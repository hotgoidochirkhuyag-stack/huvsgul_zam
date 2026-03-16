import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { motion } from "framer-motion";
import { Mail, MessageSquare, Trash2, Users, Video, LayoutDashboard } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import LogoutButton from "@/components/LogoutButton";
import { FactoryControl } from "@/components/FactoryControl";
import { useLocation } from "wouter";

function getAdminHeaders() {
  return {
    "Content-Type": "application/json",
    "x-admin-token": localStorage.getItem("adminToken") || "",
  };
}

export default function AdminDashboard() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<"subscriptions" | "contacts" | "video">("subscriptions");
  const [connectionMode, setConnectionMode] = useState<"DIRECTOR_ENGINEER" | "ENGINEER_WORKER" | "VENDOR_SUPPORT">("DIRECTOR_ENGINEER");

  const { data: subscriptions = [], isLoading: loadingSubs } = useQuery<any[]>({
    queryKey: ["/api/subscriptions"],
    queryFn: async () => {
      const res = await fetch("/api/subscriptions", { headers: getAdminHeaders() });
      if (!res.ok) throw new Error("Татахад алдаа гарлаа");
      return res.json();
    },
  });

  const { data: contacts = [], isLoading: loadingContacts } = useQuery<any[]>({
    queryKey: ["/api/contacts"],
    queryFn: async () => {
      const res = await fetch("/api/contacts", { headers: getAdminHeaders() });
      if (!res.ok) throw new Error("Татахад алдаа гарлаа");
      return res.json();
    },
  });

  const deleteSub = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/subscriptions/${id}`, {
        method: "DELETE",
        headers: getAdminHeaders(),
      });
      if (!res.ok) throw new Error("Устгахад алдаа");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscriptions"] });
      toast({ title: "Амжилттай устгалаа" });
    },
  });

  const deleteContact = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/contacts/${id}`, {
        method: "DELETE",
        headers: getAdminHeaders(),
      });
      if (!res.ok) throw new Error("Устгахад алдаа");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      toast({ title: "Амжилттай устгалаа" });
    },
  });

  return (
    <div className="min-h-screen bg-[#020617] text-white p-8">
      <header className="flex justify-between items-center mb-10 border-b border-white/10 pb-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Админ Самбар</h1>
          <p className="text-slate-400">Хөвсгөл Зам ХХК - Удирдлагын систем</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setLocation("/erp")}
            data-testid="btn-erp-dashboard"
            className="flex items-center gap-2 px-4 py-2 bg-amber-600/20 text-amber-400 hover:bg-amber-600/30 border border-amber-500/30 rounded-xl text-sm font-bold transition-all"
          >
            <LayoutDashboard className="w-4 h-4" /> ERP Систем
          </button>
          <LogoutButton />
        </div>
      </header>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {[
          { label: "Бүртгэлтэй и-мэйл", value: subscriptions.length, icon: Mail, color: "blue" },
          { label: "Холбоо барих хүсэлт", value: contacts.length, icon: MessageSquare, color: "green" },
          { label: "Нийт хэрэглэгч", value: subscriptions.length + contacts.length, icon: Users, color: "purple" },
        ].map((card) => (
          <div key={card.label} className="bg-slate-900/60 border border-white/10 rounded-2xl p-6 flex items-center gap-4">
            <div className={`p-3 bg-${card.color}-600/20 rounded-xl`}>
              <card.icon className={`w-6 h-6 text-${card.color}-400`} />
            </div>
            <div>
              <p className="text-slate-400 text-sm">{card.label}</p>
              <p className="text-2xl font-bold text-white">{card.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {[
          { key: "subscriptions", label: "И-мэйл", icon: Mail },
          { key: "contacts", label: "Холбоо барих", icon: MessageSquare },
          { key: "video", label: "Хяналт", icon: Video },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
              activeTab === tab.key ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700"
            }`}
          >
            <tab.icon className="w-4 h-4" /> {tab.label}
          </button>
        ))}
      </div>

      {/* Subscriptions Tab */}
      {activeTab === "subscriptions" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-slate-900/60 rounded-2xl border border-white/10 overflow-hidden">
          {loadingSubs ? (
            <div className="p-10 text-center text-slate-400">Уншиж байна...</div>
          ) : subscriptions.length === 0 ? (
            <div className="p-10 text-center text-slate-400">И-мэйл бүртгэл байхгүй байна</div>
          ) : (
            <table className="w-full">
              <thead className="bg-slate-800/50 border-b border-white/10">
                <tr>
                  <th className="text-left p-4 text-slate-400 text-xs uppercase tracking-widest">#</th>
                  <th className="text-left p-4 text-slate-400 text-xs uppercase tracking-widest">И-мэйл</th>
                  <th className="text-left p-4 text-slate-400 text-xs uppercase tracking-widest">Төрөл</th>
                  <th className="text-left p-4 text-slate-400 text-xs uppercase tracking-widest">Огноо</th>
                  <th className="text-left p-4 text-slate-400 text-xs uppercase tracking-widest"></th>
                </tr>
              </thead>
              <tbody>
                {subscriptions.map((sub: any, i: number) => (
                  <tr key={sub.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="p-4 text-slate-500 text-sm">{i + 1}</td>
                    <td className="p-4 text-white">{sub.email}</td>
                    <td className="p-4">
                      <span className="px-2 py-1 bg-blue-600/20 text-blue-400 rounded-lg text-xs font-medium">{sub.type}</span>
                    </td>
                    <td className="p-4 text-slate-400 text-sm">
                      {sub.createdAt ? new Date(sub.createdAt).toLocaleDateString("mn-MN") : "-"}
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => deleteSub.mutate(sub.id)}
                        disabled={deleteSub.isPending}
                        className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </motion.div>
      )}

      {/* Contacts Tab */}
      {activeTab === "contacts" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-slate-900/60 rounded-2xl border border-white/10 overflow-hidden">
          {loadingContacts ? (
            <div className="p-10 text-center text-slate-400">Уншиж байна...</div>
          ) : contacts.length === 0 ? (
            <div className="p-10 text-center text-slate-400">Холбоо барих хүсэлт байхгүй байна</div>
          ) : (
            <table className="w-full">
              <thead className="bg-slate-800/50 border-b border-white/10">
                <tr>
                  <th className="text-left p-4 text-slate-400 text-xs uppercase tracking-widest">#</th>
                  <th className="text-left p-4 text-slate-400 text-xs uppercase tracking-widest">Нэр</th>
                  <th className="text-left p-4 text-slate-400 text-xs uppercase tracking-widest">И-мэйл</th>
                  <th className="text-left p-4 text-slate-400 text-xs uppercase tracking-widest">Утас</th>
                  <th className="text-left p-4 text-slate-400 text-xs uppercase tracking-widest">Мэдэгдэл</th>
                  <th className="text-left p-4 text-slate-400 text-xs uppercase tracking-widest">Огноо</th>
                  <th className="text-left p-4 text-slate-400 text-xs uppercase tracking-widest"></th>
                </tr>
              </thead>
              <tbody>
                {contacts.map((c: any, i: number) => (
                  <tr key={c.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="p-4 text-slate-500 text-sm">{i + 1}</td>
                    <td className="p-4 text-white font-medium">{c.name}</td>
                    <td className="p-4 text-slate-300">{c.email}</td>
                    <td className="p-4 text-slate-400">{c.phone || "-"}</td>
                    <td className="p-4 text-slate-300 max-w-xs">
                      <p className="truncate">{c.message}</p>
                    </td>
                    <td className="p-4 text-slate-400 text-sm">
                      {c.createdAt ? new Date(c.createdAt).toLocaleDateString("mn-MN") : "-"}
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => deleteContact.mutate(c.id)}
                        disabled={deleteContact.isPending}
                        className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </motion.div>
      )}

      {/* Video/Control Tab */}
      {activeTab === "video" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-slate-900/60 p-6 rounded-2xl border border-white/10">
          <div className="flex gap-4 mb-6 flex-wrap">
            {[
              { key: "DIRECTOR_ENGINEER", label: "Захирал - Инженер" },
              { key: "ENGINEER_WORKER", label: "Инженер - Ажилчид" },
              { key: "VENDOR_SUPPORT", label: "Гадаад дэмжлэг" },
            ].map((mode) => (
              <button
                key={mode.key}
                onClick={() => setConnectionMode(mode.key as any)}
                className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                  connectionMode === mode.key
                    ? "bg-blue-600 border-blue-500 text-white"
                    : "bg-slate-800 border-white/10 text-slate-400 hover:border-white/30"
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>
          <FactoryControl mode={connectionMode} />
        </motion.div>
      )}
    </div>
  );
}
