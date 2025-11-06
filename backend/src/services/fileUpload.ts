import { supabase } from './supabase';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs/promises';
import sharp from 'sharp';
import mammoth from 'mammoth';
import { PDFExtract } from 'pdf.js-extract';

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

  /**
   * Extract content from uploaded file
   * Returns extracted text for documents, base64 for images, or file path for videos
   */
  async extractContent(
    file: Express.Multer.File
  ): Promise<{ content: string; contentType: 'text' | 'image' | 'video'; mediaType?: string }> {
    const category = this.getFileCategory(file.mimetype);

    try {
      switch (category) {
        case 'image':
          // Convert image to base64 for Claude's vision API
          console.log(`[FileUpload] Converting image to base64: ${file.originalname}`);
          const imageBuffer = await fs.readFile(file.path);
          const base64Image = imageBuffer.toString('base64');
          console.log(`[FileUpload] Image converted to base64, size: ${base64Image.length} chars`);
          return {
            content: base64Image,
            contentType: 'image',
            mediaType: file.mimetype,
          };

        case 'video':
          // For videos, return path (video analysis would be a future feature)
          return {
            content: file.path,
            contentType: 'video',
          };

        case 'document':
          // Extract text from documents
          const extractedText = await this.extractTextFromDocument(file);
          return {
            content: extractedText,
            contentType: 'text',
          };

        default:
          throw new Error(`Unsupported file category: ${category}`);
      }
    } catch (error) {
      console.error('[FileUpload] Content extraction error:', error);
      throw error;
    }
  }

  /**
   * Extract text content from document files
   */
  private async extractTextFromDocument(file: Express.Multer.File): Promise<string> {
    const fileBuffer = await fs.readFile(file.path);

    try {
      // PDF extraction using pdf.js-extract
      if (file.mimetype === 'application/pdf') {
        console.log(`[FileUpload] Extracting text from PDF: ${file.originalname}`);
        const pdfExtract = new PDFExtract();
        const data = await pdfExtract.extractBuffer(fileBuffer);

        // Combine text from all pages
        const text = data.pages
          .map(page => page.content.map(item => item.str).join(' '))
          .join('\n\n');

        console.log(`[FileUpload] Extracted ${text.length} characters from PDF`);
        return text || `[PDF Document: ${file.originalname}]\n\nNo extractable text found in this PDF.`;
      }

      // Word document extraction using mammoth
      if (
        file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        file.mimetype === 'application/msword'
      ) {
        console.log(`[FileUpload] Extracting text from Word document: ${file.originalname}`);
        const result = await mammoth.extractRawText({ buffer: fileBuffer });
        const text = result.value;
        console.log(`[FileUpload] Extracted ${text.length} characters from Word document`);

        if (result.messages.length > 0) {
          console.log(`[FileUpload] Mammoth warnings:`, result.messages);
        }

        return text || `[Word Document: ${file.originalname}]\n\nNo extractable text found in this document.`;
      }

      // Plain text files
      if (file.mimetype === 'text/plain' || file.mimetype === 'text/markdown') {
        console.log(`[FileUpload] Reading text file: ${file.originalname}`);
        const text = fileBuffer.toString('utf-8');
        console.log(`[FileUpload] Read ${text.length} characters from text file`);
        return text;
      }

      // CSV files
      if (file.mimetype === 'text/csv') {
        console.log(`[FileUpload] Reading CSV file: ${file.originalname}`);
        const text = fileBuffer.toString('utf-8');
        console.log(`[FileUpload] Read ${text.length} characters from CSV file`);
        return text;
      }

      // For other document types (Excel, PowerPoint), return a placeholder
      console.log(`[FileUpload] Document type ${file.mimetype} not yet supported for text extraction`);
      return `[Document: ${file.originalname}]\n\nContent extraction for ${file.mimetype} files is not yet implemented. Supported formats: PDF, Word (.docx/.doc), Text, Markdown, CSV.`;
    } catch (error) {
      console.error(`[FileUpload] Text extraction error for ${file.originalname}:`, error);
      return `[Document: ${file.originalname}]\n\nError extracting text from this document. The file has been uploaded successfully but content analysis may be limited.`;
    }
  }
}
