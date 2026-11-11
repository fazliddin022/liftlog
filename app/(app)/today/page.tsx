"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Play, Flame, Scale, Moon, Dumbbell, Check, ChevronRight } from "lucide-react";

type TemplateItem = { id: string; name: string; weekday: number | null; exerciseCount: number };
type RecentSession = {
  id: string;
  name: string;
  templateId: string | null;
  startedAt: string;
  finishedAt: string | null;
};
type TodayData = {
  templates: TemplateItem[];
  todayTemplate: TemplateItem | null;
  activeSession: { id: string; name: string; templateId: string | null } | null;
  recentSessions: RecentSession[];
  lastBodyWeight: number | null;
};

const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];
const WD = ["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function mondayOf(d: Date) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - ((x.getDay() || 7) - 1));
  return x;
}

function weeklyStreak(sessions: RecentSession[], target: number) {
  const counts = new Map<number, number>();
  sessions.forEach((s) => {
    if (!s.finishedAt) return;
    const key = mondayOf(new Date(s.startedAt)).getTime();
    counts.set(key, (counts.get(key) || 0) + 1);
  });
  const cursor = mondayOf(new Date());
  let streak = 0;
  // Joriy hafta tugallanmagan bo'lsa, streak'ni buzmaydi
  if ((counts.get(cursor.getTime()) || 0) >= target) streak++;
  cursor.setDate(cursor.getDate() - 7);
  while ((counts.get(cursor.getTime()) || 0) >= target) {
    streak++;
    cursor.setDate(cursor.getDate() - 7);
  }
  return streak;
}

