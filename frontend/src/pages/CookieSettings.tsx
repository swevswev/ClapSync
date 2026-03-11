import Navbar from "../components/Navbar";
import CookieSettingsContent from "../components/CookieSettingsContent";

export default function CookieSettings() {
    return (
        <div className="min-h-screen bg-slate-900 text-white overflow-hidden">
            <Navbar />
            <CookieSettingsContent />
        </div>
    );
}
