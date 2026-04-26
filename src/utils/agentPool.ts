import { db } from '../firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';

export interface AgentConfig {
  id: string;
  name: string;
  type: string;
  status: 'active' | 'inactive';
  systemPrompt: string;
  model: string;
  config: {
    temperature: number;
    maxTokens: number;
  };
  stats: {
    tasksCompleted: number;
    averageTime: number;
    successRate: number;
    lastActive: any;
  };
}

/**
 * Fetch all active agents from the pool
 */
export async function getAvailableAgents(): Promise<AgentConfig[]> {
  try {
    const q = query(collection(db, 'agentPool'), where('status', '==', 'active'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as AgentConfig));
  } catch (error) {
    console.error('Error fetching agents:', error);
    return [];
  }
}

/**
 * Get a specific agent configuration
 */
export async function getAgent(agentId: string): Promise<AgentConfig | null> {
  try {
    const d = await getDoc(doc(db, 'agentPool', agentId));
    if (!d.exists()) return null;
    return { id: d.id, ...d.data() } as AgentConfig;
  } catch (error) {
    console.error(`Error fetching agent ${agentId}:`, error);
    return null;
  }
}

/**
 * Get the default coder agent
 */
export async function getDefaultAgent(): Promise<AgentConfig> {
  const agent = await getAgent('default-coder');
  if (agent) return agent;

  // Fallback if firestore is empty
  return {
    id: 'default-coder',
    name: 'Default Coder',
    type: 'general',
    status: 'active',
    systemPrompt: 'You are a helpful coding assistant. Generate clean, well-documented code.',
    model: 'gemini-2.0-flash-exp',
    config: { temperature: 0.7, maxTokens: 8192 },
    stats: { tasksCompleted: 0, averageTime: 0, successRate: 1.0, lastActive: null }
  };
}
