import { useEffect, useRef } from 'react';

export default function Waves() {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Wave parameters - more varied speeds and smoother frequencies
        const getWaveConfig = (height: number) => [
            { 
                amplitude: 80, 
                frequency: 0.005, 
                speed: 0.15, 
                yOffset: height * 0.25,
                amplitude2: 40,
                frequency2: 0.015,
                speed2: 0.25
            },
            { 
                amplitude: 100, 
                frequency: 0.004, 
                speed: 0.08, 
                yOffset: height * 0.5,
                amplitude2: 50,
                frequency2: 0.012,
                speed2: 0.18
            },
            { 
                amplitude: 90, 
                frequency: 0.006, 
                speed: 0.12, 
                yOffset: height * 0.75,
                amplitude2: 45,
                frequency2: 0.018,
                speed2: 0.22
            },
        ];

        let waves = getWaveConfig(canvas.height);

        // Set canvas size to fill viewport
        const resizeCanvas = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            waves = getWaveConfig(canvas.height);
        };
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        let animationFrame: number;
        let time = 0;

        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.strokeStyle = '#374151'; // gray-700
            ctx.lineWidth = 2;
            ctx.lineJoin = 'round';
            ctx.lineCap = 'round';

            waves.forEach((wave) => {
                ctx.beginPath();
                const yCenter = wave.yOffset;
                
                // Use smaller step size for smoother curves
                const stepSize = 2;
                
                for (let x = 0; x < canvas.width; x += stepSize) {
                    // Combine two sine waves for more organic, fluid motion
                    const wave1 = Math.sin((x * wave.frequency) + (time * wave.speed)) * wave.amplitude;
                    const wave2 = Math.sin((x * wave.frequency2) + (time * wave.speed2)) * wave.amplitude2;
                    const y = yCenter + wave1 + wave2;
                    
                    if (x === 0) {
                        ctx.moveTo(x, y);
                    } else {
                        ctx.lineTo(x, y);
                    }
                }
                
                ctx.stroke();
            });

            time += 0.01; // Slower time increment for smoother animation
            animationFrame = requestAnimationFrame(animate);
        };

        animate();

        return () => {
            window.removeEventListener('resize', resizeCanvas);
            cancelAnimationFrame(animationFrame);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 pointer-events-none z-0"
            style={{ mixBlendMode: 'normal' }}
        />
    );
}




