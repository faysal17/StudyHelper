'use client';

import { useState } from 'react';
import { compressHandwrittenNote } from '@/lib/imageCompression';
import { uploadNoteImage, createNote } from '@/lib/supabase';
import { UploadCloud, FileCheck, AlertCircle, Loader2, Image as ImageIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface NoteUploaderProps {
  taskId: string;
  taskTitle: string;
  onSuccess?: (noteId: string) => void;
  onClose?: () => void;
}

export default function NoteUploader({ taskId, taskTitle, onSuccess, onClose }: NoteUploaderProps) {
  const router = useRouter();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [compressionStats, setCompressionStats] = useState<{
    originalSizeMB: string;
    compressedSizeMB: string;
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setCompressionStats(null);
      setErrorMsg('');
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      setIsCompressing(true);
      setErrorMsg('');

      const originalSize = (selectedFile.size / (1024 * 1024)).toFixed(2);

      const compressedFile = await compressHandwrittenNote(selectedFile, {
        maxSizeMB: 0.3,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
        fileType: 'image/webp',
      });

      const compressedSize = (compressedFile.size / (1024 * 1024)).toFixed(2);
      setCompressionStats({
        originalSizeMB: originalSize,
        compressedSizeMB: compressedSize,
      });

      setIsCompressing(false);
      setIsUploading(true);

      const publicUrl = await uploadNoteImage(compressedFile);
      const note = await createNote(taskId, publicUrl);

      setIsUploading(false);

      if (onSuccess) {
        onSuccess(note.id);
      } else {
        router.push(`/notes/${note.id}/occlude`);
      }
    } catch (err: any) {
      console.error('Note upload failed:', err);
      setErrorMsg(err.message || 'Note compression or upload failed.');
      setIsCompressing(false);
      setIsUploading(false);
    }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-2xl max-w-lg w-full mx-auto">
      <div className="flex items-center space-x-3 mb-4">
        <div className="w-9 h-9 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-300">
          <UploadCloud className="w-4.5 h-4.5" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-zinc-100">Upload Handwritten Note</h3>
          <p className="text-xs text-zinc-400 line-clamp-1">{taskTitle}</p>
        </div>
      </div>

      {errorMsg && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400 flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="mb-4">
        <label className="border border-dashed border-zinc-700 hover:border-zinc-500 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition-colors bg-zinc-950/60 group">
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
          {previewUrl ? (
            <div className="text-center space-y-2">
              <img
                src={previewUrl}
                alt="Scan preview"
                className="max-h-48 max-w-full rounded-lg object-contain border border-zinc-800 shadow-md mx-auto"
              />
              <span className="text-xs text-zinc-300 font-medium block">
                Selected: {selectedFile?.name}
              </span>
            </div>
          ) : (
            <div className="text-center space-y-2">
              <ImageIcon className="w-8 h-8 text-zinc-500 group-hover:text-zinc-300 transition-colors mx-auto" />
              <p className="text-xs font-medium text-zinc-200">
                Click to select handwritten note image
              </p>
              <p className="text-[11px] text-zinc-500">
                JPEG, PNG, or WebP (compressed to &lt;300KB WebP automatically)
              </p>
            </div>
          )}
        </label>
      </div>

      {compressionStats && (
        <div className="mb-4 p-3 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-300 flex items-center justify-between">
          <div className="flex items-center space-x-1.5">
            <FileCheck className="w-4 h-4 text-emerald-400" />
            <span>Compressed</span>
          </div>
          <div className="font-mono text-[11px]">
            {compressionStats.originalSizeMB} MB &rarr; <strong>{compressionStats.compressedSizeMB} MB</strong> (WebP)
          </div>
        </div>
      )}

      {(isCompressing || isUploading) && (
        <div className="mb-4 p-3 bg-zinc-950 rounded-lg border border-zinc-800 text-xs text-zinc-300 flex items-center space-x-3">
          <Loader2 className="w-4 h-4 animate-spin text-zinc-400 shrink-0" />
          <span>
            {isCompressing
              ? 'Compressing handwritten note to WebP...'
              : 'Uploading to Supabase Storage bucket (scanned-notes)...'}
          </span>
        </div>
      )}

      <div className="flex justify-end space-x-3 pt-2">
        {onClose && (
          <button
            onClick={onClose}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs font-medium transition-colors"
          >
            Cancel
          </button>
        )}
        <button
          onClick={handleUpload}
          disabled={!selectedFile || isCompressing || isUploading}
          className="px-4 py-2 bg-zinc-100 text-zinc-950 font-semibold rounded-lg text-xs hover:bg-zinc-200 transition-all shadow-sm disabled:opacity-40 flex items-center space-x-2"
        >
          <UploadCloud className="w-3.5 h-3.5" />
          <span>Compress & Upload</span>
        </button>
      </div>
    </div>
  );
}
