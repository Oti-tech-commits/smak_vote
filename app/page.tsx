import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function HomePage() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-16 lg:px-8">
      <div className="rounded-3xl border border-slate-200 bg-white/90 p-10 shadow-xl shadow-slate-200/40 backdrop-blur">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-brand-700">St. Mark’s Secondary School</p>
          <h1 className="mt-6 text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">Secure Prefect Voting Management</h1>
          <p className="mt-6 text-lg leading-8 text-slate-700">
            A production-ready electronic voting platform for prefect elections with role-based access, audit logs, and transparent results.
          </p>
          <div className="mt-10 flex flex-col gap-4 sm:flex-row">
            <Link href="/login" className="inline-flex items-center justify-center rounded-md bg-brand-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-700">
              Login to Vote
            </Link>
            <Link href="/register" className="inline-flex items-center justify-center rounded-md border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-50">
              Register as Student
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
