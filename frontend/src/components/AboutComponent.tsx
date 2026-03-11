import { Shield, Cloud, Users } from "lucide-react";

export default function AboutComponent() {
    return (
        <main className="min-h-[calc(100vh-4rem)] mt-20 bg-gradient-to-b from-slate-900 to-slate-800 text-white">
            {/* Hero */}
            <section className="px-6 sm:px-8 lg:px-12 pt-12 sm:pt-16 pb-10">
                <div className="max-w-3xl mx-auto text-center">
                    <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold bg-gradient-to-r from-slate-200 via-blue-100 to-gray-300 bg-clip-text text-transparent mb-4">
                        About ClapSync
                    </h1>
                    <p className="text-gray-300 text-lg sm:text-xl leading-relaxed">
                        We built ClapSync so you can record and sync audio with others in real time — no cables, no hassle, no compromise on quality or privacy.
                    </p>
                </div>
            </section>

            {/* Mission */}
            <section className="px-6 sm:px-8 lg:px-12 py-10 sm:py-14">
                <div className="max-w-3xl mx-auto">
                    <h2 className="text-2xl sm:text-3xl font-semibold text-white mb-6">Why ClapSync exists</h2>
                    <p className="text-gray-300 text-base sm:text-lg leading-relaxed mb-4">
                        Whether you're recording a podcast with a remote co-host, capturing a meeting, or syncing dialogue for film and video, getting everyone's audio in one place used to mean manual uploads, sync drift, and shared links that never quite lined up.
                    </p>
                    <p className="text-gray-300 text-base sm:text-lg leading-relaxed">
                        ClapSync keeps everyone on the same timeline. You create a session, invite your collaborators, and hit record. Each participant's track is recorded locally and synced in near real time. When you're done, your mixed recordings are available to download — and we remove them from our servers after two weeks so your work stays yours.
                    </p>
                </div>
            </section>

            {/* Pillars */}
            <section className="px-6 sm:px-8 lg:px-12 py-10 sm:py-14 border-t border-slate-700/50">
                <div className="max-w-4xl mx-auto">
                    <h2 className="text-2xl sm:text-3xl font-semibold text-white mb-10 text-center">What we care about</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="flex flex-col items-center text-center space-y-3">
                            <div className="w-12 h-12 rounded-xl bg-blue-900/50 flex items-center justify-center">
                                <Users className="w-6 h-6 text-blue-300" />
                            </div>
                            <h3 className="text-lg font-semibold text-white">Collaborate anywhere</h3>
                            <p className="text-gray-400 text-sm leading-relaxed">
                                Same room or across the world — low latency and clear audio so remote sessions feel in sync.
                            </p>
                        </div>
                        <div className="flex flex-col items-center text-center space-y-3">
                            <div className="w-12 h-12 rounded-xl bg-blue-900/50 flex items-center justify-center">
                                <Cloud className="w-6 h-6 text-blue-300" />
                            </div>
                            <h3 className="text-lg font-semibold text-white">Automatic transfer</h3>
                            <p className="text-gray-400 text-sm leading-relaxed">
                                Recordings upload to the cloud so you can access and share them without manual file shuffling.
                            </p>
                        </div>
                        <div className="flex flex-col items-center text-center space-y-3">
                            <div className="w-12 h-12 rounded-xl bg-blue-900/50 flex items-center justify-center">
                                <Shield className="w-6 h-6 text-blue-300" />
                            </div>
                            <h3 className="text-lg font-semibold text-white">Privacy first</h3>
                            <p className="text-gray-400 text-sm leading-relaxed">
                                Only people you invite can join. Recordings are deleted after 2 weeks by default.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Who it's for */}
            <section className="px-6 sm:px-8 lg:px-12 py-10 sm:py-14 border-t border-slate-700/50">
                <div className="max-w-3xl mx-auto">
                    <h2 className="text-2xl sm:text-3xl font-semibold text-white mb-6">Who it's for</h2>
                    <p className="text-gray-300 text-base sm:text-lg leading-relaxed mb-4">
                        ClapSync is for anyone who needs multi-person audio in sync: podcasters, content creators, filmmakers, educators, and teams running meetings or interviews. If you've ever wished you could hit one button and have everyone's mics aligned, ClapSync is built for you.
                    </p>
                    <p className="text-gray-400 text-sm">
                        No install required for guests — share a link, grant mic access, and you're recording.
                    </p>
                </div>
            </section>
        </main>
    );
}
