import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useThemeStore } from '../../store/themeStore';
import {
  X,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Loader2,
  Send,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';

interface ExtractedIdea {
  id: string;
  source: 'user_mention' | 'ai_suggestion' | 'collaborative';
  conversationContext: {
    messageId: string;
    timestamp: string;
    leadingQuestions: string[];
    topic?: string;
    topicConfidence?: number;
    relatedMessageIds?: string[];
  };
  idea: {
    title: string;
    description: string;
    reasoning: string;
    userIntent: string;
  };
  status: 'mentioned' | 'exploring' | 'refined' | 'ready_to_extract';
  tags: string[];
  innovationLevel: 'practical' | 'moderate' | 'experimental';
}

interface TopicGroup {
  topic: string;
  icon: string;
  ideas: ExtractedIdea[];
}

interface ParsedDecisions {
  accepted: ExtractedIdea[];
  rejected: ExtractedIdea[];
  unmarked: ExtractedIdea[];
  confidence: number;
  needsClarification: boolean;
  clarificationQuestion?: string;
}

interface SessionReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  topicGroups: TopicGroup[];
  summaryText: string;
  onSubmitDecisions: (decisions: string) => Promise<ParsedDecisions | null>;
  onConfirmFinal: (decisions: ParsedDecisions) => Promise<void>;
  onCancel: () => void;
}

type ReviewStep = 'summary' | 'decisions' | 'clarification' | 'confirmation';

