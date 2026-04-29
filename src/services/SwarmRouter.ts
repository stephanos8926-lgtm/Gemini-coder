import { db } from '../../server';
import admin from 'firebase-admin';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { LogTool } from '../../packages/nexus/telemetry/LogTool';
import { routeTask } from './TaskRouter';
import { ForgeGuard } from '../../packages/nexus/guard/ForgeGuard';
import { safeJsonParse } from '../lib/utils';

const logger = new LogTool('SwarmRouter');
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const guard = ForgeGuard.init('SwarmRouter');

export async function coordinateSwarm(userId: string, projectId: string, prompt: string) {
  return guard.protect(async () => {
    logger.info(`Initializing Swarm for: ${prompt}`);
    
    // 1. Create Swarm Document (Planning mode)
    const swarmData = {
      userId,
      projectId,
      status: 'planning',
      originalPrompt: prompt,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };
  
    const swarmRef = await db.collection('swarms').add(swarmData);
    
    try {
      // 2. Generate Plan
      const plan = await createSwarmPlan(prompt);
      await swarmRef.update({ plan, status: 'executing' });
  
      // 3. Kick off subtasks in background
      // For simplicity in this env, we run them sequentially or in small parallel batches
      for (const subtask of plan.subtasks) {
        await routeTask(userId, projectId, subtask.description, {}, {
          forceBackground: true,
          context: {
            swarmId: swarmRef.id,
            subtaskId: subtask.id,
            agent: subtask.assignedAgent
          }
        });
      }
  
      return { swarmId: swarmRef.id };
    } catch (error) {
      logger.error(`Swarm coordination failed: ${swarmRef.id}`, error as any);
      await swarmRef.update({ status: 'failed' });
      throw error;
    }
  }, { method: 'coordinateSwarm', userId, projectId });
}

async function createSwarmPlan(prompt: string) {
  return guard.protect(async () => {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
    
    const planningPrompt = `You are a swarm coordinator. Break this request into 2-3 logical subtasks:
  Request: "${prompt}"
  
  Respond ONLY with JSON:
  {
    "subtasks": [
      {
        "id": "st1",
        "type": "backend|frontend|logic",
        "description": "Atomic piece of work",
        "assignedAgent": "coder|architect|tester"
      }
    ]
  }`;
  
    const response = await model.generateContent(planningPrompt);
    const text = response.response.text().replace(/```json|```/g, '').trim();
    return safeJsonParse(text, 'createSwarmPlan');
  }, { method: 'createSwarmPlan' });
}
