import type { Metadata } from 'next';
import { Hind_Siliguri, Inter } from 'next/font/google';
import './globals.css';
import Navbar from '@/components/Navbar';

const hindSiliguri = Hind_Siliguri({
  weight: ['300', '400', '500', '600', '700'],
  subsets: ['bengali', 'latin'],
  variable: '--font-hind-siliguri',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'BCS StudyHelper - Spaced Repetition & Image Occlusion Hub',
  description:
    'Personalized learning hub and spaced-repetition task manager for BCS handwritten note study with image occlusion.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="bn" className={`${hindSiliguri.variable} ${inter.variable}`}>
      <body className="bg-slate-950 text-slate-100 min-h-screen flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950">
        <Navbar />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </main>
        <footer className="border-t border-slate-800/80 py-6 text-center text-xs text-slate-500 glass-panel mt-12">
          <p>BCS StudyHelper &copy; {new Date().getFullYear()} — Spaced Repetition & Image Occlusion Manager</p>
        </footer>
      </body>
    </html>
  );
}
