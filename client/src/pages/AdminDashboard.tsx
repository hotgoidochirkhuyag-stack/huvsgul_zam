import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { motion } from "framer-motion";
import { Mail, MessageSquare, Trash2, Users, RefreshCw, ExternalLink, Video } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import LogoutButton from "@/components/LogoutButton"; // Өмнө нь хийсэн товч

// --- Үйлдвэрийн хяналтын компонент ---
function FactoryControl({ mode }: { mode: 'DIRECTOR_ENGINEER' | 'ENGINEER_WORKER' | 'VENDOR_SUPPORT' }) {
  const meetRef = useRef<HTMLDivElement>(null);

  const getRoomName = () => {
    switch(mode) {
      case 'DIRECTOR_ENGINEER': return 'Factory_Control_Direct_Line_2026';
      case 'ENGINEER_WORKER': return 'Internal_Technical_Instruction_2026';
      case 'VENDOR_SUPPORT': return 'External_Vendor_Support_Line_2026';
      default: return 'General_Factory_Meeting';
    }
  };

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://meet.jit.si/external_api.js";
    script.async = true;
    document.body.appendChild(script);
    script.onload = () => {
      const options = {
        roomName: getRoomName(),
        width: '100%',
        height: '500px',
        parentNode: meetRef.current,
        configOverwrite: { startWithAudioMuted: false }
      };
      new (window as any).JitsiMeetExternalAPI("meet.jit.si", options);
    };
    return () => { script.remove(); };
  }, [mode]);

  return <div ref={meetRef} className="mt-6 rounded-2xl overflow-hidden border border-white/10" />;
}

export default function AdminDashboard() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"subscriptions" | "contacts" | "video">("subscriptions");
  const [connectionMode, setConnectionMode] = useState<'DIRECTOR_ENGINEER' | 'ENGINEER_WORKER' | 'VENDOR_SUPPORT'>('DIRECTOR_ENGINEER');

  // Өгөгдөл татах функцүүд
  const { data: subscriptions = [], refetch: refetchSubs } = useQuery({ queryKey: ["/api/subscriptions"] });
  const { data: contacts = [], refetch: refetchContacts } = useQuery({ queryKey: ["/api/contacts"] });

  return (
    <div className="min-h-screen bg-[#020617] text-white p-8">
      <header className="flex justify-between items-center mb-10 border-b border-white/10 pb-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Админ Самбар</h1>
          <p className="text-slate-400">Хөвсгөл Зам ХХК - Удирдлагын систем</p>
        </div>
        <LogoutButton />
      </header>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {[
          { key: "subscriptions", label: "И-мэйл", icon: Mail },
          { key: "contacts", label: "Холбоо барих", icon: MessageSquare },
          { key: "video", label: "Хяналт", icon: Video },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key as any)} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold ${activeTab === tab.key ? "bg-blue-600" : "bg-slate-800"}`}>
            <tab.icon className="w-4 h-4" /> {tab.label}
          </button>
        ))}
      </div>

      {/* Video Mode */}
      {activeTab === "video" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-slate-900/60 p-6 rounded-2xl border border-white/10">
          <div className="flex gap-4 mb-6">
            {['DIRECTOR_ENGINEER', 'ENGINEER_WORKER', 'VENDOR_SUPPORT'].map(mode => (
              <button key={mode} onClick={() => setConnectionMode(mode as any)} className={`p-3 rounded-lg border ${connectionMode === mode ? 'bg-blue-600' : 'bg-slate-800'}`}>
                {mode.replace('_', ' ')}
              </button>
            ))}
          </div>
          <FactoryControl mode={connectionMode} />
        </motion.div>
      )}

      {/* Data Modes (Subscriptions/Contacts) - ... бусад кодоо энд оруулаарай */}
    </div>
  );
}