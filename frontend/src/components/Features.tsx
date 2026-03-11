import { useEffect, useRef, useState } from "react";
import Collaborate from "./features/collaborate";
import Downloads from "./features/downloads";
import Privacy from "./features/privacy";

const features = 
[
    {
        title: "Collaborate Anywhere",
        description: "Whether you're in the same room or across the world, ClapSync allows you to collaborate and synchronize your audio projects with low latency and high quality.",
        component: <Collaborate />,
        imagePosition: "right"
    },
    {
        title: "Automatic File Transfer",
        description: "Don't worry about manually transferring files between devices. ClapSync handles it for you, automatically uploading your recordings to the cloud for easy sharing.",
        component: <Downloads />,
        imagePosition: "left"
    },
    {
        title: "Privacy Protected",
        description: "Only you and the people you invite can access your sessions. Your recordings are deleted after 2 weeks to keep your data private and secure.",
        component: <Privacy />,
        imagePosition: "right"
    },
];

function HTMLFeature({ component, title, description, imagePosition }: { component: React.ReactNode; title: string; description: string; imagePosition: string }) {
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
            className={`flex flex-col lg:flex-row items-center gap-12 sm:gap-10 ${imagePosition === "left" ? "lg:flex-row-reverse" : ""}`}
        >

            {/* description side */}
            <div className={`flex-1 lg:flex-[1.5] w-full transition-opacity duration-1000 delay-200 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
                <div className="max-w-lg mx-auto lg:mx-0 text-center lg:text-left">
                    <h3 className="text-4xl sm:text-3xl lg:text-4xl font-bold mb-4 sm:mb-6 text-white">{title}</h3>
                    <p className="text-gray-300 text-base sm:text-lg leading-relaxed">{description}</p>
                </div>
            </div>

            {/* display side */}
            <div className={`relative fade-right-edge w-full lg:w-1/2 flex justify-center overflow-visible py-4 ${isVisible ? 'opacity-100' : 'opacity-0'} transition-opacity duration-1000 delay-200`}>
                <div className="origin-left">
                    {component}
                </div>
            </div>  
        </div>
    );
}

export default function Features() {
    return (<section id="features" className="py-16 sm:py-20 px-10 sm:px-6 lg:px-8 relative bg-gradient-to-b from-slate-800/0 via-slate-900/blue-950 to-blue-950/80 overflow-visible">
        
        <div className="max-w-6xl mx-auto relative z-10">

            <div className="space-y-16 sm:space-y-20 lg:space-y-32">
                {features.map((feature, key) => (
                    <HTMLFeature
                        key={key}
                        component={feature.component}
                        title={feature.title}
                        description={feature.description}
                        imagePosition={feature.imagePosition}
                    />
                ))}
            </div>

        </div>
    </section>);
}