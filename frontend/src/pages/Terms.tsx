import Navbar from "../components/Navbar";
import TermsContent from "../components/TermsContent";

export default function Terms() {
    return (
        <div className="h-screen overflow-y-auto overflow-x-hidden scrollbar-hide bg-slate-900 text-white">
            <Navbar />
            <TermsContent />
        </div>
    );
}
