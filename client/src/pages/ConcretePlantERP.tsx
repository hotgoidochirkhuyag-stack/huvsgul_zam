import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Factory, FlaskConical, Package, TruckIcon, BarChart3, Plus, ChevronDown, ChevronUp, CheckCircle2, XCircle, Clock, AlertTriangle, Trash2, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

function getHeaders() {
  return { "Content-Type": "application/json", "x-admin-token": localStorage.getItem("adminToken") ?? "" };
}
const fmt = (n: number, d = 1) => n.toFixed(d);
const fmtM = (n: number) => (n / 1_000_000).toFixed(2) + "M";
const TODAY = new Date().toISOString().slice(0, 10);
const GRADES = ["B15", "B20", "B25", "B30", "B35"];
const ORDER_STATUS: Record<string, { label: string; color: string }> = {
  pending:   { label: "Хүлээж байна", color: "text-yellow-400" },
  producing: { label: "Үйлдвэрлэж байна", color: "text-blue-400" },
  delivered: { label: "Хүргэгдсэн", color: "text-green-400" },
  cancelled: { label: "Цуцлагдсан", color: "text-red-400" },
};

// ─── KPI Cards ────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, color = "text-amber-400" }: any) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
      <p className="text-xs text-slate-400 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
    </div>
  );
}

