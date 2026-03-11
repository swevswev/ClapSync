import Navbar from "../components/Navbar";
import Collaborate from "../components/features/collaborate";

export default function TestCollaborate() {
  return (
    <div className="min-h-screen bg-slate-900 text-white overflow-hidden">
      <Navbar />
      <main className="pt-24 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
        <h1 className="text-2xl font-semibold text-slate-200 mb-6">
          Collaborate component (testing)
        </h1>
        <Collaborate />
      </main>
    </div>
  );
}
