// Read-only view of a trainer-written workout plan (MongoDB document)
export default function PlanView({ plan }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {plan.days.map((day) => (
        <div key={day.day} className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-semibold text-emerald-700">{day.day}</p>
          <ul className="mt-3 space-y-2 text-sm">
            {day.items.map((item, i) => (
              <li key={i} className="flex justify-between gap-3">
                <span className="text-zinc-800">{item.name}</span>
                <span className="text-zinc-500">{item.targetSets} × {item.targetReps}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
