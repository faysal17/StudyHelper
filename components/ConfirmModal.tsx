'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  isOpen,
  title = 'Confirm Action',
  message,
  confirmText = 'Delete',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 top-0 left-0 right-0 bottom-0 w-screen h-screen z-[9999] bg-zinc-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl max-w-md w-full p-6 shadow-2xl relative space-y-5 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-zinc-100">{title}</h3>
              <p className="text-xs text-zinc-400 mt-0.5">{message}</p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="text-zinc-500 hover:text-zinc-300 transition-colors p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center justify-end space-x-3 pt-3 border-t border-zinc-800/80">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs font-medium transition-colors"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg text-xs transition-colors shadow-sm"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
