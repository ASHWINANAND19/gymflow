import Shell from '@/components/Shell.js';

const LINKS = [
  { href: '/member', label: 'Dashboard' },
  { href: '/member/plans', label: 'Plans & payments' },
  { href: '/member/workouts', label: 'Log workout' },
  { href: '/member/progress', label: 'Progress' },
  { href: '/member/workout-plan', label: 'My workout plan' },
];

export default function MemberLayout({ children }) {
  return <Shell role="member" links={LINKS}>{children}</Shell>;
}
