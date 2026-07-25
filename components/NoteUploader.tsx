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

      // 1. Compress Image using browser-image-compression with required settings
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

      // 2. Upload to Supabase Storage bucket 'scanned-notes'
      const publicUrl = await uploadNoteImage(compressedFile);

      // 3. Save Note row in DB
      const note = await createNote(taskId, publicUrl);

      setIsUploading(false);

      if (onSuccess) {
        onSuccess(note.id);
      } else {
        router.push(`/notes/${note.id}/occlude`);
      }
    } catch (err: any) {
      console.error('Note upload failed:', err);
      setErrorMsg(err.message || 'নোট আপলোড বা কম্প্রেশনে ব্যর্থ হয়েছে।');
      setIsCompressing(false);
      setIsUploading(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-700/80 rounded-2xl p-6 shadow-2xl max-w-lg w-full mx-auto">
      <div className="flex items-center space-x-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
          <UploadCloud className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-100">হ্যান্ডরাইটিং নোট আপলোড</h3>
          <p className="text-xs text-slate-400 line-clamp-1">{taskTitle}</p>
        </div>
      </div>

      {errorMsg && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400 flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* File Dropzone */}
      <div className="mb-4">
        <label className="border-2 border-dashed border-slate-700 hover:border-emerald-500/60 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition-colors bg-slate-950/60 group">
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
                className="max-h-48 max-w-full rounded-lg object-contain border border-slate-800 shadow-md mx-auto"
              />
              <span className="text-xs text-emerald-400 font-medium block">
                ছবি সিলেক্ট হয়েছে ({selectedFile?.name})
              </span>
            </div>
          ) : (
            <div className="text-center space-y-2">
              <ImageIcon className="w-10 h-10 text-slate-500 group-hover:text-emerald-400 transition-colors mx-auto" />
              <p className="text-sm font-semibold text-slate-200">
                স্ক্যানকৃত নোট নির্বাচন করতে ক্লিক করুন
              </p>
              <p className="text-xs text-slate-400">
                JPEG, PNG, বা WebP (স্বয়ংক্রিয়ভাবে &lt;300KB WebP ফরম্যাটে কম্প্রেস হবে)
              </p>
            </div>
          )}
        </label>
      </div>

      {/* Compression Stats Badge */}
      {compressionStats && (
        <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-400 flex items-center justify-between">
          <div className="flex items-center space-x-1.5">
            <FileCheck className="w-4 h-4" />
            <span>সফলভাবে কম্প্রেস সম্পন্ন</span>
          </div>
          <div className="font-mono">
            {compressionStats.originalSizeMB} MB &rarr; <strong>{compressionStats.compressedSizeMB} MB</strong> (WebP)
          </div>
        </div>
      )}

      {/* Status / Loading details */}
      {(isCompressing || isUploading) && (
        <div className="mb-4 p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-300 flex items-center space-x-3">
          <Loader2 className="w-4 h-4 animate-spin text-emerald-400 shrink-0" />
          <span>
            {isCompressing
              ? 'WebP কম্প্রেশন চলছে (max 0.3MB, 1920px)...'
              : 'Supabase Storage (scanned-notes) এ আপলোড হচ্ছে...'}
          </span>
        </div>
      )}

      {/* Buttons */}
      <div className="flex justify-end space-x-3 pt-2">
        {onClose && (
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition-colors"
          >
            বাতিল
          </button>
        )}
        <button
          onClick={handleUpload}
          disabled={!selectedFile || isCompressing || isUploading}
          className="px-5 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold rounded-xl text-xs hover:from-emerald-400 hover:to-teal-400 transition-all shadow-md shadow-emerald-500/20 disabled:opacity-40 flex items-center space-x-2"
        >
          <UploadCloud className="w-4 h-4" />
          <span>কম্প্রেস ও আপলোড করুন</span>
        </button>
      </div>
    </div>
  );
}
