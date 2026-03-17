import { useEffect, useRef, useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Video, VideoOff, Loader2, Search, Users, CheckSquare, Square, X } from "lucide-react";
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

const DEPT_LABEL: Record<string, string> = {
  office: "Оффис",
  field:  "Талбай",
  plant:  "Үйлдвэр",
};

const DEPT_COLOR: Record<string, string> = {
  office: "bg-amber-600/20 text-amber-400",
  field:  "bg-blue-600/20 text-blue-400",
  plant:  "bg-green-600/20 text-green-400",
};

export function FactoryControl({ mode }: { mode: MeetingMode }) {
  const meetRef  = useRef<HTMLDivElement>(null);
  const apiRef   = useRef<any>(null);

  const [isCalling,  setIsCalling]  = useState(false);
  const [checked,    setChecked]    = useState<Set<number>>(new Set());
  const [search,     setSearch]     = useState("");
  const [jitsiReady, setJitsiReady] = useState(false);

  const cfg     = MODE_CONFIG[mode];
  const isAmber = cfg.color === "amber";

  const { data: allEmployees = [], isLoading } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
  });

  const employees = useMemo(
    () => allEmployees.filter(e => cfg.departments.includes(e.department)),
    [allEmployees, mode]
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return q
      ? employees.filter(e => e.name.toLowerCase().includes(q) || e.role.toLowerCase().includes(q))
      : employees;
  }, [employees, search]);

  const selectedEmps = useMemo(
    () => employees.filter(e => checked.has(e.id)),
    [employees, checked]
  );

  useEffect(() => {
    if (isCalling) endCall();
    setChecked(new Set());
    setSearch("");
  }, [mode]);

  useEffect(() => {
    if ((window as any).JitsiMeetExternalAPI) { setJitsiReady(true); return; }
    const script   = document.createElement("script");
    script.src     = "https://meet.jit.si/external_api.js";
    script.async   = true;
    script.onload  = () => setJitsiReady(true);
    document.body.appendChild(script);
    return () => { script.remove(); };
  }, []);

  const toggleOne = (id: number) => {
    setChecked(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (checked.size === employees.length) {
      setChecked(new Set());
    } else {
      setChecked(new Set(employees.map(e => e.id)));
    }
  };

  const endCall = () => {
    if (apiRef.current) { apiRef.current.dispose(); apiRef.current = null; }
    setIsCalling(false);
  };

  const startCall = () => {
    if (!jitsiReady || !meetRef.current || checked.size === 0) return;
    apiRef.current = new (window as any).JitsiMeetExternalAPI("meet.jit.si", {
      roomName:   cfg.roomName,
      width:      "100%",
      height:     480,
      parentNode: meetRef.current,
      userInfo:   { displayName: "Зохион байгуулагч" },
      configOverwrite:          { startWithAudioMuted: false, startWithVideoMuted: false },
      interfaceConfigOverwrite: { TOOLBAR_BUTTONS: ["microphone","camera","chat","hangup","tileview","fullscreen"] },
    });
    apiRef.current.addEventListener("videoConferenceLeft", () => endCall());
    setIsCalling(true);
  };

  const allChecked    = employees.length > 0 && checked.size === employees.length;
  const someChecked   = checked.size > 0 && !allChecked;

  return (
    <div className="flex flex-col gap-4">
      {!isCalling && (
        <>
          {/* Search + select all */}
          <div className="flex gap-2 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Нэр, албан тушаалаар хайх..."
                className="w-full bg-slate-800 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder:text-slate-600 outline-none focus:border-white/30 transition-all"
              />
            </div>
            <button
              onClick={toggleAll}
              title={allChecked ? "Бүгдийг цуцлах" : "Бүгдийг сонгох"}
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-white/10 bg-slate-800 hover:border-white/20 text-slate-400 hover:text-white text-sm transition-all whitespace-nowrap"
            >
              {allChecked
                ? <CheckSquare className={`w-4 h-4 ${isAmber ? "text-amber-400" : "text-blue-400"}`} />
                : someChecked
                  ? <CheckSquare className="w-4 h-4 text-slate-500" />
                  : <Square className="w-4 h-4" />}
              Бүгд
            </button>
          </div>

          {/* Employee list */}
          {isLoading ? (
            <div className="flex items-center gap-2 text-slate-500 py-6 justify-center">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Ажилтнуудын жагсаалт татаж байна...</span>
            </div>
          ) : employees.length === 0 ? (
            <div className="text-slate-500 text-sm py-6 text-center">
              Энэ горимд харгалзах ажилтан олдсонгүй
            </div>
          ) : (
            <div className="border border-white/10 rounded-2xl overflow-hidden">
              <div className="max-h-64 overflow-y-auto">
                {filtered.length === 0 ? (
                  <div className="text-slate-500 text-sm p-4 text-center">Хайлтын үр дүн олдсонгүй</div>
                ) : (
                  filtered.map((emp, i) => {
                    const isChecked = checked.has(emp.id);
                    return (
                      <button
                        key={emp.id}
                        onClick={() => toggleOne(emp.id)}
                        data-testid={`emp-row-${emp.id}`}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all ${
                          i !== 0 ? "border-t border-white/5" : ""
                        } ${isChecked
                          ? isAmber ? "bg-amber-600/10" : "bg-blue-600/10"
                          : "hover:bg-white/[0.03]"
                        }`}
                      >
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
                          isChecked
                            ? isAmber
                              ? "bg-amber-600 border-amber-500"
                              : "bg-blue-600 border-blue-500"
                            : "border-slate-600"
                        }`}>
                          {isChecked && <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                        </div>

                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${
                          isChecked
                            ? isAmber ? "bg-amber-600 text-white" : "bg-blue-600 text-white"
                            : "bg-slate-700 text-slate-400"
                        }`}>
                          {emp.name.charAt(0)}
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-semibold truncate">{emp.name}</p>
                          <p className="text-slate-500 text-xs truncate">{emp.role}</p>
                        </div>

                        <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded ${DEPT_COLOR[emp.department] ?? "bg-slate-700 text-slate-400"}`}>
                          {DEPT_LABEL[emp.department] ?? emp.department}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Selected chips */}
          {selectedEmps.length > 0 && (
            <div className="bg-slate-800/40 rounded-xl border border-white/10 p-3">
              <div className="flex items-center gap-2 mb-2">
                <Users className={`w-4 h-4 ${isAmber ? "text-amber-400" : "text-blue-400"}`} />
                <span className="text-xs font-bold text-white">Сонгосон оролцогчид ({selectedEmps.length})</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {selectedEmps.map(emp => (
                  <span
                    key={emp.id}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold ${
                      isAmber ? "bg-amber-600/20 text-amber-300" : "bg-blue-600/20 text-blue-300"
                    }`}
                  >
                    {emp.name}
                    <button onClick={() => toggleOne(emp.id)} className="opacity-60 hover:opacity-100 ml-0.5">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Start button */}
          <button
            onClick={startCall}
            disabled={!jitsiReady || checked.size === 0}
            className={`w-full py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all ${
              isAmber
                ? "bg-amber-600 hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed"
            }`}
          >
            <Video className="w-4 h-4" />
            {checked.size === 0
              ? "Оролцогч сонгоно уу"
              : jitsiReady
                ? `${checked.size} хүнтэй хурал эхлүүлэх`
                : "Холбогдож байна..."}
          </button>
        </>
      )}

      {isCalling && (
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm text-green-400 font-semibold">Хурал явагдаж байна — {selectedEmps.length} оролцогч</span>
          </div>
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
