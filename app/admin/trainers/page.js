'use client';

import { useState } from 'react';
import { api, useApi, formatDate } from '@/lib/client.js';
import { PageHeader, Card, Notice, Table, Loading, Button, Badge, Field, inputClass } from '@/components/ui.js';

const capacityClass = inputClass.replace('w-full', 'w-20');
const blankTrainer = { fullName: '', email: '', phone: '', password: '', specialization: '', maxClients: 10 };

export default function TrainersPage() {
  const { data, error, loading, reload } = useApi('/api/admin/trainers');
  const [assign, setAssign] = useState({ memberId: '', trainerId: '' });
  const [newTrainer, setNewTrainer] = useState(blankTrainer);
  const [capacity, setCapacity] = useState({});
  const [message, setMessage] = useState(null);

  async function run(action, successText) {
    setMessage(null);
    try {
      await action();
      setMessage({ tone: 'success', text: successText });
      await reload();
      return true;
    } catch (err) {
      // e.g. "Trainer is at full capacity (3 of 3 clients)" from the trigger
      setMessage({ tone: 'error', text: err.message });
      return false;
    }
  }

  if (loading) return <Loading />;
  if (error) return <Notice>{error}</Notice>;

  return (
    <>
      <PageHeader title="Trainers" subtitle="Capacity and plan eligibility are checked by a database trigger." />
      {message && <Notice tone={message.tone}>{message.text}</Notice>}

      <Card title="Workload (v_trainer_workload)">
        <Table
          rowKey="trainer_id"
          rows={data.workload}
          columns={[
            { key: 'full_name', label: 'Trainer', render: (t) => <span className="font-medium text-zinc-900">{t.full_name}</span> },
            { key: 'specialization', label: 'Specialization' },
            {
              key: 'active_clients', label: 'Clients',
              render: (t) => <Badge tone={t.utilisation_pct >= 100 ? 'warn' : 'good'}>{t.active_clients} / {t.max_clients}</Badge>,
            },
            {
              key: 'max_clients', label: 'Change capacity',
              render: (t) => (
                <div className="flex items-center gap-2">
                  <input type="number" min={1} max={30} className={capacityClass}
                    value={capacity[t.trainer_id] ?? t.max_clients}
                    onChange={(e) => setCapacity({ ...capacity, [t.trainer_id]: e.target.value })} />
                  <Button variant="secondary" className="px-3 py-1.5"
                    onClick={() => run(
                      () => api(`/api/admin/trainers/${t.trainer_id}`, { method: 'PATCH', body: { maxClients: capacity[t.trainer_id] ?? t.max_clients } }),
                      `${t.full_name}'s capacity updated.`
                    )}>
                    Save
                  </Button>
                </div>
              ),
            },
          ]}
        />
      </Card>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title="Assign a trainer">
          <div className="space-y-3">
            <Field label="Member" hint="Members on a trainer plan who have no trainer yet. You can also type any member id.">
              <input list="needing-trainer" className={inputClass} placeholder="Member id" value={assign.memberId}
                onChange={(e) => setAssign({ ...assign, memberId: e.target.value })} />
              <datalist id="needing-trainer">
                {data.needingTrainer.map((m) => <option key={m.member_id} value={m.member_id}>{m.full_name} · {m.plan_name}</option>)}
              </datalist>
            </Field>
            {data.needingTrainer.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {data.needingTrainer.map((m) => (
                  <button key={m.member_id} type="button" onClick={() => setAssign({ ...assign, memberId: String(m.member_id) })}
                    className="rounded-full border border-zinc-300 px-3 py-1 text-xs hover:border-emerald-600">
                    {m.full_name} (#{m.member_id})
                  </button>
                ))}
              </div>
            )}
            <Field label="Trainer">
              <select className={inputClass} value={assign.trainerId} onChange={(e) => setAssign({ ...assign, trainerId: e.target.value })}>
                <option value="">Choose trainer…</option>
                {data.workload.map((t) => (
                  <option key={t.trainer_id} value={t.trainer_id}>{t.full_name} ({t.active_clients}/{t.max_clients})</option>
                ))}
              </select>
            </Field>
            <Button disabled={!assign.memberId || !assign.trainerId}
              onClick={async () => {
                const ok = await run(
                  () => api('/api/admin/assignments', { method: 'POST', body: { memberId: Number(assign.memberId), trainerId: Number(assign.trainerId) } }),
                  'Trainer assigned.'
                );
                if (ok) setAssign({ memberId: '', trainerId: '' });
              }}>
              Assign
            </Button>
          </div>
        </Card>

        <Card title="Add a trainer">
          <form className="grid gap-3 sm:grid-cols-2"
            onSubmit={async (e) => {
              e.preventDefault();
              if (await run(() => api('/api/admin/trainers', { method: 'POST', body: newTrainer }), 'Trainer account created.')) {
                setNewTrainer(blankTrainer);
              }
            }}>
            <Field label="Full name"><input className={inputClass} required value={newTrainer.fullName} onChange={(e) => setNewTrainer({ ...newTrainer, fullName: e.target.value })} /></Field>
            <Field label="Email"><input type="email" className={inputClass} required value={newTrainer.email} onChange={(e) => setNewTrainer({ ...newTrainer, email: e.target.value })} /></Field>
            <Field label="Phone"><input className={inputClass} value={newTrainer.phone} onChange={(e) => setNewTrainer({ ...newTrainer, phone: e.target.value })} /></Field>
            <Field label="Temporary password"><input type="password" minLength={8} className={inputClass} required value={newTrainer.password} onChange={(e) => setNewTrainer({ ...newTrainer, password: e.target.value })} /></Field>
            <Field label="Specialization"><input className={inputClass} required value={newTrainer.specialization} onChange={(e) => setNewTrainer({ ...newTrainer, specialization: e.target.value })} /></Field>
            <Field label="Max clients"><input type="number" min={1} max={30} className={inputClass} value={newTrainer.maxClients} onChange={(e) => setNewTrainer({ ...newTrainer, maxClients: e.target.value })} /></Field>
            <div className="sm:col-span-2"><Button type="submit">Create trainer</Button></div>
          </form>
        </Card>
      </div>

      <Card title="Current assignments" className="mt-4">
        <Table
          rowKey="assignment_id"
          rows={data.assignments}
          empty="No running assignments."
          columns={[
            { key: 'trainer_name', label: 'Trainer' },
            { key: 'member_name', label: 'Member' },
            { key: 'assigned_on', label: 'Since', render: (a) => formatDate(a.assigned_on) },
            {
              key: 'actions', label: '',
              render: (a) => (
                <button className="text-xs font-medium text-red-600 hover:underline"
                  onClick={() => run(() => api(`/api/admin/assignments/${a.assignment_id}`, { method: 'PATCH' }), 'Assignment ended.')}>
                  End
                </button>
              ),
            },
          ]}
        />
      </Card>
    </>
  );
}
