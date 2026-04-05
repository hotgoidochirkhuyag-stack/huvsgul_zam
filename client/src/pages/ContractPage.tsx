import { useState, useRef } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import {
  CheckCircle2, Download, Loader2, AlertCircle, FileText,
  Building2, Phone, Mail, MapPin, Calendar, Package, BadgeCheck,
  ZoomIn, X, Truck
} from "lucide-react";
import type { Contract, ContractTemplateSection } from "@shared/schema";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft:            { label: "Ноорог",             color: "bg-slate-500" },
  sent:             { label: "Явуулсан",            color: "bg-blue-500" },
  client_approved:  { label: "Зөвшөөрсөн",          color: "bg-green-500" },
  factory_ordered:  { label: "Үйлдвэрт захиалагдсан", color: "bg-amber-500" },
  completed:        { label: "Дууссан",             color: "bg-teal-500" },
  cancelled:        { label: "Цуцлагдсан",          color: "bg-red-500" },
};

function fmtMNT(n: number) {
  if (n >= 1_000_000_000) return `₮${(n / 1_000_000_000).toFixed(2)} тэрбум`;
  if (n >= 1_000_000) return `₮${(n / 1_000_000).toFixed(2)} сая`;
  return `₮${n.toLocaleString("mn-MN")}`;
}

function replacePlaceholders(text: string, contract: Contract): string {
  return text
    .replace(/\{\{clientOrg\}\}/g, contract.clientOrg || contract.clientName || "")
    .replace(/\{\{clientName\}\}/g, contract.clientName || "")
    .replace(/\{\{clientPhone\}\}/g, contract.clientPhone || "")
    .replace(/\{\{clientEmail\}\}/g, contract.clientEmail || "")
    .replace(/\{\{product\}\}/g, contract.product || "")
    .replace(/\{\{quantity\}\}/g, String(contract.quantity || ""))
    .replace(/\{\{unit\}\}/g, contract.unit || "м³")
    .replace(/\{\{unitPrice\}\}/g, fmtMNT(Number(contract.unitPrice || 0)))
    .replace(/\{\{totalAmount\}\}/g, fmtMNT(Number(contract.totalAmount || 0)))
    .replace(/\{\{deliveryAddress\}\}/g, contract.deliveryAddress || "—")
    .replace(/\{\{deliveryDate\}\}/g, contract.deliveryDate || "—")
    .replace(/\{\{contractNo\}\}/g, contract.contractNo || "")
    .replace(/\{\{notes\}\}/g, contract.notes || "");
}

