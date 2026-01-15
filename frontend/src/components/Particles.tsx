import { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  opacity: number;
}

interface ParticlesConfig {
  particleSpeed?: number;
  particleCount?: number;
  particleSize?: number;
  particleColor?: string;
  particleOpacity?: number;
}

interface ParticlesProps {
  config?: ParticlesConfig;
  className?: string;
  average?: number;
}

export default function Particles({ 
  config = {},
  className = '',
  average = 0
}: ParticlesProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const particlesRef = useRef<Particle[]>([]);
  const averageRef = useRef<number>(0);


  const {
    particleSpeed = 1,
    particleCount = 20,
    particleSize = 4,
    particleColor = '#ffffff',
    particleOpacity = 0.3
  } = config;

  // Update average ref whenever average prop changes (without reinitializing particles)
  useEffect(() => {
    averageRef.current = average;
  }, [average]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Get device pixel ratio for high-DPI displays
    const dpr = window.devicePixelRatio || 1;
    let logicalWidth = window.innerWidth;
    let logicalHeight = window.innerHeight;

    // Initialize particles
    const initParticles = () => {
      particlesRef.current = [];
      for (let i = 0; i < particleCount; i++) {
        particlesRef.current.push({
          x: Math.random() * logicalWidth,
          y: Math.random() * logicalHeight,
          vx: (Math.random() - 0.5) * particleSpeed,
          vy: (Math.random() - 0.5) * particleSpeed,
          radius: Math.random() * particleSize + 1,
          opacity: Math.random() * particleOpacity + 0.2
        });
      }
    };

    // Set canvas size to fill entire viewport with high-DPI support
    const resizeCanvas = () => {
      logicalWidth = window.innerWidth;
      logicalHeight = window.innerHeight;
      
      // Set the actual size in memory (scaled by device pixel ratio)
      canvas.width = logicalWidth * dpr;
      canvas.height = logicalHeight * dpr;
      
      // Set the CSS size to the actual window size
      canvas.style.width = logicalWidth + 'px';
      canvas.style.height = logicalHeight + 'px';
      
      // Scale the context to match the device pixel ratio
      ctx.scale(dpr, dpr);
      
      // Reinitialize particles after resize
      initParticles();
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Animation loop
    const animate = () => {
      ctx.clearRect(0, 0, logicalWidth, logicalHeight);

      // Calculate speed multiplier: ranges from 1 (default) to 25 (max) based on audio average
      const speedMultiplier = 1 + (averageRef.current / 255) * 24;

      particlesRef.current.forEach((particle) => {
        // Update position with audio-reactive speed
        particle.x += particle.vx * speedMultiplier;
        particle.y += particle.vy * speedMultiplier;

        // Bounce off edges
        if (particle.x < 0 || particle.x > logicalWidth) {
          particle.vx = -particle.vx;
        }
        if (particle.y < 0 || particle.y > logicalHeight) {
          particle.vy = -particle.vy;
        }

        // Keep particles within bounds
        particle.x = Math.max(0, Math.min(logicalWidth, particle.x));
        particle.y = Math.max(0, Math.min(logicalHeight, particle.y));

        // Draw particle
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        ctx.fillStyle = particleColor;
        ctx.globalAlpha = particle.opacity;
        ctx.fill();
        ctx.globalAlpha = 1;
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    // Cleanup
    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [particleSpeed, particleCount, particleSize, particleColor, particleOpacity]);

  return (
    <canvas
      ref={canvasRef}
      className={`fixed inset-0 ${className}`}
      style={{ 
        pointerEvents: 'none',
        zIndex: 0
      }}
    />
  );
}

