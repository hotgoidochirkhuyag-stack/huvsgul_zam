import { QRCodeSVG } from "qrcode.react";
import { Printer, Shield, Building2, HardHat, Factory } from "lucide-react";

const BASE_URL = window.location.origin;
const CHECKIN_URL = `${BASE_URL}/checkin`;

const CARDS = [
  {
    dept: "office",
    label: "ОФФИС",
    sublabel: "Оффисын ажилтан",
    icon: Building2,
    color: "#3b82f6",
    bg: "#0f172a",
    border: "#1e3a5f",
  },
  {
    dept: "field",
    label: "ТАЛБАЙ",
    sublabel: "Талбайн ажилтан",
    icon: HardHat,
    color: "#d97706",
    bg: "#0f172a",
    border: "#3d2a05",
  },
  {
    dept: "plant",
    label: "ҮЙЛДВЭР",
    sublabel: "Үйлдвэрийн ажилтан",
    icon: Factory,
    color: "#22c55e",
    bg: "#0f172a",
    border: "#0f3320",
  },
];

export default function QRPrint() {
  return (
    <div className="min-h-screen bg-slate-100 p-6 print:p-0 print:bg-white">
      {/* Хэвлэх товч — хэвлэхэд харагдахгүй */}
      <div className="flex justify-center mb-8 print:hidden">
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-8 py-3 bg-[#0f172a] hover:bg-slate-800 text-white font-bold rounded-xl text-sm transition-all shadow-lg"
        >
          <Printer className="w-5 h-5" /> Хэвлэх
        </button>
      </div>

      {/* Нийтлэг мэдэгдэл */}
      <div className="text-center mb-6 print:mb-4">
        <h1 className="text-2xl font-black text-[#0f172a] tracking-wide print:text-xl">
          Хөвсгөл Зам ХХК
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Өдрийн ирц бүртгэл — QR код уншуулна уу
        </p>
      </div>

      {/* 3 QR карт — нэг эгнээнд */}
      <div className="flex flex-wrap justify-center gap-8 print:gap-6">
        {CARDS.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.dept}
              className="w-64 rounded-2xl overflow-hidden shadow-xl print:shadow-none print:border print:border-gray-300"
              style={{ background: card.bg }}
            >
              {/* Дээд хэсэг */}
              <div
                className="px-5 py-4 flex items-center gap-3"
                style={{ background: card.border }}
              >
                <Icon style={{ color: card.color, width: 22, height: 22 }} />
                <div>
                  <p
                    className="font-black text-sm tracking-widest"
                    style={{ color: card.color }}
                  >
                    {card.label}
                  </p>
                  <p className="text-xs" style={{ color: "rgba(255,255,255,0.6)" }}>
                    {card.sublabel}
                  </p>
                </div>
              </div>

              {/* QR хэсэг */}
              <div className="flex flex-col items-center px-6 py-6">
                <div className="bg-white p-3 rounded-2xl shadow-md">
                  <QRCodeSVG
                    value={CHECKIN_URL}
                    size={170}
                    bgColor="#ffffff"
                    fgColor="#0f172a"
                    level="M"
                    includeMargin={false}
                  />
                </div>

                <p
                  className="font-black text-base mt-4 tracking-wide"
                  style={{ color: "#ffffff" }}
                >
                  ИРЦЭЭ БҮРТГҮҮЛЭХ
                </p>
                <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.45)" }}>
                  {CHECKIN_URL}
                </p>
              </div>

              {/* Доод хэсэг */}
              <div
                className="px-5 py-3 flex items-center justify-center gap-2"
                style={{ background: "#1e293b" }}
              >
                <Shield style={{ width: 13, height: 13, color: "#22c55e" }} />
                <span style={{ color: "#22c55e", fontSize: 11, fontWeight: 700 }}>
                  ХАБЭА баталгаажуулалттай
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Заавар */}
      <div className="mt-10 max-w-xl mx-auto bg-white rounded-2xl shadow p-5 print:mt-6 print:shadow-none print:border print:border-gray-200">
        <h2 className="font-black text-[#0f172a] text-base mb-3">
          Хэрхэн ашиглах вэ?
        </h2>
        <ol className="space-y-2">
          {[
            "Утасны камераар QR кодыг уншуулна",
            "Нэрээ жагсаалтаас хайж олно",
            "ХАБЭА зааварчлагааны бүх зүйлийг уншаад тэмдэглэнэ",
            '"Баталгаажуулж бүртгүүлэх" товч дарна → ирсэн цаг бүртгэгдэнэ',
            "Даалгавраа хүлээн авч, орой ажил дуусаад тайлангаа оруулна",
          ].map((step, i) => (
            <li key={i} className="flex items-start gap-3 text-sm text-slate-600">
              <span
                className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-black"
                style={{ background: "#d97706" }}
              >
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
      </div>

      {/* Хэвлэхэд зориулсан стиль */}
      <style>{`
        @media print {
          @page { size: A4; margin: 15mm; }
          .print\\:hidden { display: none !important; }
        }
      `}</style>
    </div>
  );
}
