import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { motion } from "framer-motion";
import { Mail, MessageSquare, Trash2, LogOut, Users, RefreshCw, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Subscription, Contact } from "@shared/schema";

const getToken = () => localStorage.getItem("adminToken") || "";

const adminFetch = (url: string, options: RequestInit = {}) =>
  fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "x-admin-token": getToken(),
      ...(options.headers || {}),
    },
  });

export default function AdminDashboard() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"subscriptions" | "contacts">("subscriptions");

  useEffect(() => {
    if (!localStorage.getItem("isAdmin") || !localStorage.getItem("adminToken")) {
      window.location.href = "/admin";
    }
  }, []);

  const { data: subscriptions = [], isLoading: subLoading, refetch: refetchSubs } = useQuery<Subscription[]>({
    queryKey: ["/api/subscriptions"],
    queryFn: async () => {
      const res = await adminFetch("/api/subscriptions");
      if (res.status === 401) { window.location.href = "/admin"; throw new Error("Unauthorized"); }
      if (!res.ok) throw new Error("Татахад алдаа");
      return res.json();
    },
  });

  const { data: contacts = [], isLoading: contactLoading, refetch: refetchContacts } = useQuery<Contact[]>({
    queryKey: ["/api/contacts"],
    queryFn: async () => {
      const res = await adminFetch("/api/contacts");
      if (res.status === 401) { window.location.href = "/admin"; throw new Error("Unauthorized"); }
      if (!res.ok) throw new Error("Татахад алдаа");
      return res.json();
    },
  });

  const deleteSub = useMutation({
    mutationFn: async (id: number) => {
      const res = await adminFetch(`/api/subscriptions/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Устгахад алдаа");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscriptions"] });
      toast({ title: "Амжилттай устгагдлаа" });
    },
  });

  const deleteContact = useMutation({
    mutationFn: async (id: number) => {
      const res = await adminFetch(`/api/contacts/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Устгахад алдаа");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      toast({ title: "Амжилттай устгагдлаа" });
    },
  });

  const handleLogout = () => {
    localStorage.removeItem("isAdmin");
    localStorage.removeItem("adminToken");
    window.location.href = "/admin";
  };

  const formatDate = (d: string | Date | null) => {
    if (!d) return "-";
    return new Date(d).toLocaleDateString("mn-MN", {
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit",
    });
  };

  const jobSubs = subscriptions.filter(s => s.type === "Ажлын байр");
  const newsSubs = subscriptions.filter(s => s.type === "Төслийн мэдээ");

  return (
    <div className="min-h-screen bg-[#020617] text-white">

      {/* Header */}
      <header className="border-b border-white/10 bg-slate-900/60 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <a href="/" className="text-slate-400 hover:text-white transition-colors">
              <ExternalLink className="w-4 h-4" />
            </a>
            <div className="w-px h-5 bg-white/10"></div>
            <h1 className="text-lg font-bold text-white uppercase tracking-widest">Удирдах самбар</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <Users className="w-4 h-4" />
              <span>{subscriptions.length} бүртгэл</span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors px-4 py-2 rounded-lg border border-white/10 hover:border-white/30"
            >
              <LogOut className="w-4 h-4" />
              Гарах
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10">

        {/* Stats cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {[
            { label: "Нийт бүртгэл", value: subscriptions.length, color: "text-blue-400" },
            { label: "Ажлын байр", value: jobSubs.length, color: "text-green-400" },
            { label: "Төслийн мэдээ", value: newsSubs.length, color: "text-yellow-400" },
            { label: "Холбоо барих", value: contacts.length, color: "text-purple-400" },
          ].map((stat, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="bg-slate-900/60 border border-white/10 rounded-2xl p-5">
              <p className="text-xs text-slate-400 uppercase tracking-widest mb-2">{stat.label}</p>
              <p className={`text-3xl font-black ${stat.color}`}>{stat.value}</p>
            </motion.div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {[
            { key: "subscriptions", label: "И-мэйл бүртгэл", icon: Mail },
            { key: "contacts", label: "Холбоо барих мэдэгдэл", icon: MessageSquare },
          ].map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === tab.key ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400 hover:text-white"}`}>
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
          <button onClick={() => { refetchSubs(); refetchContacts(); }}
            className="ml-auto flex items-center gap-2 px-4 py-2 rounded-xl text-sm text-slate-400 hover:text-white border border-white/10 hover:border-white/30 transition-all">
            <RefreshCw className="w-4 h-4" />
            Шинэчлэх
          </button>
        </div>

        {/* Subscriptions tab */}
        {activeTab === "subscriptions" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-slate-900/40 border border-white/10 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
              <h2 className="font-bold text-white">И-мэйл бүртгэлийн жагсаалт</h2>
              <span className="text-xs text-slate-400 bg-slate-800 px-3 py-1 rounded-full">{subscriptions.length} нийт</span>
            </div>
            {subLoading ? (
              <div className="p-10 text-center text-slate-400">Уншиж байна...</div>
            ) : subscriptions.length === 0 ? (
              <div className="p-10 text-center text-slate-500">
                <Mail className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>Одоогоор бүртгэл байхгүй байна</p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {subscriptions.map((sub) => (
                  <div key={sub.id} className="px-6 py-4 flex items-center justify-between hover:bg-white/5 transition-colors group">
                    <div className="flex items-center gap-4">
                      <div className="w-9 h-9 rounded-full bg-blue-600/20 flex items-center justify-center shrink-0">
                        <Mail className="w-4 h-4 text-blue-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{sub.email}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${sub.type === "Ажлын байр" ? "bg-green-600/20 text-green-400" : "bg-yellow-600/20 text-yellow-400"}`}>
                            {sub.type}
                          </span>
                          <span className="text-[11px] text-slate-500">{formatDate(sub.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => deleteSub.mutate(sub.id)}
                      disabled={deleteSub.isPending}
                      className="opacity-0 group-hover:opacity-100 p-2 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Contacts tab */}
        {activeTab === "contacts" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-slate-900/40 border border-white/10 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
              <h2 className="font-bold text-white">Холбоо барих мэдэгдэлүүд</h2>
              <span className="text-xs text-slate-400 bg-slate-800 px-3 py-1 rounded-full">{contacts.length} нийт</span>
            </div>
            {contactLoading ? (
              <div className="p-10 text-center text-slate-400">Уншиж байна...</div>
            ) : contacts.length === 0 ? (
              <div className="p-10 text-center text-slate-500">
                <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>Одоогоор мэдэгдэл байхгүй байна</p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {contacts.map((c) => (
                  <div key={c.id} className="px-6 py-5 hover:bg-white/5 transition-colors group">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4 flex-1 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-purple-600/20 flex items-center justify-center shrink-0 mt-0.5">
                          <MessageSquare className="w-4 h-4 text-purple-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-1">
                            <p className="text-sm font-bold text-white">{c.name}</p>
                            <span className="text-[11px] text-slate-500">{formatDate(c.createdAt)}</span>
                          </div>
                          <div className="flex flex-wrap gap-3 mb-2">
                            <a href={`mailto:${c.email}`} className="text-xs text-blue-400 hover:underline">{c.email}</a>
                            {c.phone && <span className="text-xs text-slate-400">{c.phone}</span>}
                          </div>
                          <p className="text-sm text-slate-300 leading-relaxed bg-white/5 rounded-lg px-4 py-3">{c.message}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => deleteContact.mutate(c.id)}
                        disabled={deleteContact.isPending}
                        className="opacity-0 group-hover:opacity-100 p-2 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </main>
    </div>
  );
}
