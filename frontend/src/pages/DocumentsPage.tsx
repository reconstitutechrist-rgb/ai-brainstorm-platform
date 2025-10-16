import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useThemeStore } from '../store/themeStore';
import { useProjectStore } from '../store/projectStore';
import { FileText, CheckCircle, Clock, Archive, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';

export const DocumentsPage: React.FC = () => {
  const { isDarkMode } = useThemeStore();
  const { currentProject } = useProjectStore();
  const [selectedState, setSelectedState] = useState<'decided' | 'exploring' | 'parked'>('decided');

  if (!currentProject) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className={`${isDarkMode ? 'glass-dark' : 'glass'} rounded-3xl p-12 text-center shadow-glass`}>
          <FileText size={48} className={`mx-auto mb-4 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`} />
          <h2 className={`text-2xl font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
            No Project Selected
          </h2>
          <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Please select a project to view its documents
          </p>
        </div>
      </div>
    );
  }

  const items = currentProject.items || [];
  const decidedItems = items.filter(item => item.state === 'decided');
  const exploringItems = items.filter(item => item.state === 'exploring');
  const parkedItems = items.filter(item => item.state === 'parked');

  const currentItems = selectedState === 'decided' ? decidedItems :
                      selectedState === 'exploring' ? exploringItems :
                      parkedItems;

  const stateConfig = {
    decided: {
      icon: CheckCircle,
      color: 'text-green-400 bg-green-500/20',
      label: 'Decided',
      description: 'Confirmed decisions ready for implementation'
    },
    exploring: {
      icon: Clock,
      color: 'text-blue-400 bg-blue-500/20',
      label: 'Exploring',
      description: 'Ideas under active consideration'
    },
    parked: {
      icon: Archive,
      color: 'text-gray-400 bg-gray-500/20',
      label: 'Parked',
      description: 'Ideas saved for future consideration'
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`${isDarkMode ? 'glass-dark' : 'glass'} rounded-3xl p-8 mb-8 shadow-glass`}
      >
        <h1 className={`text-3xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
          {currentProject.title}
        </h1>
        <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          Project documentation and decision tracking
        </p>
      </motion.div>

      {/* State Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {Object.entries(stateConfig).map(([state, config], index) => {
          const Icon = config.icon;
          const count = state === 'decided' ? decidedItems.length :
                       state === 'exploring' ? exploringItems.length :
                       parkedItems.length;

          return (
            <motion.button
              key={state}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => setSelectedState(state as any)}
              className={`${
                selectedState === state
                  ? 'ring-2 ring-green-metallic'
                  : ''
              } ${isDarkMode ? 'glass-dark' : 'glass'} rounded-2xl p-6 shadow-glass hover:shadow-glass-hover transition-all text-left`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 rounded-xl ${config.color} flex items-center justify-center`}>
                  <Icon size={24} />
                </div>
                <ChevronRight
                  size={20}
                  className={selectedState === state ? 'text-green-metallic' : 'text-gray-400'}
                />
              </div>
              <h3 className={`text-2xl font-bold mb-1 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                {count}
              </h3>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {config.label}
              </p>
            </motion.button>
          );
        })}
      </div>

      {/* Items List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className={`${isDarkMode ? 'glass-dark' : 'glass'} rounded-3xl p-8 shadow-glass`}
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
              {stateConfig[selectedState].label} Items
            </h2>
            <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              {stateConfig[selectedState].description}
            </p>
          </div>
          <span className={`px-4 py-2 rounded-xl ${stateConfig[selectedState].color} font-medium`}>
            {currentItems.length} {currentItems.length === 1 ? 'item' : 'items'}
          </span>
        </div>

        {currentItems.length === 0 ? (
          <div className="text-center py-12">
            {React.createElement(stateConfig[selectedState].icon, {
              size: 48,
              className: `mx-auto mb-4 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`
            })}
            <p className={`text-lg ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              No {selectedState} items yet
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {currentItems.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`${
                  isDarkMode ? 'bg-white/5' : 'bg-white/50'
                } rounded-xl p-6 border ${
                  isDarkMode ? 'border-white/10' : 'border-white/30'
                } hover:border-green-metallic/50 transition-all`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className={`text-lg mb-3 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                      {item.text}
                    </p>

                    {item.citation && (
                      <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} space-y-1`}>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">User said:</span>
                          <span className="italic">"{item.citation.userQuote}"</span>
                        </div>
                        <div className="flex items-center space-x-4">
                          <span>
                            Recorded: {format(new Date(item.citation.timestamp), 'MMM d, yyyy h:mm a')}
                          </span>
                          <span className={`px-2 py-0.5 rounded ${
                            item.citation.confidence === 100
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-yellow-500/20 text-yellow-400'
                          }`}>
                            {item.citation.confidence}% confidence
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className={`ml-4 px-3 py-1 rounded-lg ${stateConfig[selectedState].color} text-sm font-medium`}>
                    {stateConfig[selectedState].label}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
};
