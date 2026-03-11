import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Save, Shield, BarChart3, Settings } from "lucide-react";

const COOKIE_KEYS = {
    necessary: "clapsync_cookies_necessary",
    analytics: "clapsync_cookies_analytics",
    preferences: "clapsync_cookies_preferences",
} as const;

function getStored(key: string, defaultVal: boolean): boolean {
    try {
        const v = localStorage.getItem(key);
        return v !== null ? v === "true" : defaultVal;
    } catch {
        return defaultVal;
    }
}

function setStored(key: string, value: boolean) {
    try {
        localStorage.setItem(key, String(value));
    } catch {
        /* ignore */
    }
}

export default function CookieSettingsContent() {
    const [necessary, setNecessary] = useState(true);
    const [analytics, setAnalytics] = useState(false);
    const [preferences, setPreferences] = useState(true);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        setNecessary(getStored(COOKIE_KEYS.necessary, true));
        setAnalytics(getStored(COOKIE_KEYS.analytics, false));
        setPreferences(getStored(COOKIE_KEYS.preferences, true));
    }, []);

    const handleSave = () => {
        setStored(COOKIE_KEYS.necessary, necessary);
        setStored(COOKIE_KEYS.analytics, analytics);
        setStored(COOKIE_KEYS.preferences, preferences);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
    };

    return (
        <main className="min-h-[calc(100vh-4rem)] mt-20 bg-gradient-to-b from-slate-900 to-slate-800 text-white">
            <div className="max-w-3xl mx-auto px-6 sm:px-8 lg:px-12 py-12 sm:py-16">
                <h1 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-slate-200 to-gray-300 bg-clip-text text-transparent mb-2">
                    Cookie Settings
                </h1>
                <p className="text-gray-400 text-sm mb-10">
                    Manage how ClapSync uses cookies and similar technologies. Necessary cookies are required for the service to function.
                </p>

                <div className="space-y-6 mb-10">
                    {/* Necessary */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
                        <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-lg bg-blue-900/50 flex items-center justify-center flex-shrink-0">
                                <Shield className="w-5 h-5 text-blue-300" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-white">Necessary</h3>
                                <p className="text-gray-400 text-sm mt-1">
                                    Required for authentication, session management, and security. Cannot be disabled.
                                </p>
                            </div>
                        </div>
                        <label className="flex items-center gap-2 cursor-pointer flex-shrink-0">
                            <input
                                type="checkbox"
                                checked={necessary}
                                disabled
                                className="rounded border-slate-600 bg-slate-700 text-blue-500"
                            />
                            <span className="text-sm text-gray-400">Always on</span>
                        </label>
                    </div>

                    {/* Analytics */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
                        <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-lg bg-blue-900/50 flex items-center justify-center flex-shrink-0">
                                <BarChart3 className="w-5 h-5 text-blue-300" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-white">Analytics</h3>
                                <p className="text-gray-400 text-sm mt-1">
                                    Help us understand how the service is used (e.g., page views, feature usage) to improve ClapSync.
                                </p>
                            </div>
                        </div>
                        <label className="flex items-center gap-2 cursor-pointer flex-shrink-0">
                            <input
                                type="checkbox"
                                checked={analytics}
                                onChange={(e) => setAnalytics(e.target.checked)}
                                className="rounded border-slate-600 bg-slate-700 text-blue-500 focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-300">Enabled</span>
                        </label>
                    </div>

                    {/* Preferences */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
                        <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-lg bg-blue-900/50 flex items-center justify-center flex-shrink-0">
                                <Settings className="w-5 h-5 text-blue-300" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-white">Preferences</h3>
                                <p className="text-gray-400 text-sm mt-1">
                                    Remember your settings (e.g., cookie choices, language, or display preferences).
                                </p>
                            </div>
                        </div>
                        <label className="flex items-center gap-2 cursor-pointer flex-shrink-0">
                            <input
                                type="checkbox"
                                checked={preferences}
                                onChange={(e) => setPreferences(e.target.checked)}
                                className="rounded border-slate-600 bg-slate-700 text-blue-500 focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-300">Enabled</span>
                        </label>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                    <button
                        type="button"
                        onClick={handleSave}
                        className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg font-semibold bg-gradient-to-r from-blue-800 to-indigo-800 text-white hover:from-blue-700 hover:to-indigo-700 transition-all duration-200"
                    >
                        <Save className="w-4 h-4" />
                        {saved ? "Saved" : "Save preferences"}
                    </button>
                    <Link
                        to="/privacy"
                        className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg font-medium border border-slate-600 text-gray-300 hover:bg-slate-800/50 transition-colors"
                    >
                        Privacy Policy
                    </Link>
                </div>

                <p className="text-gray-500 text-xs mt-6">
                    Your choices are stored locally in your browser. Clearing site data will reset these settings.
                </p>
            </div>
        </main>
    );
}
