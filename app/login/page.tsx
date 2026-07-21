import { Suspense } from 'react';
import { LoginForm } from './form';

export default function LoginPage() {
  return (
    // Wrap the form in a Suspense boundary to handle client-side rendering with useSearchParams
    <Suspense
      fallback={
        <div className="mx-auto max-w-3xl px-6 py-16 lg:px-8">Loading...</div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
