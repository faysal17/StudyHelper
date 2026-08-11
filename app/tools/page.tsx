'use client';

import { Wrench, BookOpen, Shuffle, ExternalLink } from 'lucide-react';
import Link from 'next/link';

export default function ToolsPage() {
  const toolCategories = [
    {
      id: 'bangla-vocab',
      title: 'Bangla Vocab Builder',
      description: 'Import CSV, visualize Bangla dictionary words, and study with Spaced Repetition Active Recall flashcards.',
      icon: <BookOpen className="w-5 h-5 text-amber-400" />,
      status: 'Active Tool',
      badgeBg: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
      href: '/tools/bangla-vocab',
      external: false,
    },
    {
      id: 'synonym-practice',
      title: 'Bangla Word Practice',
      description: 'BCS Bangla synonym & semantics (অর্থতত্ত্ব) practice tool with spaced repetition.',
      icon: <Shuffle className="w-5 h-5 text-pink-400" />,
      status: 'Active Tool',
      badgeBg: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
      href: '/tools/synonym-practice',
      external: false,
    },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      {/* Header Bar */}
      <div className="flex items-center space-x-3 border-b border-zinc-800 pb-4">
        <div className="p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-100 shadow-sm">
          <Wrench className="w-5 h-5 text-amber-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
            <span>Tools</span>
          </h1>
          <p className="text-xs text-zinc-400">
            Specialized utility programs, calculators, and automation tools for BCS study optimization.
          </p>
        </div>
      </div>

      {/* Tools Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {toolCategories.map((tool) => {
          const isInteractive = Boolean(tool.href);
          const Content = (
            <div className="glass-panel p-5 rounded-xl border border-zinc-800/90 hover:border-zinc-700 transition-all space-y-3 relative group h-full flex flex-col justify-between cursor-pointer">
              <div className="flex items-center justify-between">
                <div className="p-2 rounded-lg bg-zinc-950 border border-zinc-800">
                  {tool.icon}
                </div>
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${tool.badgeBg}`}>
                  {tool.status}
                </span>
              </div>

              <div className="space-y-1">
                <h3 className="text-sm font-bold text-zinc-100 group-hover:text-amber-400 transition-colors flex items-center gap-1.5">
                  <span>{tool.title}</span>
                  {tool.external && <ExternalLink className="w-3 h-3 text-zinc-500 group-hover:text-amber-400 transition-colors shrink-0" />}
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  {tool.description}
                </p>
              </div>
            </div>
          );

          if (!isInteractive) {
            return <div key={tool.id}>{Content}</div>;
          }

          return tool.external ? (
            <a key={tool.id} href={tool.href!} target="_blank" rel="noopener noreferrer">
              {Content}
            </a>
          ) : (
            <Link key={tool.id} href={tool.href!}>
              {Content}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
