import { FactoryControl } from "@/components/FactoryControl";
import { Wrench, LogOut, FlaskConical, ExternalLink } from "lucide-react";

export default function EngineerDashboard() {
  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/admin/ENGINEER";
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white p-8">
      {/* Header хэсэг */}
      <div className="flex flex-wrap justify-between items-center mb-8 border-b border-white/10 pb-6 gap-3">
        <div className="flex items-center gap-3">
          <Wrench className="w-8 h-8 text-blue-500" />
          <h1 className="text-2xl font-bold uppercase tracking-widest">Инженерийн хяналтын самбар</h1>
        </div>
        <div className="flex items-center gap-2">
          <a href="/dashboard/lab-qc"
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 rounded-lg transition-all text-sm font-semibold">
            <FlaskConical size={16} /> Лабораторийн хяналт <ExternalLink size={12} />
          </a>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 bg-red-600/20 text-red-400 hover:bg-red-600/30 rounded-lg transition-all"
          >
            <LogOut size={16} /> Гарах
          </button>
        </div>
      </div>

      {/* Гол контент */}
      <div className="grid grid-cols-1 gap-6">
        <div className="bg-slate-900/50 p-6 rounded-2xl border border-white/10">
          <h2 className="text-sm text-slate-400 mb-4 uppercase tracking-wider">Техникийн шууд хяналт</h2>
          <FactoryControl mode="ENGINEER_WORKER" />
        </div>
      </div>
    </div>
  );
}