import logo from "../assets/cat.jpg";
import testVideo from "../assets/akdopaskdpasda.mp4";

const features = 
[
    {
        title: "Collaborate anywhere",
        description: "Hey guys welcome back to my minecraft gameplay. Hey guys welcome back to my minecraft gameplay. Hey guys welcome back to my minecraft gameplay.",
        image: "imagine",
        imagePosition: "left"
    },
    {
        title: "Collaborate anywhere",
        description: "wow",
        image: "imagine",
        imagePosition: "right"
    },
    {
        title: "Collaborate anywhere",
        description: "wow",
        image: "imagine",
        imagePosition: "left"
    },
];

export default function Features() {
    return (<section id="features" className="py-16 sm:py-20 px-10 sm:px-6 lg:px-8 relative">
        <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12 sm:mb-16 lg:mb-20">
                <h2 className="text-5xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 sm:mb-6">
                    <span className="bg-gradient-to-b from-white to-gray-400 bg-clip-text text-transparent">Features Tab</span>
                    <br />
                    <span className="bg-gradient-to-b from-white to-blue-600 bg-clip-text text-transparent">Yes</span>
                </h2>
            </div>

            <div className="space-y-16 sm:space-y-20 lg:space-y-32">
                {features.map((feature, key) => (
                    <div key = {key} className={`flex flex-col lg:flex-row items-center gap-8 sm:gap-12 ${feature.imagePosition === "right" ? "lg:flex-row-reverse" : ""}`}>
                        {/* display side */}
                        <div className="bg-gray-950 rounded-lg p-3 sm:p-4">
                            <video src={testVideo} controls className="w-lg" />
                        </div>

                        {/* description side */}
                        <div className="flex-1 w-full">
                            <div className="max-w-lg mx-auto lg:mx-0 text-center lg:text-left">
                                <h3 className="text-4xl sm:text-3xl lg:text-4xl font-bold mb-4 sm:mb-6 text-white">{feature.title}</h3>
                                <p className="text-gray-300 text-base text-xl sm:text-lg leading-relaxed">{feature.description}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

        </div>
    </section>);
}