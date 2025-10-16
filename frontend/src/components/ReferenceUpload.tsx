import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { useThemeStore } from '../store/themeStore';
import { useUserStore } from '../store/userStore';
import { useProjectStore } from '../store/projectStore';
import { Upload, File, Image, Video, X, CheckCircle, Loader2 } from 'lucide-react';
import { referencesApi } from '../services/api';

export const ReferenceUpload: React.FC = () => {
  const { isDarkMode } = useThemeStore();
  const { user } = useUserStore();
  const { currentProject } = useProjectStore();
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!currentProject) {
      alert('Please select a project first');
      return;
    }

    setUploading(true);
    const userId = user?.id || 'demo-user-123';

    for (const file of acceptedFiles) {
      try {
        const response = await referencesApi.upload(
          currentProject.id,
          userId,
          file
        );

        if (response.success) {
          setUploadedFiles(prev => [...prev, {
            id: response.reference.id,
            name: file.name,
            type: file.type,
            status: 'uploaded',
          }]);
        }
      } catch (error: any) {
        console.error('Upload failed:', error);
        const errorMsg = error.response?.data?.error || error.message || 'Upload failed';
        alert(`Failed to upload ${file.name}: ${errorMsg}`);
        setUploadedFiles(prev => [...prev, {
          id: Date.now().toString(),
          name: file.name,
          type: file.type,
          status: 'failed',
        }]);
      }
    }

    setUploading(false);
  }, [currentProject, user]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
      'video/*': ['.mp4', '.mov', '.avi', '.webm'],
      'application/pdf': ['.pdf'],
    },
    maxSize: 50 * 1024 * 1024, // 50MB
  });

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <Image size={20} />;
    if (type.startsWith('video/')) return <Video size={20} />;
    return <File size={20} />;
  };

  return (
    <div className="space-y-4">
      {/* Upload Zone */}
      <div
        {...getRootProps()}
        className={`${
          isDarkMode ? 'glass-dark' : 'glass'
        } rounded-2xl p-8 border-2 border-dashed transition-all cursor-pointer ${
          isDragActive
            ? 'border-green-metallic bg-green-metallic/10'
            : isDarkMode
            ? 'border-white/20 hover:border-green-metallic/50'
            : 'border-gray-300 hover:border-green-metallic/50'
        }`}
      >
        <input {...getInputProps()} />

        <div className="text-center">
          <div className={`w-16 h-16 mx-auto mb-4 rounded-full ${
            isDarkMode ? 'bg-white/10' : 'bg-gray-200'
          } flex items-center justify-center`}>
            <Upload size={32} className={isDragActive ? 'text-green-metallic' : isDarkMode ? 'text-gray-400' : 'text-gray-600'} />
          </div>

          {isDragActive ? (
            <p className={`text-lg font-medium ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
              Drop files here...
            </p>
          ) : (
            <>
              <p className={`text-lg font-medium mb-2 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                Drag & drop files here
              </p>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                or click to browse
              </p>
              <p className={`text-xs mt-4 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                Supported: Images, Videos, PDFs (max 50MB)
              </p>
            </>
          )}
        </div>
      </div>

      {/* Uploaded Files List */}
      {uploadedFiles.length > 0 && (
        <div className={`${isDarkMode ? 'glass-dark' : 'glass'} rounded-2xl p-6 shadow-glass`}>
          <h3 className={`text-lg font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
            Uploaded Files
          </h3>

          <div className="space-y-3">
            <AnimatePresence>
              {uploadedFiles.map((file) => (
                <motion.div
                  key={file.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className={`flex items-center space-x-3 p-3 rounded-xl ${
                    isDarkMode ? 'bg-white/5' : 'bg-white/50'
                  } border ${
                    isDarkMode ? 'border-white/10' : 'border-white/30'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-lg ${
                    isDarkMode ? 'bg-white/10' : 'bg-gray-200'
                  } flex items-center justify-center flex-shrink-0`}>
                    {getFileIcon(file.type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className={`font-medium truncate ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                      {file.name}
                    </p>
                    <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {file.status === 'uploaded' ? 'Analysis in progress...' : 'Upload failed'}
                    </p>
                  </div>

                  {file.status === 'uploaded' ? (
                    <CheckCircle size={20} className="text-green-500 flex-shrink-0" />
                  ) : (
                    <X size={20} className="text-red-500 flex-shrink-0" />
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Uploading Indicator */}
      {uploading && (
        <div className={`${isDarkMode ? 'glass-dark' : 'glass'} rounded-2xl p-4 shadow-glass`}>
          <div className="flex items-center space-x-3">
            <Loader2 size={20} className="text-green-metallic animate-spin" />
            <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Uploading files...
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
