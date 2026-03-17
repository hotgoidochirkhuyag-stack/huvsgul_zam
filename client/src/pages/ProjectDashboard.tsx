import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { motion } from "framer-motion";
import {
  MessageSquare, Trash2, Users, Mail, Filter, Layers,
  LayoutDashboard, Phone, Calendar, ChevronDown, ChevronUp
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import LogoutButton from "@/components/LogoutButton";

function getHeaders() {
  return {
    "Content-Type": "application/json",
    "x-admin-token": localStorage.getItem("adminToken") || "",
  };
}

const TYPE_STYLE: Record<string, { bg: string; text: string; border: string }> = {
  "Холбоо барих": { bg: "bg-green-600/20", text: "text-green-400", border: "border-green-500/30" },
  "Үнийн санал":  { bg: "bg-amber-600/20",  text: "text-amber-400",  border: "border-amber-500/30"  },
  "Ажлын байр":   { bg: "bg-purple-600/20", text: "text-purple-400", border: "border-purple-500/30" },
  "Төслийн мэдээ":{ bg: "bg-blue-600/20",   text: "text-blue-400",   border: "border-blue-500/30"   },
};

const FILTER_ITEMS = ["Бүгд", "Холбоо барих", "Үнийн санал", "Ажлын байр", "Төслийн мэдээ"];

export default function ProjectDashboard() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [filter, setFilter] = useState("Бүгд");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: contacts = [], isLoading: loadingC } = useQuery<any[]>({
    queryKey: ["/api/contacts"],
    queryFn: async () => {
      const res = await fetch("/api/contacts", { headers: getHeaders() });
      if (!res.ok) throw new Error("Татахад алдаа");
      return res.json();
    },
  });

  const { data: subscriptions = [], isLoading: loadingS } = useQuery<any[]>({
    queryKey: ["/api/subscriptions"],
    queryFn: async () => {
      const res = await fetch("/api/subscriptions", { headers: getHeaders() });
      if (!res.ok) throw new Error("Татахад алдаа");
      return res.json();
    },
  });

  const deleteContact = useMutation({
    mutationFn: (id: number) => fetch(`/api/contacts/${id}`, { method: "DELETE", headers: getHeaders() }).then(r => { if (!r.ok) throw new Error(); }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/contacts"] }); toast({ title: "Устгагдлаа" }); },
  });

  const deleteSub = useMutation({
    mutationFn: (id: number) => fetch(`/api/subscriptions/${id}`, { method: "DELETE", headers: getHeaders() }).then(r => { if (!r.ok) throw new Error(); }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/subscriptions"] }); toast({ title: "Устгагдлаа" }); },
  });

  const isLoading = loadingC || loadingS;

  const contactRows = contacts.map((c: any) => ({
    id: `c-${c.id}`, rawId: c.id, kind: "contact" as const,
    name: c.name, email: c.email, phone: c.phone || "—",
    info: c.message, type: c.type || "Холбоо барих", date: c.createdAt,
  }));
  const subRows = subscriptions.map((s: any) => ({
    id: `s-${s.id}`, rawId: s.id, kind: "sub" as const,
    name: "—", email: s.email, phone: "—",
    info: "И-мэйл бүртгэл", type: s.type, date: s.createdAt,
  }));

  const allRows = [...contactRows, ...subRows]
    .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());

  const filtered = filter === "Бүгд" ? allRows : allRows.filter(r => r.type === filter);

  const countOf = (t: string) =>
    t === "Ажлын байр" || t === "Төслийн мэдээ"
      ? subscriptions.filter((s: any) => s.type === t).length
      : contacts.filter((c: any) => c.type === t).length;

  const stats = [
    { label: "Холбоо барих", icon: MessageSquare, key: "Холбоо барих" },
    { label: "Үнийн санал",  icon: Layers,        key: "Үнийн санал"  },
    { label: "Ажлын байр",   icon: Users,          key: "Ажлын байр"   },
    { label: "Төслийн мэдээ",icon: Mail,           key: "Төслийн мэдээ"},
  ];

  return (
    <div className="min-h-screen bg-[#020617] text-white p-6 md:p-8">
      {/* Header */}
      <header className="flex justify-between items-start mb-10 border-b border-white/10 pb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">Төслийн хөгжүүлэлт</h1>
          <p className="text-slate-400 mt-1">Бүртгэлийн нэгдсэн самбар — Хөвсгөл Зам ХХК</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setLocation("/dashboard/admin")}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-white/10 rounded-xl text-sm font-medium transition-all"
          >
            <LayoutDashboard className="w-4 h-4" /> Админ самбар
          </button>
          <LogoutButton />
        </div>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {stats.map(s => {
          const style = TYPE_STYLE[s.key];
          const count = countOf(s.key);
          return (
            <motion.div
              key={s.key}
              whileHover={{ y: -2 }}
              onClick={() => setFilter(filter === s.key ? "Бүгд" : s.key)}
              className={`rounded-2xl p-5 flex items-center gap-4 cursor-pointer border transition-all ${
                filter === s.key
                  ? `${style.bg} ${style.border} border`
                  : "bg-slate-900/60 border border-white/10 hover:border-white/20"
              }`}
            >
              <div className={`p-3 rounded-xl ${style.bg}`}>
                <s.icon className={`w-5 h-5 ${style.text}`} />
              </div>
              <div>
                <p className="text-slate-400 text-xs leading-tight">{s.label}</p>
                <p className="text-3xl font-black text-white">{count}</p>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Filter chips */}
      <div className="flex items-center gap-2 flex-wrap mb-5">
        <Filter className="w-4 h-4 text-slate-500" />
        {FILTER_ITEMS.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filter === f ? "bg-amber-600 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700"
            }`}
          >
            {f}
            {f !== "Бүгд" && (
              <span className="ml-1.5 opacity-60">
                ({countOf(f)})
              </span>
            )}
            {f === "Бүгд" && (
              <span className="ml-1.5 opacity-60">({allRows.length})</span>
            )}
          </button>
        ))}
      </div>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-slate-900/60 rounded-2xl border border-white/10 overflow-hidden"
      >
        {isLoading ? (
          <div className="p-16 text-center text-slate-400">Уншиж байна...</div>
        ) : filtered.length === 0 ? (
          <div className="p-16 text-center text-slate-500">
            <Layers className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p className="text-sm">Бүртгэл байхгүй байна</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-800/60 border-b border-white/10">
                <tr>
                  <th className="text-left p-4 text-slate-400 text-xs uppercase tracking-widest">#</th>
                  <th className="text-left p-4 text-slate-400 text-xs uppercase tracking-widest">Төрөл</th>
                  <th className="text-left p-4 text-slate-400 text-xs uppercase tracking-widest">Нэр</th>
                  <th className="text-left p-4 text-slate-400 text-xs uppercase tracking-widest">И-мэйл</th>
                  <th className="text-left p-4 text-slate-400 text-xs uppercase tracking-widest">Утас</th>
                  <th className="text-left p-4 text-slate-400 text-xs uppercase tracking-widest">Мэдэгдэл</th>
                  <th className="text-left p-4 text-slate-400 text-xs uppercase tracking-widest">Огноо</th>
                  <th className="text-left p-4 text-slate-400 text-xs uppercase tracking-widest"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row, i) => {
                  const style = TYPE_STYLE[row.type] || { bg: "bg-slate-700", text: "text-slate-300", border: "" };
                  const isExpanded = expandedId === row.id;
                  return (
                    <>
                      <tr
                        key={row.id}
                        className="border-b border-white/5 hover:bg-white/[0.03] transition-colors cursor-pointer"
                        onClick={() => setExpandedId(isExpanded ? null : row.id)}
                      >
                        <td className="p-4 text-slate-500 text-sm">{i + 1}</td>
                        <td className="p-4">
                          <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${style.bg} ${style.text}`}>
                            {row.type}
                          </span>
                        </td>
                        <td className="p-4 text-white font-medium text-sm">{row.name}</td>
                        <td className="p-4 text-slate-300 text-sm">
                          <a href={`mailto:${row.email}`} className="hover:text-amber-400 transition-colors" onClick={e => e.stopPropagation()}>
                            {row.email}
                          </a>
                        </td>
                        <td className="p-4 text-slate-400 text-sm">{row.phone}</td>
                        <td className="p-4 text-slate-300 text-sm max-w-[220px]">
                          <p className="truncate">{row.info}</p>
                        </td>
                        <td className="p-4 text-slate-500 text-xs whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {row.date ? new Date(row.date).toLocaleDateString("mn-MN") : "—"}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-1">
                            {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                            <button
                              onClick={e => { e.stopPropagation(); row.kind === "contact" ? deleteContact.mutate(row.rawId) : deleteSub.mutate(row.rawId); }}
                              disabled={deleteContact.isPending || deleteSub.isPending}
                              className="p-1.5 text-red-400 hover:bg-red-500/20 rounded-lg transition-all"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                      {isExpanded && row.kind === "contact" && (
                        <tr key={`${row.id}-expand`} className="border-b border-white/5 bg-slate-900/40">
                          <td colSpan={8} className="px-8 py-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                              <div>
                                <p className="text-slate-500 text-xs uppercase tracking-wider mb-1">Нэр</p>
                                <p className="text-white">{row.name}</p>
                              </div>
                              <div>
                                <p className="text-slate-500 text-xs uppercase tracking-wider mb-1 flex items-center gap-1"><Mail className="w-3 h-3" /> И-мэйл</p>
                                <a href={`mailto:${row.email}`} className="text-amber-400 hover:underline">{row.email}</a>
                              </div>
                              <div>
                                <p className="text-slate-500 text-xs uppercase tracking-wider mb-1 flex items-center gap-1"><Phone className="w-3 h-3" /> Утас</p>
                                <p className="text-white">{row.phone}</p>
                              </div>
                              <div className="md:col-span-3">
                                <p className="text-slate-500 text-xs uppercase tracking-wider mb-1">Мэдэгдэл / Хүсэлт</p>
                                <p className="text-slate-200 leading-relaxed bg-slate-800/50 rounded-xl p-4">{row.info}</p>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </div>
  );
}
