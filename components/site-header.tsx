import Link from 'next/link';

const navItems: Array<{ href: '/' | '/vote' | '/results' | '/admin' | '/officer'; label: string }> = [
  { href: '/', label: 'Home' },
  { href: '/vote', label: 'Vote' },
  { href: '/results', label: 'Results' },
  { href: '/admin', label: 'Admin' },
  { href: '/officer', label: 'Officer' }
];

export function SiteHeader() {
  return (
    <header className="border-b border-slate-200 bg-white/90 backdrop-blur-lg">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
        <Link href="/" className="text-lg font-semibold text-slate-900">
          St. Mark’s Prefect Vote
        </Link>
        <nav className="hidden items-center gap-4 md:flex">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="rounded-full px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-100 hover:text-slate-900">
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
