import { useState } from "react";
import { 
  TrendingUp, Factory, FileText, PlayCircle, Loader2, 
  Download, Edit3, Save, CheckCircle2, AlertTriangle, Printer
} from "lucide-react";
import { useLocation } from "wouter";

export default function ERPDashboard() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("tender");
  const [isGenerating, setIsGenerating] = useState(false);
  const [tenderProgress, setTenderProgress] = useState(0);
  const [isEditing, setIsEditing] = useState(false);

  // ТЕНДЕРИЙН АГУУЛГА (AI-аас ирэх өгөгдөл)
  const [tenderContent, setTenderContent] = useState({
    title: "ТАРИАЛАН СУМЫН ПАВЕД ЗАМЫН АЖИЛ ГҮЙЦЭТГЭХ АРГАЧЛАЛ",
    company: "Хөвсгөл Зам ХХК",
    body: `1. ТӨСЛИЙН УДИРДЛАГА: Манай компани Мөрөн дэх бетон зуурмагийн үйлдвэр (90м3/ц)-ээс нийлүүлэлтийг тасралтгүй хангана.\n\n2. ТЕХНОЛОГИЙН ДАРААЛАЛ: Асфальт бетон хучилтыг БНбД 32-01-26 стандартын дагуу 2 үе шаттайгаар гүйцэтгэнэ.\n\n3. ЧАНАРЫН ХЯНАЛТ: Лабораторийн шинжилгээг талбай дээр тухай бүр гүйцэтгэж, AI системээр норм хяналтыг тогтооно.`
  });

  // AI ГЕНЕРАЦИ ХИЙХ
  const startTenderAI = () => {
    setIsGenerating(true);
    setTenderProgress(0);
    const interval = setInterval(() => {
      setTenderProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsGenerating(false);
          return 100;
        }
        return prev + 10;
      });
    }, 200);
  };

  // PDF БОЛГОЖ ХЭВЛЭХ (Browser Print)
  const handleDownloadPDF = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 flex overflow-hidden">

      {/* SIDEBAR - Хэвлэх үед харагдахгүй */}
      <aside className="w-64 border-r border-white/5 bg-slate-900/50 p-6 flex flex-col gap-6 print:hidden">
        <div>
          <h2 className="text-xl font-black text-white italic">ХӨВСГӨЛ ЗАМ</h2>
          <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest">AI ERP v3.5</p>
        </div>
        <nav className="flex flex-col gap-2">
          <button onClick={() => setActiveTab("overview")} className={`flex items-center gap-3 px-4 py-3 rounded-xl ${activeTab === "overview" ? "bg-blue-600" : "hover:bg-slate-800"}`}>
            <TrendingUp size={18} /> <span className="text-xs font-bold">ДАШБОРД</span>
          </button>
          <button onClick={() => setActiveTab("tender")} className={`flex items-center gap-3 px-4 py-3 rounded-xl ${activeTab === "tender" ? "bg-blue-600" : "hover:bg-slate-800"}`}>
            <FileText size={18} /> <span className="text-xs font-bold">ТЕНДЕР БЭЛДЭГЧ</span>
          </button>
        </nav>
        <button onClick={() => setLocation("/")} className="mt-auto py-2 text-xs font-bold text-red-400">ГАРАХ</button>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 p-8 overflow-y-auto bg-[#020617]">

        {activeTab === "tender" && (
          <div className="max-w-4xl mx-auto space-y-6">

            {/* CONTROL PANEL - Хэвлэх үед харагдахгүй */}
            <div className="flex justify-between items-center print:hidden">
              <h1 className="text-2xl font-black text-white uppercase italic">Тендер боловсруулалт</h1>
              <div className="flex gap-3">
                <button 
                  onClick={startTenderAI}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all"
                >
                  {isGenerating ? <Loader2 className="animate-spin" size={18} /> : <PlayCircle size={18} />}
                  AI ГЕНЕРАЦИ
                </button>

                {tenderProgress === 100 && (
                  <>
                    <button 
                      onClick={() => setIsEditing(!isEditing)}
                      className="bg-slate-800 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 border border-white/10"
                    >
                      {isEditing ? <Save size={18} /> : <Edit3 size={18} />}
                      {isEditing ? "ХАДГАЛАХ" : "ЗАСАХ"}
                    </button>
                    <button 
                      onClick={handleDownloadPDF}
                      className="bg-green-600 hover:bg-green-500 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2"
                    >
                      <Printer size={18} /> PDF ТАТАХ
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* PROGRESS BAR */}
            {isGenerating && (
              <div className="bg-slate-900 border border-blue-500/30 p-6 rounded-2xl animate-pulse print:hidden">
                <div className="flex justify-between mb-2">
                  <span className="text-xs font-bold text-blue-400 uppercase">AI Материал бэлдэж байна...</span>
                  <span className="text-xs font-bold">{tenderProgress}%</span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div className="bg-blue-500 h-full transition-all duration-300" style={{ width: `${tenderProgress}%` }} />
                </div>
              </div>
            )}

            {/* DOCUMENT AREA (Энэ хэсэг PDF болно) */}
            <div className={`bg-white text-black p-12 rounded-sm shadow-2xl min-h-[1000px] transition-all ${isEditing ? 'ring-4 ring-blue-500/50' : ''}`}>
              <div className="max-w-[100%] mx-auto">
                {/* Header */}
                <div className="border-b-2 border-black pb-6 mb-8 flex justify-between items-start">
                  <div>
                    <h2 className="text-2xl font-black uppercase leading-tight">{tenderContent.company}</h2>
                    <p className="text-sm font-bold text-gray-600 uppercase tracking-widest mt-1">Тендерийн алба</p>
                  </div>
                  <div className="text-right text-xs font-bold">
                    <p>Огноо: {new Date().toLocaleDateString()}</p>
                    <p>Дугаар: ХЗ-2026/Т-08</p>
                  </div>
                </div>

                {/* Editable Content */}
                {isEditing ? (
                  <textarea 
                    className="w-full h-[800px] p-4 text-lg border-2 border-blue-500 rounded-lg focus:outline-none leading-relaxed font-serif"
                    value={tenderContent.body}
                    onChange={(e) => setTenderContent({...tenderContent, body: e.target.value})}
                  />
                ) : (
                  <div className="space-y-6">
                    <h1 className="text-xl font-bold text-center underline mb-8">{tenderContent.title}</h1>
                    <div className="text-lg leading-[1.8] whitespace-pre-wrap font-serif">
                      {tenderProgress > 0 ? tenderContent.body : "AI-аар материалаа бэлдэх товчийг дарна уу..."}
                    </div>

                    {tenderProgress === 100 && (
                      <div className="mt-20 pt-10 border-t border-gray-200 flex justify-between">
                        <div className="text-center">
                          <p className="font-bold">Боловсруулсан:</p>
                          <p className="mt-4 italic">............................ /AI Agent/</p>
                        </div>
                        <div className="text-center">
                          <p className="font-bold">Хянасан:</p>
                          <p className="mt-4 italic">............................ /О.Цэрэндорж/</p>
                          <p className="text-[10px] mt-1 font-bold uppercase">(Гүйцэтгэх захирал)</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}