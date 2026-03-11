import Navbar from "../components/Navbar";
import PrivacyPolicyContent from "../components/PrivacyPolicyContent";

export default function PrivacyPolicy() {
    return (
        <div className="h-screen overflow-y-auto overflow-x-hidden scrollbar-hide bg-slate-900 text-white">
            <Navbar />
            <PrivacyPolicyContent />
        </div>
    );
}
