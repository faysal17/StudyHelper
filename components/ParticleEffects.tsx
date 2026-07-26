'use client';

import { useEffect, useRef } from 'react';

interface ParticleEffectsProps {
  mode: 'confetti-fireworks' | 'emoji-rain';
  isActive: boolean;
}

export default function ParticleEffects({ mode, isActive }: ParticleEffectsProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!isActive) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    let animationFrameId: number;
    const particles: any[] = [];

    if (mode === 'confetti-fireworks') {
      const colors = ['#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#ef4444'];
      for (let i = 0; i < 150; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height * 0.5,
          vx: (Math.random() - 0.5) * 8,
          vy: Math.random() * 6 + 2,
          color: colors[Math.floor(Math.random() * colors.length)],
          size: Math.random() * 8 + 4,
          rotation: Math.random() * Math.PI * 2,
          rotSpeed: (Math.random() - 0.5) * 0.2,
        });
      }
    } else {
      // Emoji Rain Mode (Haha Emojis)
      const emojis = ['🤣', '😂', '🤡', '💩', '👎', '💀'];
      for (let i = 0; i < 70; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: -Math.random() * canvas.height,
          vy: Math.random() * 5 + 3,
          vx: (Math.random() - 0.5) * 2,
          emoji: emojis[Math.floor(Math.random() * emojis.length)],
          size: Math.floor(Math.random() * 16) + 24,
        });
      }
    }

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (mode === 'confetti-fireworks') {
        particles.forEach((p) => {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rotation);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
          ctx.restore();

          p.x += p.vx;
          p.y += p.vy;
          p.rotation += p.rotSpeed;

          if (p.y > canvas.height) {
            p.y = -10;
            p.x = Math.random() * canvas.width;
          }
        });
      } else {
        // Emoji Rain Particle Loop
        particles.forEach((p) => {
          ctx.font = `${p.size}px sans-serif`;
          ctx.fillText(p.emoji, p.x, p.y);

          p.y += p.vy;
          p.x += p.vx;

          if (p.y > canvas.height) {
            p.y = -30;
            p.x = Math.random() * canvas.width;
          }
        });
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    const handleResize = () => {
      if (canvas) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, [mode, isActive]);

  if (!isActive) return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-[100001] w-full h-full"
    />
  );
}
