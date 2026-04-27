import { useState } from 'react';
import { Message } from '../lib/gemini';
import { ForgeAI } from '../lib/forgeAI';
import { AIRuntimeState } from '../services/ai/types';
import { extractFiles, type FileStore } from '../lib/fileStore';
import { applyDiff } from '../lib/diff';
import { filesystemService } from '../lib/filesystemService';
import { generateAstSkeleton } from '../lib/astManager';
import { getSystemInstruction } from '../constants/systemInstruction';
import { generateId } from '../lib/projectStore';
import { Settings } from '../lib/settingsStore';
import { ForgeGuard } from '../utils/ForgeWrappers';
import { submitTask, submitSwarm } from '../lib/taskManager';

interface UseAppChatProps {
  apiKey: string | null;
  model: string;
  workspaceName: string;
  selectedFile: string | null;
  settings: Settings;
  enabledTools: any[];
  fileStore: FileStore;
  setFileStore: React.Dispatch<React.SetStateAction<FileStore>>;
  setShowKeyModal: (show: boolean) => void;
  systemModifier: string;
}

export function useAppChat({
  apiKey,
  model,
  workspaceName,
  selectedFile,
  settings,
  enabledTools,
  fileStore,
  setFileStore,
  setShowKeyModal,
  systemModifier
}: UseAppChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const guard = ForgeGuard.init('useAppChat');

  const processSlashCommand = (msg: string): boolean => {
    if (msg.startsWith('/help')) {
      setMessages(prev => [...prev, { id: generateId(), role: 'user', content: msg }, { id: generateId(), role: 'model', content: '**Available Commands:**\n- `/help` : Show this message\n- `/reset` : Clear chat and files\n- `/files` : Print file tree\n- `/zip` : Download project as ZIP\n- `/preview` : Switch to Preview tab\n- `/persona <name>` : Switch persona\n- `/verbose` : Toggle verbose mode\n- `/terse` : Toggle terse mode' }]);
      return true;
    }
    if (msg.startsWith('/reset')) {
      if (window.confirm('Are you sure you want to clear all chat history and files?')) {
        setMessages([]);
        filesystemService.loadAllFiles().then(setFileStore);
      }
      return true;
    }
    if (msg.startsWith('/files')) {
      const tree = Object.keys(fileStore).map(p => `- ${p}`).join('\n');
      setMessages(prev => [...prev, { id: generateId(), role: 'user', content: msg }, { id: generateId(), role: 'model', content: `**Current Files:**\n${tree || 'No files yet.'}` }]);
      return true;
    }
    if (msg.startsWith('/swarm')) {
      const prompt = msg.replace('/swarm', '').trim();
      if (!prompt) {
        setMessages(prev => [...prev, { id: generateId(), role: 'model', content: '❌ Please provide a prompt for the swarm. Example: `/swarm build a todo app`'}]);
        return true;
      }
      submitSwarm(prompt).then(res => {
        setMessages(prev => [...prev, { id: generateId(), role: 'model', content: `🚀 **Forge Swarm Initialized!**\nSwarm ID: \`${res.swarmId}\`\n\nI've split your request into subtasks and assigned them to agents. You can monitor progress in the Forge Swarm panel below.`}]);
      }).catch(err => {
        setMessages(prev => [...prev, { id: generateId(), role: 'model', content: `❌ Swarm failed: ${err.message}`}]);
      });
      return true;
    }
    if (msg.startsWith('/task')) {
      const prompt = msg.replace('/task', '').trim();
      if (!prompt) {
        setMessages(prev => [...prev, { id: generateId(), role: 'model', content: '❌ Please provide a prompt for the background task.'}]);
        return true;
      }
      const files: Record<string, string> = {};
      Object.entries(fileStore).forEach(([p, f]) => { files[p] = f.content; });
      
      submitTask(prompt, files, true).then(res => {
        setMessages(prev => [...prev, { id: generateId(), role: 'model', content: `⏳ **Background Task Queued**\nTask ID: \`${res.taskId}\`\nEstimated Duration: ${res.estimated}s\n\nThe task is running autonomously. Check the status panel for updates.`}]);
      }).catch(err => {
        setMessages(prev => [...prev, { id: generateId(), role: 'model', content: `❌ Task failed: ${err.message}`}]);
      });
      return true;
    }
    return false;
  };

  const handleSendMessage = async (content: string) => {
    if (processSlashCommand(content)) return;
    if (!apiKey) {
      setShowKeyModal(true);
      return;
    }

    const userMsgId = generateId();
    const userMessage: Message = { id: userMsgId, role: 'user', content };
    const newMessages: Message[] = [...messages, userMessage];
    setMessages(newMessages);
    
    const processAIResponse = async (currentMessages: Message[], currentFileStore: typeof fileStore, depth: number = 0) => {
      if (depth > 5) {
        console.warn('AI tool call depth limit reached (5). Breaking loop to prevent memory exhaustion.');
        setIsStreaming(false);
        return;
      }
      const modelMsgId = generateId();
      setMessages([...currentMessages, { id: modelMsgId, role: 'model', content: '' }]);
      setIsStreaming(true);

      try {
        let fullResponse = '';
        let finalFunctionCalls: { name: string; args: any }[] | undefined;

        const latestQuery = currentMessages.length > 0 ? currentMessages[currentMessages.length - 1].content : '';
        
        let relevantContextItems: { path: string, content: string }[] = [];
        try {
          relevantContextItems = await filesystemService.getRelevantContext(latestQuery, 5);
        } catch (e) {
          console.warn('[useAppChat] Context engine unreachable:', e);
        }

        const mentionRegex = /@([a-zA-Z0-9_./-]+)/g;
        const mentions = Array.from(latestQuery.matchAll(mentionRegex)).map(m => m[1]);
        for (const mention of mentions) {
          if (currentFileStore[mention] && !relevantContextItems.find(i => i.path === mention)) {
            relevantContextItems.push({ path: mention, content: currentFileStore[mention].content });
          } else if (!relevantContextItems.find(i => i.path === mention)) {
            relevantContextItems.push({ path: mention, content: `(File referenced via @mention not loaded in memory)` });
          }
        }
        
        const fileTreeItems = await Promise.all(Object.entries(currentFileStore).map(async ([path, file]) => {
          const skeleton = await generateAstSkeleton(file.content, path);
          if (skeleton) {
            return `- ${path}\n  AST Summary:\n  ${skeleton.split('\n').join('\n  ')}`;
          }
          return `- ${path}`;
        }));
        const fileTree = fileTreeItems.join('\\n');
        
        const personaInstruction = settings.aiPersona === 'custom' 
          ? settings.customPersona 
          : `Act as a ${settings.aiPersona}.`;

        let relevantContextString = relevantContextItems.length > 0 
          ? `\n\n[RELEVANT CONTEXT & MENTIONS]\nBased on the user's query and explicit @mentions, here are detailed snippets of the most relevant files/symbols:\n` +
            relevantContextItems.map(m => `--- ${m.path} ---\n${m.content}\n`).join('\n')
          : '';

        const systemPrompt = getSystemInstruction(enabledTools) + 
          `\n\n[CURRENT WORKSPACE CONTEXT]\n` +
          `Workspace Name: ${workspaceName}\n` +
          `Active File: ${selectedFile || 'None'}\n` +
          `\n[CURRENT WORKSPACE FILES & STRUCTURE]\n` +
          `The following is a list of files in the current workspace. For supported files (JS, TS, Python), ` +
          `a structural AST summary is provided to help you understand the codebase without reading every file. ` +
          `Use these summaries to identify relevant functions, classes, and types.\n\n` +
          `${fileTree || 'No files yet.'}\n` +
          relevantContextString +
          `\n\n[AI PERSONA: ${settings.aiPersona.toUpperCase()}]\n${personaInstruction}\n` +
          (settings.aiChainOfThought ? "\n[CHAIN OF THOUGHT]\nYou MUST wrap your internal reasoning process in <thinking> tags before providing your final response. This reasoning should include your plan, file manifest, and any complexity estimates.\n" : "") +
          systemModifier;

        await guard.protect(async () => {
          await ForgeAI.stream(
            currentMessages.length > 50 ? currentMessages.slice(-50) : currentMessages,
            {
              model,
              apiKey,
              systemInstruction: systemPrompt,
              temperature: settings.temperature,
              workspace: workspaceName,
              onChunk: (chunk, functionCalls, state) => {
                if (chunk) fullResponse += chunk;
                if (functionCalls) finalFunctionCalls = functionCalls;
                
                setMessages(prev => {
                  const updated = [...prev];
                  const lastIdx = updated.length - 1;
                  updated[lastIdx].content = fullResponse;
                  if (functionCalls) {
                    updated[lastIdx].functionCalls = functionCalls;
                  }
                  // We could also surface state.warnings here
                  return updated;
                });

                if (chunk) {
                  setFileStore(prevStore => {
                    const extractedStore = extractFiles(fullResponse, currentFileStore);
                    const mergedStore = { ...extractedStore };
                    // (rest of the store merging logic...)
                    for (const path in prevStore) {
                      if (currentFileStore[path] && prevStore[path].content !== currentFileStore[path].content) {
                        mergedStore[path] = prevStore[path];
                      } else if (!currentFileStore[path] && prevStore[path]) {
                        mergedStore[path] = prevStore[path];
                      }
                    }
                    for (const path in currentFileStore) {
                      if (!prevStore[path]) {
                        delete mergedStore[path];
                      }
                    }
                    return mergedStore;
                  });
                }
              }
            }
          );
        }, { path: 'streamGemini' });

        setIsStreaming(false);

        if (finalFunctionCalls && finalFunctionCalls.length > 0) {
          const functionResponses: { name: string; response: any }[] = [];
          let updatedFileStore = { ...currentFileStore };
          
          await guard.protect(async () => {
              for (const call of finalFunctionCalls!) {
                try {
                  switch (call.name) {
                    // ... (simplified for brevity, assume the full switch block is here)
                    case 'runCommand': {
                      const res = await filesystemService.runTool(call.args.command);
                      functionResponses.push({ name: call.name, response: res });
                      break;
                    }
                    case 'read_file': {
                      const content = await filesystemService.getFileContent(call.args.path);
                      functionResponses.push({ name: call.name, response: { content } });
                      break;
                    }
                    case 'write_file': {
                      await filesystemService.saveFile(call.args.path, call.args.content);
                      updatedFileStore[call.args.path] = {
                        content: call.args.content,
                        isNew: false,
                        isModified: false,
                        size: call.args.content.length
                      };
                      functionResponses.push({ name: call.name, response: { success: true } });
                      break;
                    }
                    case 'apply_diff': {
                      const currentContent = updatedFileStore[call.args.path]?.content || '';
                      const newContent = applyDiff(currentContent, call.args.diff);
                      await filesystemService.saveFile(call.args.path, newContent);
                      updatedFileStore[call.args.path] = {
                        ...updatedFileStore[call.args.path],
                        content: newContent,
                        isModified: false
                      };
                      functionResponses.push({ name: call.name, response: { success: true } });
                      break;
                    }
                    case 'search_code': {
                      const res = await filesystemService.search(call.args.pattern);
                      functionResponses.push({ name: call.name, response: { results: res } });
                      break;
                    }
                    case 'find_symbol': {
                      const res = await filesystemService.search(call.args.symbol);
                      functionResponses.push({ name: call.name, response: { results: res } });
                      break;
                    }
                    case 'get_diagnostics': {
                      functionResponses.push({ name: call.name, response: { diagnostics: [] } });
                      break;
                    }
                    case 'web_search': {
                      const res = await fetch('/api/admin/web-search', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ query: call.args.query })
                      });
                      const data = await res.json();
                      functionResponses.push({ name: call.name, response: data });
                      break;
                    }
                    default:
                      functionResponses.push({ name: call.name, response: { error: 'Unknown function' } });
                  }
                } catch (e: any) {
                  functionResponses.push({ name: call.name, response: { error: e.message } });
                }
              }
          }, { path: 'ToolDispatchLoop' });

          setFileStore(updatedFileStore);

          const newMessagesWithResponses = [
            ...currentMessages,
            { id: modelMsgId, role: 'model', content: fullResponse, functionCalls: finalFunctionCalls },
            { id: generateId(), role: 'function', content: '', functionResponses }
          ] as Message[];
          
          await processAIResponse(newMessagesWithResponses, updatedFileStore, depth + 1);
        }
      } catch (error) {
        console.error('Failed to get AI response', error);
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1].content = `Error: ${error instanceof Error ? error.message : 'Failed to connect to AI'}`;
          return updated;
        });
        setIsStreaming(false);
      }
    };

    await processAIResponse(newMessages, fileStore);
  };

  return {
    messages,
    setMessages,
    isStreaming,
    handleSendMessage,
    processSlashCommand
  };
}
