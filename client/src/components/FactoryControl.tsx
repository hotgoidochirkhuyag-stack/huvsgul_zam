import { useEffect, useRef, useState } from "react";
import { Video, VideoOff, Users, Building2, Crown } from "lucide-react";

export type MeetingMode = "CONFERENCE_HALL" | "BOARD_DIRECTOR";

const MODE_CONFIG: Record<MeetingMode, {
  roomName: string;
  displayName: string;
  icon: any;
  color: string;
  participants: { id: string; name: string; role: string }[];
}> = {
  CONFERENCE_HALL: {
    roomName: "KhuvsgulZam_HurlynZaal",
    displayName: "Хурлын заал",
    icon: Building2,
    color: "blue",
    participants: [
      { id: "p1", name: "Бат (Инженер)",      role: "Инженер"     },
      { id: "p2", name: "Дорж (Оператор)",    role: "Оператор"    },
      { id: "p3", name: "Цэцэг (Хяналт)",     role: "Хяналт"      },
      { id: "p4", name: "Мөнх (Механик)",     role: "Механик"     },
      { id: "p5", name: "Сарнай (Лаборатори)", role: "Лаборатори" },
    ],
  },
  BOARD_DIRECTOR: {
    roomName: "KhuvsgulZam_TUZ_Zahiral",
    displayName: "ТУЗ / Захирал",
    icon: Crown,
    color: "amber",
    participants: [
      { id: "d1", name: "Захирал",             role: "Гүйцэтгэх захирал" },
      { id: "d2", name: "ТУЗ-ын дарга",        role: "ТУЗ"               },
      { id: "d3", name: "Санхүүгийн захирал",  role: "CFO"               },
      { id: "d4", name: "Техникийн захирал",   role: "CTO"               },
      { id: "d5", name: "Хуулийн зөвлөх",      role: "Хуулийн зөвлөх"   },
    ],
  },
};

export function FactoryControl({ mode }: { mode: MeetingMode }) {
  const meetRef    = useRef<HTMLDivElement>(null);
  const apiRef     = useRef<any>(null);
  const [isCalling, setIsCalling]   = useState(false);
  const [selected, setSelected]     = useState(MODE_CONFIG[mode].participants[0].id);
  const [jitsiReady, setJitsiReady] = useState(false);

  const cfg = MODE_CONFIG[mode];
  const Icon = cfg.icon;
  const isAmber = cfg.color === "amber";

  useEffect(() => {
    if ((window as any).JitsiMeetExternalAPI) { setJitsiReady(true); return; }
    const script = document.createElement("script");
    script.src   = "https://meet.jit.si/external_api.js";
    script.async = true;
    script.onload = () => setJitsiReady(true);
    document.body.appendChild(script);
    return () => { script.remove(); };
  }, []);

  useEffect(() => {
    if (isCalling) endCall();
  }, [mode]);

  const endCall = () => {
    if (apiRef.current) { apiRef.current.dispose(); apiRef.current = null; }
    setIsCalling(false);
  };

  const startCall = () => {
    if (!jitsiReady || !meetRef.current) return;
    const participant = cfg.participants.find(p => p.id === selected);
    apiRef.current = new (window as any).JitsiMeetExternalAPI("meet.jit.si", {
      roomName:   cfg.roomName,
      width:      "100%",
      height:     480,
      parentNode: meetRef.current,
      userInfo:   { displayName: participant?.name ?? "Хэрэглэгч" },
      configOverwrite: { startWithAudioMuted: false, startWithVideoMuted: false },
      interfaceConfigOverwrite: { TOOLBAR_BUTTONS: ["microphone","camera","chat","hangup","tileview","fullscreen"] },
    });
    apiRef.current.addEventListener("videoConferenceLeft", () => endCall());
    setIsCalling(true);
  };

  return (
    <div className="flex flex-col gap-4">
      {!isCalling && (
        <div className="bg-slate-800/60 rounded-xl border border-white/10 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Icon className={`w-4 h-4 ${isAmber ? "text-amber-400" : "text-blue-400"}`} />
            <span className="text-sm font-semibold text-white">{cfg.displayName} — нэвтрэх хэрэглэгч</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mb-4">
            {cfg.participants.map(p => (
              <button
                key={p.id}
                onClick={() => setSelected(p.id)}
                className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${
                  selected === p.id
                    ? isAmber
                      ? "bg-amber-600/20 border-amber-500/40"
                      : "bg-blue-600/20 border-blue-500/40"
                    : "bg-slate-900/40 border-white/10 hover:border-white/20"
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${
                  selected === p.id
                    ? isAmber ? "bg-amber-600 text-white" : "bg-blue-600 text-white"
                    : "bg-slate-700 text-slate-400"
                }`}>
                  {p.name.charAt(0)}
                </div>
                <div>
                  <p className="text-white text-sm font-semibold leading-tight">{p.name}</p>
                  <p className="text-slate-500 text-xs mt-0.5">{p.role}</p>
                </div>
              </button>
            ))}
          </div>

          <button
            onClick={startCall}
            disabled={!jitsiReady}
            className={`w-full py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all ${
              isAmber
                ? "bg-amber-600 hover:bg-amber-500 disabled:opacity-40"
                : "bg-blue-600 hover:bg-blue-500 disabled:opacity-40"
            }`}
          >
            <Video className="w-4 h-4" />
            {jitsiReady ? "Хурал эхлүүлэх" : "Холбогдож байна..."}
          </button>
        </div>
      )}

      {isCalling && (
        <div className="flex justify-end">
          <button
            onClick={endCall}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 rounded-xl text-white font-bold transition-all"
          >
            <VideoOff className="w-4 h-4" />
            Хурал дуусгах
          </button>
        </div>
      )}

      <div
        ref={meetRef}
        className="rounded-2xl overflow-hidden border border-white/10"
        style={{ display: isCalling ? "block" : "none", minHeight: 480 }}
      />
    </div>
  );
}
