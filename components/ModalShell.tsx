'use client';

import { useState, useEffect, ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface ModalShellProps {
  isOpen: boolean;
  children: ReactNode;
  // Overrides the default centered-card backdrop (z-index, blur, background, animation).
  overlayClassName?: string;
  // Locks page scroll while open (used by fullscreen/immersive modals).
  lockScroll?: boolean;
}

const DEFAULT_OVERLAY_CLASSNAME =
  'fixed inset-0 z-[100000] bg-zinc-950/80 backdrop-blur-md flex items-center justify-center p-4 !m-0 animate-in fade-in duration-200';

export default function ModalShell({ isOpen, children, overlayClassName, lockScroll }: ModalShellProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!lockScroll) return;
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, lockScroll]);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className={overlayClassName ?? DEFAULT_OVERLAY_CLASSNAME}>{children}</div>,
    document.body
  );
}
