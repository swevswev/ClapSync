import { Check, Flame } from "lucide-react";
import Features from "./Features";

const plans =
[
    {
        name: "LOSER",
        price: "999.99",
        description: "Some test text lol because prob not selling anything here",
        features:
        [
            "organic",
            "grass-fed",
            "real",
            "faker approved",
        ],
        popular: false,
    },
    {
        name: "WINNER",
        price: "9.99",
        description: "Some test text lol because prob not selling anything here",
        features:
        [
            "organic",
            "grass-fed",
            "real",
            "faker approved",
        ],
        popular: false,
    },
    {
        name: "PREMIUM",
        price: "1999.99",
        description: "Some test text lol because prob not selling anything here",
        features:
        [
            "organic",
            "grass-fed",
            "real",
            "faker approved",
        ],
        popular: true,
    },
]

export default function Pricing() {
    return (<section id="pricing" className="py-16 sm:py-20 px-10 sm:px-6 lg:px-8 relative">
        <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12 sm:mb-16 lg:mb-20">
                <h2 className="text-5xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 sm:mb-6">
                    <span className="bg-gradient-to-b from-white to-gray-400 bg-clip-text text-transparent">Pricing Tab</span>
                    <br />
                    <span className="bg-gradient-to-b from-white to-blue-600 bg-clip-text text-transparent">Yes</span>
                </h2>
                <p className="text-gray-400 text-base sm:text-lg max-w-2xl mx-auto">
                    Choose the perfect plan to start syncing your claps
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 lg:gap-6">
                {plans.map((plan, key) => (
                    <div key={key} className={`relative bg-slate-900/50 backdrop-blur-sm border rounded-xl sm:rounded-2xl p-6 sm:p-8 transition-all duration-300 overflow-visible group flex flex-col h-full 
                    ${plan.popular ? "border-blue-500 shadow-2xl shadow-blue-500/20 lg:scale-105" : "border-slate-800 hover:border-slate-700"}`}>

                        {/*"hover"*/}
                        <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-lg"/>

                        {plan.popular && (
                            <div className="absolute -top-2 sm:-top-3 left-1/2 transform -translate-x-1/2 z-1">
                                <div className="flex items-center space-x-1 px-3 sm:px-4 py-1 sm:py-1.5 bg-gradient-to-b from-blue-500 to-cyan-500 rounded-full text-xs sm:text-sm font-semibold shadow-lg">
                                    <Flame className="w-3 h-3 sm:w-3 sm:h-3 fill-white" />
                                    <span>Popular</span>
                                </div>
                            </div>
                        )}
                        <div className="text-center mb-6 sm:mb-8">
                            <h3 className="text-xl sm:text-2xl font-bold mb-2">{plan.name}</h3>
                            <p className="text-gray-400 text-xs sm:text-sm mb-3 sm:mb-4">{plan.description}</p>
                            <div className="flex items-baseline justify-center">
                                <span className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">${plan.price}</span>
                                <span className="text-gray-400 ml-1 sm:ml-2 text-sm sm:text-base">/month</span>
                            </div>
                        </div>
                        
                        <ul className="space-y-3 sm:space-y-4 mb-6 sm:mb-8 flex-row">
                            {plan.features.map((feature, featureKey) => (
                                <li key={featureKey} className="flex items-start space-x-2 sm:space-x-3">
                                    <div className="flex-shrink-0 w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-blue-500/20 flex items-center justify-center mt-0.5">
                                        <Check className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-blue-400"/>
                                    </div>
                                    <span className="text-gray-300 text-sm sm:text-base">{feature}</span>
                                </li>
                            ))}
                        </ul>

                        <button className={`w-full py-2.5 sm:py-3 px-4 sm:px-6 rounded-lg font-semibold transition-all duration-300 mt-auto hover:scale-102 cursor-pointer text-sm sm:text-base
                            ${plan.popular ? "bg-gradient-to-b from-blue-500 to-cyan-500" : "bg-white/5 border border-white/10 hover:bg-white/10"}`}>
                            Get Started
                        </button>
                    </div>
                ))}
            </div>

            <div className="mt-8 sm:mt-12 text-center">
                <p className="text-gray-400 text-base">
                    Need a custom plan? <a href="#" className="text-blue-400 hover:text-blue-300">Contact our sales team</a>
                </p>
            </div>

        </div>
    </section>);
}