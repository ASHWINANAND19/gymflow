import { formatDate } from '@/lib/client.js';

// One-line description of an exercise entry from a MongoDB workout document
export function describeExercise(ex) {
  if (ex.category === 'strength') {
    const top = Math.max(...ex.sets.map((s) => s.weightKg));
    return `${ex.sets.length} sets · up to ${top} kg`;
  }
  return [ex.durationMin && `${ex.durationMin} min`, ex.distanceKm && `${ex.distanceKm} km`].filter(Boolean).join(' · ');
}

export default function WorkoutSummary({ session, action }) {
  return (
    <div className="rounded-lg border border-zinc-200 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium text-zinc-900">{formatDate(session.date)}</p>
          <p className="text-xs text-zinc-500">
            {session.exercises.length} exercises{session.durationMin ? ` · ${session.durationMin} min` : ''}
          </p>
        </div>
        {action}
      </div>
      <ul className="mt-3 space-y-1 text-sm">
        {session.exercises.map((ex, i) => (
          <li key={i} className="flex justify-between gap-3">
            <span className="text-zinc-800">{ex.name}</span>
            <span className="text-zinc-500">{describeExercise(ex)}</span>
          </li>
        ))}
      </ul>
      {session.notes && <p className="mt-2 text-xs italic text-zinc-500">&ldquo;{session.notes}&rdquo;</p>}
    </div>
  );
}
