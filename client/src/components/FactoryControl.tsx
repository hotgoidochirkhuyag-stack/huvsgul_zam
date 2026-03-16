import { useEffect, useRef, useState } from "react";

// Ажилчдын өгөгдөл
const WORKERS = [
  { id: "worker_01", name: "Бат (Инженер)" },
  { id: "worker_02", name: "Дорж (Оператор)" },
  { id: "worker_03", name: "Цэцэг (Хяналт)" }
];

export function FactoryControl({ mode }: { mode: 'DIRECTOR_ENGINEER' | 'ENGINEER_WORKER' | 'VENDOR_SUPPORT' }) {
  const meetRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<any>(null);
  const [isCalling, setIsCalling] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState(WORKERS[0].id);

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://meet.jit.si/external_api.js";
    script.async = true;
    document.body.appendChild(script);
    return () => { script.remove(); };
  }, []);

  const startCall = () => {
    if ((window as any).JitsiMeetExternalAPI) {
      const options = {
        // Сонгосон ажилтны ID-аар өрөөний нэр үүсгэнэ
        roomName: `Khuvsgul_Project_${selectedWorker}`, 
        width: '100%',
        height: '500px',
        parentNode: meetRef.current,
        userInfo: { displayName: "Инженер" }
      };

      apiRef.current = new (window as any).JitsiMeetExternalAPI("meet.jit.si", options);
      setIsCalling(true);
    }
  };

  const endCall = () => {
    if (apiRef.current) {
      apiRef.current.dispose();
      apiRef.current = null;
      setIsCalling(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Сонгогч хэсэг */}
      {!isCalling && (
        <div className="flex gap-4 items-center">
          <select 
            value={selectedWorker}
            onChange={(e) => setSelectedWorker(e.target.value)}
            className="bg-slate-800 text-white p-2 rounded border border-white/20"
          >
            {WORKERS.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
          <button onClick={startCall} className="bg-blue-600 px-4 py-2 rounded text-white font-bold hover:bg-blue-500">
            Залгах
          </button>
        </div>
      )}

      {/* Дуудлага дуусгах */}
      {isCalling && (
        <button onClick={endCall} className="bg-red-600 px-4 py-2 rounded text-white font-bold self-start">
          Дуудлага дуусгах
        </button>
      )}

      <div ref={meetRef} style={{ width: '100%', height: '500px', display: isCalling ? 'block' : 'none' }} />
    </div>
  );
}