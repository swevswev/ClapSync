export default function PrivacyPolicyContent() {
    return (
        <main className="min-h-[calc(100vh-4rem)] mt-20 bg-gradient-to-b from-slate-900 to-slate-800 text-white">
            <div className="max-w-3xl mx-auto px-6 sm:px-8 lg:px-12 py-12 sm:py-16">
                <h1 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-slate-200 to-gray-300 bg-clip-text text-transparent mb-2">
                    Privacy Policy
                </h1>
                <p className="text-gray-400 text-sm mb-10">Last updated: March 2026</p>

                <div className="space-y-8 text-gray-300 text-base leading-relaxed">
                    <section>
                        <h2 className="text-xl font-semibold text-white mb-3">1. Introduction</h2>
                        <p>
                            ClapSync ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our audio recording and synchronization service.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-white mb-3">2. Information We Collect</h2>
                        <p className="mb-3">We may collect:</p>
                        <ul className="list-disc pl-6 space-y-1">
                            <li><strong className="text-gray-200">Account information:</strong> email address and password if you create an account.</li>
                            <li><strong className="text-gray-200">Session and usage data:</strong> session IDs, participant identifiers, recording metadata (duration, file size), and usage patterns to operate and improve the service.</li>
                            <li><strong className="text-gray-200">Technical data:</strong> IP address, browser type, device information, and similar data necessary for connectivity and security.</li>
                            <li><strong className="text-gray-200">Audio recordings:</strong> recordings you create during sessions. These are stored temporarily and deleted after two (2) weeks unless otherwise stated.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-white mb-3">3. How We Use Your Information</h2>
                        <p>
                            We use collected information to provide, maintain, and improve ClapSync; to sync and deliver recordings to you and your invited participants; to enforce our terms and prevent abuse; and to comply with applicable law. We do not sell your personal information.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-white mb-3">4. Data Retention</h2>
                        <p>
                            Recordings are retained for two (2) weeks after a session, after which they are deleted from our systems. Account and usage data may be retained longer as needed for the service, legal compliance, or legitimate business purposes.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-white mb-3">5. Sharing and Disclosure</h2>
                        <p>
                            We may share information with service providers who assist in operating our platform (e.g., hosting, analytics), and when required by law or to protect our rights and safety. Session participants you invite can access the recordings for that session according to the permissions you set.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-white mb-3">6. Your Rights</h2>
                        <p>
                            Depending on your location, you may have the right to access, correct, delete, or port your personal data, or to object to or restrict certain processing. Contact us using the details below to exercise these rights.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-white mb-3">7. Cookies and Similar Technologies</h2>
                        <p>
                            We use cookies and similar technologies for authentication, preferences, and security. You can manage your cookie preferences in Cookie Settings.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-white mb-3">8. Contact</h2>
                        <p>
                            For questions about this Privacy Policy or our data practices, contact us at clapsync.support@gmail.com.
                        </p>
                    </section>
                </div>
            </div>
        </main>
    );
}
