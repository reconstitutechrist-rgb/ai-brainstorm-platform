import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useThemeStore } from '../store/themeStore';
import { useProjectStore } from '../store/projectStore';
import { useUserStore } from '../store/userStore';
import { useUIStore } from '../store/uiStore';
import { Plus, Sparkles, Folder, Clock, Trash2 } from 'lucide-react';
import { projectsApi } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import '../styles/homepage.css';

export const Dashboard: React.FC = () => {
  const { isDarkMode } = useThemeStore();
  const { user } = useUserStore();
  const { projects, setProjects, setCurrentProject, loading, setLoading } = useProjectStore();
  const { openCreateProjectModal } = useUIStore();
  const navigate = useNavigate();
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);

  // Apply homepage background
  useEffect(() => {
    document.body.classList.add('homepage-background');
    return () => {
      document.body.classList.remove('homepage-background');
    };
  }, []);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setLoading(true);
      // Use actual authenticated user ID or fallback to demo
      const userId = user?.id || 'demo-user-123';
      console.log('Loading projects for user:', userId);
      const response = await projectsApi.getAll(userId);
      if (response.success) {
        setProjects(response.projects);
      }
    } catch (error) {
      console.error('Failed to load projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProjectClick = (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    if (project) {
      setCurrentProject(project);
      navigate('/chat');
    }
  };

  const handleDeleteProject = async () => {
    if (!projectToDelete) return;

    setDeleting(true);
    try {
      await projectsApi.delete(projectToDelete);

      // Remove project from list
      setProjects(projects.filter(p => p.id !== projectToDelete));

      // Hide confirmation dialog
      setShowDeleteConfirm(false);
      setProjectToDelete(null);
    } catch (error) {
      console.error('Delete project error:', error);
    } finally {
      setDeleting(false);
    }
  };

  const confirmDelete = (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent project card click
    setProjectToDelete(projectId);
    setShowDeleteConfirm(true);
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className={`${isDarkMode ? 'glass-dark' : 'glass'} p-12 mb-8 rounded-3xl shadow-glass`}
      >
        <div className="flex items-center space-x-4 mb-4">
          <div className="p-3 rounded-2xl bg-green-metallic/20 glow-green">
            <Sparkles className="text-green-metallic" size={36} />
          </div>
          <h1 className={`text-5xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            AI Brainstorm Platform
          </h1>
        </div>
        <p className={`text-xl ${isDarkMode ? 'text-gray-200' : 'text-gray-700'} max-w-3xl`}>
          Transform your ideas into reality with 8 specialized AI agents working together in perfect harmony.
        </p>
      </motion.div>

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {/* New Project Card */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={openCreateProjectModal}
          className={`${isDarkMode ? 'glass-dark' : 'glass'} p-8 text-left rounded-2xl shadow-glass`}
        >
          <div className="w-14 h-14 rounded-xl gradient-green flex items-center justify-center mb-4 glow-green">
            <Plus className="text-white" size={28} />
          </div>
          <h3 className={`text-xl font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            New Project
          </h3>
          <p className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>
            Start brainstorming with AI agents
          </p>
        </motion.button>

        {/* Stats Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className={`${isDarkMode ? 'glass-dark' : 'glass'} p-8 rounded-2xl shadow-glass`}
        >
          <div className="w-12 h-12 rounded-xl bg-green-metallic/20 flex items-center justify-center mb-4">
            <Folder className="text-green-metallic" size={24} />
          </div>
          <h3 className={`text-xl font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Your Projects
          </h3>
          <p className="text-3xl font-bold text-gradient">
            {projects.length}
          </p>
        </motion.div>

        {/* Agent Status Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className={`${isDarkMode ? 'glass-dark' : 'glass'} p-8 rounded-2xl shadow-glass`}
        >
          <h3 className={`text-xl font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            AI Agents
          </h3>
          <div className="flex items-center space-x-2">
            <div className="status-indicator" />
            <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              8 agents online
            </span>
          </div>
        </motion.div>
      </div>

      {/* Recent Projects */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className={`${isDarkMode ? 'glass-dark' : 'glass'} p-8 rounded-2xl shadow-glass`}
      >
        <h2 className={`text-2xl font-bold mb-6 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          Recent Projects
        </h2>

        {loading ? (
          <div className="text-center py-8">
            <div className="inline-block w-8 h-8 border-4 border-green-metallic/30 border-t-green-metallic rounded-full animate-spin" />
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-12">
            <Folder size={48} className={`mx-auto mb-4 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} />
            <p className={`text-lg ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              No projects yet. Create your first project to get started!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.slice(0, 6).map((project, index) => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                whileHover={{ scale: 1.02 }}
                className={`${isDarkMode ? 'glass-dark-subtle' : 'glass-subtle'} p-5 rounded-xl shadow-glass text-left relative group cursor-pointer`}
                onClick={() => handleProjectClick(project.id)}
              >
                {/* Delete button - appears on hover */}
                <button
                  onClick={(e) => confirmDelete(project.id, e)}
                  className={`absolute top-3 right-3 p-2 rounded-lg transition-all opacity-0 group-hover:opacity-100 ${
                    isDarkMode ? 'hover:bg-red-500/20 text-gray-400 hover:text-red-500' : 'hover:bg-red-500/20 text-gray-600 hover:text-red-500'
                  }`}
                  title="Delete project"
                >
                  <Trash2 size={18} />
                </button>

                <h3 className={`text-lg font-semibold mb-2 pr-10 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {project.title}
                </h3>
                {project.description && (
                  <p className={`text-sm mb-3 line-clamp-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    {project.description}
                  </p>
                )}
                <div className="flex items-center space-x-4 text-xs">
                  <span className={`flex items-center space-x-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    <Clock size={12} />
                    <span>{format(new Date(project.updated_at), 'MMM d')}</span>
                  </span>
                  <span
                    className={`px-2 py-1 rounded ${
                      project.status === 'decided'
                        ? 'bg-green-500/20 text-green-400'
                        : project.status === 'exploring'
                        ? 'bg-blue-500/20 text-blue-400'
                        : 'bg-gray-500/20 text-gray-400'
                    }`}
                  >
                    {project.status}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && projectToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`${isDarkMode ? 'glass-dark' : 'glass'} rounded-2xl p-6 max-w-md w-full shadow-glass`}
          >
            <div className="flex items-start gap-4 mb-6">
              <div className="p-3 rounded-full bg-red-500/20">
                <Trash2 className="text-red-500" size={24} />
              </div>
              <div className="flex-1">
                <h3 className={`text-lg font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                  Delete Project
                </h3>
                <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  Are you sure you want to delete "{projects.find(p => p.id === projectToDelete)?.title}"? This action cannot be undone and will delete all associated conversations, messages, and data.
                </p>
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setProjectToDelete(null);
                }}
                disabled={deleting}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  isDarkMode
                    ? 'hover:bg-white/10 text-gray-300'
                    : 'hover:bg-gray-100 text-gray-700'
                } disabled:opacity-50`}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteProject}
                disabled={deleting}
                className="px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {deleting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-t-transparent border-white rounded-full animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={16} />
                    <span>Delete Project</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};
