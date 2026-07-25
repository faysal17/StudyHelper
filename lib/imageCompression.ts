import imageCompression from 'browser-image-compression';

export interface CompressionOptions {
  maxSizeMB?: number;
  maxWidthOrHeight?: number;
  useWebWorker?: boolean;
  fileType?: string;
}

export async function compressHandwrittenNote(
  imageFile: File,
  customOptions?: CompressionOptions
): Promise<File> {
  const defaultOptions = {
    maxSizeMB: 0.3,
    maxWidthOrHeight: 1920,
    useWebWorker: true,
    fileType: 'image/webp',
  };

  const options = { ...defaultOptions, ...customOptions };

  try {
    const compressedFile = await imageCompression(imageFile, options);
    return compressedFile;
  } catch (error) {
    console.error('Image compression failed, returning original file:', error);
    return imageFile;
  }
}
