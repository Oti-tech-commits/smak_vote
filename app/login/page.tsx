import Image from 'next/image';
import { Suspense } from 'react';
import { LoginForm } from './form';

export default function LoginPage() {
  return (
    <section className="mx-auto max-w-3xl px-6 py-16 lg:px-8">
      {/* Server-rendered static content for instant LCP */}
      <div className="mb-8 flex flex-col items-center text-center">
        <Image src="/logo.png" alt="St. Mark’s S.S. Naminya crest" width={80} height={80} className="h-20 w-20 object-contain" priority />
        <p className="mt-3 text-lg font-semibold text-slate-900">St. Mark’s S.S. Naminya</p>
        <p className="text-xs font-medium uppercase tracking-[0.3em] text-accent-600">Desire to Excel</p>
      </div>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">Student Login</h1>
          <p className="mt-2 text-sm text-slate-600">Use your student number, school email, or voting token.</p>
        </div>
      </div>
      {/* Wrap the form in a Suspense boundary to handle client-side rendering with useSearchParams */}
      <Suspense
        fallback={
          <div className="mx-auto max-w-3xl px-6 py-16 lg:px-8">Loading...</div>
        }
      >
        <LoginForm />
      </Suspense>
    </section>
  );
}
