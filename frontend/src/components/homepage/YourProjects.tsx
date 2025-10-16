import React from 'react';
import { motion } from 'framer-motion';
import { FolderOpen, Clock, ArrowRight } from 'lucide-react';
import { useThemeStore } from '../../store/themeStore';
import { useProjectStore } from '../../store/projectStore';
import { useNavigate } from 'react-router-dom';

export const YourProjects: React.FC = () => {
  const { isDarkMode } = useThemeStore();
  const { projects } = useProjectStore();
  const navigate = useNavigate();

  // Show only the 3 most recent projects
  const recentProjects = projects
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 3);

  if (recentProjects.length === 0) {
    return null;
  }

  return (
    <section className="py-24 px-6">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className={`text-4xl md:text-5xl font-bold mb-4 ${
            isDarkMode ? 'text-white' : 'text-white'
          }`}>
            Your <span className="text-gradient">Recent Projects</span>
          </h2>
          <p className={`text-xl ${isDarkMode ? 'text-gray-300' : 'text-gray-200'}`}>
            Pick up where you left off
          </p>
        </motion.div>

        {/* Projects Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {recentProjects.map((project, index) => (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              onClick={() => navigate(`/`)}
              className="glass-card p-6 cursor-pointer group"
            >
              {/* Project Icon */}
              <div className="flex justify-start mb-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110"
                  style={{
                    background: 'linear-gradient(135deg, #00ffaa 0%, #1affcc 100%)',
                    boxShadow: '0 4px 15px rgba(0, 255, 170, 0.3)',
                  }}
                >
                  <FolderOpen size={24} color="#0a1f1a" strokeWidth={2} />
                </div>
              </div>

              {/* Project Name */}
              <h3 className={`text-xl font-bold mb-2 ${
                isDarkMode ? 'text-white' : 'text-white'
              }`}>
                {project.title}
              </h3>

              {/* Project Description */}
              {project.description && (
                <p className={`text-sm mb-4 line-clamp-2 ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-200'
                }`}>
                  {project.description}
                </p>
              )}

              {/* Last Updated */}
              <div className={`flex items-center gap-2 text-sm ${
                isDarkMode ? 'text-gray-400' : 'text-gray-300'
              }`}>
                <Clock size={14} />
                <span>
                  {new Date(project.updated_at).toLocaleDateString()}
                </span>
              </div>

              {/* Hover Arrow */}
              <div className={`flex items-center gap-2 text-green-metallic mt-4 group-hover:gap-4 transition-all ${
                isDarkMode ? 'opacity-80' : 'opacity-90'
              }`}>
                <span className="font-medium text-sm">Open Project</span>
                <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
              </div>
            </motion.div>
          ))}
        </div>

        {/* View All Button */}
        {projects.length > 3 && (
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
            className="text-center"
          >
            <button
              onClick={() => navigate('/')}
              className="btn-metallic-secondary inline-flex items-center gap-3"
            >
              <span>View All Projects</span>
              <ArrowRight size={20} />
            </button>
          </motion.div>
        )}
      </div>
    </section>
  );
};
