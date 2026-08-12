'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { listNewspaperPdfs, deleteNewspaperPdf } from '@/lib/newspaper';
import { NewspaperPdf } from '@/lib/types';
import { Newspaper, UploadCloud, Loader2, AlertCircle } from 'lucide-react';
import NewspaperUploadModal from '@/components/newspaper/NewspaperUploadModal';
import NewspaperBrowser from '@/components/newspaper/NewspaperBrowser';
import NewspaperViewer from '@/components/newspaper/NewspaperViewer';

export default function NewspaperStudyPage() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [loading, setLoading] = useState(true);
  const [pdfs, setPdfs] = useState<NewspaperPdf[]>([]);
  const [showUpload, setShowUpload] = useState(false);
  const [viewingPdfId, setViewingPdfId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const checkSession = async () => {
      if (isSupabaseConfigured && supabase) {
        const { data } = await supabase.auth.getSession();
        if (!data?.session) {
          router.push('/login');
          return;
        }
      } else if (typeof window !== 'undefined') {
        const storedSession = localStorage.getItem('studyhub_user_session');
        if (!storedSession) {
          router.push('/login');
          return;
        }
      }
      setCheckingAuth(false);
    };
    checkSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (checkingAuth) return;
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkingAuth]);

  const reload = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const data = await listNewspaperPdfs();
      setPdfs(data);
    } catch (err: any) {
      console.error('Failed to load newspaper archive:', err);
      setErrorMsg(err.message || 'Failed to load newspaper archive.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePdf = async (pdfId: string) => {
    if (!confirm('Delete this newspaper article? This cannot be undone.')) return;
    try {
      await deleteNewspaperPdf(pdfId);
      if (viewingPdfId === pdfId) setViewingPdfId(null);
      await reload();
    } catch (err: any) {
      console.error('Failed to delete newspaper PDF:', err);
      setErrorMsg(err.message || 'Failed to delete this PDF.');
    }
  };

  if (checkingAuth) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-100 shadow-sm">
            <Newspaper className="w-5 h-5 text-orange-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-zinc-100">Newspaper Study</h1>
            <p className="text-xs text-zinc-400">Archive article scans by date and track pages read.</p>
          </div>
        </div>
        <button
          onClick={() => setShowUpload(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-zinc-100 text-zinc-950 font-semibold rounded-lg text-xs hover:bg-zinc-200 transition-all shadow-sm"
        >
          <UploadCloud className="w-3.5 h-3.5" />
          <span>Upload</span>
        </button>
      </div>

      {errorMsg && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400 flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
        </div>
      ) : viewingPdfId ? (
        <NewspaperViewer pdfId={viewingPdfId} onBack={() => setViewingPdfId(null)} />
      ) : (
        <NewspaperBrowser pdfs={pdfs} onOpenPdf={setViewingPdfId} onDeletePdf={handleDeletePdf} />
      )}

      {showUpload && (
        <NewspaperUploadModal
          onClose={() => setShowUpload(false)}
          onSuccess={() => {
            setShowUpload(false);
            reload();
          }}
        />
      )}
    </div>
  );
}
