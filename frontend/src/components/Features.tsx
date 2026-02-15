import testVideo from "../assets/akdopaskdpasda.mp4";
import { AudioLines, Sparkles, Waves as WavesIcon, Radio, Mic } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const features = 
[
    {
        title: "Collaborate Anywhere",
        description: "Whether you're in the same room or across the world, ClapSync allows you to collaborate and synchronize your audio projects with low latency and high quality.",
        image: "imagine",
        imagePosition: "left"
    },
    {
        title: "Automatic File Transfer",
        description: "Don't worry about manually transferring files between devices. ClapSync handles it for you, automatically uploading your recordings to the cloud for easy sharing.",
        image: "imagine",
        imagePosition: "right"
    },
    {
        title: "Privacy Protected",
        description: "Only you and the people you invite can access your sessions. Your recordings are deleted after 2 weeks to keep your data private and secure.",
        image: "imagine",
        imagePosition: "left"
    },
];

function VideoFeature({ videoSrc, title, description, imagePosition }: { videoSrc: string; title: string; description: string; imagePosition: string }) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        setIsVisible(true);
                        const video = videoRef.current;
                        if (video) {
                            video.play().catch((err) => {
                                console.log("Video play failed:", err);
                            });
                        }
                    } else {
                        const video = videoRef.current;
                        if (video) {
                            video.pause();
                        }
                    }
                });
            },
            {
                threshold: 0.2, // Trigger when 20% of element is visible
            }
        );

        observer.observe(container);

        return () => {
            observer.disconnect();
        };
    }, []);

    return (
        <div 
            ref={containerRef}
            className={`flex flex-col lg:flex-row items-center space-x-2 gap-8 sm:gap-12 ${imagePosition === "right" ? "lg:flex-row-reverse" : ""}`}
        >
            {/* display side */}
            <div className={`rounded-lg p-3 sm:p-4 transition-opacity duration-1000 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
                <video 
                    ref={videoRef}
                    src={videoSrc} 
                    className="w-xl rounded-lg" 
                    muted 
                    loop 
                    playsInline
                />
            </div>

            {/* description side */}
            <div className={`flex-1 w-full transition-opacity duration-1000 delay-200 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
                <div className="max-w-lg mx-auto lg:mx-0 text-center lg:text-left">
                    <h3 className="text-4xl sm:text-3xl lg:text-4xl font-bold mb-4 sm:mb-6 text-white">{title}</h3>
                    <p className="text-gray-300 text-base sm:text-lg leading-relaxed">{description}</p>
                </div>
            </div>
        </div>
    );
}

export default function Features() {
    const headingRef = useRef<HTMLDivElement>(null);
    const [headingVisible, setHeadingVisible] = useState(false);

    useEffect(() => {
        const heading = headingRef.current;
        if (!heading) return;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        setHeadingVisible(true);
                    }
                });
            },
            {
                threshold: 0.3,
            }
        );

        observer.observe(heading);

        return () => {
            observer.disconnect();
        };
    }, []);

    return (<section id="features" className="py-16 sm:py-20 px-10 sm:px-6 lg:px-8 relative bg-gradient-to-t from-slate-800 to-blue-950 rounded-t-[5rem] overflow-hidden">
        {/* Icon backdrop */}
        <div className="absolute inset-0 pointer-events-none opacity-10">
            <AudioLines className="absolute top-20 left-10 w-32 h-32 text-blue-400 rotate-12" />
            <Mic className="absolute bottom-40 left-10 w-32 h-32 text-blue-400 -rotate-20" />
            <Sparkles className="absolute top-40 right-20 w-24 h-24 text-cyan-400 -rotate-12" />
            <WavesIcon className="absolute bottom-40 left-1/4 w-40 h-40 text-blue-300 rotate-45" />
            <Radio className="absolute bottom-20 right-1/3 w-28 h-28 text-cyan-300 -rotate-12" />
            <AudioLines className="absolute top-1/2 right-10 w-36 h-36 text-blue-500/50 rotate-[-30deg]" />
            <Sparkles className="absolute bottom-60 left-1/2 w-20 h-20 text-cyan-500/50" />
        </div>
        
        <div className="max-w-6xl mx-auto relative z-10">
            <div 
                ref={headingRef}
                className={`text-center mb-12 sm:mb-16 lg:mb-20 transition-opacity duration-1000 ${headingVisible ? 'opacity-100' : 'opacity-0'}`}
            >
                <h2 className="text-5xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 sm:mb-6">
                    <span className="bg-gradient-to-b from-slate-200 to-gray-300 bg-clip-text text-transparent">What is ClapSync?</span>
                </h2>
            </div>

            <div className="space-y-16 sm:space-y-20 lg:space-y-32">
                {features.map((feature, key) => (
                    <VideoFeature
                        key={key}
                        videoSrc={testVideo}
                        title={feature.title}
                        description={feature.description}
                        imagePosition={feature.imagePosition}
                    />
                ))}
            </div>

        </div>
    </section>);
}