import Image from 'next/image';

export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-16 border-t border-slate-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 px-6 py-8 text-center sm:flex-row sm:justify-between sm:text-left lg:px-8">
        <div className="flex items-center gap-3">
          <Image src="/logo.png" alt="St. Mark’s S.S. Naminya crest" width={48} height={48} className="h-12 w-12 object-contain" />
          <div>
            <p className="text-sm font-semibold text-slate-900">St. Mark’s S.S. Naminya</p>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-accent-600">Desire to Excel</p>
          </div>
        </div>
        <p className="text-xs text-slate-500">© {year} St. Mark’s S.S. Naminya. Secure prefect voting platform.</p>
      </div>
    </footer>
  );
}
