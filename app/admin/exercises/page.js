'use client';

import { useState } from 'react';
import { api, useApi } from '@/lib/client.js';
import { PageHeader, Card, Notice, Table, Loading, Button, Badge, Field, inputClass } from '@/components/ui.js';

const CATEGORY_TONES = { strength: 'good', cardio: 'info', flexibility: 'warn' };
const blank = { name: '', category: 'strength', muscleGroup: '' };

export default function ExercisesPage() {
  const { data, error, loading, reload } = useApi('/api/exercises');
  const [form, setForm] = useState(blank);
  const [message, setMessage] = useState(null);

  async function run(action, successText) {
    setMessage(null);
    try {
      await action();
      setMessage({ tone: 'success', text: successText });
      await reload();
      return true;
    } catch (err) {
      setMessage({ tone: 'error', text: err.message });
      return false;
    }
  }

  return (
    <>
      <PageHeader title="Exercise catalog"
        subtitle="Stored in PostgreSQL. Workout logs copy the name, so deleting an exercise keeps old history readable." />
      {message && <Notice tone={message.tone}>{message.text}</Notice>}
      {error && <Notice>{error}</Notice>}

      <Card title="Add exercise" className="mb-4">
        <form className="grid gap-3 sm:grid-cols-4"
          onSubmit={async (e) => {
            e.preventDefault();
            if (await run(() => api('/api/admin/exercises', { method: 'POST', body: form }), 'Exercise added.')) setForm(blank);
          }}>
          <Field label="Name"><input className={inputClass} required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Category">
            <select className={inputClass} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              <option value="strength">Strength</option>
              <option value="cardio">Cardio</option>
              <option value="flexibility">Flexibility</option>
            </select>
          </Field>
          <Field label="Muscle group"><input className={inputClass} value={form.muscleGroup} onChange={(e) => setForm({ ...form, muscleGroup: e.target.value })} /></Field>
          <div className="flex items-end"><Button type="submit" className="w-full">Add</Button></div>
        </form>
      </Card>

      <Card>
        {loading ? <Loading /> : (
          <Table
            rowKey="exercise_id"
            rows={data}
            columns={[
              { key: 'exercise_id', label: 'ID' },
              { key: 'name', label: 'Name', render: (e) => <span className="font-medium text-zinc-900">{e.name}</span> },
              { key: 'category', label: 'Category', render: (e) => <Badge tone={CATEGORY_TONES[e.category]}>{e.category}</Badge> },
              { key: 'muscle_group', label: 'Muscle group' },
              {
                key: 'actions', label: '',
                render: (e) => (
                  <button className="text-xs font-medium text-red-600 hover:underline"
                    onClick={() => confirm(`Delete ${e.name}?`) && run(() => api(`/api/admin/exercises/${e.exercise_id}`, { method: 'DELETE' }), `${e.name} deleted.`)}>
                    Delete
                  </button>
                ),
              },
            ]}
          />
        )}
      </Card>
    </>
  );
}
