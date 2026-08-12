'use client';

import { NewspaperPdf } from '@/lib/types';
import { ArrowLeft } from 'lucide-react';

interface NewspaperViewerProps {
  pdf: NewspaperPdf;
  onBack: () => void;
}

export default function NewspaperViewer({ pdf, onBack }: NewspaperViewerProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center space-x-2 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to archive</span>
        </button>
        <h3 className="text-sm font-semibold text-zinc-100 truncate ml-4">{pdf.title}</h3>
      </div>

      <iframe
        src={pdf.pdf_url}
        title={pdf.title}
        className="w-full h-[85vh] rounded-xl border border-zinc-800 bg-zinc-950"
      />
    </div>
  );
}
