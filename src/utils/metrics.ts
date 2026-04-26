import { db } from '../firebase';
import { doc, updateDoc, serverTimestamp, increment } from 'firebase/firestore';

/**
 * Update agent stats after a task completes
 */
export async function updateAgentStats(agentId: string, taskSuccess: boolean, durationSeconds: number) {
  try {
    const agentRef = doc(db, 'agentPool', agentId);
    
    // Using atomic updates where possible, but averageTime requires a more complex calculation 
    // usually handled by a Cloud Function trigger. For now, we update basic counters.
    await updateDoc(agentRef, {
      'stats.tasksCompleted': increment(1),
      'stats.lastActive': serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating agent stats:', error);
  }
}

/**
 * Record detailed metrics for a task
 */
export async function recordTaskMetrics(taskId: string, metrics: { duration: number, iterations: number, tokensUsed?: number }) {
  try {
    const taskRef = doc(db, 'tasks', taskId);
    await updateDoc(taskRef, {
      'metrics.endTime': serverTimestamp(),
      'metrics.duration': metrics.duration,
      'metrics.iterations': metrics.iterations,
      'metrics.tokensUsed': metrics.tokensUsed || 0
    });
  } catch (error) {
    console.error('Error recording task metrics:', error);
  }
}
