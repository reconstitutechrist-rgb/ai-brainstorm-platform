import React, { useState } from 'react';
import { MessageCircle, ChevronDown, ChevronUp, CheckCircle2, Minimize2 } from 'lucide-react';
import type { AgentQuestion } from '../types';

interface AgentQuestionBubbleProps {
  questions: AgentQuestion[];
  isOpen: boolean;
  onToggle: () => void;
  onAnswer?: (questionId: string, question: string, answer: string) => void;
  unansweredCount: number;
}

export const AgentQuestionBubble: React.FC<AgentQuestionBubbleProps> = ({
  questions,
  isOpen,
  onToggle,
  onAnswer,
  unansweredCount
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [answering, setAnswering] = useState<string | null>(null);
  const [answerText, setAnswerText] = useState('');

  // Separate answered and unanswered questions
  const unansweredQuestions = questions.filter(q => !q.answered);
  const answeredQuestions = questions.filter(q => q.answered);

  const handleSubmitAnswer = (questionId: string, question: string) => {
    if (answerText.trim() && onAnswer) {
      onAnswer(questionId, question, answerText);
      setAnswerText('');
      setAnswering(null);
    }
  };

  // Show minimized button when closed
  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        className="fixed bottom-24 right-[40%] z-50 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-full p-4 shadow-lg hover:shadow-xl transition-all hover:scale-110 flex items-center gap-2"
        aria-label="Open agent questions"
      >
        <MessageCircle className="w-6 h-6" />
        {unansweredCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
            {unansweredCount}
          </span>
        )}
      </button>
    );
  }

  return (
    <div className="fixed bottom-24 right-[40%] z-50 max-w-md animate-slide-up">
      {/* Bubble Header */}
      <div
        className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-t-2xl px-4 py-3 flex items-center justify-between cursor-pointer shadow-lg"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5" />
          <span className="font-semibold">
            💭 Agent Questions ({unansweredCount > 0 ? `${unansweredCount} new` : questions.length})
          </span>
        </div>
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronDown className="w-5 h-5" />
          ) : (
            <ChevronUp className="w-5 h-5" />
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
            className="hover:bg-white/20 rounded-full p-1 transition-colors"
            aria-label="Minimize questions"
          >
            <Minimize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Bubble Content */}
      {isExpanded && (
        <div className="bg-white rounded-b-2xl shadow-2xl border border-gray-200 max-h-96 overflow-y-auto">
          <div className="p-4 space-y-3">
            {questions.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">
                No questions yet. I'll ask clarifying questions here when needed.
              </p>
            ) : (
              <>
                <p className="text-sm text-gray-600 mb-3">
                  These questions help me understand your vision better. You can answer them or ignore them - totally optional!
                </p>

                {/* Unanswered Questions */}
                {unansweredQuestions.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-purple-700 uppercase tracking-wide">
                      Unanswered ({unansweredQuestions.length})
                    </h4>
                    {unansweredQuestions.map((q) => (
                      <div
                        key={q.id}
                        className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg p-3 border border-purple-200"
                      >
                        <div className="flex items-start gap-2">
                          <div className="flex-shrink-0 mt-1">
                            <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                          </div>
                          <div className="flex-1">
                            <p className="text-gray-800 text-sm font-medium mb-2">
                              {q.question}
                            </p>

                            {answering === q.id ? (
                              <div className="mt-2">
                                <input
                                  type="text"
                                  value={answerText}
                                  onChange={(e) => setAnswerText(e.target.value)}
                                  onKeyPress={(e) => {
                                    if (e.key === 'Enter') {
                                      handleSubmitAnswer(q.id, q.question);
                                    }
                                  }}
                                  placeholder="Type your answer..."
                                  className="w-full px-3 py-2 text-sm border border-purple-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                                  autoFocus
                                />
                                <div className="flex gap-2 mt-2">
                                  <button
                                    onClick={() => handleSubmitAnswer(q.id, q.question)}
                                    className="px-3 py-1 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                                  >
                                    Send
                                  </button>
                                  <button
                                    onClick={() => {
                                      setAnswering(null);
                                      setAnswerText('');
                                    }}
                                    className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button
                                onClick={() => setAnswering(q.id)}
                                className="text-xs text-purple-600 hover:text-purple-700 font-medium"
                              >
                                Answer →
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Answered Questions */}
                {answeredQuestions.length > 0 && (
                  <div className="space-y-2 mt-4">
                    <h4 className="text-xs font-semibold text-green-700 uppercase tracking-wide flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Answered ({answeredQuestions.length})
                    </h4>
                    {answeredQuestions.map((q) => (
                      <div
                        key={q.id}
                        className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-3 border border-green-200 opacity-70"
                      >
                        <div className="flex items-start gap-2">
                          <div className="flex-shrink-0 mt-1">
                            <CheckCircle2 className="w-4 h-4 text-cyan-600" />
                          </div>
                          <div className="flex-1">
                            <p className="text-gray-700 text-sm line-through">
                              {q.question}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-3 bg-gray-50 rounded-b-2xl border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              {unansweredCount > 0
                ? "These questions won't interrupt your brainstorming - continue whenever you're ready!"
                : "All questions answered! This panel stays accessible for viewing question history."}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
