import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck, X, ShoppingCart, FileText, MessageSquare } from "lucide-react";
import type { Notification } from "@shared/schema";

function timeAgo(date: string | Date | null) {
  if (!date) return "";
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Дөнгөж сая";
  if (mins < 60) return `${mins} мин өмнө`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} цаг өмнө`;
  return `${Math.floor(hrs / 24)} өдөр өмнө`;
}

const SOURCE_ICON: Record<string, any> = {
  project_order: ShoppingCart,
  contract:      FileText,
  request:       MessageSquare,
};

export default function NotificationBell({ role }: { role: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const qc  = useQueryClient();

  // Гадна дарахад хаах
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const { data: notifs = [] } = useQuery<Notification[]>({
    queryKey: ["/api/notifications", role],
    queryFn: () =>
      fetch(`/api/notifications?role=${role}`, {
        headers: { "x-admin-token": localStorage.getItem("adminToken") ?? "" },
      }).then(r => r.json()),
    refetchInterval: 15000,
  });

  const unread = notifs.filter(n => !n.isRead).length;

  const markRead = useMutation({
    mutationFn: (id: number) =>
      fetch(`/api/notifications/${id}/read`, {
        method: "PATCH",
        headers: { "x-admin-token": localStorage.getItem("adminToken") ?? "" },
      }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/notifications", role] }),
  });

  const markAll = useMutation({
    mutationFn: () =>
      fetch("/api/notifications/read-all", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-token": localStorage.getItem("adminToken") ?? "" },
        body: JSON.stringify({ role }),
      }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/notifications", role] }),
  });

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="relative p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/50 transition-all"
        data-testid="btn-notification-bell"
      >
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 w-80 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl z-50 overflow-hidden">
          {/* Толгой */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
            <div className="flex items-center gap-2">
              <Bell size={14} className="text-amber-400" />
              <span className="text-sm font-bold text-white">Мэдэгдэл</span>
              {unread > 0 && (
                <span className="text-xs bg-red-500/20 text-red-400 border border-red-500/30 px-1.5 py-0.5 rounded-full font-bold">
                  {unread} шинэ
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unread > 0 && (
                <button
                  onClick={() => markAll.mutate()}
                  className="text-xs text-slate-400 hover:text-amber-400 flex items-center gap-1 px-2 py-1 rounded hover:bg-slate-700/50 transition-all"
                  data-testid="btn-mark-all-read"
                  title="Бүгдийг уншсан болгох"
                >
                  <CheckCheck size={12} /> Бүгд
                </button>
              )}
              <button onClick={() => setOpen(false)} className="text-slate-500 hover:text-white p-1 rounded">
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Жагсаалт */}
          <div className="max-h-96 overflow-y-auto divide-y divide-slate-800">
            {notifs.length === 0 ? (
              <div className="py-10 text-center text-slate-500 text-sm">
                <Bell size={24} className="mx-auto mb-2 opacity-20" />
                Мэдэгдэл байхгүй байна
              </div>
            ) : (
              notifs.map(n => {
                const Icon = SOURCE_ICON[n.sourceType ?? ""] ?? Bell;
                return (
                  <div
                    key={n.id}
                    onClick={() => { if (!n.isRead) markRead.mutate(n.id); }}
                    className={`flex gap-3 px-4 py-3 cursor-pointer transition-all hover:bg-slate-800/60 ${!n.isRead ? "bg-amber-500/5" : ""}`}
                    data-testid={`notification-item-${n.id}`}
                  >
                    <div className={`mt-0.5 shrink-0 w-7 h-7 rounded-lg flex items-center justify-center ${!n.isRead ? "bg-amber-500/20" : "bg-slate-700/50"}`}>
                      <Icon size={13} className={!n.isRead ? "text-amber-400" : "text-slate-500"} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-semibold leading-snug ${!n.isRead ? "text-white" : "text-slate-400"}`}>
                        {n.title}
                        {!n.isRead && <span className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full bg-amber-400 align-middle" />}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5 leading-snug line-clamp-2">{n.body}</p>
                      <p className="text-[10px] text-slate-600 mt-1">{timeAgo(n.createdAt)}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
