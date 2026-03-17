import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Video, VideoOff, Loader2 } from "lucide-react";
import type { Employee } from "@shared/schema";

export type MeetingMode = "CONFERENCE_HALL" | "BOARD_DIRECTOR";

const MODE_CONFIG: Record<MeetingMode, {
  roomName: string;
  departments: string[];
  color: "blue" | "amber";
}> = {
  CONFERENCE_HALL: {
    roomName:    "KhuvsgulZam_HurlynZaal",
    departments: ["field", "plant"],
    color:       "blue",
  },
  BOARD_DIRECTOR: {
    roomName:    "KhuvsgulZam_TUZ_Zahiral",
    departments: ["office"],
    color:       "amber",
  },
};

export function FactoryControl({ mode }: { mode: MeetingMode }) {
  const meetRef  = useRef<HTMLDivElement>(null);
  const apiRef   = useRef<any>(null);
  const [isCalling,   setIsCalling]   = useState(false);
  const [selected,    setSelected]    = useState<number | null>(null);
  const [jitsiReady,  setJitsiReady]  = useState(false);

  const cfg      = MODE_CONFIG[mode];
  const isAmber  = cfg.color === "amber";

  const { data: allEmployees = [], isLoading } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
  });

  const employees = allEmployees.filter(e => cfg.departments.includes(e.department));

  useEffect(() => {
    if (employees.length > 0 && selected === null) {
      setSelected(employees[0].id);
    }
  }, [employees.length, mode]);

  useEffect(() => {
    if ((window as any).JitsiMeetExternalAPI) { setJitsiReady(true); return; }
    const script   = document.createElement("script");
    script.src     = "https://meet.jit.si/external_api.js";
    script.async   = true;
    script.onload  = () => setJitsiReady(true);
    document.body.appendChild(script);
    return () => { script.remove(); };
  }, []);

  useEffect(() => {
    if (isCalling) endCall();
    setSelected(null);
  }, [mode]);

  const endCall = () => {
    if (apiRef.current) { apiRef.current.dispose(); apiRef.current = null; }
    setIsCalling(false);
  };

  const startCall = () => {
    if (!jitsiReady || !meetRef.current || selected === null) return;
    const emp = employees.find(e => e.id === selected);
    apiRef.current = new (window as any).JitsiMeetExternalAPI("meet.jit.si", {
      roomName:   cfg.roomName,
      width:      "100%",
      height:     480,
      parentNode: meetRef.current,
      userInfo:   { displayName: emp?.name ?? "Хэрэглэгч" },
      configOverwrite:          { startWithAudioMuted: false, startWithVideoMuted: false },
      interfaceConfigOverwrite: { TOOLBAR_BUTTONS: ["microphone","camera","chat","hangup","tileview","fullscreen"] },
    });
    apiRef.current.addEventListener("videoConferenceLeft", () => endCall());
    setIsCalling(true);
  };

  const DEPT_LABEL: Record<string, string> = {
    office: "Оффис",
    field:  "Талбай",
    plant:  "Үйлдвэр",
  };

  return (
    <div className="flex flex-col gap-4">
      {!isCalling && (
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
            Нэвтрэх хэрэглэгч сонгох
          </p>

          {isLoading ? (
            <div className="flex items-center gap-2 text-slate-500 py-4">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Ажилтнуудын жагсаалт татаж байна...</span>
            </div>
          ) : employees.length === 0 ? (
            <div className="text-slate-500 text-sm py-4 text-center">
              Энэ горимд харгалзах ажилтан олдсонгүй
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mb-4 max-h-60 overflow-y-auto pr-1">
              {employees.map(emp => (
                <button
                  key={emp.id}
                  onClick={() => setSelected(emp.id)}
                  className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${
                    selected === emp.id
                      ? isAmber
                        ? "bg-amber-600/20 border-amber-500/40"
                        : "bg-blue-600/20 border-blue-500/40"
                      : "bg-slate-900/40 border-white/10 hover:border-white/20"
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${
                    selected === emp.id
                      ? isAmber ? "bg-amber-600 text-white" : "bg-blue-600 text-white"
                      : "bg-slate-700 text-slate-400"
                  }`}>
                    {emp.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-white text-sm font-semibold leading-tight truncate">{emp.name}</p>
                    <p className="text-slate-500 text-xs mt-0.5">{emp.role}</p>
                    <span className={`inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      emp.department === "office"
                        ? "bg-amber-600/20 text-amber-400"
                        : emp.department === "field"
                          ? "bg-blue-600/20 text-blue-400"
                          : "bg-green-600/20 text-green-400"
                    }`}>
                      {DEPT_LABEL[emp.department] ?? emp.department}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}

          <button
            onClick={startCall}
            disabled={!jitsiReady || selected === null || employees.length === 0}
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
