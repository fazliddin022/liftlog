"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  Plus, ChevronDown, ChevronUp, Trash2, X, Check, Dumbbell,
  Sparkles, ArrowUp, ArrowDown, Search, Power,
} from "lucide-react";

type Row = {
  id: string;
  templateId: string;
  exerciseId: string;
  position: number;
  targetSets: number;
  repsMin: number;
  repsMax: number;
  name: string;
  muscleGroup: string;
  equipment: string;
};
type Tpl = { id: string; name: string; weekday: number | null; isActive: boolean | null; exercises: Row[] };
type LibEx = { id: string; name: string; muscleGroup: string; equipment: string };

const WEEKDAYS = [
  { v: "", l: "Any day" },
  { v: "1", l: "Monday" },
  { v: "2", l: "Tuesday" },
  { v: "3", l: "Wednesday" },
  { v: "4", l: "Thursday" },
  { v: "5", l: "Friday" },
  { v: "6", l: "Saturday" },
  { v: "7", l: "Sunday" },
];
const MUSCLES = ["chest", "back", "shoulders", "biceps", "triceps", "legs", "core", "other"];
const EQUIPMENT = ["machine", "barbell", "dumbbell", "cable", "bodyweight", "other"];

const MUSCLE_STYLE: Record<string, string> = {
  chest: "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400",
  back: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400",
  shoulders: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400",
  biceps: "bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400",
  triceps: "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-500/20 dark:text-fuchsia-400",
  legs: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400",
  core: "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-400",
  other: "bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300",
};

async function call(url: string, method: string, body?: unknown) {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || "Something went wrong");
  return json;
}

