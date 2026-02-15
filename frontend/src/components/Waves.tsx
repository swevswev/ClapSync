import { useEffect, useRef } from 'react';

interface WavesProps {
    soundLevel?: number; // 0-255, not used in this implementation
}

// Custom 3D noise function using a simple hash-based approach
class SimpleNoise3D {
    private perm: number[];
    private gradP: number[][];

    constructor() {
        // Permutation table
        const p = [
            151, 160, 137, 91, 90, 15, 131, 13, 201, 95, 96, 53, 194, 233, 7, 225,
            140, 36, 103, 30, 69, 142, 8, 99, 37, 240, 21, 10, 23, 190, 6, 148,
            247, 120, 234, 75, 0, 26, 197, 62, 94, 252, 219, 203, 117, 35, 11, 32,
            57, 177, 33, 88, 237, 149, 56, 87, 174, 20, 125, 136, 171, 168, 68, 175,
            74, 165, 71, 134, 139, 48, 27, 166, 77, 146, 158, 231, 83, 111, 229, 122,
            60, 211, 133, 230, 220, 105, 92, 41, 55, 46, 245, 40, 244, 102, 143, 54,
            65, 25, 63, 161, 1, 216, 80, 73, 209, 76, 132, 187, 208, 89, 18, 169,
            200, 196, 135, 130, 116, 188, 159, 86, 164, 100, 109, 198, 173, 186, 3, 64,
            52, 217, 226, 250, 124, 123, 5, 202, 38, 147, 118, 126, 255, 82, 85, 212,
            207, 206, 59, 227, 47, 16, 58, 17, 182, 189, 28, 42, 223, 183, 170, 213,
            119, 248, 152, 2, 44, 154, 163, 70, 221, 153, 101, 155, 167, 43, 172, 9,
            129, 22, 39, 253, 19, 98, 108, 110, 79, 113, 224, 232, 178, 185, 112, 104,
            218, 246, 97, 228, 251, 34, 242, 193, 238, 210, 144, 12, 191, 179, 162, 241,
            81, 51, 145, 235, 249, 14, 239, 107, 49, 192, 214, 31, 181, 199, 106, 157,
            184, 84, 204, 176, 115, 121, 50, 45, 127, 4, 150, 254, 138, 236, 205, 93,
            222, 114, 67, 29, 24, 72, 243, 141, 128, 195, 78, 66, 215, 61, 156, 180
        ];

        this.perm = new Array(512);
        this.gradP = new Array(512);

        for (let i = 0; i < 512; i++) {
            this.perm[i] = p[i & 255];
            this.gradP[i] = [
                (this.perm[i] % 12) - 6,
                ((this.perm[i] >> 1) % 12) - 6,
                ((this.perm[i] >> 2) % 12) - 6
            ];
        }
    }

    private fade(t: number): number {
        return t * t * t * (t * (t * 6 - 15) + 10);
    }

    private lerp(a: number, b: number, t: number): number {
        return a + t * (b - a);
    }

    private grad(hash: number, x: number, y: number, z: number): number {
        const h = hash & 15;
        const u = h < 8 ? x : y;
        const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
        return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
    }

    noise3D(x: number, y: number, z: number): number {
        const X = Math.floor(x) & 255;
        const Y = Math.floor(y) & 255;
        const Z = Math.floor(z) & 255;

        x -= Math.floor(x);
        y -= Math.floor(y);
        z -= Math.floor(z);

        const u = this.fade(x);
        const v = this.fade(y);
        const w = this.fade(z);

        const A = this.perm[X] + Y;
        const AA = this.perm[A] + Z;
        const AB = this.perm[A + 1] + Z;
        const B = this.perm[X + 1] + Y;
        const BA = this.perm[B] + Z;
        const BB = this.perm[B + 1] + Z;

        return this.lerp(
            this.lerp(
                this.lerp(
                    this.grad(this.perm[AA], x, y, z),
                    this.grad(this.perm[BA], x - 1, y, z),
                    u
                ),
                this.lerp(
                    this.grad(this.perm[AB], x, y - 1, z),
                    this.grad(this.perm[BB], x - 1, y - 1, z),
                    u
                ),
                v
            ),
            this.lerp(
                this.lerp(
                    this.grad(this.perm[AA + 1], x, y, z - 1),
                    this.grad(this.perm[BA + 1], x - 1, y, z - 1),
                    u
                ),
                this.lerp(
                    this.grad(this.perm[AB + 1], x, y - 1, z - 1),
                    this.grad(this.perm[BB + 1], x - 1, y - 1, z - 1),
                    u
                ),
                v
            ),
            w
        );
    }
}

const dprScaleDown = (v: number) => v / window.devicePixelRatio;
const dprScaleUp = (v: number) => v * window.devicePixelRatio;