export default function TodayPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [data, setData] = useState<TodayData | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState<string | null>(null);

  const load = useCallback(async () => {
    const weekday = new Date().getDay() || 7;
    const res = await fetch(`/api/today?weekday=${weekday}`);
    if (res.ok) setData(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const start = async (templateId: string) => {
    setStarting(templateId);
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId }),
      });
      const s = await res.json();
      if (res.ok) router.push(`/workout/${s.id}`);
    } finally {
      setStarting(null);
    }
  };

  if (loading || !data) {
    return (
      <div className="space-y-4">
        <div className="h-10 w-48 bg-gray-200 dark:bg-white/10 rounded-xl animate-pulse" />
        <div className="h-44 bg-gray-200 dark:bg-white/10 rounded-3xl animate-pulse" />
        <div className="grid grid-cols-3 gap-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-gray-200 dark:bg-white/10 rounded-2xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  const now = new Date();
  const todayStr = now.toDateString();
  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const firstName = session?.user?.name?.split(" ")[0] || "";

  const recent = data.recentSessions;
  const planned = new Set(data.templates.map((t) => t.weekday).filter((w): w is number => w !== null));
  const target = Math.max(1, planned.size);

  const monday = mondayOf(now);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
  const doneDays = new Set(recent.filter((s) => s.finishedAt).map((s) => new Date(s.startedAt).toDateString()));
  const doneThisWeek = recent.filter((s) => s.finishedAt && new Date(s.startedAt) >= monday).length;
  const streak = weeklyStreak(recent, target);

  const active = data.activeSession;
  const todayTpl = data.todayTemplate;
  const doneToday = !!todayTpl && recent.some(
    (s) => s.finishedAt && s.templateId === todayTpl.id && new Date(s.startedAt).toDateString() === todayStr
  );
  const others = data.templates.filter((t) => t.id !== todayTpl?.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white">
          {greeting}{firstName ? `, ${firstName}` : ""} 💪
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
          {now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        </p>
      </div>

      {/* Main card */}
      {active ? (
        <div className="rounded-3xl p-6 bg-gradient-to-br from-rose-500 to-orange-500 text-white shadow-xl shadow-rose-500/25">
          <p className="text-xs font-bold uppercase tracking-wider text-white/80 mb-1">In progress</p>
          <h2 className="text-2xl font-black mb-4">{active.name}</h2>
          <Link href={`/workout/${active.id}`}
            className="flex items-center justify-center gap-2 w-full py-4 bg-white text-rose-600 font-black rounded-2xl no-underline active:scale-[0.98] transition-all">
            <Play size={18} fill="currentColor" /> Continue workout
          </Link>
        </div>
      ) : doneToday && todayTpl ? (
        <div className="rounded-3xl p-6 bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-xl shadow-emerald-500/25">
          <div className="flex items-center gap-2 mb-1">
            <Check size={18} />
            <p className="text-xs font-bold uppercase tracking-wider text-white/80">Done for today</p>
          </div>
          <h2 className="text-2xl font-black mb-1">{todayTpl.name}</h2>
          <p className="text-white/80 text-sm">Good work. Recover well and eat enough.</p>
        </div>
      ) : todayTpl ? (
        <div className="rounded-3xl p-6 bg-gradient-to-br from-rose-500 to-orange-500 text-white shadow-xl shadow-rose-500/25">
          <p className="text-xs font-bold uppercase tracking-wider text-white/80 mb-1">Today&apos;s workout</p>
          <h2 className="text-2xl font-black">{todayTpl.name}</h2>
          <p className="text-white/80 text-sm mb-4">{todayTpl.exerciseCount} exercises</p>
          <button onClick={() => start(todayTpl.id)} disabled={starting === todayTpl.id}
            className="flex items-center justify-center gap-2 w-full py-4 bg-white text-rose-600 font-black rounded-2xl active:scale-[0.98] disabled:opacity-60 transition-all">
            <Play size={18} fill="currentColor" /> {starting === todayTpl.id ? "Starting..." : "Start workout"}
          </button>
        </div>
      ) : (
        <div className="rounded-3xl p-6 bg-white dark:bg-gray-900 border border-gray-100 dark:border-white/10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-11 h-11 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center">
              <Moon size={20} className="text-indigo-500" />
            </div>
            <div>
              <h2 className="font-black text-gray-900 dark:text-white text-lg">
                {data.templates.length === 0 ? "No program yet" : "Rest day"}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {data.templates.length === 0
                  ? "Create your first workout in Programs."
                  : "Nothing planned today. Train anyway below if you want."}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-white/5 p-4">
          <Dumbbell size={18} className="text-rose-500 mb-2" />
          <p className="text-2xl font-black text-gray-900 dark:text-white">{doneThisWeek}<span className="text-sm text-gray-400 font-bold">/{target}</span></p>
          <p className="text-xs text-gray-500 dark:text-gray-400">This week</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-white/5 p-4">
          <Flame size={18} className="text-orange-500 mb-2" />
          <p className="text-2xl font-black text-gray-900 dark:text-white">{streak}<span className="text-sm text-gray-400 font-bold"> wk</span></p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Streak</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-white/5 p-4">
          <Scale size={18} className="text-blue-500 mb-2" />
          <p className="text-2xl font-black text-gray-900 dark:text-white">{data.lastBodyWeight ?? "—"}<span className="text-sm text-gray-400 font-bold"> kg</span></p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Body weight</p>
        </div>
      </div>

      {/* Week strip */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-white/5 p-4">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">This week</p>
        <div className="grid grid-cols-7 gap-2">
          {days.map((d, i) => {
            const done = doneDays.has(d.toDateString());
            const isToday = d.toDateString() === todayStr;
            const isPlanned = planned.has(i + 1);
            return (
              <div key={i} className="flex flex-col items-center gap-1.5">
                <span className={`text-[11px] font-bold ${isToday ? "text-rose-500" : "text-gray-400"}`}>{DAY_LABELS[i]}</span>
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  done
                    ? "bg-emerald-500 text-white"
                    : isToday
                    ? "border-2 border-rose-500 text-rose-500"
                    : isPlanned
                    ? "border-2 border-dashed border-gray-300 dark:border-white/20 text-gray-400"
                    : "bg-gray-100 dark:bg-white/5 text-gray-300 dark:text-gray-600"
                }`}>
                  {done ? <Check size={16} /> : d.getDate()}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Other workouts */}
      {others.length > 0 && (
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
            {todayTpl ? "Other workouts" : "Train anyway"}
          </p>
          <div className="space-y-2">
            {others.map((t) => (
              <button key={t.id} onClick={() => start(t.id)} disabled={starting === t.id}
                className="w-full flex items-center gap-3 p-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-white/5 text-left active:scale-[0.99] hover:border-rose-200 dark:hover:border-rose-500/30 disabled:opacity-60 transition-all">
                <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center flex-shrink-0">
                  <Dumbbell size={18} className="text-rose-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 dark:text-white text-sm truncate">{t.name}</p>
                  <p className="text-xs text-gray-400">
                    {t.weekday ? `${WD[t.weekday]} · ` : ""}{t.exerciseCount} exercises
                  </p>
                </div>
                <ChevronRight size={18} className="text-gray-300" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}