import React from 'react';
import { motion } from 'framer-motion';
import { useThemeStore } from '../store/themeStore';
import { Settings, Moon, Sun, Bell, Shield, Database, Zap } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { isDarkMode, toggleDarkMode } = useThemeStore();

  const settingsSections = [
    {
      title: 'Appearance',
      icon: isDarkMode ? Moon : Sun,
      settings: [
        {
          id: 'theme',
          label: 'Dark Mode',
          description: 'Toggle dark mode theme',
          type: 'toggle',
          value: isDarkMode,
          onChange: toggleDarkMode,
        },
      ],
    },
    {
      title: 'Notifications',
      icon: Bell,
      settings: [
        {
          id: 'agent-notifications',
          label: 'Agent Activity',
          description: 'Get notified when agents complete tasks',
          type: 'toggle',
          value: true,
          onChange: () => {},
        },
        {
          id: 'project-updates',
          label: 'Project Updates',
          description: 'Receive updates about your projects',
          type: 'toggle',
          value: true,
          onChange: () => {},
        },
      ],
    },
    {
      title: 'Privacy & Security',
      icon: Shield,
      settings: [
        {
          id: 'data-retention',
          label: 'Data Retention',
          description: 'Automatically delete old conversations',
          type: 'select',
          value: 'never',
          options: [
            { value: 'never', label: 'Never' },
            { value: '30days', label: '30 days' },
            { value: '90days', label: '90 days' },
            { value: '1year', label: '1 year' },
          ],
        },
      ],
    },
    {
      title: 'Agent Behavior',
      icon: Zap,
      settings: [
        {
          id: 'accuracy-mode',
          label: 'Maximum Accuracy Mode',
          description: 'Zero tolerance for assumptions (recommended)',
          type: 'toggle',
          value: true,
          onChange: () => {},
        },
        {
          id: 'proactive-questions',
          label: 'Proactive Questions',
          description: 'Allow agents to ask clarifying questions',
          type: 'toggle',
          value: true,
          onChange: () => {},
        },
      ],
    },
  ];

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`${isDarkMode ? 'glass-dark' : 'glass'} rounded-3xl p-8 mb-8 shadow-glass`}
      >
        <div className="flex items-center space-x-3 mb-2">
          <Settings className="text-green-metallic" size={32} />
          <h1 className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
            Settings
          </h1>
        </div>
        <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          Customize your AI Brainstorm Platform experience
        </p>
      </motion.div>

      {/* Settings Sections */}
      <div className="space-y-6">
        {settingsSections.map((section, sectionIndex) => {
          const Icon = section.icon;

          return (
            <motion.div
              key={section.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: sectionIndex * 0.1 }}
              className={`${isDarkMode ? 'glass-dark' : 'glass'} rounded-2xl p-6 shadow-glass`}
            >
              {/* Section Header */}
              <div className="flex items-center space-x-3 mb-6 pb-4 border-b border-green-metallic/20">
                <div className="w-10 h-10 rounded-xl bg-green-metallic/20 flex items-center justify-center">
                  <Icon size={20} className="text-green-metallic" />
                </div>
                <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                  {section.title}
                </h2>
              </div>

              {/* Settings Items */}
              <div className="space-y-4">
                {section.settings.map((setting) => (
                  <div key={setting.id} className="flex items-center justify-between">
                    <div className="flex-1">
                      <label
                        htmlFor={setting.id}
                        className={`block font-medium mb-1 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}
                      >
                        {setting.label}
                      </label>
                      <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        {setting.description}
                      </p>
                    </div>

                    {setting.type === 'toggle' && (
                      <button
                        onClick={setting.onChange}
                        className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                          setting.value ? 'bg-green-metallic' : 'bg-gray-300'
                        }`}
                      >
                        <span
                          className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                            setting.value ? 'translate-x-7' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    )}

                    {setting.type === 'select' && setting.options && (
                      <select
                        id={setting.id}
                        value={setting.value}
                        className={`px-4 py-2 rounded-xl ${
                          isDarkMode
                            ? 'bg-white/10 text-white border-white/20'
                            : 'bg-white text-gray-800 border-gray-300'
                        } border focus:outline-none focus:ring-2 focus:ring-green-metallic/50`}
                      >
                        {setting.options.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Account Info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className={`${isDarkMode ? 'glass-dark' : 'glass'} rounded-2xl p-6 shadow-glass mt-6`}
      >
        <div className="flex items-center space-x-3 mb-4">
          <Database className="text-green-metallic" size={20} />
          <h3 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
            System Information
          </h3>
        </div>
        <div className={`space-y-2 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          <div className="flex justify-between">
            <span>Version:</span>
            <span className="font-mono">1.0.0</span>
          </div>
          <div className="flex justify-between">
            <span>Active Agents:</span>
            <span className="font-mono">18/18</span>
          </div>
          <div className="flex justify-between">
            <span>Backend Status:</span>
            <span className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              <span>Connected</span>
            </span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
