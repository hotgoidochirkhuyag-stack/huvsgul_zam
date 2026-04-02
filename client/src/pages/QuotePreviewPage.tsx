import { useEffect } from "react";
import { Building2, Calendar, Printer, PenLine, ArrowLeft, CheckCircle } from "lucide-react";

function fmtMNT(n: number) {
  return n > 0 ? n.toLocaleString("mn-MN") + "₮" : "—";
}
function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,"0")}.${String(d.getDate()).padStart(2,"0")}`;
}

export default function QuotePreviewPage() {
  const params = new URLSearchParams(window.location.search);
  const quoteId       = params.get("quoteId") || "—";
  const name          = params.get("name") || "";
  const company       = params.get("company") || "";
  const phone         = params.get("phone") || "";
  const email         = params.get("email") || "";
  const product       = params.get("product") || "";
  const quantity      = parseFloat(params.get("quantity") || "1");
  const unit          = params.get("unit") || "";
  const unitPrice     = parseFloat(params.get("unitPrice") || "0");
  const totalAmount   = parseFloat(params.get("totalAmount") || "0") || Math.round(unitPrice * quantity);
  const validUntil    = params.get("validUntil") || new Date(Date.now() + 7*24*60*60*1000).toISOString();
  const deliveryAddress = params.get("deliveryAddress") || "";
  const contractUrl   = params.get("contractUrl") || `/#contact`;
  const today         = formatDate(new Date().toISOString());

  useEffect(() => {
    document.title = `Үнийн санал #${quoteId} — Хөвсгөл зам ХХК`;
  }, [quoteId]);

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Хяналтын мөр — зөвхөн дэлгэц дээр */}
      <div className="print:hidden bg-slate-900 px-6 py-3 flex items-center gap-4">
        <button onClick={() => window.history.back()}
          className="flex items-center gap-2 text-slate-300 hover:text-white text-sm transition-colors">
          <ArrowLeft className="w-4 h-4" /> Буцах
        </button>
        <div className="flex-1" />
        <a href={contractUrl}
          className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-black font-bold text-sm rounded transition-colors"
          data-testid="btn-go-to-contract">
          <PenLine className="w-4 h-4" /> Гэрээ байгуулах
        </a>
        <button onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white font-bold text-sm rounded transition-colors"
          data-testid="btn-print-quote">
          <Printer className="w-4 h-4" /> PDF хадгалах
        </button>
      </div>

      {/* A4 хуудас */}
      <div className="max-w-2xl mx-auto my-8 print:my-0 bg-white shadow-2xl print:shadow-none">
        <div className="p-10 print:p-8">

          {/* Дээд хэсэг */}
          <div className="flex items-start justify-between mb-8 pb-6 border-b-4 border-slate-900">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-slate-900 rounded flex items-center justify-center flex-shrink-0">
                <Building2 className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <p className="font-black text-slate-900 text-base leading-tight">Хөвсгөл зам ХХК</p>
                <p className="text-xs text-slate-500">Зам гүүр, барилга угсралтын компани</p>
                <p className="text-xs text-slate-500">+976 9941-2701 | info@huvsgulzam.mn</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-black text-slate-900">ҮНИЙН САНАЛ</p>
              <p className="text-xs text-slate-500 mt-1">№ {String(quoteId).padStart(5, "0")}</p>
              <p className="text-xs text-slate-500">Огноо: {today}</p>
            </div>
          </div>

          {/* Харилцагчийн мэдээлэл */}
          <div className="grid grid-cols-2 gap-6 mb-8">
            <div className="bg-slate-50 rounded p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Харилцагч</p>
              <p className="font-bold text-slate-900 text-sm">{name}</p>
              {company && <p className="text-xs text-slate-600 mt-0.5">{company}</p>}
              {phone   && <p className="text-xs text-slate-600 mt-0.5">📞 {phone}</p>}
              {email   && <p className="text-xs text-slate-600 mt-0.5">✉ {email}</p>}
              {deliveryAddress && <p className="text-xs text-slate-600 mt-0.5">📍 {deliveryAddress}</p>}
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-amber-600 mb-2">Хүчинтэй хугацаа</p>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-amber-600" />
                <p className="font-bold text-amber-800 text-sm">{formatDate(validUntil)} хүртэл</p>
              </div>
              <p className="text-xs text-amber-700 mt-1">Энэхүү санал 7 хоногийн дотор хүчинтэй</p>
            </div>
          </div>

          {/* Бүтээгдэхүүний хүснэгт */}
          <table className="w-full mb-8 border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white">
                <th className="text-left px-3 py-2 text-xs font-bold uppercase tracking-wide">№</th>
                <th className="text-left px-3 py-2 text-xs font-bold uppercase tracking-wide">Бүтээгдэхүүн</th>
                <th className="text-center px-3 py-2 text-xs font-bold uppercase tracking-wide">Тоо хэмжээ</th>
                <th className="text-center px-3 py-2 text-xs font-bold uppercase tracking-wide">Нэгж</th>
                <th className="text-right px-3 py-2 text-xs font-bold uppercase tracking-wide">Нэгж үнэ</th>
                <th className="text-right px-3 py-2 text-xs font-bold uppercase tracking-wide">Нийт дүн</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-200">
                <td className="px-3 py-3 text-sm text-slate-600">1</td>
                <td className="px-3 py-3 text-sm font-semibold text-slate-900">{product}</td>
                <td className="px-3 py-3 text-sm text-center text-slate-900">{quantity.toLocaleString()}</td>
                <td className="px-3 py-3 text-sm text-center text-slate-600">{unit}</td>
                <td className="px-3 py-3 text-sm text-right text-slate-900">{fmtMNT(unitPrice)}</td>
                <td className="px-3 py-3 text-sm text-right font-bold text-slate-900">{fmtMNT(totalAmount)}</td>
              </tr>
              <tr className="bg-slate-50">
                <td colSpan={4} />
                <td className="px-3 py-2 text-xs font-bold text-right text-slate-600">ДҮН:</td>
                <td className="px-3 py-2 text-base font-black text-right text-amber-600">{fmtMNT(totalAmount)}</td>
              </tr>
            </tbody>
          </table>

          {/* Нөхцөл */}
          <div className="bg-slate-50 rounded p-4 mb-8 text-xs text-slate-600 space-y-1">
            <p className="font-bold text-slate-800 text-sm mb-2">Санал болгож буй нөхцөл:</p>
            <div className="flex items-start gap-2"><CheckCircle className="w-3.5 h-3.5 text-green-500 mt-0.5 flex-shrink-0" /><span>НӨАТ 10% орсон үнэ</span></div>
            <div className="flex items-start gap-2"><CheckCircle className="w-3.5 h-3.5 text-green-500 mt-0.5 flex-shrink-0" /><span>Тээвэрлэлтийн нөхцөл — гэрээгээр тохируулна</span></div>
            <div className="flex items-start gap-2"><CheckCircle className="w-3.5 h-3.5 text-green-500 mt-0.5 flex-shrink-0" /><span>Төлбөр: урьдчилгаа 50%, үлдэгдэл хүргэлтийн үед</span></div>
            <div className="flex items-start gap-2"><CheckCircle className="w-3.5 h-3.5 text-green-500 mt-0.5 flex-shrink-0" /><span>Чанарын баталгаа: MNS стандартын дагуу</span></div>
          </div>

          {/* Гарын үсэг */}
          <div className="grid grid-cols-2 gap-8 mt-12">
            <div>
              <p className="text-xs text-slate-500 mb-8">Компанийн төлөөлөгч:</p>
              <div className="border-t border-slate-300 pt-2">
                <p className="text-xs text-slate-500">Хөвсгөл зам ХХК</p>
                <p className="text-xs text-slate-500">Борлуулалтын алба</p>
              </div>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-8">Захиалагч:</p>
              <div className="border-t border-slate-300 pt-2">
                <p className="text-xs font-semibold text-slate-700">{name}</p>
                {company && <p className="text-xs text-slate-500">{company}</p>}
              </div>
            </div>
          </div>

          {/* Гэрээний линк — print үед харагдахгүй */}
          <div className="print:hidden mt-8 p-4 bg-amber-50 border border-amber-300 rounded text-center">
            <p className="text-sm text-amber-800 font-semibold mb-3">Энэ саналыг зөвшөөрч байна уу?</p>
            <a href={contractUrl}
              className="inline-flex items-center gap-2 px-6 py-3 bg-amber-600 hover:bg-amber-500 text-black font-bold text-sm rounded transition-colors"
              data-testid="btn-contract-from-quote">
              <PenLine className="w-4 h-4" /> Онлайн гэрээ байгуулах
            </a>
          </div>

        </div>
      </div>

      <style>{`
        @media print {
          @page { margin: 15mm; size: A4; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>
    </div>
  );
}
