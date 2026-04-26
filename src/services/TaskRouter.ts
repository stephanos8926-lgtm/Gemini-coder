import { db } from '../../server';
import admin from 'firebase-admin';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { LogTool } from '../../packages/nexus/telemetry/LogTool';
import { detectLanguage } from '../utils/languageUtils';

const logger = new LogTool('TaskRouter');
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export interface TaskComplexity {
  score: number;
  isComplex: boolean;
  estimatedTime: number;
}

/**
 * Estimates task complexity based on prompt and file data.
 */
export function estimateTaskComplexity(prompt: string, files: Record<string, string>): TaskComplexity {
  let score = 0;
  
  const pLower = prompt.toLowerCase();
  if (pLower.includes('build entire') || pLower.includes('create whole')) score += 3;
  if (pLower.includes('full stack') || pLower.includes('end to end')) score += 3;
  if (pLower.includes('multiple') || pLower.includes('several')) score += 2;
  
  const numericMatch = prompt.match(/\d+/);
  if (numericMatch && parseInt(numericMatch[0]) > 5) score += 2;
  
  const fileCount = Object.keys(files).length;
  if (fileCount > 10) score += 3;
  else if (fileCount > 5) score += 2;
  else if (fileCount > 2) score += 1;
  
  return {
    score,
    isComplex: score >= 5,
    estimatedTime: score * 20
  };
}

/**
 * Routes a task to either foreground execution or background persistence.
 */
export async function routeTask(
  userId: string, 
  projectId: string, 
  prompt: string, 
  files: Record<string, string>, 
  options: any = {}
) {
  const complexity = estimateTaskComplexity(prompt, files);
  const forceBackground = options.forceBackground === true;
  const isBackground = forceBackground || complexity.isComplex;

  if (isBackground) {
    const taskData = {
      status: 'queued',
      type: 'background',
      userId,
      projectId,
      prompt,
      files,
      context: options.context || {},
      progress: 0,
      currentStep: 'Queued',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      estimatedDuration: complexity.estimatedTime,
      requestedAgent: options.agentId || 'default-coder',
      metrics: {
        startTime: admin.firestore.FieldValue.serverTimestamp()
      }
    };

    const taskRef = await db.collection('tasks').add(taskData);
    logger.info(`Task routed to BACKGROUND: ${taskRef.id}`, { complexity });
    
    return {
      mode: 'background',
      taskId: taskRef.id,
      estimated: complexity.estimatedTime
    };
  }

  logger.info('Task routed to FOREGROUND');
  return {
    mode: 'foreground'
  };
}

/**
 * BACKGROUND WORKER (Simulating Cloud Functions onCreate trigger)
 */
let isWorkerRunning = false;
const activeTasks = new Set<string>();
const MAX_CONCURRENT_TASKS = 2;

export function initBackgroundWorker() {
  if (isWorkerRunning) return;
  isWorkerRunning = true;
  logger.info('Background Task Worker INITIALIZED');

  // Listen for queued background tasks
  db.collection('tasks')
    .where('status', '==', 'queued')
    .where('type', '==', 'background')
    .onSnapshot((snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added' || change.type === 'modified') {
          const taskId = change.doc.id;
          if (!activeTasks.has(taskId) && activeTasks.size < MAX_CONCURRENT_TASKS) {
            processTask(change.doc);
          }
        }
      });
    });
}

async function processTask(doc: admin.firestore.QueryDocumentSnapshot) {
  const taskId = doc.id;
  const task = doc.data();
  activeTasks.add(taskId);

  logger.info(`Processing background task: ${taskId}`);

  try {
    // 1. Mark as running
    await doc.ref.update({
      status: 'running',
      startedAt: admin.firestore.FieldValue.serverTimestamp(),
      currentStep: 'Starting AI engine...'
    });

    // 2. Execute AI logic
    const result = await executeAITaskWithProgress(task, async (progress, step) => {
      await doc.ref.update({ progress, currentStep: step });
    });

    // 3. Complete
    const endTime = Date.now();
    const startTime = task.metrics?.startTime?.toDate?.()?.getTime() || Date.now();
    const duration = (endTime - startTime) / 1000;

    await doc.ref.update({
      status: 'completed',
      result,
      progress: 1.0,
      currentStep: 'Completed',
      completedAt: admin.firestore.FieldValue.serverTimestamp(),
      'metrics.endTime': admin.firestore.FieldValue.serverTimestamp(),
      'metrics.duration': duration,
      'metrics.iterations': result.iterations || 1
    });

    logger.info(`Task COMPLETED: ${taskId}`);
  } catch (error) {
    logger.error(`Task FAILED: ${taskId}`, error instanceof Error ? error : new Error(String(error)));
    await doc.ref.update({
      status: 'failed',
      result: { error: error instanceof Error ? error.message : String(error) },
      completedAt: admin.firestore.FieldValue.serverTimestamp()
    });
  } finally {
    activeTasks.delete(taskId);
  }
}

async function executeAITaskWithProgress(task: any, onProgress: (p: number, s: string) => Promise<void>) {
  const modelName = task.context.model || 'gemini-2.0-flash-exp';
  const model = genAI.getGenerativeModel({ model: modelName });

  let iterationCount = 0;
  const maxIterations = 5; // Restricted for safety in this environment
  
  await onProgress(0.1, 'Analyzing codebase context...');
  
  // Detect language for specialized focus points
  const files = task.files || {};
  let mainLang = 'javascript';
  const exts = Object.keys(files).map(f => f.split('.').pop()?.toLowerCase());
  if (exts.includes('py')) mainLang = 'python';
  else if (exts.includes('go')) mainLang = 'go';
  else if (exts.includes('rs')) mainLang = 'rust';
  else if (exts.includes('cpp') || exts.includes('c')) mainLang = 'cpp';

  const languageSpecifics: Record<string, string> = {
    'go': 'Focus on clean, idiomatic Go, proper package structure (go.mod), and providing compilation instructions.',
    'rust': 'Focus on safe, idiomatic Rust, proper Cargo.toml organization, and modules.',
    'cpp': 'Focus on modern C++ (C++17/20), header/implementation separation, and CMake/Make instructions.'
  };

  const focus = languageSpecifics[mainLang] || 'Follow standard best practices for the detected framework.';

  // Create a structured system prompt for the background worker
  const systemPrompt = `You are a background autonomous coding agent in ForgeGuard IDE (GIDE).
You must follow instructions precisely and return your final response once the task is complete.
Your final response MUST include a clear summary and any file changes in a block format.

LANGUAGE FOCUS: ${focus}

User Request: ${task.prompt}`;

  try {
    const result = await model.generateContent(systemPrompt);
    const responseText = result.response.text();
    
    await onProgress(0.9, 'Finalizing code structure...');
    
    // Simple parsing logic (can be expanded)
    return {
      summary: responseText.slice(0, 500) + (responseText.length > 500 ? '...' : ''),
      fullResponse: responseText,
      iterations: 1,
      timestamp: Date.now()
    };
  } catch (err) {
    throw new Error(`AI Execution Error: ${err instanceof Error ? err.message : String(err)}`);
  }
}
