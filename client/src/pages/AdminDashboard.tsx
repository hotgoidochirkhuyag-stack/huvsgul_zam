import { useLocation } from "wouter";
import { LayoutDashboard } from "lucide-react";
import { motion } from "framer-motion";
import LogoutButton from "@/components/LogoutButton";

export default function AdminDashboard() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-[#020617] text-white flex flex-col">
      <header className="flex justify-between items-center px-8 py-5 border-b border-white/10">
        <div>
          <h1 className="text-2xl font-bold text-white">Админ самбар</h1>
          <p className="text-slate-400 text-sm">Хөвсгөл Зам ХХК — Удирдлагын систем</p>
        </div>
        <LogoutButton />
      </header>

      <div className="flex-1 flex items-center justify-center p-8">
        <motion.button
          whileHover={{ scale: 1.04, y: -4 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => setLocation("/erp")}
          data-testid="btn-erp-system"
          className="flex flex-col items-center gap-5 px-16 py-12 bg-amber-600/10 border border-amber-500/30 hover:bg-amber-600/20 hover:border-amber-400/60 rounded-3xl transition-all shadow-lg shadow-amber-900/20"
        >
          <div className="p-5 bg-amber-600/20 rounded-2xl">
            <LayoutDashboard className="w-12 h-12 text-amber-400" />
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-white">ERP Систем</p>
            <p className="text-slate-400 mt-1">Удирдлагын нэгдсэн систем</p>
          </div>
        </motion.button>
      </div>
    </div>
  );
}
