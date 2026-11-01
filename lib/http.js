// Helpers shared by every API route: a typed error and a wrapper that turns
// any thrown error (ours, PostgreSQL's or MongoDB's) into a JSON response.

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// Friendly messages for named constraints, so users never see raw SQL errors
const CONSTRAINT_MESSAGES = {
  users_email_key: 'An account with this email already exists',
  users_email_check: 'Email address is not valid',
  users_phone_check: 'Phone number must be exactly 10 digits',
  users_full_name_check: 'Name must be at least 2 characters',
  chk_member_min_age: 'Members must be at least 14 years old',
  members_height_cm_check: 'Height must be between 100 and 250 cm',
  members_gender_check: 'Gender must be male, female or other',
  plans_name_key: 'A plan with this name already exists',
  plans_price_check: 'Price must be greater than 0',
  plans_duration_days_check: 'Duration must be at least 1 day',
  trainers_max_clients_check: 'Max clients must be between 1 and 30',
  payments_method_check: 'Payment method must be cash, card or upi',
  exercises_name_key: 'An exercise with this name already exists',
  exercises_category_check: 'Category must be strength, cardio or flexibility',
  uq_one_active_trainer_per_member: 'This member already has a trainer',
};

function json(status, message) {
  return Response.json({ error: message }, { status });
}

export function errorResponse(err) {
  if (err instanceof HttpError) return json(err.status, err.message);

  const friendly = CONSTRAINT_MESSAGES[err.constraint];
  switch (err.code) {
    case 'P0001': // RAISE EXCEPTION inside our triggers and procedures
      return json(400, err.message);
    case '23505': // unique_violation
      return json(409, friendly || 'That record already exists');
    case '23514': // check_violation
      return json(400, friendly || `Invalid value (${err.constraint})`);
    case '23502': // not_null_violation
      return json(400, `${err.column} is required`);
    case '23503': // foreign_key_violation
      return json(409, 'Record is in use or does not exist');
    case '22P02': // invalid_text_representation
    case '22007': // invalid_datetime_format
    case '22008': // datetime_field_overflow
      return json(400, 'Invalid input format');
    case 121: // MongoDB document failed $jsonSchema validation
      return json(400, 'Workout failed database validation');
    default:
      console.error(err);
      return json(500, 'Something went wrong');
  }
}

// Wraps a route handler so errors become JSON responses instead of crashes
export function route(handler) {
  return async (request, context) => {
    try {
      return await handler(request, context);
    } catch (err) {
      return errorResponse(err);
    }
  };
}

export async function readJson(request) {
  try {
    return await request.json();
  } catch {
    throw new HttpError(400, 'Request body must be valid JSON');
  }
}

export function toId(value, label = 'id') {
  const id = Number(value);
  if (!Number.isInteger(id) || id < 1) throw new HttpError(400, `Invalid ${label}`);
  return id;
}
