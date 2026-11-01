'use client';

import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';
import { Empty } from './ui.js';

const GRID = '#e4e4e7';
const AXIS = { fontSize: 12, fill: '#71717a' };

// Generic bar chart: data = [{ [xKey]: ..., [yKey]: number }]
export function SimpleBarChart({ data, xKey, yKey, label, color = '#059669', format = (v) => v, layout = 'horizontal' }) {
  if (!data?.length) return <Empty>No data yet.</Empty>;
  const vertical = layout === 'vertical';
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout={layout} margin={{ top: 8, right: 8, bottom: 0, left: vertical ? 40 : 0 }}>
          <CartesianGrid stroke={GRID} vertical={vertical} horizontal={!vertical} />
          {vertical ? (
            <>
              <XAxis type="number" tick={AXIS} tickFormatter={format} />
              <YAxis type="category" dataKey={xKey} tick={AXIS} width={110} />
            </>
          ) : (
            <>
              <XAxis dataKey={xKey} tick={AXIS} />
              <YAxis tick={AXIS} tickFormatter={format} width={64} />
            </>
          )}
          <Tooltip formatter={(v) => [format(v), label]} />
          <Bar dataKey={yKey} fill={color} radius={vertical ? [0, 4, 4, 0] : [4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function SimpleLineChart({ data, xKey, yKey, label, color = '#0284c7', format = (v) => v }) {
  if (!data?.length) return <Empty>No data yet.</Empty>;
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey={xKey} tick={AXIS} />
          <YAxis tick={AXIS} tickFormatter={format} width={48} />
          <Tooltip formatter={(v) => [format(v), label]} />
          <Line type="monotone" dataKey={yKey} stroke={color} strokeWidth={2} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
