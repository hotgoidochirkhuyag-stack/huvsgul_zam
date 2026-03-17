import { FactoryControl } from "@/components/FactoryControl";
import { Wrench, LogOut } from "lucide-react";
import { useLocation } from "wouter";

export default function EngineerDashboard() {
  const [, setLocation] = useLocation();
  const handleLogout = () => {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("userRole");
    setLocation("/select-role");
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