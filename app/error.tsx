'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Application Error:', error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-6 py-24 sm:py-32 lg:px-8">
      <div className="text-center">
        <p className="text-base font-semibold text-brand-600">Something went wrong</p>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-5xl">
          We encountered an unexpected error
        </h1>
        <p className="mt-6 text-base leading-7 text-slate-600">
          The system encountered an error while processing your request. This has been logged and we are looking into it.
        </p>
        <div className="mt-10 flex items-center justify-center gap-x-6">
          <Button onClick={() => reset()}>
            Try again
          </Button>
          <a href="/" className="text-sm font-semibold text-slate-900">
            Go back home <span aria-hidden="true">&rarr;</span>
          </a>
        </div>
        {error.digest && (
          <p className="mt-4 text-xs text-slate-400">Error ID: {error.digest}</p>
        )}
      </div>
    </div>
  );
}