export default function ContractPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const printRef = useRef<HTMLDivElement>(null);
  const [approved, setApproved] = useState(false);
  const [activating, setActivating] = useState(false);
  const [zoomCert, setZoomCert] = useState<string | null>(null);

  const { data: contract, isLoading, error, refetch } = useQuery<Contract>({
    queryKey: ["/api/contracts/public", token],
    queryFn: () => fetch(`/api/contracts/public/${token}`).then(r => {
      if (!r.ok) throw new Error("Гэрээ олдсонгүй");
      return r.json();
    }),
    enabled: !!token,
  });

  const { data: templateSections = [] } = useQuery<ContractTemplateSection[]>({
    queryKey: ["/api/contract-template/public"],
    queryFn: () => fetch("/api/contract-template/public").then(r => r.json()),
  });

  const approveMut = useMutation({
    mutationFn: () => fetch(`/api/contracts/approve/${token}`, { method: "POST" }).then(r => r.json()),
    onSuccess: () => {
      setApproved(true);
      refetch();
    },
  });

  const activateMut = useMutation({
    mutationFn: () => fetch(`/api/contracts/activate/${token}`, { method: "POST" }).then(r => r.json()),
    onSuccess: () => refetch(),
  });

  const handlePrint = async () => {
    setActivating(true);
    if (contract?.status === "client_approved") {
      await activateMut.mutateAsync();
    }
    setActivating(false);
    window.print();
  };

  const verifyUrl = `${window.location.origin}/contract/${token}`;
  const isApproved = approved || contract?.status === "client_approved" || contract?.status === "factory_ordered" || contract?.status === "completed";

  if (isLoading) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
    </div>
  );

  if (error || !contract) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <p className="text-white text-lg font-bold">Гэрээ олдсонгүй</p>
        <p className="text-slate-400 text-sm mt-2">Холбоосыг шалгаад дахин оролдоно уу</p>
      </div>
    </div>
  );

  const st = STATUS_LABELS[contract.status] ?? { label: contract.status, color: "bg-slate-500" };

  // Signature хэсгийг тусад нь гаргаж, бусад зүйлүүдийг дунд нь харуулна
  const bodySection = templateSections.filter(s => s.sectionKey !== "signature");

  return (
    <>
      {/* Гэрчилгээ томруулах modal */}
      {zoomCert && (
        <div
          className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center p-4 no-print"
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

      {/* Print styles */}
      <style>{`
        @media print {
          body { background: white !important; }
          .no-print { display: none !important; }
          .print-area { box-shadow: none !important; border: 1px solid #ddd !important; }
          .template-section { page-break-inside: avoid; }
        }
      `}</style>

      <div className="min-h-screen bg-slate-950 py-8 px-4">
        {/* Action bar */}
        <div className="max-w-3xl mx-auto mb-4 no-print">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-amber-500" />
              <span className="text-white font-bold">{contract.contractNo}</span>
              <span className={`text-xs text-white px-2 py-0.5 rounded-full ${st.color}`}>{st.label}</span>
            </div>
            <div className="flex gap-2 flex-wrap">
              {!isApproved && contract.status === "sent" && (
                <button
                  onClick={() => approveMut.mutate()}
                  disabled={approveMut.isPending}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white font-bold px-5 py-2 rounded-lg transition-all"
                  data-testid="btn-approve-contract"
                >
                  {approveMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Зөвшөөрөх
                </button>
              )}
              {isApproved && (
                <button
                  onClick={handlePrint}
                  disabled={activating}
                  className="flex items-center gap-2 bg-amber-600 hover:bg-amber-500 text-black font-bold px-5 py-2 rounded-lg transition-all"
                  data-testid="btn-download-contract"
                >
                  {activating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  Гэрээ татаж авах (PDF)
                </button>
              )}
            </div>
          </div>
          {isApproved && (
            <div className="mt-3 bg-green-900/30 border border-green-500/30 rounded-lg px-4 py-2 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
              <p className="text-green-300 text-sm">
                {contract.status === "factory_ordered" || contract.status === "completed"
                  ? "Гэрээ баталгаажсан — Үйлдвэрт ажлын захиалга үүссэн ✓"
                  : "Гэрээ зөвшөөрөгдсөн — Гэрээгээ татаж авснаар үйлдвэрт ажлын захиалга үүснэ"}
              </p>
            </div>
          )}
        </div>

        {/* Гэрээний үндсэн хэсэг */}
        <div ref={printRef} className="max-w-3xl mx-auto bg-white rounded-xl shadow-2xl print-area overflow-hidden">

          {/* Header */}
          <div className="bg-[#0f172a] px-8 py-6 flex items-start justify-between gap-6">
            <div>
              <div className="text-amber-500 font-black text-xl tracking-tight">ХӨВСГӨЛ ЗАМ ХХК</div>
              <div className="text-slate-300 text-xs mt-1">Зам гүүр, барилга угсралтын компани</div>
              <div className="text-slate-400 text-xs mt-3 space-y-0.5">
                <div>Утас: (+976) 9966-0017</div>
                <div>Хаяг: Мурэн, Хөвсгөл аймаг</div>
                <div>И-мэйл: info@huvsgulzam.mn</div>
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-white font-black text-2xl">{contract.contractNo}</div>
              <div className="text-amber-500 text-xs font-bold tracking-widest uppercase mt-1">Худалдах / Худалдан авах Гэрээ</div>
              <div className="text-slate-400 text-xs mt-2">
                {contract.createdAt ? new Date(contract.createdAt).toLocaleDateString("mn-MN") : ""}
              </div>
              <div className={`inline-block mt-2 text-xs text-white px-3 py-1 rounded-full font-bold ${st.color}`}>{st.label}</div>
            </div>
          </div>

          <div className="p-8 space-y-6">

            {/* Харилцагчийн мэдээлэл */}
            <div className="grid grid-cols-2 gap-6">
              <div className="border border-slate-200 rounded-lg p-4">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5" /> Нийлүүлэгч
                </div>
                <div className="font-black text-slate-800 text-sm">Хөвсгөл зам ХХК</div>
                <div className="text-slate-500 text-xs mt-1">УБ-12345678</div>
                <div className="text-slate-500 text-xs">Мөрөн, Хөвсгөл аймаг</div>
                <div className="text-slate-500 text-xs">Утас: (+976) 9966-0017</div>
              </div>
              <div className="border border-slate-200 rounded-lg p-4">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5" /> Худалдан авагч
                </div>
                <div className="font-black text-slate-800 text-sm">{contract.clientOrg || contract.clientName}</div>
                {contract.clientOrg && <div className="text-slate-600 text-xs">{contract.clientName}</div>}
                {contract.clientPhone && (
                  <div className="text-slate-500 text-xs flex items-center gap-1 mt-1">
                    <Phone className="w-3 h-3" /> {contract.clientPhone}
                  </div>
                )}
                <div className="text-slate-500 text-xs flex items-center gap-1">
                  <Mail className="w-3 h-3" /> {contract.clientEmail}
                </div>
                {contract.deliveryAddress && (
                  <div className="text-slate-500 text-xs flex items-center gap-1 mt-1">
                    <MapPin className="w-3 h-3" /> {contract.deliveryAddress}
                  </div>
                )}
              </div>
            </div>

            {/* Захиалгын хүснэгт */}
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5" /> Нийлүүлэх бүтээгдэхүүн
              </div>
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="text-left px-3 py-2 border border-slate-200 text-xs font-bold text-slate-600">Бүтээгдэхүүн</th>
                    <th className="text-right px-3 py-2 border border-slate-200 text-xs font-bold text-slate-600">Тоо хэмжээ</th>
                    <th className="text-right px-3 py-2 border border-slate-200 text-xs font-bold text-slate-600">Нэгж үнэ</th>
                    <th className="text-right px-3 py-2 border border-slate-200 text-xs font-bold text-slate-600">Нийт дүн</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="px-3 py-3 border border-slate-200 font-medium text-slate-800">{contract.product}</td>
                    <td className="px-3 py-3 border border-slate-200 text-right text-slate-700">{contract.quantity.toLocaleString()} {contract.unit}</td>
                    <td className="px-3 py-3 border border-slate-200 text-right text-slate-700">{fmtMNT(contract.unitPrice)}/{contract.unit}</td>
                    <td className="px-3 py-3 border border-slate-200 text-right font-black text-slate-800">{fmtMNT(contract.totalAmount)}</td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr className="bg-[#0f172a]">
                    <td colSpan={3} className="px-3 py-2 text-amber-400 font-bold text-xs uppercase tracking-wider text-right">НИЙТ ДҮН</td>
                    <td className="px-3 py-2 text-white font-black text-right">{fmtMNT(contract.totalAmount)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Хүргэлтийн мэдээлэл */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              {contract.deliveryDate && (
                <div className="flex items-start gap-2">
                  <Calendar className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs text-slate-500 font-bold uppercase">Хүргэлтийн хугацаа</div>
                    <div className="text-slate-800 font-medium">{contract.deliveryDate}</div>
                  </div>
                </div>
              )}
              {contract.deliveryAddress && (
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs text-slate-500 font-bold uppercase">Хүргэх хаяг</div>
                    <div className="text-slate-800 font-medium">{contract.deliveryAddress}</div>
                  </div>
                </div>
              )}
            </div>

            {contract.notes && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
                <div className="text-xs font-bold text-amber-700 uppercase mb-1">Нэмэлт тайлбар</div>
                <div className="text-slate-700 text-sm">{contract.notes}</div>
              </div>
            )}

            {/* ── ГЭРЭЭНИЙ ЗАГВАРЫН ЗҮЙЛҮҮД ── */}
            {bodySection.length > 0 && (
              <div className="border-t border-slate-200 pt-6 space-y-5">
                {bodySection.map((section) => (
                  <div key={section.sectionKey} className="template-section">
                    {/* Гарчиг (header) хэсгийг нуу — харилцагчийн мэдээлэл дээр дахин харуулсан */}
                    {section.sectionKey !== "header" && (
                      <>
                        <h3 className="text-sm font-black text-slate-800 mb-2 uppercase tracking-wide">
                          {section.sectionTitle}
                        </h3>
                        <div className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                          {replacePlaceholders(section.content || "", contract)}
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* ── Тохирлын гэрчилгээ + Чанарын баталгаа + Нийлүүлэлт ── */}
            <div className="border border-slate-200 rounded-lg p-5 space-y-5">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <BadgeCheck className="w-3.5 h-3.5 text-green-600" /> Тохирлын гэрчилгээ · Чанарын баталгаа · Нийлүүлэлт
              </div>

              {/* Нийлүүлэлтийн мэдээлэл */}
              <div className="bg-slate-50 rounded-md px-4 py-3 border border-slate-200">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1">
                  <Truck className="w-3 h-3" /> Нийлүүлэлт
                </div>
                <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                  {[
                    { k: "Бүтээгдэхүүн", v: contract.product },
                    { k: "Тоо хэмжээ", v: `${contract.quantity.toLocaleString()} ${contract.unit}` },
                    { k: "Нэгжийн үнэ", v: `₮${contract.unitPrice.toLocaleString()}/${contract.unit}` },
                    { k: "Нийт дүн", v: `₮${contract.totalAmount.toLocaleString()}` },
                    ...(contract.deliveryDate ? [{ k: "Хүргэх огноо", v: contract.deliveryDate }] : []),
                    ...(contract.deliveryAddress ? [{ k: "Хүргэх хаяг", v: contract.deliveryAddress }] : []),
                  ].map((row, i) => (
                    <div key={i} className="flex flex-col">
                      <span className="text-[9px] text-slate-400 font-bold uppercase">{row.k}</span>
                      <span className="text-xs text-slate-800 font-semibold">{row.v}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 2 тохирлын гэрчилгээний зураг + QR нэг мөрөнд */}
              <div className="flex items-start gap-4 flex-wrap">
                {[
                  { src: "/cert-db149-25.jpg", number: "ДБ149/25", product: "Бетон зуурмаг", standard: "MNS 1185:1998 · MNS EN 206:2017", expires: "2027.12.04" },
                  { src: "/cert-db150-25.jpg", number: "ДБ150/25", product: "Элс, Хайрга",   standard: "MNS 0392:2014 · MNS 0346:2000",  expires: "2027.12.04" },
                ].map(cert => (
                  <button
                    key={cert.number}
                    onClick={() => setZoomCert(cert.src)}
                    className="group flex-shrink-0 text-left"
                  >
                    <div className="relative overflow-hidden rounded-sm border border-slate-200 group-hover:border-green-400 transition-colors w-[100px]">
                      <img
                        src={cert.src}
                        alt={cert.number}
                        className="w-full h-[145px] object-cover object-top group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <ZoomIn className="w-5 h-5 text-white" />
                      </div>
                    </div>
                    <div className="mt-1.5 px-0.5">
                      <p className="text-[10px] font-black text-[#0f172a] font-mono">{cert.number}</p>
                      <p className="text-[8.5px] text-slate-600 leading-tight">{cert.product}</p>
                      <p className="text-[7.5px] text-slate-400 mt-0.5">{cert.standard}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                        <span className="text-[7.5px] text-green-600 font-semibold">{cert.expires}</span>
                      </div>
                    </div>
                  </button>
                ))}

                {/* QR код — гэрчилгээнүүдийн ард */}
                <div className="flex flex-col items-center justify-start gap-1.5 flex-shrink-0 pt-0.5">
                  <div className="bg-white p-1.5 border border-slate-200 rounded-sm">
                    <QRCodeSVG value={verifyUrl} size={98} bgColor="#ffffff" fgColor="#0f172a" level="M" />
                  </div>
                  <div className="text-center">
                    <div className="text-[9px] font-bold text-slate-600">Гэрээ шалгах</div>
                    <div className="text-[8px] text-slate-400">{contract.contractNo}</div>
                  </div>
                </div>
              </div>
              <p className="text-[7.5px] text-slate-400">Гэрчилгээг дарж бүтэн хэмжээгээр үзнэ · QR скан → гэрээ + гэрчилгээ онлайнаар шалгах</p>
            </div>

            {/* Гарын үсэг */}
            <div className="grid grid-cols-2 gap-8 pt-6 border-t-2 border-slate-800 mt-4">
              <div>
                <div className="text-xs text-slate-500 font-bold uppercase mb-2">Нийлүүлэгчийн гарын үсэг</div>
                <div className="text-xs text-slate-700 mb-1 font-medium">Хөвсгөл зам ХХК</div>
                <div className="text-xs text-slate-500 mb-8">Захирал: ..................................</div>
                <div className="border-b-2 border-slate-400 mb-1" />
                <div className="text-xs text-slate-500">Огноо: ............ / ............ / ............</div>
                <div className="text-xs text-slate-500 mt-2">Тамга:</div>
              </div>
              <div>
                <div className="text-xs text-slate-500 font-bold uppercase mb-2">Худалдан авагчийн гарын үсэг</div>
                <div className="text-xs text-slate-700 mb-1 font-medium">{contract.clientOrg || contract.clientName}</div>
                {contract.clientOrg && <div className="text-xs text-slate-500 mb-1">Захирал: ..................................</div>}
                <div className="mb-8" />
                <div className="border-b-2 border-slate-400 mb-1" />
                <div className="text-xs text-slate-500">Огноо: ............ / ............ / ............</div>
                {contract.approvedAt && (
                  <div className="text-xs text-green-600 mt-2 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Онлайн зөвшөөрсөн: {new Date(contract.approvedAt).toLocaleDateString("mn-MN")}
                  </div>
                )}
                <div className="text-xs text-slate-500 mt-2">Тамга:</div>
              </div>
            </div>

            <div className="text-center text-[10px] text-slate-400 pt-3 border-t border-slate-100">
              Энэхүү гэрээ нь цахим хэлбэрээр баталгаажсан бөгөөд хуулийн хүчин чадалтай болно. • {window.location.origin} • {contract.contractNo}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