export default function Waves({}: WavesProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const noiseRef = useRef<SimpleNoise3D | null>(null);
    const animationFrameRef = useRef<number | null>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Initialize noise
        if (!noiseRef.current) {
            noiseRef.current = new SimpleNoise3D();
        }
        const noise3D = noiseRef.current;

        /**
         * Configuration
         */
        const config = {
            animated: true,
            background: "transparent",
            lineColor: "rgba(120, 119, 124, 0.8)",
            lineColorEnd: "rgba(150, 125, 154, 0.8)", // Whitish indigo
            lineWidth: 2,
            lineSeparation: 50,
            lineSegmentSize: 15,
            speedScale: 0.00005,
            noiseScale: 0.001,
        };

        const scaledConfig = {
            lineSeparation: dprScaleUp(config.lineSeparation),
            lineSegmentSize: dprScaleUp(config.lineSegmentSize),
            lineWidth: dprScaleUp(config.lineWidth),
        };

        /**
         * Initialize state
         */
        const state = {
            clock: Date.now(),
            width: window.innerWidth,
            height: window.innerHeight,
            scaledWidth: dprScaleDown(window.innerWidth),
            scaledHeight: dprScaleDown(window.innerHeight),
            maxOffsetY: 200,
        };

        /**
         * Utility for calculating vertical draw position
         */
        const parseY = (y: number, offset?: number, reduction?: number) =>
            state.height * 0.5 +
            ((state.scaledHeight * y) / 2) * (reduction || 1) +
            (offset || 0);

        /**
         * Utility for interpolating between two colors
         */
        const interpolateColor = (color1: string, color2: string, t: number): string => {
            // Parse rgba strings
            const parseRGBA = (rgba: string) => {
                const match = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
                if (!match) return null;
                return {
                    r: parseInt(match[1]),
                    g: parseInt(match[2]),
                    b: parseInt(match[3]),
                    a: match[4] ? parseFloat(match[4]) : 1
                };
            };

            const c1 = parseRGBA(color1);
            const c2 = parseRGBA(color2);
            if (!c1 || !c2) return color1;

            const r = Math.round(c1.r + (c2.r - c1.r) * t);
            const g = Math.round(c1.g + (c2.g - c1.g) * t);
            const b = Math.round(c1.b + (c2.b - c1.b) * t);
            const a = c1.a + (c2.a - c1.a) * t;

            return `rgba(${r}, ${g}, ${b}, ${a})`;
        };

        /**
         * Render frame
         */
        const render = () => {
            // Clear
            ctx.clearRect(0, 0, state.width, state.height);

            // Frame render variables
            const t = state.clock * config.speedScale;
            const yCount = Math.ceil(state.height / scaledConfig.lineSeparation) + 2; // Add buffer to ensure full coverage
            const halfYCount = yCount / 2;
            const xCount = state.width / scaledConfig.lineSegmentSize + 1;

            // Render each line
            for (let i = 0; i < yCount; i++) {
                // Line render variables
                const y = i * 0.05;
                const initialNoiseValue = noise3D.noise3D(0, y, t);

                // Calculate gradient position (0 = top, 1 = bottom)
                const lineY = parseY(
                    initialNoiseValue,
                    scaledConfig.lineSeparation * (i - halfYCount),
                    0.5
                ) - state.maxOffsetY;
                const gradientT = Math.max(0, Math.min(1, lineY / state.height));

                // Line start
                ctx.beginPath();
                ctx.moveTo(0, lineY);

                // Horizontally draw the line across the view
                for (let x = 1; x <= xCount; x++) {
                    const n = noise3D.noise3D(
                        x * scaledConfig.lineSegmentSize * config.noiseScale,
                        y,
                        t
                    );
                    ctx.lineTo(
                        x * scaledConfig.lineSegmentSize,
                        parseY(n, scaledConfig.lineSeparation * (i - halfYCount), 0.5) -
                            state.maxOffsetY
                    );
                }

                // Render line with gradient color
                ctx.strokeStyle = interpolateColor(config.lineColor, config.lineColorEnd, gradientT);
                ctx.lineWidth = config.lineWidth;
                ctx.stroke();
            }
        };

        /**
         * Update clock state
         */
        const updateClock = () => (state.clock = Date.now());

        /**
         * Resize canvas to match
         */
        const handleResize = () => {
            state.width = window.innerWidth;
            state.height = window.innerHeight;
            state.scaledWidth = dprScaleDown(state.width);
            state.scaledHeight = dprScaleDown(state.height);
            canvas.width = state.width;
            canvas.height = state.height;

            // Update Y offset - removed to allow full height coverage
            state.maxOffsetY = 0;

            if (!config.animated) render();
        };
        handleResize();
        window.addEventListener("resize", handleResize);
        window.addEventListener("scroll", handleResize);
        window.addEventListener("load", handleResize);

        /**
         * Animation loop
         */
        const loop = () => {
            if (config.animated) {
                updateClock();
                animationFrameRef.current = requestAnimationFrame(loop);
            }
            render();
        };
        if (config.animated) loop();

        return () => {
            window.removeEventListener("resize", handleResize);
            window.removeEventListener("scroll", handleResize);
            window.removeEventListener("load", handleResize);
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
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
