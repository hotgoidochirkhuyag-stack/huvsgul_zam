import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Lock, Activity, Database, Truck } from 'lucide-react';

const AdminLogin = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [sheetData, setSheetData] = useState({ user: '', pass: '', p: '', m: '', t: '', lastUpdate: '' });

  const csvUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRiWudLYJX4r1Xf-FaK71gxRgNY8uR_Jywrk14KIphZsPHcIBE7zC0w6C2HcKNSYltvvJKMMS5Fl2M1/pub?output=csv";
  const scriptUrl = "https://script.google.com/macros/s/AKfycbz2VGfmGB0s47Bz5c5yda8G8-Ot0MyKZF1GipkX7cujlidcsLudWkxOPvb4dowEsmefjQ/exec";

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Cache-аас сэргийлж цаг хугацааны тамга нэмэв
        const res = await fetch(`${csvUrl}&t=${new Date().getTime()}`);
        const text = await res.text();
        const rows = text.split('\n').map(row => row.split(','));

        // A2, A3, A4 нүднүүдээс хамгийн сүүлийн огноог хайх логик
        let latestDate = "";
        for (let i = 1; i <= 3; i++) { // rows[1], rows[2], rows[3] буюу A2, A3, A4
          const cellValue = rows[i]?.[0]?.trim();
          if (cellValue && cellValue !== "" && cellValue.toLowerCase() !== "date") {
            latestDate = cellValue;
          }
        }

        setSheetData({
          p: rows[1]?.[7]?.trim().toLowerCase() || "амралт",
          m: rows[2]?.[7]?.trim().toLowerCase() || "амралт",
          t: rows[3]?.[7]?.trim().toLowerCase() || "амралт",
          user: rows[5]?.[7]?.trim() || "admin",
          pass: rows[6]?.[7]?.trim() || "1234",
          lastUpdate: latestDate 
        });
      } catch (e) { console.error("Data error"); }
    };
    fetchData();
  }, []);

  const getStatusStyle = (v: string) => {
    switch(v) {
      case "улаан": return { color: "bg-red-500", shadow: "shadow-[0_0_15px_#ef4444]", label: "АРГА ХЭМЖЭЭ АВАХ" };
      case "ногоон": return { color: "bg-green-500", shadow: "shadow-[0_0_15px_#22c55e]", label: "ГҮЙЦЭТГЭЛИЙГ ШАЛГАЖ ТАЙЛАГНАХ" };
      case "шар": return { color: "bg-yellow-500", shadow: "shadow-[0_0_15px_#eab308]", label: "АНХААРАЛ ХАНДУУЛАХ" };
      default: return { color: "bg-slate-500", shadow: "shadow-[0_0_15px_#64748b]", label: "АМРАЛТ" };
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (username === sheetData.user && password === sheetData.pass) {
      try {
        await fetch(scriptUrl, { method: "POST", mode: "no-cors", body: JSON.stringify({ user: username }) });
        localStorage.setItem("isAdmin", "true");
        window.location.href = "/admin/dashboard";
      } catch (err) { alert("Алдаа гарлаа"); }
    } else {
      alert("Нэр эсвэл нууц үг буруу!");
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-4 font-sans">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full"></div>
        <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-indigo-600/10 blur-[120px] rounded-full"></div>
      </div>

      <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="bg-slate-900/40 backdrop-blur-xl p-8 rounded-3xl border border-white/10 shadow-2xl">
          <div className="flex items-center gap-3 mb-10">
            <div className="p-3 bg-blue-600/20 rounded-2xl">
              <Lock className="w-6 h-6 text-blue-400" />
            </div>
            <h2 className="text-lg font-bold text-white tracking-tight uppercase">компаны удирдлага </h2>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-400 ml-1 uppercase tracking-widest">Хэрэглэгч</label>
              <input type="text" onChange={(e) => setUsername(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all placeholder:text-slate-600" placeholder="Username" required />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-400 ml-1 uppercase tracking-widest">Нууц үг</label>
              <input type="password" onChange={(e) => setPassword(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all placeholder:text-slate-600" placeholder="••••••••" required />
            </div>
            <button type="submit" className="w-full bg-blue-600/20 text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-600/60 transition-all active:scale-[0.98] mt-4">
              НЭВТРЭХ
            </button>
          </form>
        </motion.div>

        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="bg-gradient-to-br from-slate-900/60 to-slate-900/40 backdrop-blur-xl p-8 rounded-3xl border border-blue-500/10">
          <h3 className="text-lg font-bold mb-8 flex items-center gap-3 text-yellow-500">
            <div className="w-1.5 h-6 bg-yellow-500 rounded-full"></div>
            ХЯНАЛТЫН САМБАР
          </h3>

          <div className="space-y-8">
            {[
              { label: "Төслийн явц", val: sheetData.p, icon: Activity },
              { label: "Материал хангамж", val: sheetData.m, icon: Database },
              { label: "Техник ашиглалт", val: sheetData.t, icon: Truck }
            ].map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 hover:border-blue-500/20 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-blue-500/10 rounded-xl">
                    <item.icon className="w-5 h-5 text-blue-400" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-500 uppercase tracking-tighter">{item.label}</span>
                    <span className="text-sm font-bold text-slate-200">{getStatusStyle(item.val).label}</span>
                  </div>
                </div>
                <div className={`w-3 h-3 rounded-full ${getStatusStyle(item.val).color} ${getStatusStyle(item.val).shadow} animate-pulse`}></div>
              </div>
            ))}
          </div>

          <div className="mt-10 p-4 bg-blue-600/5 border border-blue-500/10 rounded-2xl">
            <p className="text-[10px] text-yellow-500 text-center leading-relaxed font-medium tracking-wide">
              Системийн мэдээлэл <br/> 
              <span className="text-white font-bold">{sheetData.lastUpdate}</span> өдрөөр шинэчлэгдcэн байна.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default AdminLogin;