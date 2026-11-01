'use client';

import { shortWeek } from '@/lib/client.js';
import { Card, Stat, Table } from './ui.js';
import { SimpleBarChart, SimpleLineChart } from './Charts.js';

// Shared by the member progress page and the trainer's client page.
// `weekly` and `records` come from MongoDB aggregation pipelines.
export default function ProgressCharts({ weekly, records }) {
  const weeks = weekly.map((w) => ({ ...w, label: shortWeek(w.week) }));
  const totalSessions = weekly.reduce((sum, w) => sum + w.sessions, 0);
  const totalVolume = weekly.reduce((sum, w) => sum + w.volumeKg, 0);
  const totalKm = weekly.reduce((sum, w) => sum + w.cardioKm, 0);

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Sessions (8 weeks)" value={totalSessions} />
        <Stat label="Weight lifted (8 weeks)" value={`${Math.round(totalVolume).toLocaleString('en-IN')} kg`} hint="Sum of reps × kg" />
        <Stat label="Cardio distance (8 weeks)" value={`${totalKm.toFixed(1)} km`} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title="Weekly training volume (kg)">
          <SimpleBarChart data={weeks} xKey="label" yKey="volumeKg" label="Volume"
            format={(v) => `${Math.round(v / 1000)}k`} />
        </Card>
        <Card title="Sessions per week">
          <SimpleLineChart data={weeks} xKey="label" yKey="sessions" label="Sessions" color="#059669" />
        </Card>
      </div>

      <Card title="Personal records" className="mt-4">
        <Table
          rowKey="exercise"
          rows={records}
          empty="Log a strength exercise to see personal records."
          columns={[
            { key: 'exercise', label: 'Exercise' },
            { key: 'bestWeightKg', label: 'Heaviest', render: (r) => `${r.bestWeightKg} kg` },
            { key: 'bestReps', label: 'Most reps' },
            { key: 'totalSets', label: 'Sets logged' },
          ]}
        />
      </Card>
    </>
  );
}
