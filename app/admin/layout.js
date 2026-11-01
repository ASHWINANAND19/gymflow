import Shell from '@/components/Shell.js';

const LINKS = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/members', label: 'Members' },
  { href: '/admin/trainers', label: 'Trainers' },
  { href: '/admin/plans', label: 'Plans' },
  { href: '/admin/payments', label: 'Payments' },
  { href: '/admin/exercises', label: 'Exercises' },
  { href: '/admin/audit', label: 'Audit log' },
];

export default function AdminLayout({ children }) {
  return <Shell role="admin" links={LINKS}>{children}</Shell>;
}
