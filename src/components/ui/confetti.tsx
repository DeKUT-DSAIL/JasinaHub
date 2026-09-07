import { useEffect, useState } from "react";

interface ConfettiProps {
  active: boolean;
  particleCount?: number;
  duration?: number;
  onComplete?: () => void;
}

interface Particle {
  id: number;
  left: number;
  delay: number;
  duration: number;
  color: string;
  size: number;
}

const colors = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(217, 91%, 60%)", // blue
  "hsl(280, 89%, 65%)", // purple
  "hsl(330, 81%, 60%)", // pink
];

export const Confetti = ({ active, particleCount = 50, duration = 3000, onComplete }: ConfettiProps) => {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (!active) {
      setParticles([]);
      return;
    }

    const newParticles: Particle[] = Array.from({ length: particleCount }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 500,
      duration: 2000 + Math.random() * 1000,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: 4 + Math.random() * 8,
    }));

    setParticles(newParticles);

    const timer = setTimeout(() => {
      setParticles([]);
      onComplete?.();
    }, duration);

    return () => clearTimeout(timer);
  }, [active, particleCount, duration, onComplete]);

  if (!active || particles.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute animate-confetti-fall"
          style={{
            left: `${particle.left}%`,
            top: '-20px',
            animationDelay: `${particle.delay}ms`,
            animationDuration: `${particle.duration}ms`,
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            backgroundColor: particle.color,
            borderRadius: Math.random() > 0.5 ? '50%' : '2px',
          }}
        />
      ))}
    </div>
  );
};
