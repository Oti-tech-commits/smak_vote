import type { Route } from 'next';
import Link from 'next/link';
import Image from 'next/image';

export function BrandLogo({ href = '/', className = '' }: { href?: Route; className?: string }) {
  return (
    <Link href={href} className={`flex items-center gap-3 ${className}`}>
      <Image src="/logo.png" alt="St. Mark’s S.S. Naminya crest" width={44} height={44} className="h-11 w-11 object-contain" />
      <span className="flex flex-col leading-tight">
        <span className="text-base font-semibold text-slate-900">St. Mark’s S.S. Naminya</span>
        <span className="text-xs font-medium uppercase tracking-[0.2em] text-accent-600">Desire to Excel</span>
      </span>
    </Link>
  );
}
