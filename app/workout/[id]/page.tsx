"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, Minus, Trash2, Check, X, Timer, Lightbulb, Flag } from "lucide-react";

type SetRow = { id: string; setNumber: number; weight: number; reps: number; isWarmup: boolean | null };
type ExerciseBlock = {
  exerciseId: string;
  name: string;
  muscleGroup: string;
  equipment: string;
  targetSets: number;
  repsMin: number;
  repsMax: number;
  last: { date: string; sets: { weight: number; reps: number }[] } | null;
  suggestion: { weight: number; reason: string } | null;
  sets: SetRow[];
};
type WorkoutData = {
  session: {
    id: string;
    name: string;
    startedAt: string;
    finishedAt: string | null;
    notes: string | null;
    bodyWeight: number | null;
  };
  exercises: ExerciseBlock[];
};
type Draft = { weight: string; reps: string; warmup: boolean };

const REST_SECONDS = 90;

const fmtClock = (total: number) => {
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(h > 0 ? 2 : 1, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
};

const stepFor = (equipment: string) => (equipment === "dumbbell" ? 1 : 2.5);

const defaultsFor = (ex: ExerciseBlock): Draft => {
  const working = ex.sets.filter((s) => !s.isWarmup);
  const lastSet = working[working.length - 1] ?? ex.sets[ex.sets.length - 1];
  if (lastSet) return { weight: String(lastSet.weight), reps: String(lastSet.reps), warmup: false };
  const w = ex.suggestion?.weight ?? ex.last?.sets[0]?.weight;
  const r = ex.last?.sets[0]?.reps ?? ex.repsMin;
  return { weight: w !== undefined ? String(w) : "", reps: String(r), warmup: false };
};

function WorkoutContent() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();

  const [data, setData] = useState<WorkoutData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [now, setNow] = useState(0);
  const [restEnd, setRestEnd] = useState<number | null>(null);
  const [showFinish, setShowFinish] = useState(false);
  const [finishForm, setFinishForm] = useState({ bodyWeight: "", notes: "" });
  const [finishing, setFinishing] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/sessions/${id}`);
    if (!res.ok) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    const json: WorkoutData = await res.json();
    setData(json);
    setDrafts(Object.fromEntries(json.exercises.map((ex: ExerciseBlock) => [ex.exerciseId, defaultsFor(ex)])));
    setFinishForm({
      bodyWeight: json.session.bodyWeight ? String(json.session.bodyWeight) : "",
      notes: json.session.notes || "",
    });
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  // Soat (har soniyada)
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Dam olish tugaganda titratish
  useEffect(() => {
    if (restEnd && now >= restEnd) {
      try { navigator.vibrate?.(300); } catch {}
      setRestEnd(null);
    }
  }, [now, restEnd]);

  const bump = (exId: string, field: "weight" | "reps", delta: number) => {
    setDrafts((prev) => {
      const cur = Number(prev[exId]?.[field]) || 0;
      const next = Math.max(0, Math.round((cur + delta) * 100) / 100);
      return { ...prev, [exId]: { ...prev[exId], [field]: String(next) } };
    });
  };

  const setDraft = (exId: string, patch: Partial<Draft>) =>
    setDrafts((prev) => ({ ...prev, [exId]: { ...prev[exId], ...patch } }));

  const addSet = async (ex: ExerciseBlock) => {
    const d = drafts[ex.exerciseId];
    const weight = Number(d.weight);
    const reps = Math.round(Number(d.reps));
    if (!Number.isFinite(weight) || weight < 0 || !Number.isFinite(reps) || reps < 1) return;

    setBusy(ex.exerciseId);
    try {
      const res = await fetch(`/api/sessions/${id}/sets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exerciseId: ex.exerciseId, weight, reps, isWarmup: d.warmup }),
      });
      if (!res.ok) return;
      const row: SetRow = await res.json();
      setData((prev) =>
        prev
          ? {
              ...prev,
              exercises: prev.exercises.map((e) =>
                e.exerciseId === ex.exerciseId ? { ...e, sets: [...e.sets, row] } : e
              ),
            }
          : prev
      );
      setDraft(ex.exerciseId, { warmup: false });
      if (!d.warmup) setRestEnd(Date.now() + REST_SECONDS * 1000);
    } finally {
      setBusy(null);
    }
  };

  const removeSet = async (exerciseId: string, setId: string) => {
    const res = await fetch(`/api/sets/${setId}`, { method: "DELETE" });
    if (!res.ok) return;
    setData((prev) =>
      prev
        ? {
            ...prev,
            exercises: prev.exercises.map((e) =>
              e.exerciseId === exerciseId ? { ...e, sets: e.sets.filter((s) => s.id !== setId) } : e
            ),
          }
        : prev
    );
  };

  const handleFinish = async () => {
    setFinishing(true);
    try {
      const res = await fetch(`/api/sessions/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(finishForm),
      });
      if (res.ok) router.push("/today");
    } finally {
      setFinishing(false);
    }
  };

  const handleDiscard = async () => {
    if (!confirm("Discard this workout? All logged sets will be deleted.")) return;
    const res = await fetch(`/api/sessions/${id}`, { method: "DELETE" });
    if (res.ok) router.push("/today");
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto p-4 space-y-4">
        <div className="h-14 bg-gray-200 dark:bg-white/10 rounded-2xl animate-pulse" />
        {[...Array(3)].map((_, i) => <div key={i} className="h-56 bg-gray-200 dark:bg-white/10 rounded-3xl animate-pulse" />)}
      </div>
    );
  }

  if (notFound || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-gray-500">
        <p>Workout not found</p>
        <Link href="/today" className="text-rose-600 font-bold no-underline">Back to Today</Link>
      </div>
    );
  }

  const allSets = data.exercises.flatMap((e) => e.sets);
  const working = allSets.filter((s) => !s.isWarmup);
  const volume = Math.round(working.reduce((sum, s) => sum + s.weight * s.reps, 0));
  const startMs = new Date(data.session.startedAt).getTime();
  const endMs = data.session.finishedAt ? new Date(data.session.finishedAt).getTime() : now;
  const elapsed = now ? Math.max(0, Math.floor((endMs - startMs) / 1000)) : 0;
  const remaining = restEnd && now ? Math.max(0, Math.ceil((restEnd - now) / 1000)) : 0;
  const isFinished = !!data.session.finishedAt;

  const inputBase =
    "w-full text-center text-xl font-black bg-gray-50 dark:bg-white/5 border-2 border-gray-200 dark:border-white/10 rounded-xl py-3 text-gray-900 dark:text-white outline-none focus:border-rose-400 dark:focus:border-rose-500 transition-all";
  const stepBtn =
    "w-12 h-12 flex-shrink-0 rounded-xl bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-200 flex items-center justify-center active:scale-90 transition-all";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-32">
      {/* Sticky header */}
      <div className="sticky top-0 z-30 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-b border-gray-100 dark:border-white/5">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center gap-3">
          <Link href="/today" aria-label="Back" className="p-2 -ml-2 rounded-xl text-gray-500 hover:text-gray-900 dark:hover:text-white">
            <ArrowLeft size={20} />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="font-black text-gray-900 dark:text-white truncate leading-tight">{data.session.name}</h1>
            <p className="text-xs text-gray-400">
              {working.length} sets · {volume.toLocaleString()} kg volume
            </p>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 font-black tabular-nums text-sm">
            <Timer size={14} /> {fmtClock(elapsed)}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-5 space-y-4">
        {data.exercises.length === 0 && (
          <div className="text-center py-16 bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-white/5 text-gray-400">
            This workout has no exercises. Add some in Programs.
          </div>
        )}

        {data.exercises.map((ex) => {
          const d = drafts[ex.exerciseId] ?? { weight: "", reps: "", warmup: false };
          const doneSets = ex.sets.filter((s) => !s.isWarmup).length;
          const complete = doneSets >= ex.targetSets;
          const wStep = stepFor(ex.equipment);

          return (
            <div key={ex.exerciseId}
              className={`bg-white dark:bg-gray-900 rounded-3xl border p-5 transition-all ${
                complete ? "border-emerald-200 dark:border-emerald-500/30" : "border-gray-100 dark:border-white/5"
              }`}>
              {/* Title */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="min-w-0">
                  <h2 className="font-black text-gray-900 dark:text-white leading-snug">{ex.name}</h2>
                  <p className="text-xs text-gray-400 capitalize mt-0.5">
                    {ex.muscleGroup} · {ex.equipment} · target {ex.targetSets} × {ex.repsMin}–{ex.repsMax}
                  </p>
                </div>
                <span className={`flex-shrink-0 text-xs font-black px-2.5 py-1 rounded-full ${
                  complete
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400"
                    : "bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300"
                }`}>
                  {doneSets}/{ex.targetSets}
                </span>
              </div>

              {/* Last time + suggestion */}
              {ex.last && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                  <span className="font-bold">Last time</span>{" "}
                  ({new Date(ex.last.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}):{" "}
                  {ex.last.sets.slice(0, 5).map((s) => `${s.weight}×${s.reps}`).join(" · ")}
                </p>
              )}
              {ex.suggestion && (
                <button
                  onClick={() => setDraft(ex.exerciseId, { weight: String(ex.suggestion!.weight) })}
                  title={ex.suggestion.reason}
                  className="inline-flex items-center gap-1.5 mb-3 px-3 py-1.5 rounded-full bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs font-bold active:scale-95 transition-all">
                  <Lightbulb size={13} /> Try {ex.suggestion.weight} kg
                  <span className="font-medium opacity-70">· {ex.suggestion.reason}</span>
                </button>
              )}

              {/* Logged sets */}
              {ex.sets.length > 0 && (
                <div className="space-y-1.5 mb-4">
                  {ex.sets.map((s) => (
                    <div key={s.id}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-white/5">
                      <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black flex-shrink-0 ${
                        s.isWarmup
                          ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400"
                          : "bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400"
                      }`}>
                        {s.isWarmup ? "W" : s.setNumber}
                      </span>
                      <span className="flex-1 font-bold text-gray-900 dark:text-white tabular-nums">
                        {s.weight} kg <span className="text-gray-400">×</span> {s.reps}
                      </span>
                      <button onClick={() => removeSet(ex.exerciseId, s.id)} aria-label="Delete set"
                        className="p-2 text-gray-300 hover:text-red-500 transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Input */}
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 text-center">Weight (kg)</p>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => bump(ex.exerciseId, "weight", -wStep)} aria-label="Less weight" className={stepBtn}><Minus size={18} /></button>
                    <input type="number" inputMode="decimal" step="0.5" min="0" value={d.weight}
                      onChange={(e) => setDraft(ex.exerciseId, { weight: e.target.value })} className={inputBase} />
                    <button onClick={() => bump(ex.exerciseId, "weight", wStep)} aria-label="More weight" className={stepBtn}><Plus size={18} /></button>
                  </div>
                </div>
                <div>
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 text-center">Reps</p>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => bump(ex.exerciseId, "reps", -1)} aria-label="Less reps" className={stepBtn}><Minus size={18} /></button>
                    <input type="number" inputMode="numeric" min="0" value={d.reps}
                      onChange={(e) => setDraft(ex.exerciseId, { reps: e.target.value })} className={inputBase} />
                    <button onClick={() => bump(ex.exerciseId, "reps", 1)} aria-label="More reps" className={stepBtn}><Plus size={18} /></button>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <button onClick={() => setDraft(ex.exerciseId, { warmup: !d.warmup })}
                  className={`px-4 py-3.5 rounded-2xl text-sm font-bold border-2 transition-all ${
                    d.warmup
                      ? "border-amber-400 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400"
                      : "border-gray-200 dark:border-white/10 text-gray-400"
                  }`}>
                  Warm-up
                </button>
                <button onClick={() => addSet(ex)} disabled={busy === ex.exerciseId}
                  className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-rose-500 to-orange-500 text-white font-black rounded-2xl active:scale-[0.98] disabled:opacity-60 shadow-lg shadow-rose-500/20 transition-all">
                  <Check size={18} /> {busy === ex.exerciseId ? "Saving..." : "Add set"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Rest timer */}
      {restEnd && remaining > 0 && (
        <div className="fixed left-1/2 -translate-x-1/2 bottom-24 z-40 flex items-center gap-3 pl-4 pr-2 py-2 rounded-2xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-2xl">
          <Timer size={16} />
          <span className="font-black tabular-nums">Rest {fmtClock(remaining)}</span>
          <button onClick={() => setRestEnd((e) => (e ? e + 30000 : e))}
            className="px-2.5 py-1.5 rounded-lg bg-white/15 dark:bg-gray-900/10 text-xs font-bold">+30s</button>
          <button onClick={() => setRestEnd(null)} aria-label="Skip rest"
            className="p-1.5 rounded-lg bg-white/15 dark:bg-gray-900/10"><X size={14} /></button>
        </div>
      )}

      {/* Bottom action bar */}
      <div className="fixed bottom-0 inset-x-0 z-30 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] bg-gradient-to-t from-gray-50 via-gray-50/95 to-transparent dark:from-gray-950 dark:via-gray-950/95">
        <div className="max-w-2xl mx-auto">
          <button onClick={() => setShowFinish(true)}
            className="w-full flex items-center justify-center gap-2 py-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-black rounded-2xl active:scale-[0.98] shadow-xl transition-all">
            <Flag size={18} /> {isFinished ? "Save changes" : "Finish workout"}
          </button>
        </div>
      </div>

      {/* Finish modal */}
      {showFinish && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-3xl p-6 border border-gray-100 dark:border-white/10 shadow-2xl">
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-black text-xl text-gray-900 dark:text-white">{isFinished ? "Save workout" : "Finish workout"}</h2>
              <button onClick={() => setShowFinish(false)} aria-label="Close" className="p-2 rounded-xl bg-gray-100 dark:bg-white/10 text-gray-500"><X size={16} /></button>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
              {working.length} sets · {volume.toLocaleString()} kg volume · {fmtClock(elapsed)}
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Body weight (kg), optional</label>
                <input type="number" inputMode="decimal" step="0.1" min="0" value={finishForm.bodyWeight}
                  onChange={(e) => setFinishForm({ ...finishForm, bodyWeight: e.target.value })}
                  placeholder="e.g. 70.5"
                  className="w-full px-4 py-3 border-2 border-gray-200 dark:border-white/10 rounded-xl text-base bg-transparent text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:border-rose-400 transition-all" />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Notes, optional</label>
                <textarea value={finishForm.notes} rows={3}
                  onChange={(e) => setFinishForm({ ...finishForm, notes: e.target.value })}
                  placeholder="How did it feel? Anything to change next time?"
                  className="w-full px-4 py-3 border-2 border-gray-200 dark:border-white/10 rounded-xl text-base bg-transparent text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:border-rose-400 resize-none transition-all" />
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowFinish(false)}
                className="flex-1 py-3.5 bg-gray-100 dark:bg-white/10 rounded-2xl font-bold text-gray-600 dark:text-gray-300">
                Back
              </button>
              <button onClick={handleFinish} disabled={finishing}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-rose-500 to-orange-500 text-white font-black rounded-2xl disabled:opacity-60">
                <Check size={18} /> {finishing ? "Saving..." : "Save"}
              </button>
            </div>

            {!isFinished && (
              <button onClick={handleDiscard} className="w-full mt-3 py-2 text-sm font-semibold text-red-500 hover:underline">
                Discard workout
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function WorkoutPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-400">Loading...</div>}>
      <WorkoutContent />
    </Suspense>
  );
}