import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useThemeStore } from '../store/themeStore';
import { useProjectStore } from '../store/projectStore';
import { Download, FileText, Table, FileJson, Package, AlertCircle } from 'lucide-react';
import { conversationsApi, documentsApi, agentsApi } from '../services/api';
import {
  exportToPDF,
  exportToExcel,
  exportToJSON,
  exportCompletePackage
} from '../utils/exportUtils';

export const ExportSystem: React.FC = () => {
  const { isDarkMode } = useThemeStore();
  const { currentProject } = useProjectStore();
  const [exporting, setExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const exportFormats = [
    {
      id: 'pdf',
      name: 'PDF Report',
      icon: FileText,
      description: 'Comprehensive project report',
      action: () => handleExportPDF()
    },
    {
      id: 'excel',
      name: 'Excel Spreadsheet',
      icon: Table,
      description: 'Decisions & activity log',
      action: () => handleExportExcel()
    },
    {
      id: 'json',
      name: 'JSON Data',
      icon: FileJson,
      description: 'Complete project data',
      action: () => handleExportJSON()
    },
    {
      id: 'package',
      name: 'Complete Package',
      icon: Package,
      description: 'All documents + data',
      action: () => handleExportCompletePackage()
    }
  ];

  const fetchExportData = async () => {
    if (!currentProject) {
      throw new Error('No project selected');
    }

    setExportStatus('Fetching project data...');

    // Fetch all related data
    const [messagesResponse, documentsResponse, agentActivityResponse] = await Promise.all([
      conversationsApi.getMessages(currentProject.id).catch(() => ({ success: true, messages: [] })),
      documentsApi.getByProject(currentProject.id).catch(() => ({ success: true, documents: [] })),
      agentsApi.getActivity(currentProject.id, 50).catch(() => ({ success: true, activity: [] })),
    ]);

    return {
      project: currentProject,
      messages: messagesResponse.messages || [],
      documents: documentsResponse.documents || [],
      agentActivities: agentActivityResponse.activity || [],
    };
  };

  const handleExportPDF = async () => {
    try {
      setExporting(true);
      setError(null);
      setExportStatus('Preparing PDF export...');

      const data = await fetchExportData();

      setExportStatus('Generating PDF...');
      await exportToPDF(data);

      setExportStatus('PDF exported successfully!');
      setTimeout(() => setExportStatus(''), 3000);
    } catch (err) {
      console.error('PDF export error:', err);
      setError(err instanceof Error ? err.message : 'Failed to export PDF');
    } finally {
      setExporting(false);
    }
  };

  const handleExportExcel = async () => {
    try {
      setExporting(true);
      setError(null);
      setExportStatus('Preparing Excel export...');

      const data = await fetchExportData();

      setExportStatus('Generating Excel file...');
      exportToExcel(data);

      setExportStatus('Excel exported successfully!');
      setTimeout(() => setExportStatus(''), 3000);
    } catch (err) {
      console.error('Excel export error:', err);
      setError(err instanceof Error ? err.message : 'Failed to export Excel');
    } finally {
      setExporting(false);
    }
  };

  const handleExportJSON = async () => {
    try {
      setExporting(true);
      setError(null);
      setExportStatus('Preparing JSON export...');

      const data = await fetchExportData();

      setExportStatus('Generating JSON file...');
      exportToJSON(data);

      setExportStatus('JSON exported successfully!');
      setTimeout(() => setExportStatus(''), 3000);
    } catch (err) {
      console.error('JSON export error:', err);
      setError(err instanceof Error ? err.message : 'Failed to export JSON');
    } finally {
      setExporting(false);
    }
  };

  const handleExportCompletePackage = async () => {
    try {
      setExporting(true);
      setError(null);
      setExportStatus('Preparing complete package...');

      const data = await fetchExportData();

      setExportStatus('Creating ZIP archive...');
      await exportCompletePackage(data);

      setExportStatus('Complete package exported successfully!');
      setTimeout(() => setExportStatus(''), 3000);
    } catch (err) {
      console.error('Complete package export error:', err);
      setError(err instanceof Error ? err.message : 'Failed to export complete package');
    } finally {
      setExporting(false);
    }
  };

  if (!currentProject) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`${isDarkMode ? 'glass-dark' : 'glass'} rounded-2xl p-6 shadow-glass`}
      >
        <div className="flex items-center space-x-3 text-yellow-500">
          <AlertCircle size={24} />
          <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            Please select a project to export
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`${isDarkMode ? 'glass-dark' : 'glass'} rounded-2xl p-6 shadow-glass`}
    >
      <div className="flex items-center space-x-3 mb-6">
        <Download className="text-green-metallic" size={24} />
        <div>
          <h3 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
            Export Project
          </h3>
          <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Download your project data in various formats
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {exportFormats.map((format) => {
          const Icon = format.icon;
          return (
            <button
              key={format.id}
              onClick={format.action}
              disabled={exporting}
              className={`p-4 rounded-xl border text-left transition-all ${
                isDarkMode
                  ? 'bg-white/5 border-white/10 hover:border-green-metallic/50'
                  : 'bg-white/50 border-white/30 hover:border-green-metallic/50'
              } disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg`}
            >
              <div className="flex items-start space-x-3">
                <div className={`w-10 h-10 rounded-lg ${
                  isDarkMode ? 'bg-white/10' : 'bg-gray-200'
                } flex items-center justify-center flex-shrink-0`}>
                  <Icon size={20} className="text-green-metallic" />
                </div>
                <div className="flex-1">
                  <h4 className={`font-semibold mb-1 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                    {format.name}
                  </h4>
                  <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {format.description}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Export Status */}
      {exporting && exportStatus && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 p-4 rounded-xl bg-green-metallic/20 border border-green-metallic/50"
        >
          <div className="flex items-center space-x-3">
            <div className="w-5 h-5 border-2 border-green-metallic border-t-transparent rounded-full animate-spin" />
            <span className={`text-sm font-medium ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
              {exportStatus}
            </span>
          </div>
        </motion.div>
      )}

      {/* Success Message */}
      {!exporting && exportStatus && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 p-4 rounded-xl bg-green-500/20 border border-green-500/50"
        >
          <div className="flex items-center space-x-3">
            <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <span className={`text-sm font-medium ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
              {exportStatus}
            </span>
          </div>
        </motion.div>
      )}

      {/* Error Message */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 p-4 rounded-xl bg-red-500/20 border border-red-500/50"
        >
          <div className="flex items-start space-x-3">
            <AlertCircle className="text-red-500 flex-shrink-0" size={20} />
            <div className="flex-1">
              <p className={`text-sm font-medium ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>
                Export Failed
              </p>
              <p className={`text-xs mt-1 ${isDarkMode ? 'text-red-300' : 'text-red-500'}`}>
                {error}
              </p>
            </div>
            <button
              onClick={() => setError(null)}
              className={`text-sm ${isDarkMode ? 'text-red-400 hover:text-red-300' : 'text-red-600 hover:text-red-700'}`}
            >
              Dismiss
            </button>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};
