import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import {
  TrendingUp, Star, Target, Calendar, CheckCircle2, Clock,
  ChevronLeft, Loader2, Award, BarChart3, HardHat, Building2, Factory,
  ArrowRight, Zap,
} from "lucide-react";

const DEPT_INFO: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  office: { label: "Оффис",   icon: Building2, color: "text-blue-400",  bg: "bg-blue-500/15" },
  field:  { label: "Талбай",  icon: HardHat,   color: "text-amber-400", bg: "bg-amber-500/15" },
  plant:  { label: "Үйлдвэр", icon: Factory,   color: "text-green-400", bg: "bg-green-500/15" },
};

const LEVEL_LABEL: Record<number, string> = { 1: "Шинэ", 2: "Туршлагатай", 3: "Мэргэшсэн", 4: "Мастер" };

function ProgressBar({ value, max = 100, color = "bg-amber-500" }: { value: number; max?: number; color?: string }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
      <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function LevelMeter({ avg }: { avg: number }) {
  const pct = Math.min(100, (avg / 4) * 100);
  const color = avg >= 4 ? "bg-amber-400" : avg >= 3 ? "bg-green-400" : avg >= 2 ? "bg-blue-400" : "bg-slate-500";
  return (
    <div className="relative w-full">
      <div className="flex justify-between text-[10px] text-slate-500 mb-1.5">
        <span>Шинэ</span><span>Туршлагатай</span><span>Мэргэшсэн</span><span>Мастер</span>
      </div>
      <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-1000 ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="flex justify-between text-[10px] text-slate-600 mt-1">
        <span>1.0</span><span>2.0</span><span>3.0</span><span>4.0</span>
      </div>
    </div>
  );
}

export default function EmployeeProfile() {
  const { token } = useParams<{ token: string }>();
  const [, setLocation] = useLocation();

  const { data, isLoading, error } = useQuery<any>({
    queryKey: ["/api/employee-profile", token],
    queryFn: () => fetch(`/api/employee-profile/${token}`).then(r => r.json()),
    enabled: !!token,
    staleTime: 30000,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
      </div>
    );
  }

  if (error || data?.error) {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center gap-4 p-6">
        <p className="text-red-400 text-center">Мэдээлэл олдсонгүй</p>
        <button onClick={() => setLocation("/checkin")} className="text-amber-400 text-sm flex items-center gap-1">
          <ChevronLeft className="w-4 h-4" /> Буцах
        </button>
      </div>
    );
  }

  if (!data) return null;

  const emp = data.employee;
  const skill = data.skill;
  const att = data.attendance;
  const kpi = data.kpi;
  const base = data.salaryBase ?? 0;

  const dept = DEPT_INFO[emp.department] ?? DEPT_INFO.field;
  const DeptIcon = dept.icon;

  const bonusAmt   = Math.round(base * skill.bonusPct / 100);
  const nextBonus  = Math.round(base * skill.nextBonusPct / 100);
  const gainAmt    = nextBonus - bonusAmt;
  const toNext     = skill.nextTarget > 0 ? (skill.nextTarget - skill.avgLevel).toFixed(2) : null;

  const attColor = att.pct >= 96 ? "bg-green-400" : att.pct >= 90 ? "bg-blue-400" : att.pct >= 80 ? "bg-amber-400" : "bg-red-400";
  const bonusColor = skill.bonusPct === 50 ? "text-amber-400" : skill.bonusPct === 30 ? "text-green-400" : skill.bonusPct > 0 ? "text-blue-400" : "text-slate-500";
  const bonusBg = skill.bonusPct === 50 ? "from-amber-500/20 to-yellow-500/10 border-amber-500/30" :
                  skill.bonusPct === 30 ? "from-green-500/20 to-emerald-500/10 border-green-500/30" :
                  skill.bonusPct > 0    ? "from-blue-500/20 to-cyan-500/10 border-blue-500/30" :
                                          "from-slate-700/40 to-slate-800/20 border-white/10";

  const [ymY, ymM] = data.month.split("-");
  const monthLabel = `${ymY} оны ${parseInt(ymM)} сар`;

  return (
    <div className="min-h-screen bg-[#020617] text-white pb-8">
      {/* Header */}
      <div className="bg-slate-900/80 border-b border-white/10 px-5 py-4">
        <div className="flex items-center gap-3 max-w-lg mx-auto">
          <button onClick={() => setLocation("/checkin")} className="p-2 hover:bg-white/5 rounded-xl transition-all">
            <ChevronLeft className="w-5 h-5 text-slate-400" />
          </button>
          <div className="flex items-center gap-2 flex-1">
            <div className="w-7 h-7 bg-amber-500 rounded-lg flex items-center justify-center">
              <span className="text-black font-black text-[10px]">ХЗ</span>
            </div>
            <span className="font-black text-sm tracking-widest uppercase">Миний өсөлт</span>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-5 space-y-4">

        {/* Ажилтны мэдээлэл */}
        <div className={`flex items-center gap-4 p-4 rounded-2xl border ${dept.bg} border-white/10`}>
          <div className={`p-3 ${dept.bg} rounded-xl`}>
            <DeptIcon className={`w-6 h-6 ${dept.color}`} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-white font-black text-lg leading-tight">{emp.name}</h2>
            <p className="text-slate-400 text-sm truncate">{emp.role}</p>
            <span className={`text-xs font-medium ${dept.color}`}>{dept.label}</span>
          </div>
          {skill.bonusPct > 0 && (
            <div className={`text-right shrink-0`}>
              <div className={`text-2xl font-black ${bonusColor}`}>+{skill.bonusPct}%</div>
              <div className="text-xs text-slate-400">нэмэгдэл</div>
            </div>
          )}
        </div>

        {/* Ур чадварын түвшин — гол блок */}
        <div className={`p-5 rounded-2xl border bg-gradient-to-br ${bonusBg}`}>
          <div className="flex items-center gap-2 mb-4">
            <Star className="w-4 h-4 text-amber-400" />
            <span className="text-white font-bold text-sm">Ур чадварын түвшин</span>
            <span className="ml-auto text-xs text-slate-400">{skill.count}/{skill.total} чадвар үнэлэгдсэн</span>
          </div>

          <div className="text-center mb-5">
            <div className={`text-5xl font-black ${bonusColor}`}>{skill.avgLevel}</div>
            <div className="text-slate-400 text-sm mt-1">
              {skill.avgLevel === 0 ? "Үнэлгээ хийгдээгүй" : LEVEL_LABEL[Math.floor(skill.avgLevel)] ?? "Мастер"}
            </div>
          </div>

          <LevelMeter avg={skill.avgLevel} />

          {/* Дараагийн шатны мэдэгдэл */}
          {toNext && skill.nextTarget > 0 && (
            <div className="mt-4 p-3 bg-white/5 rounded-xl border border-white/10">
              <div className="flex items-center gap-2 mb-1.5">
                <Target className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-xs text-slate-300 font-semibold">Дараагийн зорилт</span>
              </div>
              <p className="text-xs text-slate-400">
                Дундаж оноо <span className="text-white font-bold">{skill.nextTarget}</span> болоход
                цалинд <span className="text-green-400 font-bold">+{skill.nextBonusPct}%</span> нэмэгдэл авна
              </p>
              {base > 0 && gainAmt > 0 && (
                <div className="mt-2 flex items-center gap-2">
                  <ArrowRight className="w-3 h-3 text-green-400" />
                  <span className="text-green-300 font-bold text-sm">+{gainAmt.toLocaleString()}₮/сар нэмэгдэнэ</span>
                </div>
              )}
              <div className="mt-2.5">
                <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                  <span>Одоогийн: {skill.avgLevel}</span>
                  <span>Зорилт: {skill.nextTarget}</span>
                </div>
                <ProgressBar
                  value={Math.max(0, skill.avgLevel - (skill.nextTarget - 1))}
                  max={1}
                  color={skill.nextBonusPct === 50 ? "bg-amber-400" : skill.nextBonusPct === 30 ? "bg-green-400" : "bg-blue-400"}
                />
              </div>
            </div>
          )}

          {skill.bonusPct === 50 && (
            <div className="mt-4 p-3 bg-amber-500/10 rounded-xl border border-amber-500/30 text-center">
              <Award className="w-5 h-5 text-amber-400 mx-auto mb-1" />
              <p className="text-amber-300 font-bold text-sm">Мастер түвшинд хүрсэн!</p>
              <p className="text-xs text-slate-400 mt-0.5">Хамгийн дээд нэмэгдэл (+50%) авч байна</p>
            </div>
          )}
        </div>

        {/* Ангиллаар дэлгэрэнгүй */}
        {skill.categories.length > 0 && (
          <div className="p-4 bg-slate-900/60 border border-white/8 rounded-2xl">
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className="w-4 h-4 text-slate-400" />
              <span className="text-white font-bold text-sm">Ангиллаар</span>
            </div>
            <div className="space-y-3">
              {skill.categories.map((c: any) => {
                const catColor = c.avg >= 3.5 ? "bg-amber-400" : c.avg >= 2.5 ? "bg-green-400" : c.avg >= 1.5 ? "bg-blue-400" : "bg-slate-500";
                const catText  = c.avg >= 3.5 ? "text-amber-400" : c.avg >= 2.5 ? "text-green-400" : c.avg >= 1.5 ? "text-blue-400" : "text-slate-400";
                return (
                  <div key={c.category}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs text-slate-400 truncate pr-2">{c.category}</span>
                      <span className={`text-xs font-bold shrink-0 ${catText}`}>{c.avg} / 4.0</span>
                    </div>
                    <ProgressBar value={c.avg} max={4} color={catColor} />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Хоёр багана: Ирц + KPI */}
        <div className="grid grid-cols-2 gap-3">
          {/* Ирц */}
          <div className="p-4 bg-slate-900/60 border border-white/8 rounded-2xl">
            <div className="flex items-center gap-1.5 mb-2">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-xs text-slate-400 font-medium">Ирц</span>
            </div>
            <div className="text-2xl font-black text-white">{att.pct}%</div>
            <div className="text-[10px] text-slate-500 mt-0.5">{att.days}/{att.workingDays} өдөр</div>
            <div className="mt-2">
              <ProgressBar value={att.pct} color={attColor} />
            </div>
            <div className="text-[10px] text-slate-500 mt-1.5">{monthLabel}</div>
          </div>

          {/* KPI */}
          <div className="p-4 bg-slate-900/60 border border-white/8 rounded-2xl">
            <div className="flex items-center gap-1.5 mb-2">
              <Zap className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-xs text-slate-400 font-medium">KPI</span>
            </div>
            {kpi.kpiPct !== null ? (
              <>
                <div className={`text-2xl font-black ${kpi.kpiPct >= 90 ? "text-green-400" : kpi.kpiPct >= 75 ? "text-blue-400" : kpi.kpiPct >= 60 ? "text-amber-400" : "text-red-400"}`}>
                  {kpi.kpiPct}%
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">{kpi.doneTasks}/{kpi.totalTasks} даалгавар</div>
                <div className="mt-2">
                  <ProgressBar
                    value={kpi.kpiPct}
                    color={kpi.kpiPct >= 90 ? "bg-green-400" : kpi.kpiPct >= 75 ? "bg-blue-400" : kpi.kpiPct >= 60 ? "bg-amber-400" : "bg-red-400"}
                  />
                </div>
                <div className="text-[10px] text-slate-500 mt-1.5">{monthLabel}</div>
              </>
            ) : (
              <div className="mt-2">
                <Clock className="w-5 h-5 text-slate-600 mb-1" />
                <div className="text-xs text-slate-500">Тухайн сард даалгавар байхгүй</div>
              </div>
            )}
          </div>
        </div>

        {/* Цалингийн тооцоолол */}
        {base > 0 && (
          <div className="p-4 bg-gradient-to-br from-slate-800/60 to-slate-900/40 border border-white/8 rounded-2xl">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-green-400" />
              <span className="text-white font-bold text-sm">Цалингийн тооцоолол</span>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Үндсэн цалин</span>
                <span className="text-white font-medium">{base.toLocaleString()}₮</span>
              </div>
              {skill.bonusPct > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Ур чадварын нэмэгдэл</span>
                  <span className={`font-bold ${bonusColor}`}>+{bonusAmt.toLocaleString()}₮</span>
                </div>
              )}
              <div className="border-t border-white/10 pt-2 mt-1 flex justify-between">
                <span className="text-slate-300 font-semibold">Таны авах дүн</span>
                <span className="text-green-400 font-black">{(base + bonusAmt).toLocaleString()}₮</span>
              </div>
            </div>
            {toNext && gainAmt > 0 && (
              <div className="mt-3 p-2.5 bg-white/5 rounded-xl text-center">
                <p className="text-xs text-slate-400">
                  Дараагийн түвшинд хүрвэл: <span className="text-green-300 font-bold">{(base + nextBonus).toLocaleString()}₮</span>
                </p>
              </div>
            )}
          </div>
        )}

        {/* Хөгжлийн зөвлөгөө */}
        <div className="p-4 bg-amber-500/8 border border-amber-500/20 rounded-2xl">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-amber-300 font-bold text-xs mb-1">Хурдан өсөх зөвлөгөө</p>
              {skill.count === 0 ? (
                <p className="text-slate-400 text-xs">HR-т хандаж ур чадварын үнэлгээ хийлгэнэ үү — нэмэгдэл авах эхний алхам.</p>
              ) : skill.bonusPct === 0 ? (
                <p className="text-slate-400 text-xs">Дундаж оноогоо 2.0 болгоход +15% нэмэгдэл авах боломжтой. Бага оноотой чадваруудаа сайжруулна уу.</p>
              ) : skill.bonusPct === 15 ? (
                <p className="text-slate-400 text-xs">Дундаж 3.0 болгоход +30% болно. Одоо {(skill.nextTarget - skill.avgLevel).toFixed(2)} оноо дутуй байна.</p>
              ) : skill.bonusPct === 30 ? (
                <p className="text-slate-400 text-xs">Дундаж 4.0 (Мастер) болгоход +50% авна. Та маш ойрхон байна!</p>
              ) : (
                <p className="text-slate-400 text-xs">Та хамгийн дээд түвшинд хүрсэн. Шинэ ажилтнуудыг дагалдуулж сургах боломжтой.</p>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
