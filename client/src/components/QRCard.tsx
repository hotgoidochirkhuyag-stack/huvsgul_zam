import { QRCodeSVG } from "qrcode.react";
import { X, Download, Printer, Building2, HardHat, Factory, Shield } from "lucide-react";
import { useRef } from "react";

interface Employee {
  id: number;
  name: string;
  role: string;
  department: string;
  qrCode: string;
}

interface QRCardProps {
  employee: Employee;
  onClose: () => void;
  baseUrl?: string;
}

const DEPT = {
  office: { label: "Оффис", icon: Building2, color: "#3b82f6", bg: "#1e3a5f" },
  field:  { label: "Талбай", icon: HardHat,  color: "#d97706", bg: "#3d2a05" },
  plant:  { label: "Үйлдвэр", icon: Factory, color: "#22c55e", bg: "#0f3320" },
};

export default function QRCard({ employee, onClose, baseUrl }: QRCardProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const dept = DEPT[employee.department as keyof typeof DEPT] ?? DEPT.field;
  const DeptIcon = dept.icon;

  const reportUrl = `${baseUrl ?? window.location.origin}/erp/report?dept=${employee.department}&qr=${encodeURIComponent(employee.qrCode)}`;

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;
    const win = window.open("", "_blank", "width=400,height=600");
    if (!win) return;
    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>QR — ${employee.name}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Arial', sans-serif; background: #fff; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
          .card { width: 85mm; border: 1px solid #ddd; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.15); }
          .card-top { background: ${dept.bg}; padding: 12px 16px; display: flex; align-items: center; gap: 8px; }
          .card-top .company { color: ${dept.color}; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; }
          .card-top .dept { color: rgba(255,255,255,0.7); font-size: 8px; }
          .card-body { background: #0f172a; padding: 16px; text-align: center; }
          .card-body svg { border-radius: 4px; }
          .card-name { color: #fff; font-size: 13px; font-weight: 700; margin-top: 10px; }
          .card-role { color: rgba(255,255,255,0.5); font-size: 10px; margin-top: 2px; }
          .card-code { color: ${dept.color}; font-size: 9px; font-family: monospace; margin-top: 6px; letter-spacing: 1px; }
          .card-footer { background: #1e293b; padding: 8px 16px; text-align: center; }
          .card-footer p { color: rgba(255,255,255,0.4); font-size: 8px; }
          .safety-badge { display: flex; align-items: center; gap: 4px; justify-content: center; margin-top: 4px; }
          .safety-badge span { color: #22c55e; font-size: 8px; font-weight: 600; }
        </style>
      </head>
      <body>
        ${printContent.innerHTML}
        <script>window.onload = () => { window.print(); window.close(); }</script>
      </body>
      </html>
    `);
    win.document.close();
  };

  const handleDownloadSVG = () => {
    const svgEl = printRef.current?.querySelector("svg");
    if (!svgEl) return;
    const serializer = new XMLSerializer();
    const svgStr = serializer.serializeToString(svgEl);
    const blob = new Blob([svgStr], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `QR-${employee.name.replace(/\s+/g, "_")}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-sm" onClick={e => e.stopPropagation()}>

        {/* Modal header */}
        <div className="flex items-center justify-between mb-4 px-1">
          <h2 className="text-white font-bold">Ажилтны QR карт</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-all p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* QR Card preview + print content */}
        <div ref={printRef}>
          <div className="card rounded-2xl overflow-hidden shadow-2xl border border-white/10">
            {/* Top brand bar */}
            <div className="card-top px-5 py-3 flex items-center gap-3" style={{ background: dept.bg }}>
              <DeptIcon style={{ color: dept.color, width: 18, height: 18 }} />
              <div>
                <p className="company text-xs font-black uppercase tracking-widest" style={{ color: dept.color }}>
                  Хөвсгөл Зам ХХК
                </p>
                <p className="dept text-xs" style={{ color: "rgba(255,255,255,0.6)" }}>{dept.label} ажилтан</p>
              </div>
            </div>

            {/* QR body */}
            <div className="card-body px-6 py-6 text-center" style={{ background: "#0f172a" }}>
              <div className="inline-block p-3 bg-white rounded-2xl shadow-lg">
                <QRCodeSVG
                  value={reportUrl}
                  size={160}
                  bgColor="#ffffff"
                  fgColor="#0f172a"
                  level="M"
                  includeMargin={false}
                />
              </div>
              <p className="card-name text-white font-black text-base mt-4">{employee.name}</p>
              <p className="card-role text-sm mt-1" style={{ color: "rgba(255,255,255,0.5)" }}>{employee.role}</p>
              <p className="card-code font-mono text-xs mt-3" style={{ color: dept.color }}>{employee.qrCode}</p>
            </div>

            {/* Footer */}
            <div className="card-footer px-5 py-3" style={{ background: "#1e293b" }}>
              <div className="safety-badge flex items-center justify-center gap-1">
                <Shield style={{ width: 12, height: 12, color: "#22c55e" }} />
                <span style={{ color: "#22c55e", fontSize: 11, fontWeight: 600 }}>ХАБЭА баталгаажуулалттай</span>
              </div>
              <p className="text-center text-xs mt-1" style={{ color: "rgba(255,255,255,0.3)" }}>
                Тайлан бөглөхдөө уншуулна уу
              </p>
            </div>
          </div>
        </div>

        {/* URL preview */}
        <div className="mt-3 p-3 bg-slate-800/50 border border-white/5 rounded-xl">
          <p className="text-xs text-slate-500 mb-1">QR кодын линк:</p>
          <p className="text-xs text-slate-300 font-mono break-all">{reportUrl}</p>
        </div>

        {/* Action buttons */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <button
            onClick={handlePrint}
            className="flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all text-sm"
          >
            <Printer className="w-4 h-4" /> Хэвлэх
          </button>
          <button
            onClick={handleDownloadSVG}
            className="flex items-center justify-center gap-2 py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl transition-all text-sm"
          >
            <Download className="w-4 h-4" /> Татах (SVG)
          </button>
        </div>
      </div>
    </div>
  );
}
