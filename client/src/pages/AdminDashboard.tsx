import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { motion } from "framer-motion";
import { Mail, MessageSquare, Trash2, Users, LayoutDashboard, Layers, Filter } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import LogoutButton from "@/components/LogoutButton";
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
  const [activeTab, setActiveTab] = useState<"subscriptions" | "contacts" | "development">("development");
  const [devFilter, setDevFilter] = useState<string>("Бүгд");

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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Холбоо барих", value: contacts.filter((c: any) => c.type === "Холбоо барих").length, icon: MessageSquare, color: "green" },
          { label: "Үнийн санал", value: contacts.filter((c: any) => c.type === "Үнийн санал").length, icon: Layers, color: "amber" },
          { label: "Ажлын байр", value: subscriptions.filter((s: any) => s.type === "Ажлын байр").length, icon: Users, color: "purple" },
          { label: "Төслийн мэдээ", value: subscriptions.filter((s: any) => s.type === "Төслийн мэдээ").length, icon: Mail, color: "blue" },
        ].map((card) => (
          <div key={card.label} className="bg-slate-900/60 border border-white/10 rounded-2xl p-5 flex items-center gap-4">
            <div className={`p-3 rounded-xl ${card.color === "green" ? "bg-green-600/20" : card.color === "amber" ? "bg-amber-600/20" : card.color === "purple" ? "bg-purple-600/20" : "bg-blue-600/20"}`}>
              <card.icon className={`w-5 h-5 ${card.color === "green" ? "text-green-400" : card.color === "amber" ? "text-amber-400" : card.color === "purple" ? "text-purple-400" : "text-blue-400"}`} />
            </div>
            <div>
              <p className="text-slate-400 text-xs">{card.label}</p>
              <p className="text-2xl font-bold text-white">{card.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {[
          { key: "development", label: "Төслийн хөгжүүлэлт", icon: Layers },
          { key: "subscriptions", label: "И-мэйл бүртгэл", icon: Mail },
          { key: "contacts", label: "Холбоо барих", icon: MessageSquare },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
              activeTab === tab.key ? "bg-amber-600 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700"
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

      {/* Төслийн хөгжүүлэлт — нэгдсэн бүртгэлийн самбар */}
      {activeTab === "development" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          {/* Шүүлтүүр */}
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-4 h-4 text-slate-400" />
            {["Бүгд", "Холбоо барих", "Үнийн санал", "Ажлын байр", "Төслийн мэдээ"].map((f) => (
              <button
                key={f}
                onClick={() => setDevFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  devFilter === f ? "bg-amber-600 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                }`}
              >
                {f}
                <span className="ml-1.5 text-xs opacity-70">
                  ({f === "Бүгд"
                    ? contacts.length + subscriptions.length
                    : f === "Холбоо барих" || f === "Үнийн санал"
                      ? contacts.filter((c: any) => c.type === f).length
                      : subscriptions.filter((s: any) => s.type === f).length})
                </span>
              </button>
            ))}
          </div>

          {/* Нэгдсэн хүснэгт */}
          <div className="bg-slate-900/60 rounded-2xl border border-white/10 overflow-hidden">
            {(() => {
              // Contacts болон subscriptions-ийг нэгтгэх
              const contactRows = contacts
                .filter((c: any) => devFilter === "Бүгд" || c.type === devFilter)
                .map((c: any) => ({ id: `c-${c.id}`, rawId: c.id, kind: "contact", name: c.name, email: c.email, phone: c.phone || "-", info: c.message, type: c.type || "Холбоо барих", date: c.createdAt }));
              const subRows = subscriptions
                .filter((s: any) => devFilter === "Бүгд" || s.type === devFilter)
                .map((s: any) => ({ id: `s-${s.id}`, rawId: s.id, kind: "sub", name: "—", email: s.email, phone: "—", info: "И-мэйл бүртгэл", type: s.type, date: s.createdAt }));
              const rows = [...contactRows, ...subRows].sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());

              const TYPE_COLOR: Record<string, string> = {
                "Холбоо барих": "bg-green-600/20 text-green-400",
                "Үнийн санал": "bg-amber-600/20 text-amber-400",
                "Ажлын байр": "bg-purple-600/20 text-purple-400",
                "Төслийн мэдээ": "bg-blue-600/20 text-blue-400",
              };

              if (rows.length === 0) return (
                <div className="p-12 text-center text-slate-400">
                  <Layers className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p>Бүртгэл байхгүй байна</p>
                </div>
              );

              return (
                <table className="w-full">
                  <thead className="bg-slate-800/50 border-b border-white/10">
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
                    {rows.map((row, i) => (
                      <tr key={row.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td className="p-4 text-slate-500 text-sm">{i + 1}</td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded-lg text-xs font-bold ${TYPE_COLOR[row.type] || "bg-slate-700 text-slate-300"}`}>
                            {row.type}
                          </span>
                        </td>
                        <td className="p-4 text-white font-medium">{row.name}</td>
                        <td className="p-4 text-slate-300 text-sm">{row.email}</td>
                        <td className="p-4 text-slate-400 text-sm">{row.phone}</td>
                        <td className="p-4 text-slate-300 text-sm max-w-xs">
                          <p className="truncate">{row.info}</p>
                        </td>
                        <td className="p-4 text-slate-400 text-sm whitespace-nowrap">
                          {row.date ? new Date(row.date).toLocaleDateString("mn-MN") : "-"}
                        </td>
                        <td className="p-4">
                          <button
                            onClick={() => row.kind === "contact" ? deleteContact.mutate(row.rawId) : deleteSub.mutate(row.rawId)}
                            disabled={deleteContact.isPending || deleteSub.isPending}
                            className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              );
            })()}
          </div>
        </motion.div>
      )}
    </div>
  );
}
