import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useThemeStore } from '../store/themeStore';
import { useProjectStore } from '../store/projectStore';
import { ChatInterface } from '../components/sandbox/ChatInterface';
import { IdeaBoardPanel } from '../components/sandbox/IdeaBoardPanel';
import { sandboxApi } from '../services/api';
import { TestTube, Save, Trash2, AlertTriangle } from 'lucide-react';
import '../styles/homepage.css';

export const ConversationalSandbox: React.FC = () => {
  const { isDarkMode } = useThemeStore();
  const { currentProject } = useProjectStore();

  const [activeSandbox, setActiveSandbox] = useState<any>(null);
  const [conversation, setConversation] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [extractedIdeas, setExtractedIdeas] = useState<any[]>([]);
  const [selectedIdeaIds, setSelectedIdeaIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [conversationMode, setConversationMode] = useState('exploration');

  // Apply homepage background
  useEffect(() => {
    document.body.classList.add('homepage-background');
    return () => {
      document.body.classList.remove('homepage-background');
    };
  }, []);

  useEffect(() => {
    if (currentProject) {
      initializeSandbox();
    }
  }, [currentProject]);

  const initializeSandbox = async () => {
    if (!currentProject) return;

    try {
      // Get or create sandbox
      const response = await sandboxApi.getByProject(currentProject.id);
      const activeSandboxes = response.sandboxes.filter((s: any) => s.status === 'active');

      let sandbox;
      if (activeSandboxes.length > 0) {
        sandbox = activeSandboxes[0];
      } else {
        const createResponse = await sandboxApi.create({
          projectId: currentProject.id,
          userId: 'demo-user-123',
          name: `Sandbox - ${new Date().toLocaleDateString()}`,
        });
        sandbox = createResponse.sandbox;
      }

      setActiveSandbox(sandbox);

      // Start or get conversation
      if (sandbox.conversation_id) {
        const convResponse = await sandboxApi.getConversation(sandbox.conversation_id);
        setConversation(convResponse.conversation);
        setMessages(convResponse.conversation.messages || []);
        setExtractedIdeas(convResponse.conversation.extracted_ideas || []);
        setConversationMode(convResponse.conversation.current_mode || 'exploration');
      } else {
        // Start new conversation
        const convResponse = await sandboxApi.startConversation({
          sandboxId: sandbox.id,
          projectContext: {
            projectTitle: currentProject.title,
            projectDescription: currentProject.description,
            currentDecisions: currentProject.items?.filter((i: any) => i.state === 'decided') || [],
            constraints: [],
          },
        });
        setConversation(convResponse.conversation);
        setMessages(convResponse.conversation.messages || []);
        setExtractedIdeas([]);
      }
    } catch (error) {
      console.error('Initialize sandbox error:', error);
    }
  };

  const handleSendMessage = async (userMessage: string) => {
    if (!conversation) return;

    setIsLoading(true);
    try {
      const response = await sandboxApi.sendMessage({
        conversationId: conversation.id,
        userMessage,
        mode: conversationMode,
      });

      // Update messages
      setMessages((prev) => [...prev, response.message]);

      // Update extracted ideas
      if (response.extractedIdeas && response.extractedIdeas.length > 0) {
        setExtractedIdeas((prev) => [...prev, ...response.extractedIdeas]);
      }

      // Update mode if shifted
      if (response.modeShift) {
        setConversationMode(response.modeShift);
      }
    } catch (error) {
      console.error('Send message error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleIdeaSelect = (ideaId: string) => {
    setSelectedIdeaIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(ideaId)) {
        newSet.delete(ideaId);
      } else {
        newSet.add(ideaId);
      }
      return newSet;
    });
  };

  const handleExtractIdeas = async () => {
    if (!conversation || selectedIdeaIds.size === 0) return;

    try {
      await sandboxApi.extractFromConversation({
        conversationId: conversation.id,
        selectedIdeaIds: Array.from(selectedIdeaIds),
      });

      alert(`✅ Extracted ${selectedIdeaIds.size} ideas to your main project!`);
      setSelectedIdeaIds(new Set());
    } catch (error) {
      console.error('Extract ideas error:', error);
      alert('Failed to extract ideas. Please try again.');
    }
  };

  const handleUpdateIdeaStatus = async (ideaId: string, status: string) => {
    if (!conversation) return;

    try {
      await sandboxApi.updateIdeaStatus({
        ideaId,
        conversationId: conversation.id,
        status,
      });

      // Update local state
      setExtractedIdeas((prev) =>
        prev.map((idea) => (idea.id === ideaId ? { ...idea, status } : idea))
      );
    } catch (error) {
      console.error('Update idea status error:', error);
    }
  };

  const handleSaveAsAlternative = async () => {
    if (!activeSandbox) return;

    const name = prompt('Name this alternative version:');
    if (!name) return;

    try {
      await sandboxApi.saveAsAlternative({
        sandboxId: activeSandbox.id,
        alternativeName: name,
      });
      alert('✅ Saved as alternative version!');
      initializeSandbox();
    } catch (error) {
      console.error('Save alternative error:', error);
      alert('Failed to save alternative. Please try again.');
    }
  };

  const handleDiscardSandbox = async () => {
    if (!activeSandbox) return;

    if (!confirm('Discard all ideas and conversation in this sandbox? This cannot be undone.')) return;

    try {
      await sandboxApi.discard(activeSandbox.id);
      setActiveSandbox(null);
      setConversation(null);
      setMessages([]);
      setExtractedIdeas([]);
      initializeSandbox();
    } catch (error) {
      console.error('Discard sandbox error:', error);
      alert('Failed to discard sandbox. Please try again.');
    }
  };

  if (!currentProject) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className={`${isDarkMode ? 'glass-dark' : 'glass'} rounded-3xl p-12 text-center shadow-glass`}>
          <TestTube size={48} className={`mx-auto mb-4 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`} />
          <h2 className={`text-2xl font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
            No Project Selected
          </h2>
          <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Select a project to start brainstorming with AI
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen h-[calc(100vh-120px)] flex flex-col">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`${isDarkMode ? 'glass-dark' : 'glass'} rounded-3xl p-6 mb-6 shadow-glass border-2 border-green-metallic/30`}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-2">
              <TestTube className="text-green-metallic" size={28} />
              <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                Conversational Sandbox
              </h1>
            </div>
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mb-2`}>
              Brainstorm with AI to explore ideas, clarify thinking, and discover what you really want
            </p>
            <div
              className={`flex items-center space-x-2 text-xs px-3 py-1.5 rounded-lg w-fit ${
                isDarkMode ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-700'
              }`}
            >
              <AlertTriangle size={14} />
              <span>Nothing here affects your main project until you extract ideas</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2 ml-4">
            <button
              onClick={handleSaveAsAlternative}
              className={`px-4 py-2 rounded-xl transition-all flex items-center space-x-2 ${
                isDarkMode
                  ? 'bg-blue-500/20 hover:bg-blue-500/30 text-blue-400'
                  : 'bg-blue-100 hover:bg-blue-200 text-blue-600'
              }`}
            >
              <Save size={16} />
              <span className="text-sm font-medium">Save as Alternative</span>
            </button>
            <button
              onClick={handleDiscardSandbox}
              className={`px-4 py-2 rounded-xl transition-all flex items-center space-x-2 ${
                isDarkMode
                  ? 'bg-red-500/20 hover:bg-red-500/30 text-red-400'
                  : 'bg-red-100 hover:bg-red-200 text-red-600'
              }`}
            >
              <Trash2 size={16} />
              <span className="text-sm font-medium">Discard All</span>
            </button>
          </div>
        </div>
      </motion.div>

      {/* Main Content - Chat + Ideas Panel */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className={`${isDarkMode ? 'glass-dark' : 'glass'} rounded-2xl shadow-glass flex-1 overflow-hidden`}
      >
        <div className="h-full grid grid-cols-1 lg:grid-cols-3 gap-0">
          {/* Chat Interface - 2/3 width on large screens */}
          <div className={`lg:col-span-2 h-full border-r ${isDarkMode ? 'border-white/10' : 'border-gray-200'}`}>
            <ChatInterface
              messages={messages}
              onSendMessage={handleSendMessage}
              isLoading={isLoading}
              conversationMode={conversationMode}
            />
          </div>

          {/* Ideas Board Panel - 1/3 width on large screens */}
          <div className="h-full">
            <IdeaBoardPanel
              ideas={extractedIdeas}
              selectedIdeaIds={selectedIdeaIds}
              onToggleSelect={handleToggleIdeaSelect}
              onExtract={handleExtractIdeas}
              onUpdateStatus={handleUpdateIdeaStatus}
            />
          </div>
        </div>
      </motion.div>
    </div>
  );
};
