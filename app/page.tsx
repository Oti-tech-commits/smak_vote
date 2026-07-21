import Link from 'next/link';
import Image from 'next/image';

export default function HomePage() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-16 lg:px-8">
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white/90 shadow-xl shadow-brand-900/10 backdrop-blur">
        <div className="grid items-center gap-10 p-8 sm:p-12 lg:grid-cols-[1.4fr_1fr]">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-accent-600">St. Mark’s S.S. Naminya</p>
            <h1 className="mt-6 text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">Secure Prefect Voting Management</h1>
            <p className="mt-6 text-lg leading-8 text-slate-700">
              A production-ready electronic voting platform for prefect elections with role-based access, audit logs, and transparent results.
            </p>
            <div className="mt-10 flex flex-col gap-4 sm:flex-row">
              <Link href="/login" className="inline-flex items-center justify-center rounded-md bg-brand-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-700">
                Login to Vote
              </Link>
              <Link href="/results" className="inline-flex items-center justify-center rounded-md border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-50">
                View Results
              </Link>
            </div>
          </div>
          <div className="flex flex-col items-center gap-5 rounded-3xl bg-gradient-to-br from-brand-50 via-white to-accent-50 p-8">
            <Image src="/logo.png" alt="St. Mark’s S.S. Naminya crest" width={208} height={208} className="h-44 w-44 object-contain sm:h-52 sm:w-52" />
            <p className="text-base font-semibold uppercase tracking-[0.35em] text-brand-700">Desire to Excel</p>
          </div>
        </div>
      </div>
    </section>
  );
}
