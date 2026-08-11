'use client';

import { useState, useEffect } from 'react';
import { compressHandwrittenNote } from '@/lib/imageCompression';
import { convertPdfToImageFile } from '@/lib/pdfToImage';
import { uploadNoteImage, createNote } from '@/lib/supabase';
import { UploadCloud, FileCheck, AlertCircle, Loader2, Image as ImageIcon, FileText } from 'lucide-react';
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
  const [isConvertingHeic, setIsConvertingHeic] = useState(false);
  const [isConvertingPdf, setIsConvertingPdf] = useState(false);
  const [pdfPageCount, setPdfPageCount] = useState<number | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [compressionStats, setCompressionStats] = useState<{
    originalSizeMB: string;
    compressedSizeMB: string;
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Lock background scroll while this modal is open — otherwise the page
  // behind it can still scroll, and on mobile browsers the address bar
  // collapsing/expanding as you scroll it can make the fixed backdrop
  // appear to leave a gap instead of covering the full page.
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      let file = e.target.files[0];
      setErrorMsg('');
      setCompressionStats(null);
      setPdfPageCount(null);

      const isHeic =
        file.name.toLowerCase().endsWith('.heic') ||
        file.name.toLowerCase().endsWith('.heif') ||
        file.type === 'image/heic' ||
        file.type === 'image/heif';

      const isPdf = file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf';

      if (isPdf) {
        try {
          setIsConvertingPdf(true);
          const result = await convertPdfToImageFile(file);
          file = result.file;
          setPdfPageCount(result.pageCount);
        } catch (err: any) {
          console.error('PDF conversion failed:', err);
          setErrorMsg(err.message || 'Could not convert this PDF to an image. Please try a different file.');
          setIsConvertingPdf(false);
          return;
        } finally {
          setIsConvertingPdf(false);
        }
      } else if (isHeic) {
        try {
          setIsConvertingHeic(true);
          const heic2any = (await import('heic2any')).default;
          const resultBlob = await heic2any({
            blob: file,
            toType: 'image/jpeg',
            quality: 0.85,
          });

          const convertedBlob = Array.isArray(resultBlob) ? resultBlob[0] : resultBlob;
          const newName = file.name.replace(/\.(heic|heif)$/i, '.jpg');
          file = new File([convertedBlob], newName, { type: 'image/jpeg' });
        } catch (err: any) {
          console.error('HEIC conversion failed:', err);
          setErrorMsg('HEIC conversion failed. Please try a JPEG or PNG file.');
          setIsConvertingHeic(false);
          return;
        } finally {
          setIsConvertingHeic(false);
        }
      }

      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      setIsCompressing(true);
      setErrorMsg('');

      const originalSize = (selectedFile.size / (1024 * 1024)).toFixed(2);

      const isFromPdf = pdfPageCount !== null;
      const compressedFile = await compressHandwrittenNote(selectedFile, {
        // PDF pages are rendered text, not a coarse handwriting photo — the
        // same 300KB budget that's fine for a phone snapshot forces heavy
        // WebP quality loss on small print, so give PDFs a much bigger
        // ceiling to keep the text legible.
        maxSizeMB: isFromPdf ? 6 : 0.3,
        // convertPdfToImageFile already sizes the stitched image (capping
        // its own total height for very long documents) to keep per-page
        // text legible. Re-applying a maxWidthOrHeight cap here constrains
        // whichever side is longest — for a multi-page stitch that's
        // always the height, so it was scaling width down proportionally
        // too (an 11-page note ended up 226px wide). Only cap it for
        // regular photos; let PDFs keep the dimensions already chosen.
        maxWidthOrHeight: isFromPdf ? undefined : 1920,
        // Let quality flex to hit the byte budget instead of silently
        // shrinking dimensions further when a long multi-page doc doesn't
        // fit under maxSizeMB — a bigger file beats illegible text.
        alwaysKeepResolution: isFromPdf,
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
            accept="image/*,.heic,.heif,image/heic,image/heif,.pdf,application/pdf"
            onChange={handleFileChange}
            className="hidden"
          />
          {isConvertingPdf ? (
            <div className="text-center space-y-2 py-4">
              <Loader2 className="w-6 h-6 animate-spin text-zinc-400 mx-auto" />
              <p className="text-xs text-zinc-300">Converting PDF pages to an image...</p>
            </div>
          ) : isConvertingHeic ? (
            <div className="text-center space-y-2 py-4">
              <Loader2 className="w-6 h-6 animate-spin text-zinc-400 mx-auto" />
              <p className="text-xs text-zinc-300">Converting Apple HEIC image to JPEG...</p>
            </div>
          ) : previewUrl ? (
            <div className="text-center space-y-2">
              <img
                src={previewUrl}
                alt="Scan preview"
                className="max-h-48 max-w-full rounded-lg object-contain border border-zinc-800 shadow-md mx-auto"
              />
              <span className="text-xs text-zinc-300 font-medium block">
                Selected: {selectedFile?.name}
              </span>
              {pdfPageCount !== null && (
                <span className="text-[11px] text-zinc-500 flex items-center justify-center space-x-1">
                  <FileText className="w-3 h-3" />
                  <span>
                    Converted {pdfPageCount} PDF page{pdfPageCount === 1 ? '' : 's'} into one stitched image
                  </span>
                </span>
              )}
            </div>
          ) : (
            <div className="text-center space-y-2">
              <ImageIcon className="w-8 h-8 text-zinc-500 group-hover:text-zinc-300 transition-colors mx-auto" />
              <p className="text-xs font-medium text-zinc-200">
                Click to select handwritten note image or PDF
              </p>
              <p className="text-[11px] text-zinc-500">
                HEIC, JPEG, PNG, WebP, or PDF (auto-compressed to WebP)
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
          disabled={!selectedFile || isConvertingHeic || isConvertingPdf || isCompressing || isUploading}
          className="px-4 py-2 bg-zinc-100 text-zinc-950 font-semibold rounded-lg text-xs hover:bg-zinc-200 transition-all shadow-sm disabled:opacity-40 flex items-center space-x-2"
        >
          <UploadCloud className="w-3.5 h-3.5" />
          <span>Compress & Upload</span>
        </button>
      </div>
    </div>
  );
}