function ExerciseRow({
  row, first, last, onUpdate, onMove, onRemove,
}: {
  row: Row;
  first: boolean;
  last: boolean;
  onUpdate: (row: Row, patch: { targetSets: number; repsMin: number; repsMax: number }) => void;
  onMove: (row: Row, dir: "up" | "down") => void;
  onRemove: (row: Row) => void;
}) {
  const [sets, setSets] = useState(String(row.targetSets));
  const [min, setMin] = useState(String(row.repsMin));
  const [max, setMax] = useState(String(row.repsMax));

  useEffect(() => {
    setSets(String(row.targetSets));
    setMin(String(row.repsMin));
    setMax(String(row.repsMax));
  }, [row.targetSets, row.repsMin, row.repsMax]);

  const commit = () => {
    const s = Math.round(Number(sets));
    const a = Math.round(Number(min));
    const b = Math.round(Number(max));
    const valid = [s, a, b].every(Number.isFinite) && s >= 1 && s <= 10 && a >= 1 && b >= a && b <= 100;
    if (!valid) {
      setSets(String(row.targetSets));
      setMin(String(row.repsMin));
      setMax(String(row.repsMax));
      return;
    }
    if (s !== row.targetSets || a !== row.repsMin || b !== row.repsMax) {
      onUpdate(row, { targetSets: s, repsMin: a, repsMax: b });
    }
  };

  const num =
    "w-12 text-center font-bold text-sm bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg py-2 text-gray-900 dark:text-white outline-none focus:border-rose-400";

  return (
    <div className="px-4 py-3.5 border-t border-gray-50 dark:border-white/5">
      <div className="flex items-start justify-between gap-2 mb-2.5">
        <div className="min-w-0">
          <p className="font-bold text-gray-900 dark:text-white text-sm leading-snug">{row.name}</p>
          <div className="flex items-center gap-1.5 mt-1">
            <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${MUSCLE_STYLE[row.muscleGroup] || MUSCLE_STYLE.other}`}>
              {row.muscleGroup}
            </span>
            <span className="text-[11px] text-gray-400 capitalize">{row.equipment}</span>
          </div>
        </div>
        <div className="flex items-center flex-shrink-0">
          <button onClick={() => onMove(row, "up")} disabled={first} aria-label="Move up"
            className="p-2 text-gray-400 hover:text-gray-700 dark:hover:text-white disabled:opacity-25"><ArrowUp size={16} /></button>
          <button onClick={() => onMove(row, "down")} disabled={last} aria-label="Move down"
            className="p-2 text-gray-400 hover:text-gray-700 dark:hover:text-white disabled:opacity-25"><ArrowDown size={16} /></button>
          <button onClick={() => onRemove(row)} aria-label="Remove exercise"
            className="p-2 text-gray-300 hover:text-red-500"><Trash2 size={16} /></button>
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
        <span className="font-semibold">Sets</span>
        <input type="number" inputMode="numeric" min="1" max="10" value={sets}
          onChange={(e) => setSets(e.target.value)} onBlur={commit} className={num} />
        <span className="font-semibold ml-2">Reps</span>
        <input type="number" inputMode="numeric" min="1" value={min}
          onChange={(e) => setMin(e.target.value)} onBlur={commit} className={num} />
        <span>–</span>
        <input type="number" inputMode="numeric" min="1" value={max}
          onChange={(e) => setMax(e.target.value)} onBlur={commit} className={num} />
      </div>
    </div>
  );
}

export default function ProgramsPage() {
  const [templates, setTemplates] = useState<Tpl[]>([]);
  const [library, setLibrary] = useState<LibEx[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const firstLoad = useRef(true);

  // New workout modal
  const [showNew, setShowNew] = useState(false);
  const [newForm, setNewForm] = useState({ name: "", weekday: "" });

  // Add exercise modal
  const [addTo, setAddTo] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [createForm, setCreateForm] = useState({ name: "", muscleGroup: "chest", equipment: "machine" });

  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/programs");
    if (!res.ok) return;
    const json: { templates: Tpl[]; library: LibEx[] } = await res.json();
    setTemplates(json.templates);
    setLibrary(json.library);
    if (firstLoad.current) {
      setExpanded(new Set(json.templates.map((t) => t.id)));
      firstLoad.current = false;
    }
  }, []);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  const run = async (fn: () => Promise<unknown>) => {
    setError("");
    setBusy(true);
    try {
      await fn();
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const createWorkout = () =>
    run(async () => {
      const created = await call("/api/programs", "POST", {
        name: newForm.name,
        weekday: newForm.weekday === "" ? null : Number(newForm.weekday),
      });
      setShowNew(false);
      setNewForm({ name: "", weekday: "" });
      setExpanded((prev) => new Set(prev).add(created.id));
    });

  const loadStarter = () =>
    run(async () => {
      await call("/api/programs/starter", "POST");
      firstLoad.current = true; // yangi kunlar ochiq ko'rinsin
    });

  const deleteWorkout = (t: Tpl) => {
    if (!confirm(`Delete "${t.name}"? Your workout history stays.`)) return;
    run(() => call(`/api/programs/${t.id}`, "DELETE"));
  };

  const addExistingExercise = (templateId: string, exerciseId: string) =>
    run(async () => {
      await call(`/api/programs/${templateId}/exercises`, "POST", { exerciseId });
    });

  const createAndAdd = (templateId: string) =>
    run(async () => {
      const ex = await call("/api/exercises", "POST", createForm);
      await call(`/api/programs/${templateId}/exercises`, "POST", { exerciseId: ex.id });
      setCreateForm({ name: "", muscleGroup: createForm.muscleGroup, equipment: createForm.equipment });
      setSearch("");
    });

  const updateRow = (row: Row, patch: { targetSets: number; repsMin: number; repsMax: number }) =>
    run(() => call(`/api/template-exercises/${row.id}`, "PUT", patch));
  const moveRow = (row: Row, dir: "up" | "down") =>
    run(() => call(`/api/template-exercises/${row.id}`, "PUT", { direction: dir }));
  const removeRow = (row: Row) => {
    if (!confirm(`Remove "${row.name}" from this workout?`)) return;
    run(() => call(`/api/template-exercises/${row.id}`, "DELETE"));
  };

  const addingTpl = templates.find((t) => t.id === addTo) || null;
  const available = addingTpl
    ? library.filter(
        (l) =>
          !addingTpl.exercises.some((e) => e.exerciseId === l.id) &&
          l.name.toLowerCase().includes(search.trim().toLowerCase())
      )
    : [];

  const field =
    "w-full px-4 py-3 border-2 border-gray-200 dark:border-white/10 rounded-xl text-base bg-transparent text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:border-rose-400 dark:focus:border-rose-500 transition-all";
  const selectField = `${field} bg-white dark:bg-gray-900`;

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-10 w-40 bg-gray-200 dark:bg-white/10 rounded-xl animate-pulse" />
        {[...Array(2)].map((_, i) => <div key={i} className="h-40 bg-gray-200 dark:bg-white/10 rounded-3xl animate-pulse" />)}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white">Programs</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Your workouts and exercises</p>
        </div>
        <button onClick={() => setShowNew(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-rose-500 to-orange-500 text-white text-sm font-bold rounded-xl shadow-lg shadow-rose-500/20 active:scale-95 transition-all">
          <Plus size={16} /> New
        </button>
      </div>

      {error && (
        <div className="flex items-center justify-between gap-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-2xl px-4 py-3 text-sm text-red-600 dark:text-red-400">
          <span>{error}</span>
          <button onClick={() => setError("")} aria-label="Dismiss"><X size={16} /></button>
        </div>
      )}

      {templates.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-white/5 p-8 text-center">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center">
            <Dumbbell size={26} className="text-rose-500" />
          </div>
          <h2 className="font-black text-gray-900 dark:text-white text-lg mb-1">No workouts yet</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
            Load a ready 3-day split (chest + triceps, back + biceps, shoulders + legs) and edit it, or start from scratch.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button onClick={loadStarter} disabled={busy}
              className="flex items-center justify-center gap-2 px-5 py-3.5 bg-gradient-to-r from-rose-500 to-orange-500 text-white font-bold rounded-2xl disabled:opacity-60 shadow-lg shadow-rose-500/20">
              <Sparkles size={16} /> {busy ? "Loading..." : "Load starter split"}
            </button>
            <button onClick={() => setShowNew(true)}
              className="px-5 py-3.5 border-2 border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 font-bold rounded-2xl">
              Create my own
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {templates.map((t) => {
            const open = expanded.has(t.id);
            return (
              <div key={t.id}
                className={`bg-white dark:bg-gray-900 rounded-3xl border overflow-hidden transition-all ${
                  t.isActive === false ? "border-gray-100 dark:border-white/5 opacity-60" : "border-gray-100 dark:border-white/5"
                }`}>
                {/* Header */}
                <button onClick={() => toggle(t.id)} className="w-full flex items-center gap-3 p-4 text-left">
                  <div className="w-11 h-11 rounded-2xl bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center flex-shrink-0">
                    <Dumbbell size={20} className="text-rose-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-gray-900 dark:text-white truncate">{t.name}</p>
                    <p className="text-xs text-gray-400">
                      {t.weekday ? WEEKDAYS[t.weekday].l : "Any day"} · {t.exercises.length} exercises
                      {t.isActive === false ? " · paused" : ""}
                    </p>
                  </div>
                  {open ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
                </button>

                {open && (
                  <>
                    {/* Settings */}
                    <div className="px-4 pb-3 flex flex-wrap items-center gap-2">
                      <select value={t.weekday ? String(t.weekday) : ""}
                        onChange={(e) =>
                          run(() => call(`/api/programs/${t.id}`, "PUT", { weekday: e.target.value === "" ? null : Number(e.target.value) }))
                        }
                        className="px-3 py-2 text-xs font-semibold rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 outline-none">
                        {WEEKDAYS.map((d) => <option key={d.v} value={d.v}>{d.l}</option>)}
                      </select>
                      <button onClick={() => run(() => call(`/api/programs/${t.id}`, "PUT", { isActive: !(t.isActive !== false) }))}
                        className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300">
                        <Power size={13} /> {t.isActive === false ? "Resume" : "Pause"}
                      </button>
                      <button onClick={() => deleteWorkout(t)}
                        className="ml-auto flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10">
                        <Trash2 size={13} /> Delete
                      </button>
                    </div>

                    {/* Exercises */}
                    {t.exercises.length === 0 ? (
                      <p className="px-4 py-6 text-center text-sm text-gray-400 border-t border-gray-50 dark:border-white/5">
                        No exercises yet
                      </p>
                    ) : (
                      t.exercises.map((row, i) => (
                        <ExerciseRow key={row.id} row={row}
                          first={i === 0} last={i === t.exercises.length - 1}
                          onUpdate={updateRow} onMove={moveRow} onRemove={removeRow} />
                      ))
                    )}

                    <div className="p-4 border-t border-gray-50 dark:border-white/5">
                      <button onClick={() => { setAddTo(t.id); setSearch(""); }}
                        className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed border-gray-200 dark:border-white/10 text-sm font-bold text-gray-500 dark:text-gray-400 hover:border-rose-300 hover:text-rose-500 transition-all">
                        <Plus size={16} /> Add exercise
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })}

          <button onClick={loadStarter} disabled={busy}
            className="w-full flex items-center justify-center gap-2 py-3 text-xs font-semibold text-gray-400 hover:text-rose-500 transition-all">
            <Sparkles size={13} /> Add missing starter workouts
          </button>
        </div>
      )}

      {/* New workout modal */}
      {showNew && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-3xl p-6 border border-gray-100 dark:border-white/10 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-black text-xl text-gray-900 dark:text-white">New workout</h2>
              <button onClick={() => setShowNew(false)} aria-label="Close" className="p-2 rounded-xl bg-gray-100 dark:bg-white/10 text-gray-500"><X size={16} /></button>
            </div>
            <div className="space-y-3">
              <input value={newForm.name} onChange={(e) => setNewForm({ ...newForm, name: e.target.value })}
                placeholder="e.g. Upper body" autoFocus className={field} />
              <select value={newForm.weekday} onChange={(e) => setNewForm({ ...newForm, weekday: e.target.value })} className={selectField}>
                {WEEKDAYS.map((d) => <option key={d.v} value={d.v}>{d.l}</option>)}
              </select>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowNew(false)}
                className="flex-1 py-3.5 bg-gray-100 dark:bg-white/10 rounded-2xl font-bold text-gray-600 dark:text-gray-300">Cancel</button>
              <button onClick={createWorkout} disabled={busy || !newForm.name.trim()}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-rose-500 to-orange-500 text-white font-black rounded-2xl disabled:opacity-50">
                <Check size={18} /> Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add exercise modal */}
      {addingTpl && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-4">
          <div className="w-full max-w-md max-h-[88vh] flex flex-col bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-white/10 shadow-2xl">
            <div className="flex items-center justify-between p-5 pb-3">
              <div>
                <h2 className="font-black text-xl text-gray-900 dark:text-white">Add exercise</h2>
                <p className="text-xs text-gray-400">to {addingTpl.name}</p>
              </div>
              <button onClick={() => setAddTo(null)} aria-label="Close" className="p-2 rounded-xl bg-gray-100 dark:bg-white/10 text-gray-500"><X size={16} /></button>
            </div>

            <div className="px-5 pb-3">
              <div className="relative">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search your exercises..." className={`${field} pl-10`} />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 space-y-1.5">
              {available.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">
                  {library.length === 0 ? "No exercises yet. Create your first below." : "No matching exercises."}
                </p>
              ) : (
                available.map((l) => (
                  <button key={l.id} onClick={() => addExistingExercise(addingTpl.id, l.id)} disabled={busy}
                    className="w-full flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-white/5 text-left hover:bg-rose-50 dark:hover:bg-rose-500/10 disabled:opacity-60 transition-all">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-gray-900 dark:text-white truncate">{l.name}</p>
                      <p className="text-[11px] text-gray-400 capitalize">{l.muscleGroup} · {l.equipment}</p>
                    </div>
                    <Plus size={16} className="text-rose-500 flex-shrink-0" />
                  </button>
                ))
              )}
            </div>

            {/* Create new */}
            <div className="p-5 pt-4 mt-3 border-t border-gray-100 dark:border-white/5 space-y-2.5">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Or create a new exercise</p>
              <input value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                placeholder="Exercise name" className={field} />
              <div className="grid grid-cols-2 gap-2.5">
                <select value={createForm.muscleGroup} onChange={(e) => setCreateForm({ ...createForm, muscleGroup: e.target.value })} className={`${selectField} capitalize`}>
                  {MUSCLES.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
                <select value={createForm.equipment} onChange={(e) => setCreateForm({ ...createForm, equipment: e.target.value })} className={`${selectField} capitalize`}>
                  {EQUIPMENT.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <button onClick={() => createAndAdd(addingTpl.id)} disabled={busy || !createForm.name.trim()}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-rose-500 to-orange-500 text-white font-black rounded-2xl disabled:opacity-50">
                <Plus size={18} /> Create &amp; add
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}