// ─── Tab: Хяналтын самбар ─────────────────────────────────────────────────────
function DashboardTab({ date, setDate }: { date: string; setDate: (d: string) => void }) {
  const { data: summary } = useQuery<any>({ queryKey: ["/api/concrete/summary", date], queryFn: () => fetch(`/api/concrete/summary?date=${date}`, { headers: getHeaders() }).then(r => r.json()) });
  const { data: batches = [] } = useQuery<any[]>({ queryKey: ["/api/concrete/batches", date], queryFn: () => fetch(`/api/concrete/batches?date=${date}`, { headers: getHeaders() }).then(r => r.json()) });

  const todayByGrade = useMemo(() => {
    const m: Record<string, number> = {};
    batches.filter(b => b.status !== "rejected").forEach(b => { m[b.grade] = (m[b.grade] ?? 0) + (b.actualQty ?? b.plannedQty); });
    return m;
  }, [batches]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <input type="date" value={date} onChange={e => setDate(e.target.value)} className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-sm outline-none" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label={`Өнөөдрийн гарц (${date})`} value={`${fmt(summary?.todayM3 ?? 0)} м³`} sub={`${summary?.batchCount ?? 0} зуурах`} />
        <KpiCard label="Сарын нийт гарц" value={`${fmt(summary?.monthM3 ?? 0)} м³`} color="text-blue-400" />
        <KpiCard label="Цементийн зарцуулалт (өнөөдөр)" value={`${fmt((summary?.todayCement ?? 0) / 1000)} тн`} color="text-orange-400" />
        <KpiCard label="Идэвхтэй захиалга" value={summary?.activeOrders ?? 0} sub={`${fmt(summary?.pendingM3 ?? 0)} м³ хүлээгдэж байна`} color="text-purple-400" />
      </div>

      {/* Өдрийн зуурах бүртгэл */}
      <div>
        <h3 className="text-sm font-semibold text-slate-300 mb-3">Өдрийн зуурах бүртгэл</h3>
        {batches.length === 0 ? (
          <div className="bg-white/5 border border-white/10 rounded-xl p-8 text-center text-slate-500 text-sm">Өнөөдөр зуурах бүртгэл байхгүй</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-slate-400 border-b border-white/10">
                <th className="pb-2 pr-4">№</th><th className="pb-2 pr-4">Зэрэглэл</th><th className="pb-2 pr-4">м³</th>
                <th className="pb-2 pr-4">Цемент кг</th><th className="pb-2 pr-4">Слумп мм</th><th className="pb-2 pr-4">Оператор</th>
                <th className="pb-2 pr-4">Миксер</th><th className="pb-2">Төлөв</th>
              </tr></thead>
              <tbody>{batches.map(b => (
                <tr key={b.id} className="border-b border-white/5 hover:bg-white/5">
                  <td className="py-2 pr-4 text-slate-300">{b.batchNumber}</td>
                  <td className="py-2 pr-4"><span className="bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full text-xs font-bold">{b.grade}</span></td>
                  <td className="py-2 pr-4 text-white font-medium">{fmt(b.actualQty ?? b.plannedQty)}</td>
                  <td className="py-2 pr-4 text-slate-300">{b.cementActual ? fmt(b.cementActual, 0) : "—"}</td>
                  <td className="py-2 pr-4">{b.slumpMm ? <span className={`font-medium ${b.slumpMm >= 60 && b.slumpMm <= 180 ? "text-green-400" : "text-red-400"}`}>{b.slumpMm}</span> : "—"}</td>
                  <td className="py-2 pr-4 text-slate-300">{b.operator}</td>
                  <td className="py-2 pr-4 text-slate-400">{b.truckPlate ?? "—"}</td>
                  <td className="py-2">{b.status === "rejected" ? <XCircle className="w-4 h-4 text-red-400" /> : b.warehouseDeducted ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : <Clock className="w-4 h-4 text-yellow-400" />}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </div>

      {/* Зэрэглэл бүрийн гарц */}
      {Object.keys(todayByGrade).length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-300 mb-3">Зэрэглэл бүрийн гарц</h3>
          <div className="flex gap-3 flex-wrap">
            {Object.entries(todayByGrade).map(([g, q]) => (
              <div key={g} className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3 text-center">
                <p className="text-amber-300 font-bold text-lg">{fmt(q as number)} м³</p>
                <p className="text-slate-400 text-xs">{g}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tab: Захиалга ─────────────────────────────────────────────────────────────
function OrdersTab({ mixDesigns }: { mixDesigns: any[] }) {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const emptyForm = { clientName: "", projectName: "", grade: "B25", mixDesignId: "", orderedQty: "", deliveryAddress: "", orderDate: TODAY, deliveryDate: "", unitPrice: "", notes: "" };
  const [form, setForm] = useState(emptyForm);

  const { data: orders = [] } = useQuery<any[]>({ queryKey: ["/api/concrete/orders"], queryFn: () => fetch("/api/concrete/orders", { headers: getHeaders() }).then(r => r.json()) });

  const addMut = useMutation({
    mutationFn: (body: any) => apiRequest("POST", "/api/concrete/orders", body),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/concrete/orders"] }); setShowForm(false); setForm(emptyForm); toast({ title: "Захиалга нэмэгдлээ" }); },
  });
  const patchMut = useMutation({
    mutationFn: ({ id, body }: any) => apiRequest("PATCH", `/api/concrete/orders/${id}`, body),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/concrete/orders"] }); toast({ title: "Шинэчлэгдлээ" }); },
  });
  const delMut = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/concrete/orders/${id}`, {}),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/concrete/orders"] }); toast({ title: "Устгагдлаа" }); },
  });

  const handleSubmit = () => {
    if (!form.clientName || !form.grade || !form.orderedQty) return toast({ title: "Харилцагч, зэрэглэл, хэмжээ бөглөнө үү", variant: "destructive" });
    const md = mixDesigns.find(m => m.grade === form.grade);
    addMut.mutate({ ...form, orderedQty: parseFloat(form.orderedQty), unitPrice: parseFloat(form.unitPrice || "0"), mixDesignId: md?.id ?? null });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-semibold text-slate-300">{orders.length} захиалга</h3>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl px-4 py-2 text-sm font-medium">
          <Plus className="w-4 h-4" /> Шинэ захиалга
        </button>
      </div>

      {showForm && (
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-5 space-y-3">
          <p className="text-sm font-bold text-amber-300">Шинэ захиалга бүртгэх</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {[["clientName","Харилцагч *",""],["projectName","Төслийн нэр",""],["deliveryAddress","Хүргэлтийн хаяг",""]].map(([k,p]) => (
              <div key={k}><label className="text-xs text-slate-500 mb-1 block">{p}</label>
              <input value={(form as any)[k]} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} placeholder={p} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-amber-500/50" /></div>
            ))}
            <div><label className="text-xs text-slate-500 mb-1 block">Бетоны зэрэглэл *</label>
              <select value={form.grade} onChange={e => setForm(f => ({ ...f, grade: e.target.value }))} className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none">
                {GRADES.map(g => <option key={g}>{g}</option>)}
              </select>
            </div>
            <div><label className="text-xs text-slate-500 mb-1 block">Захиалсан хэмжээ (м³) *</label>
              <input type="number" value={form.orderedQty} onChange={e => setForm(f => ({ ...f, orderedQty: e.target.value }))} placeholder="100" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-amber-500/50" />
            </div>
            <div><label className="text-xs text-slate-500 mb-1 block">Нэгжийн үнэ ₮/м³</label>
              <input type="number" value={form.unitPrice} onChange={e => setForm(f => ({ ...f, unitPrice: e.target.value }))} placeholder="280000" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-amber-500/50" />
            </div>
            <div><label className="text-xs text-slate-500 mb-1 block">Захиалгын огноо</label>
              <input type="date" value={form.orderDate} onChange={e => setForm(f => ({ ...f, orderDate: e.target.value }))} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none" />
            </div>
            <div><label className="text-xs text-slate-500 mb-1 block">Хүргэх огноо</label>
              <input type="date" value={form.deliveryDate} onChange={e => setForm(f => ({ ...f, deliveryDate: e.target.value }))} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none" />
            </div>
            <div className="sm:col-span-2 md:col-span-3"><label className="text-xs text-slate-500 mb-1 block">Тэмдэглэл</label>
              <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none" />
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={handleSubmit} disabled={addMut.isPending} className="bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-xl px-6 py-2.5 text-sm font-medium">
              {addMut.isPending ? "Хадгалж байна..." : "Хадгалах"}
            </button>
            <button onClick={() => setShowForm(false)} className="bg-white/10 text-slate-300 rounded-xl px-6 py-2.5 text-sm">Болих</button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {orders.map(order => {
          const pct = order.orderedQty > 0 ? Math.min(100, (order.deliveredQty ?? 0) / order.orderedQty * 100) : 0;
          const st = ORDER_STATUS[order.status] ?? ORDER_STATUS.pending;
          return (
            <div key={order.id} className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
              <div className="p-4 cursor-pointer" onClick={() => setExpandedId(expandedId === order.id ? null : order.id)}>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-slate-500 font-mono">{order.orderNumber}</span>
                      <span className="bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full text-xs font-bold">{order.grade}</span>
                      <span className={`text-xs font-medium ${st.color}`}>{st.label}</span>
                    </div>
                    <p className="text-white font-semibold mt-0.5 truncate">{order.clientName}</p>
                    {order.projectName && <p className="text-xs text-slate-400">{order.projectName}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-white font-bold">{fmt(order.deliveredQty ?? 0)} / {fmt(order.orderedQty)} м³</p>
                    {order.unitPrice > 0 && <p className="text-xs text-slate-400">₮{(order.orderedQty * order.unitPrice).toLocaleString()}</p>}
                  </div>
                  {expandedId === order.id ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
                </div>
                <div className="mt-3 bg-white/10 rounded-full h-1.5">
                  <div className="h-1.5 rounded-full bg-amber-500 transition-all" style={{ width: `${pct}%` }} />
                </div>
              </div>
              {expandedId === order.id && (
                <div className="border-t border-white/10 p-4 bg-white/3 space-y-3">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div><p className="text-slate-500 text-xs">Захиалгын огноо</p><p className="text-white">{order.orderDate}</p></div>
                    <div><p className="text-slate-500 text-xs">Хүргэх огноо</p><p className="text-white">{order.deliveryDate ?? "—"}</p></div>
                    <div><p className="text-slate-500 text-xs">Хүргэлтийн хаяг</p><p className="text-white">{order.deliveryAddress ?? "—"}</p></div>
                    <div><p className="text-slate-500 text-xs">Нэгжийн үнэ</p><p className="text-white">{order.unitPrice ? `₮${order.unitPrice.toLocaleString()}` : "—"}</p></div>
                  </div>
                  {order.notes && <p className="text-xs text-slate-400">{order.notes}</p>}
                  <div className="flex gap-2 flex-wrap">
                    {["pending","producing","delivered","cancelled"].map(s => (
                      <button key={s} onClick={() => patchMut.mutate({ id: order.id, body: { status: s } })}
                        className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${order.status === s ? "bg-amber-600 text-white" : "bg-white/10 text-slate-300 hover:bg-white/20"}`}>
                        {ORDER_STATUS[s].label}
                      </button>
                    ))}
                    <button onClick={() => { if (confirm("Устгах уу?")) delMut.mutate(order.id); }} className="text-xs px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 flex items-center gap-1 ml-auto">
                      <Trash2 className="w-3 h-3" /> Устгах
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Tab: Зуурах бүртгэл (Batch Record) ──────────────────────────────────────
function BatchTab({ mixDesigns }: { mixDesigns: any[] }) {
  const { toast } = useToast();
  const [date, setDate] = useState(TODAY);
  const { data: orders = [] } = useQuery<any[]>({ queryKey: ["/api/concrete/orders"], queryFn: () => fetch("/api/concrete/orders", { headers: getHeaders() }).then(r => r.json()) });
  const { data: batches = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/concrete/batches", date],
    queryFn: () => fetch(`/api/concrete/batches?date=${date}`, { headers: getHeaders() }).then(r => r.json()),
  });

  const emptyForm = { orderId: "", grade: "B25", plannedQty: "1.5", actualQty: "1.5", operator: "", truckPlate: "", slumpMm: "", airTemp: "", startTime: "", notes: "" };
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);

  const addMut = useMutation({
    mutationFn: (body: any) => apiRequest("POST", "/api/concrete/batches", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/concrete/batches"] });
      queryClient.invalidateQueries({ queryKey: ["/api/concrete/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/concrete/summary"] });
      setShowForm(false); setForm(emptyForm);
      toast({ title: "Зуурах бүртгэгдлээ", description: "Агуулахаас материал автоматаар хасагдлаа" });
    },
    onError: (e: any) => toast({ title: "Алдаа", description: e.message, variant: "destructive" }),
  });

  const handleSubmit = () => {
    if (!form.grade || !form.plannedQty || !form.operator) return toast({ title: "Зэрэглэл, хэмжээ, оператор бөглөнө үү", variant: "destructive" });
    const md = mixDesigns.find(m => m.grade === form.grade);
    addMut.mutate({
      grade: form.grade,
      plannedQty: parseFloat(form.plannedQty),
      actualQty: parseFloat(form.actualQty || form.plannedQty),
      operator: form.operator,
      truckPlate: form.truckPlate || null,
      slumpMm: form.slumpMm ? parseInt(form.slumpMm) : null,
      airTemp: form.airTemp ? parseFloat(form.airTemp) : null,
      startTime: form.startTime || null,
      notes: form.notes || null,
      date,
      mixDesignId: md?.id ?? null,
      orderId: form.orderId ? parseInt(form.orderId) : null,
    });
  };

  const activeOrders = orders.filter(o => o.status === "pending" || o.status === "producing");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <input type="date" value={date} onChange={e => setDate(e.target.value)} className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-sm outline-none" />
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl px-4 py-2 text-sm font-medium">
          <Plus className="w-4 h-4" /> Шинэ зуурах
        </button>
      </div>

      {showForm && (
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-5 space-y-3">
          <p className="text-sm font-bold text-amber-300">Зуурах бүртгэл</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            <div><label className="text-xs text-slate-500 mb-1 block">Захиалга (сонголттой)</label>
              <select value={form.orderId} onChange={e => { const o = orders.find((x:any) => x.id === parseInt(e.target.value)); setForm(f => ({ ...f, orderId: e.target.value, grade: o?.grade ?? f.grade })); }} className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none">
                <option value="">— Захиалгагүй / Туршилт —</option>
                {activeOrders.map((o:any) => <option key={o.id} value={o.id}>{o.orderNumber} · {o.clientName} · {o.grade}</option>)}
              </select>
            </div>
            <div><label className="text-xs text-slate-500 mb-1 block">Бетоны зэрэглэл *</label>
              <select value={form.grade} onChange={e => setForm(f => ({ ...f, grade: e.target.value }))} className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none">
                {GRADES.map(g => <option key={g}>{g}</option>)}
              </select>
            </div>
            <div><label className="text-xs text-slate-500 mb-1 block">Операторч нэр *</label>
              <input value={form.operator} onChange={e => setForm(f => ({ ...f, operator: e.target.value }))} placeholder="Батаа" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-amber-500/50" />
            </div>
            <div><label className="text-xs text-slate-500 mb-1 block">Төлөвлөсөн м³</label>
              <input type="number" step="0.5" value={form.plannedQty} onChange={e => setForm(f => ({ ...f, plannedQty: e.target.value, actualQty: e.target.value }))} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-amber-500/50" />
            </div>
            <div><label className="text-xs text-slate-500 mb-1 block">Бодит гарц м³</label>
              <input type="number" step="0.1" value={form.actualQty} onChange={e => setForm(f => ({ ...f, actualQty: e.target.value }))} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-amber-500/50" />
            </div>
            <div><label className="text-xs text-slate-500 mb-1 block">Слумп налуулалт (мм)</label>
              <input type="number" value={form.slumpMm} onChange={e => setForm(f => ({ ...f, slumpMm: e.target.value }))} placeholder="80-120" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-amber-500/50" />
            </div>
            <div><label className="text-xs text-slate-500 mb-1 block">Миксер машины дугаар</label>
              <input value={form.truckPlate} onChange={e => setForm(f => ({ ...f, truckPlate: e.target.value.toUpperCase() }))} placeholder="1234АА" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none uppercase" />
            </div>
            <div><label className="text-xs text-slate-500 mb-1 block">Агаарын температур °C</label>
              <input type="number" value={form.airTemp} onChange={e => setForm(f => ({ ...f, airTemp: e.target.value }))} placeholder="20" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none" />
            </div>
            <div><label className="text-xs text-slate-500 mb-1 block">Эхэлсэн цаг</label>
              <input type="time" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none" />
            </div>
            <div className="sm:col-span-2 md:col-span-3"><label className="text-xs text-slate-500 mb-1 block">Тэмдэглэл</label>
              <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none" />
            </div>
          </div>
          {/* Mix Design preview */}
          {(() => { const md = mixDesigns.find(m => m.grade === form.grade); const qty = parseFloat(form.actualQty || "1.5");
            return md ? (
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 text-xs text-slate-300">
                <p className="text-blue-300 font-semibold mb-2">📋 {form.grade} рецептийн дагуу зарцуулалт ({qty} м³)</p>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                  {[["Цемент", (md.cementKgPerM3 * qty).toFixed(0) + " кг"],["Элс", (md.sandKgPerM3 * qty).toFixed(0) + " кг"],["Хайрга 1", (md.gravel1KgPerM3 * qty).toFixed(0) + " кг"],["Хайрга 2", (md.gravel2KgPerM3 * qty).toFixed(0) + " кг"],["Ус", (md.waterLPerM3 * qty).toFixed(0) + " л"],["Нэмэлт", ((md.admixtureKgPerM3 ?? 0) * qty).toFixed(1) + " кг"]].map(([l,v]) => (
                    <div key={l} className="text-center"><p className="text-slate-500">{l}</p><p className="text-white font-medium">{v}</p></div>
                  ))}
                </div>
              </div>
            ) : null;
          })()}
          <p className="text-xs text-amber-400">⚡ Хадгалах үед агуулахаас материал автоматаар хасагдана + Слумп тест лабораторид илгээгдэнэ</p>
          <div className="flex gap-3">
            <button onClick={handleSubmit} disabled={addMut.isPending} className="bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-xl px-6 py-2.5 text-sm font-medium">
              {addMut.isPending ? "Хадгалж байна..." : "Бүртгэх"}
            </button>
            <button onClick={() => setShowForm(false)} className="bg-white/10 text-slate-300 rounded-xl px-6 py-2.5 text-sm">Болих</button>
          </div>
        </div>
      )}

      {isLoading ? <div className="text-center text-slate-500 py-8">Ачааллаж байна...</div> : batches.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-xl p-8 text-center text-slate-500 text-sm">Энэ өдөр бүртгэл байхгүй</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-slate-400 border-b border-white/10 text-xs">
              <th className="pb-2 pr-3">№</th><th className="pb-2 pr-3">Зэрэглэл</th><th className="pb-2 pr-3">м³</th>
              <th className="pb-2 pr-3">Цемент кг</th><th className="pb-2 pr-3">Элс кг</th><th className="pb-2 pr-3">Хайрга кг</th>
              <th className="pb-2 pr-3">Слумп</th><th className="pb-2 pr-3">Агаар°C</th><th className="pb-2 pr-3">Оператор</th>
              <th className="pb-2 pr-3">Миксер</th><th className="pb-2 pr-3">Агуулах</th>
            </tr></thead>
            <tbody>{batches.map(b => (
              <tr key={b.id} className="border-b border-white/5 hover:bg-white/5">
                <td className="py-2 pr-3 text-slate-300 font-mono">{b.batchNumber}</td>
                <td className="py-2 pr-3"><span className="bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full text-xs font-bold">{b.grade}</span></td>
                <td className="py-2 pr-3 text-white font-medium">{fmt(b.actualQty ?? b.plannedQty)}</td>
                <td className="py-2 pr-3 text-slate-300">{b.cementActual ? fmt(b.cementActual, 0) : "—"}</td>
                <td className="py-2 pr-3 text-slate-300">{b.sandActual ? fmt(b.sandActual, 0) : "—"}</td>
                <td className="py-2 pr-3 text-slate-300">{b.gravel1Actual || b.gravel2Actual ? fmt((b.gravel1Actual ?? 0) + (b.gravel2Actual ?? 0), 0) : "—"}</td>
                <td className="py-2 pr-3">{b.slumpMm ? <span className={b.slumpMm >= 60 && b.slumpMm <= 180 ? "text-green-400" : "text-red-400"}>{b.slumpMm}мм</span> : "—"}</td>
                <td className="py-2 pr-3 text-slate-400">{b.airTemp ?? "—"}</td>
                <td className="py-2 pr-3 text-slate-300">{b.operator}</td>
                <td className="py-2 pr-3 text-slate-400 text-xs">{b.truckPlate ?? "—"}</td>
                <td className="py-2 pr-3">{b.warehouseDeducted ? <span className="text-green-400 text-xs">✓ Хасагдсан</span> : <span className="text-yellow-400 text-xs">Хүлээж</span>}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Tab: Рецепт (Mix Design) ─────────────────────────────────────────────────
function MixDesignTab({ mixDesigns, refetch }: { mixDesigns: any[]; refetch: () => void }) {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const emptyForm = { grade: "B25", cementKgPerM3: "360", waterLPerM3: "175", sandKgPerM3: "740", gravel1KgPerM3: "500", gravel2KgPerM3: "640", admixtureKgPerM3: "3.6", wcRatio: "0.49", targetSlump: "100", targetStrength: "25", notes: "" };
  const [form, setForm] = useState(emptyForm);

  const addMut = useMutation({
    mutationFn: (body: any) => apiRequest(editId ? "PATCH" : "POST", editId ? `/api/concrete/mix-designs/${editId}` : "/api/concrete/mix-designs", body),
    onSuccess: () => { refetch(); setShowForm(false); setEditId(null); setForm(emptyForm); toast({ title: "Рецепт хадгалагдлаа" }); },
  });
  const delMut = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/concrete/mix-designs/${id}`, {}),
    onSuccess: () => { refetch(); toast({ title: "Устгагдлаа" }); },
  });

  const handleEdit = (md: any) => { setEditId(md.id); setForm({ grade: md.grade, cementKgPerM3: String(md.cementKgPerM3), waterLPerM3: String(md.waterLPerM3), sandKgPerM3: String(md.sandKgPerM3), gravel1KgPerM3: String(md.gravel1KgPerM3), gravel2KgPerM3: String(md.gravel2KgPerM3), admixtureKgPerM3: String(md.admixtureKgPerM3 ?? 0), wcRatio: String(md.wcRatio ?? ""), targetSlump: String(md.targetSlump ?? ""), targetStrength: String(md.targetStrength ?? ""), notes: md.notes ?? "" }); setShowForm(true); };
  const handleSubmit = () => {
    const body = { grade: form.grade, cementKgPerM3: +form.cementKgPerM3, waterLPerM3: +form.waterLPerM3, sandKgPerM3: +form.sandKgPerM3, gravel1KgPerM3: +form.gravel1KgPerM3, gravel2KgPerM3: +form.gravel2KgPerM3, admixtureKgPerM3: +form.admixtureKgPerM3, wcRatio: +form.wcRatio, targetSlump: +form.targetSlump, targetStrength: +form.targetStrength, notes: form.notes };
    addMut.mutate(body);
  };

  const fields: [string, string, string][] = [
    ["cementKgPerM3","Цемент кг/м³","320"],["waterLPerM3","Ус л/м³","175"],["sandKgPerM3","Элс кг/м³","750"],
    ["gravel1KgPerM3","Хайрга 5-10мм кг/м³","480"],["gravel2KgPerM3","Хайрга 10-20мм кг/м³","640"],
    ["admixtureKgPerM3","Нэмэлт бодис кг/м³","0"],["wcRatio","В/Ц харьцаа","0.5"],
    ["targetSlump","Слумп норм мм","80"],["targetStrength","Бат бөх МПа","20"],
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-semibold text-slate-300">{mixDesigns.length} рецепт</h3>
        <button onClick={() => { setEditId(null); setForm(emptyForm); setShowForm(!showForm); }} className="flex items-center gap-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl px-4 py-2 text-sm font-medium">
          <Plus className="w-4 h-4" /> Шинэ рецепт
        </button>
      </div>

      {showForm && (
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-5 space-y-3">
          <p className="text-sm font-bold text-amber-300">{editId ? "Рецепт засах" : "Шинэ рецепт"}</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div><label className="text-xs text-slate-500 mb-1 block">Бетоны зэрэглэл</label>
              <select value={form.grade} onChange={e => setForm(f => ({ ...f, grade: e.target.value }))} className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none">
                {GRADES.map(g => <option key={g}>{g}</option>)}
              </select>
            </div>
            {fields.map(([k, label, placeholder]) => (
              <div key={k}><label className="text-xs text-slate-500 mb-1 block">{label}</label>
                <input type="number" step="any" value={(form as any)[k]} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} placeholder={placeholder} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-amber-500/50" />
              </div>
            ))}
            <div className="col-span-2 md:col-span-3"><label className="text-xs text-slate-500 mb-1 block">Тэмдэглэл</label>
              <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none" />
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={handleSubmit} disabled={addMut.isPending} className="bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-xl px-6 py-2.5 text-sm font-medium">{addMut.isPending ? "Хадгалж байна..." : "Хадгалах"}</button>
            <button onClick={() => { setShowForm(false); setEditId(null); }} className="bg-white/10 text-slate-300 rounded-xl px-6 py-2.5 text-sm">Болих</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {mixDesigns.map(md => (
          <div key={md.id} className="bg-white/5 border border-white/10 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xl font-bold text-amber-300">{md.grade}</span>
              <div className="flex gap-1">
                <button onClick={() => handleEdit(md)} className="text-xs bg-white/10 text-slate-300 hover:bg-white/20 px-2 py-1 rounded-lg">Засах</button>
                <button onClick={() => { if (confirm("Устгах уу?")) delMut.mutate(md.id); }} className="text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded-lg"><Trash2 className="w-3 h-3" /></button>
              </div>
            </div>
            <div className="space-y-1.5 text-sm">
              {[["Цемент", md.cementKgPerM3 + " кг/м³"],["Ус", md.waterLPerM3 + " л/м³"],["Элс", md.sandKgPerM3 + " кг/м³"],["Хайрга 1 (5-10мм)", md.gravel1KgPerM3 + " кг/м³"],["Хайрга 2 (10-20мм)", md.gravel2KgPerM3 + " кг/м³"],["Нэмэлт бодис", (md.admixtureKgPerM3 ?? 0) + " кг/м³"]].map(([l,v]) => (
                <div key={l} className="flex justify-between"><span className="text-slate-400">{l}</span><span className="text-white font-medium">{v}</span></div>
              ))}
              <div className="border-t border-white/10 pt-1.5 mt-1.5 flex justify-between text-xs">
                <span className="text-slate-500">В/Ц = {md.wcRatio ?? "—"}</span>
                <span className="text-slate-500">Слумп {md.targetSlump ?? "—"} мм</span>
                <span className="text-green-400 font-medium">{md.targetStrength ?? "—"} МПа</span>
              </div>
            </div>
            {md.notes && <p className="text-xs text-slate-500 mt-2 border-t border-white/10 pt-2">{md.notes}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Tab: Өртгийн тайлан ──────────────────────────────────────────────────────
function CostTab() {
  const { data: orders = [] } = useQuery<any[]>({ queryKey: ["/api/concrete/orders"], queryFn: () => fetch("/api/concrete/orders", { headers: getHeaders() }).then(r => r.json()) });
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const { data: cost } = useQuery<any>({
    queryKey: ["/api/concrete/cost", selectedId],
    queryFn: () => selectedId ? fetch(`/api/concrete/cost/${selectedId}`, { headers: getHeaders() }).then(r => r.json()) : Promise.resolve(null),
    enabled: !!selectedId,
  });

  const { data: batches = [] } = useQuery<any[]>({ queryKey: ["/api/concrete/batches"], queryFn: () => fetch("/api/concrete/batches", { headers: getHeaders() }).then(r => r.json()) });

  // Monthly summary
  const month = new Date().toISOString().slice(0, 7);
  const monthBatches = batches.filter(b => b.date.startsWith(month) && b.status !== "rejected");
  const totalM3   = monthBatches.reduce((s, b) => s + (b.actualQty ?? 0), 0);
  const totalCem  = monthBatches.reduce((s, b) => s + (b.cementActual ?? 0), 0) / 1000;
  const totalSand = monthBatches.reduce((s, b) => s + (b.sandActual ?? 0), 0) / 1000;
  const totalGrav = monthBatches.reduce((s, b) => s + ((b.gravel1Actual ?? 0) + (b.gravel2Actual ?? 0)), 0) / 1000;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-slate-300 mb-3">Сарын нийт зарцуулалт ({month})</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard label="Нийт гарц" value={`${fmt(totalM3)} м³`} />
          <KpiCard label="Цемент" value={`${fmt(totalCem)} тн`} color="text-orange-400" />
          <KpiCard label="Элс" value={`${fmt(totalSand)} тн`} color="text-yellow-400" />
          <KpiCard label="Хайрга нийт" value={`${fmt(totalGrav)} тн`} color="text-blue-400" />
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-slate-300 mb-3">Захиалгын өртгийн тооцоо</h3>
        <div className="flex gap-3 flex-wrap mb-4">
          {orders.filter(o => (o.deliveredQty ?? 0) > 0).map(o => (
            <button key={o.id} onClick={() => setSelectedId(o.id)} className={`text-xs px-3 py-2 rounded-xl font-medium transition-colors ${selectedId === o.id ? "bg-amber-600 text-white" : "bg-white/10 text-slate-300 hover:bg-white/20"}`}>
              {o.orderNumber} · {o.grade}
            </button>
          ))}
        </div>
        {cost && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <KpiCard label="Нийт хүргэлт" value={`${fmt(cost.totalM3)} м³`} />
              <KpiCard label="Материалын өртөг" value={fmtM(cost.matCost) + " ₮"} color="text-orange-400" />
              <KpiCard label="Нэгж өртөг" value={`₮${Math.round(cost.unitCost).toLocaleString()}/м³`} color="text-yellow-400" />
              <KpiCard label={cost.profit >= 0 ? "Ашиг" : "Алдагдал"} value={fmtM(Math.abs(cost.profit)) + " ₮"} color={cost.profit >= 0 ? "text-green-400" : "text-red-400"} />
            </div>
            <div className="grid grid-cols-3 gap-3 text-sm">
              {[["Цемент", cost.totalCement + " тн"],["Элс", cost.totalSand + " тн"],["Хайрга", cost.totalGravel + " тн"]].map(([l,v]) => (
                <div key={l} className="bg-white/5 rounded-xl p-3 flex justify-between">
                  <span className="text-slate-400">{l}</span><span className="text-white font-medium">{v}</span>
                </div>
              ))}
            </div>
            {cost.revenue > 0 && (
              <div className="mt-4 bg-white/5 rounded-xl p-3 flex justify-between text-sm">
                <span className="text-slate-400">Орлого</span>
                <span className="text-green-400 font-bold">₮{cost.revenue.toLocaleString()}</span>
              </div>
            )}
          </div>
        )}
        {!selectedId && <div className="text-center text-slate-500 text-sm py-8">Захиалга сонгоно уу</div>}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
const TABS = [
  { key: "dashboard", label: "Хяналт", icon: BarChart3 },
  { key: "orders",    label: "Захиалга", icon: TruckIcon },
  { key: "batch",     label: "Зуурах", icon: FlaskConical },
  { key: "recipe",    label: "Рецепт", icon: Package },
  { key: "cost",      label: "Өртөг", icon: BarChart3 },
];

export default function ConcretePlantERP() {
  const [tab, setTab] = useState("dashboard");
  const [date, setDate] = useState(TODAY);

  const { data: mixDesigns = [], refetch: refetchMix } = useQuery<any[]>({
    queryKey: ["/api/concrete/mix-designs"],
    queryFn: () => fetch("/api/concrete/mix-designs", { headers: getHeaders() }).then(r => r.json()),
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      {/* Header */}
      <div className="border-b border-white/10 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
          <Link href="/erp"><button className="text-slate-400 hover:text-white transition-colors"><ArrowLeft className="w-5 h-5" /></button></Link>
          <Factory className="w-6 h-6 text-amber-400" />
          <div>
            <h1 className="text-lg font-bold text-white leading-tight">Бетон зуурмагийн үйлдвэр</h1>
            <p className="text-xs text-slate-400">YBS-90 · 90 м³/цаг · Бүрэн ERP</p>
          </div>
        </div>
        {/* Tabs */}
        <div className="max-w-7xl mx-auto px-4 flex gap-1 pb-0 overflow-x-auto">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${tab === t.key ? "border-amber-500 text-amber-400" : "border-transparent text-slate-400 hover:text-slate-200"}`}>
              <t.icon className="w-3.5 h-3.5" /> {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {tab === "dashboard" && <DashboardTab date={date} setDate={setDate} />}
        {tab === "orders"    && <OrdersTab mixDesigns={mixDesigns} />}
        {tab === "batch"     && <BatchTab mixDesigns={mixDesigns} />}
        {tab === "recipe"    && <MixDesignTab mixDesigns={mixDesigns} refetch={refetchMix} />}
        {tab === "cost"      && <CostTab />}
      </div>
    </div>
  );
}
