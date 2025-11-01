import React from 'react';
import { motion } from 'framer-motion';
import { FileText, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useThemeStore } from '../store/themeStore';

interface TemplateAnalysisResultsProps {
  templateAnalysis: {
    templateInfo: {
      id: string;
      name: string;
      type: string;
    };
    outputFormat: string;
    structuredData: any;
    result: string;
  };
  onClose?: () => void;
}

export const TemplateAnalysisResults: React.FC<TemplateAnalysisResultsProps> = ({
  templateAnalysis,
  onClose,
}) => {
  const { isDarkMode } = useThemeStore();

  const renderStructuredData = () => {
    if (!templateAnalysis.structuredData) {
      return null;
    }

    const data = templateAnalysis.structuredData;

    return (
      <div className="space-y-4">
        {Object.entries(data).map(([key, value]) => (
          <div key={key} className={`p-4 rounded-lg ${isDarkMode ? 'bg-white/5' : 'bg-gray-50'}`}>
            <h4 className={`font-semibold mb-2 capitalize ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              {key.replace(/_/g, ' ')}
            </h4>
            {Array.isArray(value) ? (
              <ul className={`list-disc list-inside space-y-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                {value.map((item, idx) => (
                  <li key={idx} className="text-sm">
                    {typeof item === 'object' ? JSON.stringify(item) : String(item)}
                  </li>
                ))}
              </ul>
            ) : typeof value === 'object' ? (
              <div className="overflow-x-auto">
                <table
                  className={`min-w-full text-sm ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}
                >
                  <tbody>
                    {Object.entries(value as Record<string, any>).map(([subKey, subValue]) => (
                      <tr key={subKey} className={isDarkMode ? 'border-white/10' : 'border-gray-200'}>
                        <td className="font-medium py-2 pr-4">{subKey}:</td>
                        <td className="py-2">{String(subValue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                {String(value)}
              </p>
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderMarkdown = () => {
    return (
      <div
        className={`prose prose-sm max-w-none ${
          isDarkMode ? 'prose-invert' : ''
        }`}
      >
        <ReactMarkdown>{templateAnalysis.result}</ReactMarkdown>
      </div>
    );
  };

  const renderContent = () => {
    switch (templateAnalysis.outputFormat) {
      case 'structured_json':
        return templateAnalysis.structuredData ? (
          <>
            <h4 className={`font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Structured Data
            </h4>
            {renderStructuredData()}
            <div className="mt-6 pt-6 border-t border-[#00d4ff]/20">
              <h4 className={`font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Full Analysis
              </h4>
              {renderMarkdown()}
            </div>
          </>
        ) : (
          renderMarkdown()
        );
      case 'markdown':
        return renderMarkdown();
      case 'table':
        return renderStructuredData() || renderMarkdown();
      default:
        return (
          <pre
            className={`p-4 rounded-lg overflow-x-auto text-sm ${
              isDarkMode ? 'bg-black/40 text-gray-300' : 'bg-gray-50 text-gray-800'
            }`}
          >
            {templateAnalysis.result}
          </pre>
        );
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`${isDarkMode ? 'glass-dark' : 'glass'} rounded-xl p-6 space-y-6`}
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-[#00d4ff]/20">
        <div className="flex items-center space-x-3">
          <FileText className="text-[#00d4ff]" size={24} />
          <div>
            <h3 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              {templateAnalysis.templateInfo.name}
            </h3>
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Template Type: {templateAnalysis.templateInfo.type} • Format: {templateAnalysis.outputFormat}
            </p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors ${
              isDarkMode
                ? 'hover:bg-white/10 text-gray-400 hover:text-white'
                : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
            }`}
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Content */}
      <div className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>
        {renderContent()}
      </div>

      {/* Footer Info */}
      <div
        className={`mt-6 pt-4 border-t border-[#00d4ff]/20 text-xs ${
          isDarkMode ? 'text-gray-400' : 'text-gray-600'
        }`}
      >
        <p>
          Analysis completed using <span className="font-semibold">{templateAnalysis.templateInfo.name}</span>{' '}
          template. Structured data extracted based on template-specific fields and extraction hints.
        </p>
      </div>
    </motion.div>
  );
};
