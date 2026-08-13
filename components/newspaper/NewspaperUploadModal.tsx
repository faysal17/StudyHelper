'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { getPdfPageCount, zipImagesToPdf } from '@/lib/pdfMerge';
import { uploadNewspaperPdf, createNewspaperPdf } from '@/lib/newspaper';
import { getLogicalTodayDate } from '@/lib/spacedRepetition';
import { UploadCloud, AlertCircle, Loader2, FileArchive, FileText, X } from 'lucide-react';

interface NewspaperUploadModalProps {
  onSuccess: () => void;
  onClose: () => void;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function NewspaperUploadModal({ onSuccess, onClose }: NewspaperUploadModalProps) {
  const today = getLogicalTodayDate();

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingLabel, setProcessingLabel] = useState('');
  const [previewPageCount, setPreviewPageCount] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [mode, setMode] = useState<'day' | 'week'>('day');
  const [day, setDay] = useState(today.getDate());
  const [week, setWeek] = useState(1);

  // Merged/converted PDF file + its page count, ready to upload.
  const [preparedFile, setPreparedFile] = useState<File | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg('');
    setPreviewPageCount(null);
    setPreparedFile(null);
    setSelectedFile(file);

    const isZip = file.name.toLowerCase().endsWith('.zip') || file.type === 'application/zip';
    const isPdf = file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf';

    if (!isZip && !isPdf) {
      setErrorMsg('Please select a PDF file or a .zip of scanned page images.');
      setSelectedFile(null);
      return;
    }

    try {
      setIsProcessing(true);
      if (isZip) {
        setProcessingLabel('Merging images into a PDF...');
        const result = await zipImagesToPdf(file);
        setPreparedFile(result.file);
        setPreviewPageCount(result.pageCount);
      } else {
        setProcessingLabel('Reading PDF...');
        const pageCount = await getPdfPageCount(file);
        setPreparedFile(file);
        setPreviewPageCount(pageCount);
      }
    } catch (err: any) {
      console.error('Newspaper file processing failed:', err);
      setErrorMsg(err.message || 'Could not process this file.');
      setSelectedFile(null);
      setPreparedFile(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpload = async () => {
    if (!preparedFile || previewPageCount === null) return;

    try {
      setErrorMsg('');
      setIsUploading(true);

      const pdfUrl = await uploadNewspaperPdf(preparedFile);
      await createNewspaperPdf({
        title: selectedFile?.name || preparedFile.name,
        pdfUrl,
        pageCount: previewPageCount,
        year,
        month,
        week: mode === 'week' ? week : null,
        day: mode === 'day' ? day : null,
      });

      setIsUploading(false);
      onSuccess();
    } catch (err: any) {
      console.error('Newspaper upload failed:', err);
      setErrorMsg(err.message || 'Upload failed.');
      setIsUploading(false);
    }
  };

  const canUpload = Boolean(preparedFile) && !isProcessing && !isUploading;

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-2xl max-w-lg w-full mx-auto max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-300">
              <UploadCloud className="w-4.5 h-4.5" />
            </div>
            <h3 className="text-sm font-semibold text-zinc-100">Upload Newspaper Article</h3>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300">
            <X className="w-4 h-4" />
          </button>
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
              accept=".pdf,application/pdf,.zip,application/zip"
              onChange={handleFileChange}
              className="hidden"
            />
            {isProcessing ? (
              <div className="text-center space-y-2 py-4">
                <Loader2 className="w-6 h-6 animate-spin text-zinc-400 mx-auto" />
                <p className="text-xs text-zinc-300">{processingLabel}</p>
              </div>
            ) : selectedFile && previewPageCount !== null ? (
              <div className="text-center space-y-2">
                <FileText className="w-8 h-8 text-emerald-400 mx-auto" />
                <span className="text-xs text-zinc-300 font-medium block">{selectedFile.name}</span>
                <span className="text-[11px] text-zinc-500">
                  {previewPageCount} page{previewPageCount === 1 ? '' : 's'} ready to upload
                </span>
              </div>
            ) : (
              <div className="text-center space-y-2">
                <FileArchive className="w-8 h-8 text-zinc-500 group-hover:text-zinc-300 transition-colors mx-auto" />
                <p className="text-xs font-medium text-zinc-200">Click to select a PDF or a .zip of page images</p>
                <p className="text-[11px] text-zinc-500">Zipped images are merged into one PDF automatically</p>
              </div>
            )}
          </label>
        </div>

        <div className="space-y-3 mb-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-zinc-500 block mb-1">Year</label>
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-zinc-600"
              />
            </div>
            <div>
              <label className="text-[11px] text-zinc-500 block mb-1">Month</label>
              <select
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-zinc-600"
              >
                {MONTH_NAMES.map((name, idx) => (
                  <option key={name} value={idx + 1}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex bg-zinc-950 border border-zinc-800 rounded-lg p-1 text-xs">
            <button
              type="button"
              onClick={() => setMode('day')}
              className={`flex-1 py-1.5 rounded-md font-medium transition-colors ${
                mode === 'day' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Day
            </button>
            <button
              type="button"
              onClick={() => setMode('week')}
              className={`flex-1 py-1.5 rounded-md font-medium transition-colors ${
                mode === 'week' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Week
            </button>
          </div>

          {mode === 'day' ? (
            <div>
              <label className="text-[11px] text-zinc-500 block mb-1">Day</label>
              <input
                type="number"
                min={1}
                max={31}
                value={day}
                onChange={(e) => setDay(Number(e.target.value))}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-zinc-600"
              />
            </div>
          ) : (
            <div>
              <label className="text-[11px] text-zinc-500 block mb-1">Week</label>
              <select
                value={week}
                onChange={(e) => setWeek(Number(e.target.value))}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-zinc-600"
              >
                {[1, 2, 3, 4].map((w) => (
                  <option key={w} value={w}>
                    Week {w}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {isUploading && (
          <div className="mb-4 p-3 bg-zinc-950 rounded-lg border border-zinc-800 text-xs text-zinc-300 flex items-center space-x-3">
            <Loader2 className="w-4 h-4 animate-spin text-zinc-400 shrink-0" />
            <span>Uploading to Cloudflare R2...</span>
          </div>
        )}

        <div className="flex justify-end space-x-3 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={!canUpload}
            className="px-4 py-2 bg-zinc-100 text-zinc-950 font-semibold rounded-lg text-xs hover:bg-zinc-200 transition-all shadow-sm disabled:opacity-40 flex items-center space-x-2"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Upload</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
