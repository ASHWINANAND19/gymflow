import { redirect } from 'next/navigation';

// proxy.js normally sends visitors to /login or their dashboard first
export default function Home() {
  redirect('/login');
}
