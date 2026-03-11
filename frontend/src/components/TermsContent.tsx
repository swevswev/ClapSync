export default function TermsContent() {
    return (
        <main className="min-h-[calc(100vh-4rem)] mt-20 bg-gradient-to-b from-slate-900 to-slate-800 text-white">
            <div className="max-w-3xl mx-auto px-6 sm:px-8 lg:px-12 py-12 sm:py-16">
                <h1 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-slate-200 to-gray-300 bg-clip-text text-transparent mb-2">
                    Terms of Service
                </h1>
                <p className="text-gray-400 text-sm mb-10">Last updated: March 2026</p>

                <div className="space-y-8 text-gray-300 text-base leading-relaxed">
                    <section>
                        <h2 className="text-xl font-semibold text-white mb-3">1. Acceptance of Terms</h2>
                        <p>
                            By accessing or using ClapSync ("Service"), you agree to be bound by these Terms of Service. If you do not agree, do not use the Service.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-white mb-3">2. Description of Service</h2>
                        <p>
                            ClapSync provides a platform for real-time, multi-participant audio recording and synchronization. You may create sessions, invite others, record audio, and download recordings subject to these terms and our Privacy Policy.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-white mb-3">3. Your Responsibilities</h2>
                        <p className="mb-3">You agree to:</p>
                        <ul className="list-disc pl-6 space-y-1">
                            <li>Use the Service only for lawful purposes and in compliance with applicable laws.</li>
                            <li>Not upload, record, or share content that infringes others' rights, is defamatory, or violates privacy.</li>
                            <li>Not attempt to circumvent security, abuse the service, or use it to distribute malware.</li>
                            <li>Obtain any required consent from participants before recording and ensure they are aware recordings may be stored and shared according to session settings.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-white mb-3">4. Intellectual Property</h2>
                        <p>
                            ClapSync and its branding, design, and technology are owned by us. You retain ownership of your recordings and content; by using the Service you grant us a limited license to store, process, and deliver that content as necessary to operate the Service.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-white mb-3">5. Data and Privacy</h2>
                        <p>
                            Our collection and use of data is described in our Privacy Policy. Recordings are retained for two (2) weeks and then deleted unless otherwise specified. You are responsible for backing up any content you wish to keep.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-white mb-3">6. Disclaimers</h2>
                        <p>
                            The Service is provided "as is." We do not guarantee uninterrupted, error-free, or secure operation. We are not liable for loss of data, downtime, or any indirect or consequential damages arising from your use of the Service.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-white mb-3">7. Limitation of Liability</h2>
                        <p>
                            To the maximum extent permitted by law, our total liability for any claims arising from or related to the Service shall not exceed the amount you paid us in the twelve (12) months preceding the claim, or one hundred dollars (USD 100), whichever is greater.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-white mb-3">8. Termination</h2>
                        <p>
                            We may suspend or terminate your access to the Service at any time for violation of these terms or for any other reason. You may stop using the Service at any time. Upon termination, your right to use the Service ceases and we may delete your data in accordance with our retention policy.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-white mb-3">9. Changes</h2>
                        <p>
                            We may update these Terms from time to time. We will post the updated terms and indicate the effective date. Continued use of the Service after changes constitutes acceptance of the revised Terms.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-white mb-3">10. Contact</h2>
                        <p>
                            For questions about these Terms of Service, contact us at clapsync.support@gmail.com.
                        </p>
                    </section>
                </div>
            </div>
        </main>
    );
}
