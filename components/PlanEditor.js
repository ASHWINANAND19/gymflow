'use client';

import { useState } from 'react';
import { api, useApi } from '@/lib/client.js';
import { Button, Field, Notice, inputClass } from './ui.js';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const newItem = () => ({ exerciseId: '', targetSets: 3, targetReps: 10 });
const numberClass = inputClass.replace('w-full', 'w-16 shrink-0');

// Lets a trainer write a weekly plan for one client. Saved to MongoDB.
export default function PlanEditor({ memberId, plan, onSaved }) {
  const { data: exercises } = useApi('/api/exercises');
  const [title, setTitle] = useState(plan?.title ?? '');
  const [days, setDays] = useState(
    plan?.days ?? [{ day: 'Mon', items: [newItem()] }, { day: 'Wed', items: [newItem()] }, { day: 'Fri', items: [newItem()] }]
  );
  const [message, setMessage] = useState(null);
  const [busy, setBusy] = useState(false);

  function toggleDay(day) {
    if (days.some((d) => d.day === day)) setDays(days.filter((d) => d.day !== day));
    else setDays([...days, { day, items: [newItem()] }].sort((a, b) => DAYS.indexOf(a.day) - DAYS.indexOf(b.day)));
  }
  function updateItems(day, items) {
    setDays(days.map((d) => (d.day === day ? { ...d, items } : d)));
  }

  async function save() {
    setBusy(true);
    setMessage(null);
    try {
      await api(`/api/trainer/clients/${memberId}/plan`, { method: 'PUT', body: { title, days } });
      setMessage({ tone: 'success', text: 'Plan saved. Your client can see it now.' });
      onSaved?.();
    } catch (err) {
      setMessage({ tone: 'error', text: err.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {message && <Notice tone={message.tone}>{message.text}</Notice>}
      <Field label="Plan title">
        <input className={inputClass} value={title} maxLength={100} placeholder="e.g. 4-week strength base"
          onChange={(e) => setTitle(e.target.value)} />
      </Field>
      <div className="flex flex-wrap gap-2">
        {DAYS.map((day) => {
          const on = days.some((d) => d.day === day);
          return (
            <button key={day} type="button" onClick={() => toggleDay(day)}
              className={`rounded-full px-3 py-1 text-sm font-medium ${on ? 'bg-emerald-600 text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'}`}>
              {day}
            </button>
          );
        })}
      </div>

      {days.map(({ day, items }) => (
        <div key={day} className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
          <p className="mb-2 text-sm font-semibold text-zinc-800">{day}</p>
          <div className="space-y-2">
            {items.map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <select className={`${inputClass} min-w-0 flex-1`} value={item.exerciseId}
                  onChange={(e) => updateItems(day, items.map((it, j) => (j === i ? { ...it, exerciseId: Number(e.target.value) } : it)))}>
                  <option value="">Exercise…</option>
                  {exercises?.map((ex) => <option key={ex.exercise_id} value={ex.exercise_id}>{ex.name}</option>)}
                </select>
                <input type="number" min={1} max={10} className={numberClass} title="Sets" value={item.targetSets}
                  onChange={(e) => updateItems(day, items.map((it, j) => (j === i ? { ...it, targetSets: e.target.value } : it)))} />
                <span className="text-zinc-400">×</span>
                <input type="number" min={1} max={100} className={numberClass} title="Reps" value={item.targetReps}
                  onChange={(e) => updateItems(day, items.map((it, j) => (j === i ? { ...it, targetReps: e.target.value } : it)))} />
                <button type="button" className="text-zinc-400 hover:text-red-600"
                  onClick={() => updateItems(day, items.filter((_, j) => j !== i))}>✕</button>
              </div>
            ))}
          </div>
          <button type="button" className="mt-2 text-sm font-medium text-emerald-700 hover:underline"
            onClick={() => updateItems(day, [...items, newItem()])}>+ Add exercise</button>
        </div>
      ))}

      <Button onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save plan'}</Button>
    </div>
  );
}
