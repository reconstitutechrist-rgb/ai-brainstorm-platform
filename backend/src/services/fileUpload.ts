import { supabase } from './supabase';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs/promises';
import sharp from 'sharp';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

const ALLOWED_MIME_TYPES = {
  image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp'],
  video: ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm'],
  document: [
    'application/pdf',
    'text/plain',
    'text/markdown',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/csv',
  ],
};

// Configure multer for temporary file storage
export const upload = multer({
  dest: '/tmp/uploads/',
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
  fileFilter: (req, file, cb) => {
    const allAllowedTypes = [
      ...ALLOWED_MIME_TYPES.image,
      ...ALLOWED_MIME_TYPES.video,
      ...ALLOWED_MIME_TYPES.document,
    ];

    if (allAllowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  },
});

export class FileUploadService {
  /**
   * Upload file to Supabase Storage
   */
  async uploadToStorage(
    file: Express.Multer.File,
    userId: string,
    projectId: string,
    bucketName: string = 'references'  // Default to 'references' for backwards compatibility
  ): Promise<{ url: string; path: string }> {
    try {
      // Generate unique filename
      const fileExt = path.extname(file.originalname);
      const fileName = `${uuidv4()}${fileExt}`;
      const filePath = `${userId}/${projectId}/${fileName}`;

      // Read file buffer
      let fileBuffer = await fs.readFile(file.path);

      // Compress images if needed
      if (this.getFileCategory(file.mimetype) === 'image') {
        fileBuffer = await this.compressImage(fileBuffer);
      }

      // Upload to Supabase Storage
      const { error } = await supabase.storage
        .from(bucketName)
        .upload(filePath, fileBuffer, {
          contentType: file.mimetype,
          upsert: false,
        });

      if (error) {
        throw error;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath);

      // Clean up temporary file
      await fs.unlink(file.path);

      return {
        url: urlData.publicUrl,
        path: filePath,
      };
    } catch (error) {
      console.error('File upload error:', error);
      throw new Error('Failed to upload file');
    }
  }

  /**
   * Compress image to reduce storage size
   */
  private async compressImage(buffer: Buffer): Promise<Buffer> {
    try {
      return await sharp(buffer)
        .resize(2000, 2000, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .jpeg({ quality: 85 })
        .toBuffer();
    } catch (error) {
      console.error('Image compression error:', error);
      return buffer; // Return original if compression fails
    }
  }

  /**
   * Delete file from storage
   */
  async deleteFromStorage(filePath: string, bucketName: string = 'references'): Promise<void> {
    try {
      const { error } = await supabase.storage
        .from(bucketName)
        .remove([filePath]);

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('File deletion error:', error);
      throw new Error('Failed to delete file');
    }
  }

  /**
   * Get file category from MIME type
   */
  getFileCategory(mimeType: string): 'image' | 'video' | 'document' | 'unknown' {
    if (ALLOWED_MIME_TYPES.image.includes(mimeType)) return 'image';
    if (ALLOWED_MIME_TYPES.video.includes(mimeType)) return 'video';
    if (ALLOWED_MIME_TYPES.document.includes(mimeType)) return 'document';
    return 'unknown';
  }

  /**
   * Validate file type
   */
  isValidFileType(mimeType: string): boolean {
    const allAllowedTypes = [
      ...ALLOWED_MIME_TYPES.image,
      ...ALLOWED_MIME_TYPES.video,
      ...ALLOWED_MIME_TYPES.document,
    ];
    return allAllowedTypes.includes(mimeType);
  }
}