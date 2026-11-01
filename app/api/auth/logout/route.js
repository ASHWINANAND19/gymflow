import { route } from '@/lib/http.js';
import { clearSessionCookie } from '@/lib/session.js';

export const POST = route(async () => {
  await clearSessionCookie();
  return Response.json({ ok: true });
});
