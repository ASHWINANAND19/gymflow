import Shell from '@/components/Shell.js';

const LINKS = [{ href: '/trainer', label: 'My clients' }];

export default function TrainerLayout({ children }) {
  return <Shell role="trainer" links={LINKS}>{children}</Shell>;
}
