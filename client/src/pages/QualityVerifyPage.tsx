import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ShieldCheck, CheckCircle2, ZoomIn, X, Package,
  Phone, Mail, MapPin, ExternalLink, AlertCircle, TrendingUp,
} from "lucide-react";

const COMPLIANCE_CERTS = [
  {
    src: "/cert-db149-25.jpg",
    number: "ДБ149/25",
    product: "Бетон зуурмаг",
    standard: "MNS 1185:1998 · MNS EN 206:2017",
    grades: "M150 · M200 · M250 · M300 · M350 · M400 · M450 · M500 · M550",
    expires: "2027.12.04",
    issued: "2025.12.04",
  },
  {
    src: "/cert-db150-25.jpg",
    number: "ДБ150/25",
    product: "Элс, Хайрга",
    standard: "MNS 0392:2014 · MNS 0346:2000",
    grades: "Хайрга 5–10мм · Хайрга 10–20мм",
    expires: "2027.12.04",
    issued: "2025.12.04",
  },
];

export default function QualityVerifyPage() {
  const [zoomCert, setZoomCert] = useState<string | null>(null);

  const { data: report } = useQuery<any>({
    queryKey: ["/api/public/compliance-report"],
    queryFn: () => fetch("/api/public/compliance-report").then(r => r.json()),
  });

  const { data: products = [] } = useQuery<any[]>({
    queryKey: ["/api/company-products"],
    queryFn: () => fetch("/api/company-products").then(r => r.json()),
  });

  const concreteProducts = products.filter((p: any) =>
    p.category === "Бетон зуурмаг" || p.name?.includes("Бетон")
  );
  const otherProducts = products.filter((p: any) =>
    p.category !== "Бетон зуурмаг" && !p.name?.includes("Бетон")
  );

  return (
    <div className="min-h-screen bg-[#0f172a] text-white">
      {/* Cert zoom modal */}
      {zoomCert && (
        <div
          className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setZoomCert(null)}
        >
          <div className="relative max-w-2xl w-full" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setZoomCert(null)}
              className="absolute -top-10 right-0 text-white/70 hover:text-white flex items-center gap-1.5 text-sm"
            >
              <X size={16} /> Хаах
            </button>
            <img src={zoomCert} alt="Тохирлын гэрчилгээ" className="w-full rounded-lg shadow-2xl border border-white/20" />
          </div>
        </div>
      )}

      {/* Header */}
      <div className="border-b border-white/10 bg-[#0f172a]/95 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <ShieldCheck className="w-6 h-6 text-amber-500 shrink-0" />
          <div>
            <h1 className="text-sm font-black tracking-wide text-white">Хөвсгөл зам ХХК</h1>
            <p className="text-[10px] text-slate-400">Чанарын баталгаа · Тохирлын гэрчилгээ · Борлуулалт</p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-10">

        {/* ── 1. БОРЛУУЛАЛТ ─────────────────────────────────── */}
        <section>
          <div className="flex items-center gap-2 mb-5">
            <Package className="w-4 h-4 text-amber-400" />
            <h2 className="text-base font-black uppercase tracking-widest text-amber-400">Борлуулалт</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Бетон зуурмагийн бүтээгдэхүүн */}
            {concreteProducts.length > 0 && (
              <div className="border border-white/10 rounded-lg p-4 bg-white/5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Бетон зуурмаг</p>
                <div className="space-y-2">
                  {concreteProducts.map((p: any) => (
                    <div key={p.id} className="flex items-center justify-between">
                      <span className="text-sm text-slate-200">{p.name}</span>
                      {p.pricePerUnit && (
                        <span className="text-xs text-amber-400 font-bold">
                          ₮{Number(p.pricePerUnit).toLocaleString()}/{p.unit}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Бусад бүтээгдэхүүн */}
            {otherProducts.length > 0 && (
              <div className="border border-white/10 rounded-lg p-4 bg-white/5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Бусад</p>
                <div className="space-y-2">
                  {otherProducts.slice(0, 6).map((p: any) => (
                    <div key={p.id} className="flex items-center justify-between">
                      <span className="text-sm text-slate-200">{p.name}</span>
                      {p.pricePerUnit && (
                        <span className="text-xs text-amber-400 font-bold">
                          ₮{Number(p.pricePerUnit).toLocaleString()}/{p.unit}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Холбоо барих */}
            <div className="border border-amber-500/20 rounded-lg p-4 bg-amber-500/5 sm:col-span-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-amber-400 mb-3">Холбоо барих</p>
              <div className="flex flex-wrap gap-4">
                {[
                  { icon: Phone, v: "70110011 · 99119911" },
                  { icon: Mail, v: "huvsgulzamllc@gmail.com" },
                  { icon: MapPin, v: "Мөрөн сум, Хөвсгөл аймаг" },
                ].map(({ icon: Icon, v }) => (
                  <div key={v} className="flex items-center gap-2">
                    <Icon className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-sm text-slate-200">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── 2. ТОХИРЛЫН ГЭРЧИЛГЭЭ ────────────────────────── */}
        <section>
          <div className="flex items-center gap-2 mb-5">
            <ShieldCheck className="w-4 h-4 text-green-400" />
            <h2 className="text-base font-black uppercase tracking-widest text-green-400">Тохирлын гэрчилгээ</h2>
          </div>

          <div className="flex gap-4 flex-wrap">
            {COMPLIANCE_CERTS.map(cert => (
              <div
                key={cert.number}
                className="flex gap-3 border border-white/10 rounded-lg bg-white/5 overflow-hidden"
                style={{ width: 320 }}
              >
                {/* Зураг */}
                <button
                  onClick={() => setZoomCert(cert.src)}
                  className="group relative flex-shrink-0"
                >
                  <div className="relative overflow-hidden w-[100px] h-[155px]">
                    <img
                      src={cert.src}
                      alt={cert.number}
                      className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <ZoomIn className="w-5 h-5 text-white" />
                    </div>
                  </div>
                </button>

                {/* Мэдээлэл */}
                <div className="flex flex-col justify-center gap-1.5 py-3 pr-3">
                  <span className="text-[13px] font-black text-amber-400 font-mono">{cert.number}</span>
                  <span className="text-[11px] font-bold text-white">{cert.product}</span>
                  <span className="text-[9px] text-slate-400 leading-snug">{cert.standard}</span>
                  <span className="text-[9px] text-slate-300 leading-snug">{cert.grades}</span>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
                    <span className="text-[9px] text-green-400 font-bold">Хүчинтэй {cert.issued} – {cert.expires}</span>
                  </div>
                  <p className="text-[8px] text-slate-500 mt-0.5">Зургийг дарж томруулан харах</p>
                </div>
              </div>
            ))}
          </div>

          <p className="text-[9px] text-slate-500 mt-3">
            Барилгын хөгжлийн үндэсний нэгдсэн төв — MNAS итгэмжлэгдсэн лабораторийн дүнд үндэслэн олгосон
          </p>
        </section>

        {/* ── 3. ЧАНАРЫН ТОХИРЛЫН ТАЙЛАН ──────────────────── */}
        <section>
          <div className="flex items-center gap-2 mb-5">
            <TrendingUp className="w-4 h-4 text-blue-400" />
            <h2 className="text-base font-black uppercase tracking-widest text-blue-400">Чанарын тохирлын тайлан</h2>
          </div>

          {report ? (
            <div className="space-y-4">
              {/* Нийт статистик */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Нийт партийн тест", value: report.total, color: "text-white" },
                  { label: "Тохирсон", value: report.compliant, color: "text-green-400" },
                  { label: "Тохирлын %", value: `${report.compliancePct}%`, color: report.compliancePct >= 90 ? "text-green-400" : report.compliancePct >= 70 ? "text-amber-400" : "text-red-400" },
                ].map(s => (
                  <div key={s.label} className="border border-white/10 rounded-lg p-4 bg-white/5 text-center">
                    <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
                    <p className="text-[9px] text-slate-400 mt-1 uppercase tracking-wide">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Бүтээгдэхүүний төрлөөр */}
              {Object.keys(report.byProduct || {}).length > 0 && (
                <div className="border border-white/10 rounded-lg p-4 bg-white/5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3">Бүтээгдэхүүний төрлөөр</p>
                  <div className="space-y-2.5">
                    {Object.entries(report.byProduct as Record<string, { total: number; compliant: number }>)
                      .map(([type, stats]) => {
                        const pct = stats.total > 0 ? Math.round((stats.compliant / stats.total) * 100) : 0;
                        return (
                          <div key={type}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs text-slate-200">{type}</span>
                              <span className={`text-xs font-bold ${pct >= 90 ? "text-green-400" : pct >= 70 ? "text-amber-400" : "text-red-400"}`}>
                                {pct}% ({stats.compliant}/{stats.total})
                              </span>
                            </div>
                            <div className="w-full bg-white/10 rounded-full h-1.5">
                              <div
                                className={`h-1.5 rounded-full ${pct >= 90 ? "bg-green-400" : pct >= 70 ? "bg-amber-400" : "bg-red-400"}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* Сүүлийн 8 тест */}
              {report.recent && report.recent.length > 0 && (
                <div className="border border-white/10 rounded-lg overflow-hidden">
                  <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Сүүлийн туршилтын дүн</p>
                  </div>
                  <div className="divide-y divide-white/5">
                    {report.recent.map((c: any) => (
                      <div key={c.id} className="px-4 py-2.5 flex items-center justify-between">
                        <div>
                          <span className="text-xs font-bold text-white">{c.productName || c.productType}</span>
                          <span className="text-[10px] text-slate-500 ml-2 font-mono">{c.batchNumber}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-black ${c.compliancePct >= 90 ? "text-green-400" : "text-amber-400"}`}>
                            {c.compliancePct}%
                          </span>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${c.isCompliant ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                            {c.isCompliant ? "Тохирсон" : "Тохироогүй"}
                          </span>
                          <a href={`/api/public/quality-cert/${c.id}`} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="w-3 h-3 text-slate-500 hover:text-white" />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {report.total === 0 && (
                <div className="flex items-center gap-2 text-slate-500 py-4">
                  <AlertCircle className="w-4 h-4" />
                  <p className="text-sm">Лабораторийн туршилтын дүн одоогоор байхгүй байна</p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-slate-500 text-sm">Уншиж байна...</div>
          )}
        </section>

        <div className="text-center text-[9px] text-slate-600 pt-4 border-t border-white/5">
          Хөвсгөл зам ХХК · Зам гүүр, барилга угсралт · QR код — Чанарын баталгаа шалгах хуудас
        </div>
      </div>
    </div>
  );
}
