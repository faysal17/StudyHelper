'use client';

import { useState, ReactNode } from 'react';

interface TooltipProps {
  content: string | ReactNode;
  children: ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
}

export default function Tooltip({
  content,
  children,
  position = 'top',
  delay = 150,
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);

  if (!content) return <>{children}</>;

  const handleMouseEnter = () => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, delay);
    setTimeoutId(timer);
  };

  const handleMouseLeave = () => {
    if (timeoutId) clearTimeout(timeoutId);
    setIsVisible(false);
  };

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  return (
    <div
      className="relative inline-flex items-center"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}

      {isVisible && (
        <div
          className={`absolute ${positionClasses[position]} z-[99999] pointer-events-none max-w-xs animate-in fade-in zoom-in-95 duration-150`}
        >
          <div className="bg-zinc-900/95 border border-zinc-700/80 text-zinc-200 font-mono text-[11px] px-2.5 py-1.5 rounded-lg shadow-2xl backdrop-blur-md whitespace-nowrap leading-tight text-center">
            {content}
          </div>
        </div>
      )}
    </div>
  );
}
