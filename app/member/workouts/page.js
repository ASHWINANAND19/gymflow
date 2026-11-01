'use client';

import { useState } from 'react';
import { api, useApi, todayISO } from '@/lib/client.js';
import { PageHeader, Card, Notice, Button, Field, Loading, Empty, inputClass } from '@/components/ui.js';
import WorkoutSummary from '@/components/WorkoutSummary.js';

const emptySet = () => ({ reps: '', weightKg: '' });
const emptyEntry = () => ({ exerciseId: '', sets: [emptySet()], durationMin: '', distanceKm: '' });

export default function WorkoutsPage() {
  const exercises = useApi('/api/exercises');
  const history = useApi('/api/member/workouts');
  const [form, setForm] = useState({ date: todayISO(), durationMin: '', notes: '' });
  const [entries, setEntries] = useState([emptyEntry()]);
  const [message, setMessage] = useState(null);
  const [busy, setBusy] = useState(false);

  const catalog = exercises.data ?? [];
  const categoryOf = (id) => catalog.find((e) => e.exercise_id === Number(id))?.category;

  function updateEntry(index, changes) {
    setEntries(entries.map((entry, i) => (i === index ? { ...entry, ...changes } : entry)));
  }
  function updateSet(index, setIndex, changes) {
    const sets = entries[index].sets.map((s, j) => (j === setIndex ? { ...s, ...changes } : s));
    updateEntry(index, { sets });
  }

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    // Send only the fields that matter for each exercise's category
    const payload = {
      ...form,
      exercises: entries.map((entry) => {
        const category = categoryOf(entry.exerciseId);
        const base = { exerciseId: Number(entry.exerciseId) };
        if (category === 'strength') return { ...base, sets: entry.sets };
        if (category === 'cardio') return { ...base, durationMin: entry.durationMin, distanceKm: entry.distanceKm };
        return { ...base, durationMin: entry.durationMin };
      }),
    };
    try {
      await api('/api/member/workouts', { method: 'POST', body: payload });
      setMessage({ tone: 'success', text: 'Workout saved.' });
      setEntries([emptyEntry()]);
      setForm({ date: todayISO(), durationMin: '', notes: '' });
      await history.reload();
    } catch (err) {
      setMessage({ tone: 'error', text: err.message });
    } finally {
      setBusy(false);
    }
  }

  async function remove(id) {
    if (!confirm('Delete this workout?')) return;
    try {
      await api(`/api/member/workouts/${id}`, { method: 'DELETE' });
      await history.reload();
    } catch (err) {
      setMessage({ tone: 'error', text: err.message });
    }
  }

  const byCategory = ['strength', 'cardio', 'flexibility'].map((cat) => [cat, catalog.filter((e) => e.category === cat)]);

  return (
    <>
      <PageHeader title="Log workout" subtitle="Each session is saved as one MongoDB document. Fields change with the exercise type." />
      {message && <Notice tone={message.tone}>{message.text}</Notice>}

      <div className="grid gap-6 lg:grid-cols-5">
        <Card title="New session" className="lg:col-span-3">
          <form onSubmit={save} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Date">
                <input type="date" className={inputClass} max={todayISO()} required value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </Field>
              <Field label="Session length (min)">
                <input type="number" className={inputClass} min={1} max={300} value={form.durationMin}
                  onChange={(e) => setForm({ ...form, durationMin: e.target.value })} />
              </Field>
            </div>

            {entries.map((entry, index) => {
              const category = categoryOf(entry.exerciseId);
              return (
                <div key={index} className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                  <div className="flex gap-2">
                    <select className={inputClass} required value={entry.exerciseId}
                      onChange={(e) => updateEntry(index, { exerciseId: e.target.value })}>
                      <option value="">Choose exercise…</option>
                      {byCategory.map(([cat, list]) => (
                        <optgroup key={cat} label={cat}>
                          {list.map((ex) => <option key={ex.exercise_id} value={ex.exercise_id}>{ex.name}</option>)}
                        </optgroup>
                      ))}
                    </select>
                    {entries.length > 1 && (
                      <Button type="button" variant="ghost" onClick={() => setEntries(entries.filter((_, i) => i !== index))}>
                        Remove
                      </Button>
                    )}
                  </div>

                  {category === 'strength' && (
                    <div className="mt-3 space-y-2">
                      {entry.sets.map((set, j) => (
                        <div key={j} className="flex items-center gap-2 text-sm">
                          <span className="w-12 text-zinc-500">Set {j + 1}</span>
                          <input type="number" placeholder="Reps" min={1} max={100} className={inputClass} value={set.reps}
                            onChange={(e) => updateSet(index, j, { reps: e.target.value })} />
                          <input type="number" placeholder="kg" min={0} max={500} step="0.5" className={inputClass} value={set.weightKg}
                            onChange={(e) => updateSet(index, j, { weightKg: e.target.value })} />
                          {entry.sets.length > 1 && (
                            <button type="button" className="text-zinc-400 hover:text-red-600"
                              onClick={() => updateEntry(index, { sets: entry.sets.filter((_, k) => k !== j) })}>✕</button>
                          )}
                        </div>
                      ))}
                      <button type="button" className="text-sm font-medium text-emerald-700 hover:underline"
                        onClick={() => updateEntry(index, { sets: [...entry.sets, { ...entry.sets.at(-1) }] })}>
                        + Add set
                      </button>
                    </div>
                  )}

                  {(category === 'cardio' || category === 'flexibility') && (
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <input type="number" placeholder="Minutes" min={1} max={300} className={inputClass} value={entry.durationMin}
                        onChange={(e) => updateEntry(index, { durationMin: e.target.value })} />
                      {category === 'cardio' && (
                        <input type="number" placeholder="Distance (km, optional)" min={0} max={100} step="0.1" className={inputClass}
                          value={entry.distanceKm} onChange={(e) => updateEntry(index, { distanceKm: e.target.value })} />
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            <Button type="button" variant="secondary" onClick={() => setEntries([...entries, emptyEntry()])}>
              + Add exercise
            </Button>

            <Field label="Notes (optional)">
              <textarea className={inputClass} rows={2} maxLength={500} value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </Field>
            <Button type="submit" disabled={busy} className="w-full">{busy ? 'Saving…' : 'Save workout'}</Button>
          </form>
        </Card>

        <Card title="Recent sessions" className="lg:col-span-2">
          {history.loading ? <Loading /> : history.data?.length ? (
            <div className="max-h-[42rem] space-y-3 overflow-y-auto pr-1">
              {history.data.map((s) => (
                <WorkoutSummary key={s._id} session={s}
                  action={<button onClick={() => remove(s._id)} className="text-xs text-zinc-400 hover:text-red-600">Delete</button>} />
              ))}
            </div>
          ) : <Empty>No workouts logged yet.</Empty>}
        </Card>
      </div>
    </>
  );
}
