import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'blog-images');
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export interface UploadResult {
  url: string;
  width: number;
  height: number;
}

export async function uploadLocal(file: any, customPath?: string): Promise<UploadResult> {
  // Validate file size
  const fileBuffer = file.buffer || await file.arrayBuffer();
  if (fileBuffer.byteLength > MAX_FILE_SIZE) {
    throw new Error('File size exceeds 5MB limit');
  }

  // Validate file type
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    throw new Error('Invalid file type. Only JPEG, PNG, WebP, and GIF are supported');
  }

  try {
    // Process image with Sharp
    const image = sharp(Buffer.from(fileBuffer));
    const metadata = await image.metadata();
    
    // Resize if too large while maintaining aspect ratio
    if (metadata.width && metadata.width > 1920) {
      image.resize(1920, undefined, {
        fit: 'inside',
        withoutEnlargement: true
      });
    }

    // Convert to WebP for better compression
    const processedBuffer = await image
      .webp({ quality: 80 })
      .toBuffer();

    // Determine file path and create necessary directories
    let filePath, urlPath;
    if (customPath) {
      const uploadDir = path.join(process.cwd(), 'public', 'uploads');
      filePath = path.join(uploadDir, customPath);
      // Create directory structure if it doesn't exist
      await mkdir(path.dirname(filePath), { recursive: true });
      urlPath = `/uploads/${customPath}`;
    } else {
      // Create default upload directory if it doesn't exist
      if (!existsSync(UPLOAD_DIR)) {
        await mkdir(UPLOAD_DIR, { recursive: true });
      }
      const filename = `${uuidv4()}.webp`;
      filePath = path.join(UPLOAD_DIR, filename);
      urlPath = `/uploads/blog-images/${filename}`;
    }
    
    // Save file
    await writeFile(filePath, processedBuffer);
    
    // Get final dimensions
    const finalMetadata = await sharp(processedBuffer).metadata();
    
    return {
      url: urlPath,
      width: finalMetadata.width || 0,
      height: finalMetadata.height || 0
    };
  } catch (error) {
    console.error('Error processing/saving image:', error);
    throw error;
  }
}
