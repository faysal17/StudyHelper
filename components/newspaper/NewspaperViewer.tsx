'use client';

import { useEffect, useRef, useState } from 'react';
import { getNewspaperPdfWithPages, togglePageRead, updatePageComment } from '@/lib/newspaper';
import { NewspaperPdf, NewspaperPage } from '@/lib/types';
import { ArrowLeft, ChevronLeft, ChevronRight, Check, Loader2, AlertCircle } from 'lucide-react';

interface NewspaperViewerProps {
  pdfId: string;
  onBack: () => void;
}

export default function NewspaperViewer({ pdfId, onBack }: NewspaperViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pdfDocRef = useRef<any>(null);

  const [pdf, setPdf] = useState<NewspaperPdf | null>(null);
  const [pages, setPages] = useState<NewspaperPage[]>([]);
  const [currentPageNum, setCurrentPageNum] = useState(1);
  const [commentDraft, setCommentDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [rendering, setRendering] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        const data = await getNewspaperPdfWithPages(pdfId);
        if (cancelled) return;
        setPdf(data);
        setPages(data.pages || []);
        setCurrentPageNum(1);

        const pdfjsLib = await import('pdfjs-dist');
        pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
        const loaded = await pdfjsLib.getDocument({ url: data.pdf_url, disableWorker: true } as any).promise;
        if (cancelled) return;
        pdfDocRef.current = loaded;
      } catch (err: any) {
        console.error('Failed to load newspaper PDF:', err);
        if (!cancelled) setErrorMsg(err.message || 'Failed to load PDF.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdfId]);

  useEffect(() => {
    const currentPage = pages.find((p) => p.page_number === currentPageNum);
    setCommentDraft(currentPage?.comment || '');
  }, [currentPageNum, pages]);

  useEffect(() => {
    if (loading || !pdfDocRef.current) return;

    let cancelled = false;
    (async () => {
      try {
        setRendering(true);
        const page = await pdfDocRef.current.getPage(currentPageNum);
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = canvasRef.current;
        if (!canvas || cancelled) return;
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        await page.render({ canvas, canvasContext: ctx, viewport }).promise;
      } catch (err) {
        console.error('Failed to render PDF page:', err);
      } finally {
        if (!cancelled) setRendering(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [currentPageNum, loading]);

  const handleToggleRead = async (page: NewspaperPage) => {
    const nextIsRead = !page.is_read;
    setPages((prev) => prev.map((p) => (p.id === page.id ? { ...p, is_read: nextIsRead } : p)));
    try {
      await togglePageRead(page.id, nextIsRead);
    } catch (err: any) {
      console.error('Failed to toggle read state:', err);
      setPages((prev) => prev.map((p) => (p.id === page.id ? { ...p, is_read: !nextIsRead } : p)));
      setErrorMsg(err.message || 'Failed to save read state.');
    }
  };

  const handleCommentBlur = async () => {
    const currentPage = pages.find((p) => p.page_number === currentPageNum);
    if (!currentPage || currentPage.comment === commentDraft) return;
    setPages((prev) => prev.map((p) => (p.id === currentPage.id ? { ...p, comment: commentDraft } : p)));
    try {
      await updatePageComment(currentPage.id, commentDraft);
    } catch (err: any) {
      console.error('Failed to save comment:', err);
      setErrorMsg(err.message || 'Failed to save comment.');
    }
  };

  if (loading) {
    return (
      <div className="glass-panel rounded-xl border border-zinc-800/90 p-16 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (!pdf) {
    return (
      <div className="glass-panel rounded-xl border border-zinc-800/90 p-10 text-center text-sm text-red-400">
        {errorMsg || 'Could not load this PDF.'}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <button
        onClick={onBack}
        className="flex items-center space-x-2 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to archive</span>
      </button>

      {errorMsg && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400 flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-4">
        <div className="glass-panel rounded-xl border border-zinc-800/90 p-4 flex-1 flex flex-col items-center space-y-3 min-w-0">
          <h3 className="text-sm font-semibold text-zinc-100 truncate w-full text-center">{pdf.title}</h3>

          <div className="relative w-full flex items-center justify-center bg-zinc-950/60 rounded-lg border border-zinc-800 overflow-auto max-h-[75vh]">
            {rendering && (
              <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/60">
                <Loader2 className="w-5 h-5 animate-spin text-zinc-400" />
              </div>
            )}
            <canvas ref={canvasRef} className="max-w-full" />
          </div>

          <div className="flex items-center justify-center space-x-4">
            <button
              onClick={() => setCurrentPageNum((n) => Math.max(1, n - 1))}
              disabled={currentPageNum <= 1}
              className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 disabled:opacity-30 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs text-zinc-400">
              Page {currentPageNum} / {pdf.page_count}
            </span>
            <button
              onClick={() => setCurrentPageNum((n) => Math.min(pdf.page_count, n + 1))}
              disabled={currentPageNum >= pdf.page_count}
              className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 disabled:opacity-30 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="lg:w-64 shrink-0 space-y-3">
          <div className="glass-panel rounded-xl border border-zinc-800/90 p-3">
            <h4 className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wide mb-2">Pages</h4>
            <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto">
              {pages.map((page) => (
                <button
                  key={page.id}
                  onClick={() => setCurrentPageNum(page.page_number)}
                  className={`relative w-8 h-8 rounded-md text-[11px] font-medium flex items-center justify-center transition-colors border ${
                    page.page_number === currentPageNum
                      ? 'border-amber-400 text-amber-300 bg-amber-500/10'
                      : 'border-zinc-800 text-zinc-400 bg-zinc-950/60 hover:border-zinc-700'
                  }`}
                  title={`Page ${page.page_number}${page.is_read ? ' (read)' : ''}`}
                >
                  {page.page_number}
                  {page.is_read && (
                    <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 flex items-center justify-center">
                      <Check className="w-2 h-2 text-zinc-950" strokeWidth={3} />
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {pages.find((p) => p.page_number === currentPageNum) && (
            <div className="glass-panel rounded-xl border border-zinc-800/90 p-3 space-y-3">
              {(() => {
                const currentPage = pages.find((p) => p.page_number === currentPageNum)!;
                return (
                  <>
                    <button
                      onClick={() => handleToggleRead(currentPage)}
                      className={`w-full flex items-center justify-center space-x-2 py-2 rounded-lg text-xs font-medium transition-colors border ${
                        currentPage.is_read
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                          : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{currentPage.is_read ? 'Marked as read' : 'Mark as read'}</span>
                    </button>

                    <div>
                      <label className="text-[11px] text-zinc-500 block mb-1">Comment</label>
                      <textarea
                        value={commentDraft}
                        onChange={(e) => setCommentDraft(e.target.value)}
                        onBlur={handleCommentBlur}
                        rows={5}
                        placeholder="Notes on this page..."
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-zinc-600 resize-none"
                      />
                    </div>
                  </>
                );
              })()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
