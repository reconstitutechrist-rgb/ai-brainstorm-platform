import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useThemeStore } from '../../store/themeStore';
import { useUserStore } from '../../store/userStore';
import { useProjectStore } from '../../store/projectStore';
import { useUIStore } from '../../store/uiStore';
import { X, Loader2 } from 'lucide-react';
import { projectsApi } from '../../services/api';

export const CreateProjectModal: React.FC = () => {
  const { isDarkMode } = useThemeStore();
  const { user } = useUserStore();
  const { addProject } = useProjectStore();
  const { isCreateProjectModalOpen, closeCreateProjectModal } = useUIStore();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      setError('Project title is required');
      return;
    }

    setIsCreating(true);
    setError('');

    try {
      const userId = user?.id || 'demo-user-123';
      const response = await projectsApi.create({
        title: title.trim(),
        description: description.trim(),
        userId,
      });

      if (response.success) {
        addProject(response.project);
        setTitle('');
        setDescription('');
        closeCreateProjectModal();
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create project');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <AnimatePresence>
      {isCreateProjectModalOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeCreateProjectModal}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 flex items-center justify-center z-50 p-4"
          >
            <div
              className={`${
                isDarkMode ? 'glass-dark' : 'glass'
              } rounded-3xl p-8 max-w-md w-full shadow-glass`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                  Create New Project
                </h2>
                <button
                  onClick={closeCreateProjectModal}
                  className={`p-2 rounded-lg hover:bg-white/10 transition-colors ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}
                >
                  <X size={20} />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="title"
                    className={`block text-sm font-medium mb-2 ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}
                  >
                    Project Title *
                  </label>
                  <input
                    id="title"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="My Awesome Project"
                    className={`w-full px-4 py-3 rounded-xl ${
                      isDarkMode
                        ? 'bg-white/10 text-white placeholder-gray-400 border-white/20'
                        : 'bg-white text-gray-800 placeholder-gray-500 border-gray-300'
                    } border focus:outline-none focus:ring-2 focus:ring-green-metallic/50`}
                  />
                </div>

                <div>
                  <label
                    htmlFor="description"
                    className={`block text-sm font-medium mb-2 ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}
                  >
                    Description (optional)
                  </label>
                  <textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Brief description of your project..."
                    rows={3}
                    className={`w-full px-4 py-3 rounded-xl resize-none ${
                      isDarkMode
                        ? 'bg-white/10 text-white placeholder-gray-400 border-white/20'
                        : 'bg-white text-gray-800 placeholder-gray-500 border-gray-300'
                    } border focus:outline-none focus:ring-2 focus:ring-green-metallic/50`}
                  />
                </div>

                {/* Error Message */}
                {error && (
                  <div className="px-4 py-3 rounded-xl bg-red-500/20 border border-red-500/50 text-red-400 text-sm">
                    {error}
                  </div>
                )}

                {/* Actions */}
                <div className="flex space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={closeCreateProjectModal}
                    className={`flex-1 px-6 py-3 rounded-xl font-medium transition-colors ${
                      isDarkMode
                        ? 'bg-white/10 hover:bg-white/20 text-white'
                        : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isCreating}
                    className="flex-1 px-6 py-3 rounded-xl bg-green-metallic hover:bg-green-metallic-dark text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                  >
                    {isCreating ? (
                      <>
                        <Loader2 size={20} className="animate-spin" />
                        <span>Creating...</span>
                      </>
                    ) : (
                      <span>Create Project</span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