export const SessionReviewModal: React.FC<SessionReviewModalProps> = ({
  isOpen,
  onClose,
  topicGroups,
  summaryText,
  onSubmitDecisions,
  onConfirmFinal,
  onCancel,
}) => {
  const { isDarkMode } = useThemeStore();
  const [currentStep, setCurrentStep] = useState<ReviewStep>('summary');
  const [decisionsInput, setDecisionsInput] = useState('');
  const [parsedDecisions, setParsedDecisions] = useState<ParsedDecisions | null>(null);
  const [clarificationInput, setClarificationInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [expandedIdeas, setExpandedIdeas] = useState<Set<string>>(new Set());

  if (!isOpen) return null;

  const handleSubmitDecisions = async () => {
    if (!decisionsInput.trim()) return;

    console.log('[SessionReviewModal] Submitting decisions:', decisionsInput);
    setIsProcessing(true);
    try {
      const parsed = await onSubmitDecisions(decisionsInput);
      console.log('[SessionReviewModal] Received parsed decisions:', parsed);

      if (parsed) {
        setParsedDecisions(parsed);

        if (parsed.needsClarification) {
          console.log('[SessionReviewModal] Needs clarification, moving to clarification step');
          setCurrentStep('clarification');
        } else {
          console.log('[SessionReviewModal] Moving to confirmation step');
          setCurrentStep('confirmation');
        }
      } else {
        console.error('[SessionReviewModal] Parsed decisions is null/undefined');
        alert('Failed to parse decisions. Please try again.');
      }
    } catch (error) {
      console.error('[SessionReviewModal] Error submitting decisions:', error);
      alert('Failed to parse decisions. Please try again.');
    } finally {
      console.log('[SessionReviewModal] Setting isProcessing to false');
      setIsProcessing(false);
    }
  };

  const handleSubmitClarification = async () => {
    if (!clarificationInput.trim() || !parsedDecisions) return;

    setIsProcessing(true);
    try {
      // Re-parse with additional context
      const newInput = `${decisionsInput}. ${clarificationInput}`;
      const parsed = await onSubmitDecisions(newInput);
      if (parsed) {
        setParsedDecisions(parsed);

        if (parsed.needsClarification) {
          // Still need clarification
          setCurrentStep('clarification');
          setClarificationInput('');
        } else {
          setCurrentStep('confirmation');
        }
      }
    } catch (error) {
      console.error('Error submitting clarification:', error);
      alert('Failed to process clarification. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirm = async () => {
    if (!parsedDecisions) return;

    setIsProcessing(true);
    try {
      await onConfirmFinal(parsedDecisions);
      // Modal will close and show completion summary
    } catch (error) {
      console.error('Error finalizing session:', error);
      alert('Failed to finalize session. Please try again.');
      setIsProcessing(false);
    }
  };

  const handleBack = () => {
    if (currentStep === 'clarification') {
      setCurrentStep('decisions');
      setClarificationInput('');
    } else if (currentStep === 'confirmation') {
      setCurrentStep('decisions');
      setParsedDecisions(null);
    }
  };

  const toggleIdea = (ideaId: string) => {
    const newExpanded = new Set(expandedIdeas);
    if (newExpanded.has(ideaId)) {
      newExpanded.delete(ideaId);
    } else {
      newExpanded.add(ideaId);
    }
    setExpandedIdeas(newExpanded);
  };

  const renderSummaryStep = () => (
    <div className="space-y-4">
      <div className={`prose prose-sm max-w-none ${isDarkMode ? 'prose-invert' : ''}`}>
        <div className="whitespace-pre-line">{summaryText}</div>
      </div>

      {/* Topic Groups Display */}
      <div className="space-y-3 mt-6">
        {topicGroups.map((group) => (
          <div
            key={group.topic}
            className={`rounded-xl p-4 ${
              isDarkMode ? 'bg-white/5' : 'bg-gray-50'
            }`}
          >
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-xl">{group.icon}</span>
              <span className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                {group.topic}
              </span>
              <span
                className={`text-xs px-2 py-0.5 rounded ${
                  isDarkMode ? 'bg-white/10 text-gray-400' : 'bg-gray-200 text-gray-600'
                }`}
              >
                {group.ideas.length} ideas
              </span>
            </div>
            <ul className="space-y-1">
              {group.ideas.map((idea, i) => (
                <li
                  key={idea.id}
                  className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}
                >
                  {i + 1}. {idea.idea.title}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <button
        onClick={() => setCurrentStep('decisions')}
        className="w-full px-4 py-3 rounded-xl bg-cyan-primary hover:bg-cyan-primary-dark text-white font-medium transition-all"
      >
        Make Decisions
      </button>
    </div>
  );

  const renderDecisionsStep = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Left side - Ideas reference */}
      <div className="space-y-3 lg:max-h-[400px] lg:overflow-y-auto lg:pr-2">
        <h3 className={`text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
          Ideas to Review:
        </h3>
        {topicGroups.map((group) => (
          <div
            key={group.topic}
            className={`rounded-xl p-3 ${
              isDarkMode ? 'bg-white/5' : 'bg-gray-50'
            }`}
          >
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-lg">{group.icon}</span>
              <span className={`font-semibold text-sm ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                {group.topic}
              </span>
              <span
                className={`text-xs px-2 py-0.5 rounded ${
                  isDarkMode ? 'bg-white/10 text-gray-400' : 'bg-gray-200 text-gray-600'
                }`}
              >
                {group.ideas.length}
              </span>
            </div>
            <ul className="space-y-2">
              {group.ideas.map((idea, i) => {
                const isExpanded = expandedIdeas.has(idea.id);
                return (
                  <li
                    key={idea.id}
                    onClick={() => toggleIdea(idea.id)}
                    className={`text-xs cursor-pointer rounded-lg p-2 transition-all ${
                      isDarkMode ? 'hover:bg-white/5' : 'hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-start space-x-2">
                      {isExpanded ? (
                        <ChevronDown size={12} className="mt-0.5 flex-shrink-0" />
                      ) : (
                        <ChevronRight size={12} className="mt-0.5 flex-shrink-0" />
                      )}
                      <div className="flex-1">
                        <div className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                          {i + 1}. {idea.idea.title}
                        </div>

                        {isExpanded && (
                          <div className="mt-2 space-y-2">
                            {/* Description */}
                            <div>
                              <p className={`text-xs font-medium mb-0.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                Description:
                              </p>
                              <p className={`text-xs ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                {idea.idea.description}
                              </p>
                            </div>

                            {/* User Quote */}
                            {idea.idea.userIntent && idea.idea.userIntent !== 'Review analysis' && (
                              <div className={`p-2 rounded ${isDarkMode ? 'bg-white/5' : 'bg-gray-100'}`}>
                                <p className={`text-xs font-medium mb-0.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                  What you said:
                                </p>
                                <p className={`text-xs italic ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                  "{idea.idea.userIntent}"
                                </p>
                              </div>
                            )}

                            {/* Reasoning */}
                            {idea.idea.reasoning && (
                              <div>
                                <p className={`text-xs font-medium mb-0.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                  Why:
                                </p>
                                <p className={`text-xs ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                  {idea.idea.reasoning}
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      {/* Right side - Decision input */}
      <div className="space-y-4">
        <div className={`p-4 rounded-xl ${isDarkMode ? 'bg-blue-500/10' : 'bg-blue-50'}`}>
          <p className={`text-sm ${isDarkMode ? 'text-blue-300' : 'text-blue-800'}`}>
            Tell me which ideas you want to accept and which you want to reject in natural language.
          </p>
          <p className={`text-xs mt-2 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
            Examples: "I want the OAuth and dark mode. I don't want the mobile app."
          </p>
        </div>

        <textarea
          value={decisionsInput}
          onChange={(e) => setDecisionsInput(e.target.value)}
          placeholder="I want... I don't want..."
          rows={8}
          className={`w-full px-4 py-3 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-cyan-primary ${
            isDarkMode
              ? 'bg-white/10 text-white placeholder-gray-500'
              : 'bg-white text-gray-800 placeholder-gray-400 border border-gray-300'
          }`}
          disabled={isProcessing}
        />

        <div className="flex gap-2">
          <button
            onClick={handleBack}
            className={`flex-1 px-4 py-3 rounded-xl font-medium transition-all ${
              isDarkMode
                ? 'bg-white/10 hover:bg-white/20 text-gray-300'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
            }`}
            disabled={isProcessing}
          >
            Back
          </button>
          <button
            onClick={handleSubmitDecisions}
            disabled={!decisionsInput.trim() || isProcessing}
            className="flex-1 px-4 py-3 rounded-xl bg-cyan-primary hover:bg-cyan-primary-dark text-white font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {isProcessing ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <Send size={18} />
                <span>Submit</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  const renderClarificationStep = () => (
    <div className="space-y-4">
      {parsedDecisions?.clarificationQuestion && (
        <div className={`p-4 rounded-xl ${isDarkMode ? 'bg-amber-500/10' : 'bg-amber-50'}`}>
          <div className="flex items-start space-x-3">
            <HelpCircle size={20} className={isDarkMode ? 'text-amber-400' : 'text-amber-600'} />
            <div className="flex-1">
              <p className={`text-sm ${isDarkMode ? 'text-amber-300' : 'text-amber-800'}`}>
                {parsedDecisions.clarificationQuestion}
              </p>
            </div>
          </div>
        </div>
      )}

      <textarea
        value={clarificationInput}
        onChange={(e) => setClarificationInput(e.target.value)}
        placeholder="Clarify your decisions..."
        rows={4}
        className={`w-full px-4 py-3 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-cyan-primary ${
          isDarkMode
            ? 'bg-white/10 text-white placeholder-gray-500'
            : 'bg-white text-gray-800 placeholder-gray-400 border border-gray-300'
        }`}
        disabled={isProcessing}
      />

      <div className="flex gap-2">
        <button
          onClick={handleBack}
          className={`flex-1 px-4 py-3 rounded-xl font-medium transition-all ${
            isDarkMode
              ? 'bg-white/10 hover:bg-white/20 text-gray-300'
              : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
          }`}
          disabled={isProcessing}
        >
          Back
        </button>
        <button
          onClick={handleSubmitClarification}
          disabled={!clarificationInput.trim() || isProcessing}
          className="flex-1 px-4 py-3 rounded-xl bg-cyan-primary hover:bg-cyan-primary-dark text-white font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
        >
          {isProcessing ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              <span>Processing...</span>
            </>
          ) : (
            <>
              <Send size={18} />
              <span>Submit</span>
            </>
          )}
        </button>
      </div>
    </div>
  );

  const renderConfirmationStep = () => {
    if (!parsedDecisions) return null;

    return (
      <div className="space-y-4">
        <div
          className={`p-4 rounded-xl ${
            isDarkMode ? 'bg-cyan-500/10' : 'bg-green-50'
          }`}
        >
          <p className={`text-sm ${isDarkMode ? 'text-green-300' : 'text-green-800'}`}>
            Please review your decisions before finalizing.
          </p>
        </div>

        {/* Accepted Ideas */}
        {parsedDecisions.accepted.length > 0 && (
          <div
            className={`rounded-xl p-4 ${
              isDarkMode ? 'bg-white/5' : 'bg-gray-50'
            }`}
          >
            <div className="flex items-center space-x-2 mb-3">
              <CheckCircle2 size={20} className="text-cyan-400" />
              <span className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                Accepted ({parsedDecisions.accepted.length})
              </span>
            </div>
            <ul className="space-y-1">
              {parsedDecisions.accepted.map((idea) => (
                <li
                  key={idea.id}
                  className={`text-sm flex items-start space-x-2 ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}
                >
                  <span className="text-cyan-400">✓</span>
                  <span>{idea.idea.title}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Rejected Ideas */}
        {parsedDecisions.rejected.length > 0 && (
          <div
            className={`rounded-xl p-4 ${
              isDarkMode ? 'bg-white/5' : 'bg-gray-50'
            }`}
          >
            <div className="flex items-center space-x-2 mb-3">
              <XCircle size={20} className="text-red-400" />
              <span className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                Rejected ({parsedDecisions.rejected.length})
              </span>
            </div>
            <ul className="space-y-1">
              {parsedDecisions.rejected.map((idea) => (
                <li
                  key={idea.id}
                  className={`text-sm flex items-start space-x-2 ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}
                >
                  <span className="text-red-400">✗</span>
                  <span>{idea.idea.title}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Unmarked Ideas */}
        {parsedDecisions.unmarked.length > 0 && (
          <div
            className={`rounded-xl p-4 ${
              isDarkMode ? 'bg-amber-500/10' : 'bg-amber-50'
            }`}
          >
            <div className="flex items-center space-x-2 mb-3">
              <AlertTriangle size={20} className={isDarkMode ? 'text-amber-400' : 'text-amber-600'} />
              <span className={`font-semibold ${isDarkMode ? 'text-amber-300' : 'text-amber-800'}`}>
                For Later ({parsedDecisions.unmarked.length})
              </span>
            </div>
            <ul className="space-y-1">
              {parsedDecisions.unmarked.map((idea) => (
                <li
                  key={idea.id}
                  className={`text-sm flex items-start space-x-2 ${
                    isDarkMode ? 'text-amber-300' : 'text-amber-700'
                  }`}
                >
                  <span>•</span>
                  <span>{idea.idea.title}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={handleBack}
            className={`flex-1 px-4 py-3 rounded-xl font-medium transition-all ${
              isDarkMode
                ? 'bg-white/10 hover:bg-white/20 text-gray-300'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
            }`}
            disabled={isProcessing}
          >
            Back
          </button>
          <button
            onClick={handleConfirm}
            disabled={isProcessing}
            className="flex-1 px-4 py-3 rounded-xl bg-cyan-primary hover:bg-cyan-primary-dark text-white font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {isProcessing ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Finalizing...</span>
              </>
            ) : (
              <>
                <CheckCircle2 size={18} />
                <span>Finalize Session</span>
              </>
            )}
          </button>
        </div>
      </div>
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className={`w-full max-w-3xl max-h-[85vh] overflow-hidden rounded-2xl shadow-2xl ${
                isDarkMode ? 'glass-dark' : 'glass'
              }`}
            >
              {/* Header */}
              <div className={`px-6 py-4 border-b ${isDarkMode ? 'border-white/10' : 'border-gray-200'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                      Session Review
                    </h2>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {currentStep === 'summary' && 'Review all ideas discussed'}
                      {currentStep === 'decisions' && 'Make your decisions'}
                      {currentStep === 'clarification' && 'Clarify unmarked ideas'}
                      {currentStep === 'confirmation' && 'Final confirmation'}
                    </p>
                  </div>
                  <button
                    onClick={onClose}
                    className={`p-2 rounded-lg transition-all ${
                      isDarkMode ? 'hover:bg-white/10' : 'hover:bg-gray-100'
                    }`}
                    disabled={isProcessing}
                  >
                    <X size={20} className={isDarkMode ? 'text-gray-400' : 'text-gray-600'} />
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="px-6 py-6 overflow-y-auto max-h-[calc(85vh-140px)]">
                {currentStep === 'summary' && renderSummaryStep()}
                {currentStep === 'decisions' && renderDecisionsStep()}
                {currentStep === 'clarification' && renderClarificationStep()}
                {currentStep === 'confirmation' && renderConfirmationStep()}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};
