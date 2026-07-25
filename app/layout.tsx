import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Navbar from '@/components/Navbar';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Learning Hub & Spaced Repetition Manager',
  description: 'Minimal personalized learning hub and image occlusion task manager.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} dark`} suppressHydrationWarning>
      <body
        className="bg-zinc-950 text-zinc-100 min-h-screen flex flex-col font-sans antialiased selection:bg-zinc-800 selection:text-zinc-100"
        suppressHydrationWarning
      >
        <Navbar />
        <main className="flex-1 w-full px-4 sm:px-6 lg:px-10 py-8">
          {children}
        </main>
        <footer className="border-t border-zinc-800/60 py-6 text-center text-xs text-zinc-500 mt-16">
          <p>Learning Hub &bull; Spaced Repetition Task Manager</p>
        </footer>
      </body>
    </html>
  );
}
