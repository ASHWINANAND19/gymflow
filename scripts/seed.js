// Fills both databases with realistic demo data (about 3-5 months of
// history). Uses a fixed random seed, so every run produces the same data.
// Usage: npm run db:seed   (or npm run db:reset to rebuild + seed)
import bcrypt from 'bcryptjs';
import { query, closePool } from '../lib/db.js';
import { getMongoDb, closeMongo } from '../lib/mongo.js';

// ---------- deterministic random helpers ----------
let state = 42;
function random() {
  // mulberry32
  state = (state + 0x6d2b79f5) | 0;
  let t = Math.imul(state ^ (state >>> 15), 1 | state);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const between = (min, max) => min + Math.floor(random() * (max - min + 1));
const pick = (items) => items[Math.floor(random() * items.length)];
const chance = (p) => random() < p;

// ---------- date helpers (all dates are India time, 'YYYY-MM-DD') ----------
const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
function addDays(day, n) {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
function istTimestamp(day, hour, minute) {
  return new Date(`${day}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00+05:30`);
}

// ---------- reference data ----------
const PLANS = [
  { name: 'Monthly Basic', days: 30, price: 1500, trainer: false, description: 'Full gym access for one month' },
  { name: 'Quarterly Basic', days: 90, price: 4000, trainer: false, description: 'Three months of gym access at a lower monthly price' },
  { name: 'Annual Basic', days: 365, price: 12000, trainer: false, description: 'Best value: a full year of gym access' },
  { name: 'Monthly + Trainer', days: 30, price: 3500, trainer: true, description: 'One month with a personal trainer and a custom workout plan' },
  { name: 'Half-Yearly + Trainer', days: 180, price: 17000, trainer: true, description: 'Six months with a personal trainer' },
];

// [name, category, muscle group, starting weight in kg for an average member]
const EXERCISES = [
  ['Bench Press', 'strength', 'Chest', 40],
  ['Incline Dumbbell Press', 'strength', 'Chest', 14],
  ['Back Squat', 'strength', 'Legs', 50],
  ['Leg Press', 'strength', 'Legs', 80],
  ['Dumbbell Lunges', 'strength', 'Legs', 10],
  ['Deadlift', 'strength', 'Back', 60],
  ['Barbell Row', 'strength', 'Back', 35],
  ['Lat Pulldown', 'strength', 'Back', 35],
  ['Overhead Press', 'strength', 'Shoulders', 25],
  ['Bicep Curl', 'strength', 'Arms', 10],
  ['Tricep Pushdown', 'strength', 'Arms', 15],
  ['Pull-up', 'strength', 'Back', 0],
  ['Treadmill Run', 'cardio', 'Full body', null],
  ['Stationary Cycling', 'cardio', 'Legs', null],
  ['Rowing Machine', 'cardio', 'Full body', null],
  ['Jump Rope', 'cardio', 'Full body', null],
  ['Yoga Flow', 'flexibility', 'Full body', null],
  ['Stretching Routine', 'flexibility', 'Full body', null],
];

const TRAINERS = [
  { name: 'Arjun Nair', specialization: 'Strength & Conditioning', maxClients: 8 },
  { name: 'Sneha Iyer', specialization: 'Weight Loss', maxClients: 8 },
  { name: 'Vikram Shetty', specialization: 'Bodybuilding', maxClients: 6 },
  { name: 'Meera Pillai', specialization: 'Yoga & Mobility', maxClients: 3 },
];

const FIRST_NAMES = [
  ['Rohan', 'male'], ['Ananya', 'female'], ['Karthik', 'male'], ['Divya', 'female'], ['Aditya', 'male'],
  ['Pooja', 'female'], ['Siddharth', 'male'], ['Nisha', 'female'], ['Rahul', 'male'], ['Shreya', 'female'],
  ['Varun', 'male'], ['Kavya', 'female'], ['Nikhil', 'male'], ['Isha', 'female'], ['Manoj', 'male'],
  ['Lakshmi', 'female'], ['Pranav', 'male'], ['Tanvi', 'female'], ['Harish', 'male'], ['Ritu', 'female'],
  ['Sanjay', 'male'], ['Aishwarya', 'female'], ['Gautam', 'male'], ['Neha', 'female'], ['Akash', 'male'],
  ['Swathi', 'female'], ['Deepak', 'male'], ['Megha', 'female'], ['Suresh', 'male'], ['Priya', 'female'],
  ['Kiran', 'other'], ['Bhavana', 'female'], ['Abhishek', 'male'], ['Sahana', 'female'], ['Vivek', 'male'],
  ['Anjali', 'female'], ['Rajesh', 'male'], ['Keerthi', 'female'], ['Tarun', 'male'], ['Revathi', 'female'],
];
const LAST_NAMES = ['Sharma', 'Reddy', 'Kumar', 'Rao', 'Gowda', 'Hegde', 'Menon', 'Patel', 'Joshi', 'Das', 'Kulkarni', 'Bhat', 'Naidu', 'Srinivasan', 'Kapoor'];

// ---------- insert helpers ----------
async function insertUser(fullName, email, passwordHash, role, phone = null) {
  const { rows } = await query(
    `INSERT INTO users (full_name, email, phone, password_hash, role)
     VALUES ($1, $2, $3, $4, $5) RETURNING user_id`,
    [fullName, email, phone, passwordHash, role]
  );
  return rows[0].user_id;
}

// Multi-row INSERT in chunks: columns = ['a','b'], rows = [[1,2],[3,4]]
async function bulkInsert(table, columns, rows) {
  const chunkSize = Math.floor(30000 / columns.length);
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const params = [];
    const values = chunk.map((row) => {
      const placeholders = row.map((value) => {
        params.push(value);
        return `$${params.length}`;
      });
      return `(${placeholders.join(', ')})`;
    });
    await query(`INSERT INTO ${table} (${columns.join(', ')}) VALUES ${values.join(', ')}`, params);
  }
}

const randomPhone = () => `9${String(between(100000000, 999999999))}`;
const roundTo = (value, step) => Math.round(value / step) * step;

async function seed() {
  console.log('Clearing old data...');
  await query(`TRUNCATE audit_log, check_ins, trainer_assignments, payments, memberships,
               exercises, plans, trainers, members, users RESTART IDENTITY CASCADE`);
  const mongo = await getMongoDb();
  await mongo.collection('workout_sessions').deleteMany({});
  await mongo.collection('workout_plans').deleteMany({});

  const [adminHash, trainerHash, memberHash] = await Promise.all([
    bcrypt.hash('Admin@123', 10),
    bcrypt.hash('Trainer@123', 10),
    bcrypt.hash('Member@123', 10),
  ]);

  // ----- plans and exercises -----
  const plans = [];
  for (const p of PLANS) {
    const { rows } = await query(
      `INSERT INTO plans (name, duration_days, price, includes_trainer, description)
       VALUES ($1, $2, $3, $4, $5) RETURNING plan_id`,
      [p.name, p.days, p.price, p.trainer, p.description]
    );
    plans.push({ ...p, id: rows[0].plan_id });
  }
  const planByName = Object.fromEntries(plans.map((p) => [p.name, p]));

  const exercises = [];
  for (const [name, category, muscleGroup, baseKg] of EXERCISES) {
    const { rows } = await query(
      'INSERT INTO exercises (name, category, muscle_group) VALUES ($1, $2, $3) RETURNING exercise_id',
      [name, category, muscleGroup]
    );
    exercises.push({ id: rows[0].exercise_id, name, category, baseKg });
  }
  const strength = exercises.filter((e) => e.category === 'strength');
  const cardio = exercises.filter((e) => e.category === 'cardio');
  const flexibility = exercises.filter((e) => e.category === 'flexibility');

  // ----- staff -----
  await insertUser('Kavya Rao', 'admin@gymflow.com', adminHash, 'admin', '9876500001');
  const trainers = [];
  for (const [i, t] of TRAINERS.entries()) {
    const id = await insertUser(t.name, `trainer${i + 1}@gymflow.com`, trainerHash, 'trainer', randomPhone());
    await query(
      'INSERT INTO trainers (trainer_id, specialization, max_clients) VALUES ($1, $2, $3)',
      [id, t.specialization, t.maxClients]
    );
    trainers.push({ ...t, id, clients: 0 });
  }

  // ----- members and their membership history -----
  console.log('Creating members and memberships...');
  const members = [];
  for (let i = 0; i < 40; i++) {
    const n = i + 1;
    const [first, gender] = FIRST_NAMES[i];
    const name = `${first} ${pick(LAST_NAMES)}`;
    const id = await insertUser(name, `member${n}@gymflow.com`, memberHash, 'member', randomPhone());

    const joinedDaysAgo = n === 1 ? 120 : n === 2 ? 100 : n === 3 ? 60 : between(20, 150);
    const joinedOn = addDays(today, -joinedDaysAgo);
    await query(
      `INSERT INTO members (member_id, date_of_birth, gender, height_cm, joined_on)
       VALUES ($1, $2, $3, $4, $5)`,
      [id, `${between(1978, 2007)}-${String(between(1, 12)).padStart(2, '0')}-${String(between(1, 28)).padStart(2, '0')}`,
        gender, between(150, 190), joinedOn]
    );

    // member1: demo member on a trainer plan; member2: lapsed; member3: basic plan
    const lapsed = n === 2 || (n > 3 && chance(0.25));
    const wantsTrainer = n === 1 || (n > 3 && !lapsed && chance(0.4));
    const memberships = [];
    let start = joinedOn;

    if (lapsed) {
      // Back-to-back monthly plans that stop before today
      const plan = planByName['Monthly Basic'];
      while (addDays(start, plan.days - 1) < addDays(today, -5)) {
        memberships.push({ plan, start, end: addDays(start, plan.days - 1) });
        start = addDays(start, plan.days);
      }
      if (memberships.length === 0) {
        const s = addDays(today, -45);
        memberships.push({ plan, start: s, end: addDays(s, plan.days - 1) });
      }
    } else {
      while (start <= today) {
        let plan;
        if (n === 1) plan = planByName['Monthly + Trainer'];
        else if (n === 3) plan = planByName['Quarterly Basic'];
        else if (wantsTrainer) plan = pick([planByName['Monthly + Trainer'], planByName['Monthly + Trainer'], planByName['Half-Yearly + Trainer']]);
        else plan = pick([planByName['Monthly Basic'], planByName['Monthly Basic'], planByName['Quarterly Basic'], planByName['Annual Basic']]);
        memberships.push({ plan, start, end: addDays(start, plan.days - 1) });
        start = addDays(start, plan.days);
      }
    }

    // Insert as active first: the check-in trigger only accepts check-ins
    // on active memberships. expire_memberships() flips old ones later.
    for (const m of memberships) {
      const { rows } = await query(
        `INSERT INTO memberships (member_id, plan_id, start_date, end_date, created_at)
         VALUES ($1, $2, $3, $4, $5) RETURNING membership_id`,
        [id, m.plan.id, m.start, m.end, istTimestamp(m.start, 9, between(0, 59))]
      );
      m.id = rows[0].membership_id;
      await query(
        'INSERT INTO payments (membership_id, amount, method, paid_at) VALUES ($1, $2, $3, $4)',
        [m.id, m.plan.price, pick(['upi', 'upi', 'upi', 'card', 'card', 'cash']), istTimestamp(m.start, 10, between(0, 59))]
      );
    }

    members.push({
      n, id, name, memberships,
      attendance: n === 1 ? 0.65 : 0.3 + random() * 0.4,
      strengthFactor: 0.7 + random() * 0.7,
      style: n === 1 ? 'strength' : pick(['strength', 'strength', 'mixed', 'cardio', 'yoga']),
    });
  }

  // ----- check-ins (past days only) -----
  console.log('Creating check-ins...');
  const yesterday = addDays(today, -1);
  const checkInRows = [];
  const visits = []; // kept for building workout sessions
  for (const m of members) {
    for (const ms of m.memberships) {
      for (let day = ms.start; day <= ms.end && day <= yesterday; day = addDays(day, 1)) {
        if (!chance(m.attendance)) continue;
        const inTime = istTimestamp(day, between(6, 20), between(0, 59));
        const minutes = between(55, 120);
        const outTime = new Date(inTime.getTime() + minutes * 60000);
        checkInRows.push([m.id, inTime, outTime]);
        visits.push({ member: m, day, inTime, minutes });
      }
    }
  }
  await bulkInsert('check_ins', ['member_id', 'check_in_time', 'check_out_time'], checkInRows);

  // Expire old memberships now that history is in (writes audit_log rows)
  const { rows: expired } = await query('SELECT expire_memberships() AS n');

  // One member (the last one with a running basic plan) cancelled it
  const cancelled = [...members].reverse().find(
    (m) => m.n > 6 && m.memberships.at(-1).end >= today && !m.memberships.at(-1).plan.trainer
  );
  if (cancelled) {
    await query(`UPDATE memberships SET status = 'cancelled' WHERE membership_id = $1`, [cancelled.memberships.at(-1).id]);
  }

  // Two members renewed early through the stored procedure (stacked dates)
  for (const n of [5, 6]) {
    const m = members.find((x) => x.n === n);
    if (m.memberships.at(-1).end >= today) {
      await query('CALL purchase_membership($1, $2, $3, NULL)', [m.id, planByName['Monthly Basic'].id, 'upi']);
    }
  }

  // ----- trainer assignments -----
  console.log('Assigning trainers...');
  const { rows: eligible } = await query(
    `SELECT ms.member_id, ms.start_date
     FROM memberships ms JOIN plans p ON p.plan_id = ms.plan_id
     WHERE ms.status = 'active' AND p.includes_trainer
       AND current_date BETWEEN ms.start_date AND ms.end_date
     ORDER BY ms.member_id`
  );
  const assignments = []; // { memberId, trainer }
  const [arjun, , , meera] = trainers;
  // The last eligible member is left without a trainer so the admin can
  // demo assigning one (and being refused by the full trainer)
  for (const row of eligible.slice(0, -1)) {
    let trainer;
    if (row.member_id === members[0].id) trainer = arjun;
    else if (meera.clients < meera.maxClients) trainer = meera;
    else trainer = trainers.slice(0, 3).filter((t) => t.clients < t.maxClients).sort((a, b) => a.clients - b.clients)[0];
    if (!trainer) break;
    await query(
      'INSERT INTO trainer_assignments (member_id, trainer_id, assigned_on) VALUES ($1, $2, $3)',
      [row.member_id, trainer.id, row.start_date]
    );
    trainer.clients += 1;
    assignments.push({ memberId: row.member_id, trainer });
  }

  // A few members are in the gym right now (open check-in, not member1)
  const now = new Date();
  const inGymSince = new Date(now.getTime() - 40 * 60000);
  if (inGymSince.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }) === today) {
    const { rows: activeNow } = await query(
      'SELECT member_id FROM v_active_members WHERE member_id <> $1 ORDER BY member_id LIMIT 4',
      [members[0].id]
    );
    for (const r of activeNow) {
      await query('INSERT INTO check_ins (member_id, check_in_time) VALUES ($1, $2)', [r.member_id, inGymSince]);
    }
  }

  // ----- MongoDB: workout sessions for recent visits -----
  console.log('Creating workout sessions...');
  const sixtyDaysAgo = addDays(today, -60);
  const sessionDocs = [];
  for (const v of visits) {
    if (v.day < sixtyDaysAgo || !chance(0.8)) continue;
    const progress = 1 + 0.15 * ((60 - (Date.parse(today) - Date.parse(v.day)) / 86400000) / 60);
    const exerciseList = [];

    const strengthCount = { strength: 4, mixed: 2, cardio: 1, yoga: 0 }[v.member.style];
    const chosen = [...strength].sort(() => random() - 0.5).slice(0, strengthCount);
    for (const ex of chosen) {
      const setCount = between(3, 4);
      const weight = ex.baseKg === 0 ? 0 : Math.max(2.5, roundTo(ex.baseKg * v.member.strengthFactor * progress, 2.5));
      exerciseList.push({
        exerciseId: ex.id, name: ex.name, category: 'strength',
        sets: Array.from({ length: setCount }, () => ({ reps: between(6, 12), weightKg: weight })),
      });
    }
    if (v.member.style !== 'strength' || chance(0.4)) {
      const ex = pick(cardio);
      const durationMin = between(10, 30);
      const entry = { exerciseId: ex.id, name: ex.name, category: 'cardio', durationMin };
      if (ex.name !== 'Jump Rope') entry.distanceKm = Math.round(durationMin * (0.12 + random() * 0.08) * 10) / 10;
      exerciseList.push(entry);
    }
    if (v.member.style === 'yoga' || chance(0.2)) {
      const ex = pick(flexibility);
      exerciseList.push({ exerciseId: ex.id, name: ex.name, category: 'flexibility', durationMin: between(15, 40) });
    }

    sessionDocs.push({
      memberId: v.member.id,
      date: v.inTime,
      durationMin: v.minutes,
      ...(chance(0.25) ? { notes: pick(['Felt strong today', 'Low energy, kept it light', 'New personal best!', 'Focused on form', 'Short session before work']) } : {}),
      exercises: exerciseList,
      createdAt: new Date(v.inTime.getTime() + v.minutes * 60000),
    });
  }
  if (sessionDocs.length) await mongo.collection('workout_sessions').insertMany(sessionDocs);

  // ----- MongoDB: a workout plan for every member with a trainer -----
  const planTemplates = {
    'Strength & Conditioning': ['Bench Press', 'Back Squat', 'Deadlift', 'Overhead Press', 'Barbell Row', 'Pull-up'],
    'Weight Loss': ['Leg Press', 'Lat Pulldown', 'Dumbbell Lunges', 'Bicep Curl', 'Tricep Pushdown', 'Incline Dumbbell Press'],
    Bodybuilding: ['Incline Dumbbell Press', 'Bench Press', 'Bicep Curl', 'Tricep Pushdown', 'Lat Pulldown', 'Leg Press'],
    'Yoga & Mobility': ['Dumbbell Lunges', 'Pull-up', 'Overhead Press', 'Back Squat', 'Lat Pulldown', 'Bicep Curl'],
  };
  const byName = Object.fromEntries(exercises.map((e) => [e.name, e]));
  const planDocs = assignments.map(({ memberId, trainer }) => {
    const names = planTemplates[trainer.specialization];
    return {
      memberId,
      trainerId: trainer.id,
      title: `${trainer.specialization} - 4 week block`,
      active: true,
      days: ['Mon', 'Wed', 'Fri'].map((day, d) => ({
        day,
        items: names.slice(d * 2, d * 2 + 2).concat(names[(d + 3) % names.length]).map((name) => ({
          exerciseId: byName[name].id, name, targetSets: 4, targetReps: pick([6, 8, 10, 12]),
        })),
      })),
      updatedAt: new Date(),
    };
  });
  if (planDocs.length) await mongo.collection('workout_plans').insertMany(planDocs);

  console.log(`Done: ${members.length} members, ${checkInRows.length} past check-ins, ` +
    `${expired[0].n} memberships expired, ${assignments.length} trainer assignments, ` +
    `${sessionDocs.length} workout sessions, ${planDocs.length} workout plans.`);
  console.log('Logins: admin@gymflow.com / Admin@123, trainer1@gymflow.com / Trainer@123, member1@gymflow.com / Member@123');
}

seed()
  .catch((err) => {
    console.error('Seeding failed:', err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeMongo();
    await closePool();
  });
