'use client';

import type { Route } from 'next';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter, useSearchParams } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { dashboardPathForRole, getSessionProfile, VOTING_TOKEN_KEY } from '@/lib/clientAuth';
import { loginSchema } from '@/lib/validators';
import { supabaseClient } from '@/lib/supabaseClient';

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState<string | null>(null);
  const [mode, setMode] = useState<'student' | 'email' | 'token'>('student');
  const [isLoading, setIsLoading] = useState(false);

  const redirectParam = useMemo(() => {
    const redirect = searchParams.get('redirect');
    if (redirect && redirect.startsWith('/')) {
      return redirect;
    }
    return null;
  }, [searchParams]);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { studentNumber: '', email: '', password: '', token: '' }
  });

  async function onSubmit(values: LoginFormValues) {
    setMessage(null);
    setIsLoading(true);

    if (mode === 'token' && !values.token) {
      setMessage('Voting token is required for token login.');
      return;
    }

    if (mode === 'email' && !values.email) {
      setMessage('Email is required for email login.');
      return;
    }

    if (mode !== 'token' && !values.password) {
      setMessage('Password is required for student or email login.');
      return;
    }

    try {
      if (mode === 'token' && values.token) {
        const response = await fetch('/api/auth/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: values.token })
        });
        const result = await response.json();
        if (response.ok) {
          window.localStorage.setItem(VOTING_TOKEN_KEY, values.token);
          setMessage('Voting token validated. Redirecting to ballot...');
          router.push((redirectParam ?? '/vote') as Route);
        } else {
          setMessage(result.error ?? 'Invalid voting token.');
        }
        return;
      }

      let email = values.email;
      if (mode === 'student' && values.studentNumber) {
        const sn = values.studentNumber.trim();
        if (sn.length < 3) {
          setMessage('Student number must be at least 3 characters.');
          return;
        }
        const response = await fetch('/api/auth/lookup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ student_number: sn })
        });
        const result = await response.json();
        if (!response.ok) {
          setMessage(result.error ?? 'Student number not found.');
          return;
        }
        email = result.email;
      }

      const { error } = await supabaseClient.auth.signInWithPassword({ email: email || '', password: values.password ?? '' });
      if (error) {
        setMessage(error.message);
        return;
      }

      const profile = await getSessionProfile();
      const destination = redirectParam ?? (profile ? dashboardPathForRole(profile.role) : '/');
      setMessage('Login successful. Redirecting to your dashboard...');
      router.push(destination as Route);
    } catch (error) {
      setMessage('Unable to complete login.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="mx-auto max-w-3xl px-6 py-16 lg:px-8">
      <div className="mb-8 flex flex-col items-center text-center">
        <Image src="/logo.png" alt="St. Mark’s S.S. Naminya crest" width={80} height={80} className="h-20 w-20 object-contain" />
        <p className="mt-3 text-lg font-semibold text-slate-900">St. Mark’s S.S. Naminya</p>
        <p className="text-xs font-medium uppercase tracking-[0.3em] text-accent-600">Desire to Excel</p>
      </div>
      <Card>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-semibold text-slate-900">Student Login</h1>
            <p className="mt-2 text-sm text-slate-600">Use your student number, school email, or voting token.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            {(['student', 'email', 'token'] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setMode(option)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${mode === option ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
              >
                {option === 'student' ? 'Student Number' : option === 'email' ? 'School Email' : 'Voting Token'}
              </button>
            ))}
          </div>
          <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
            {mode === 'student' && (
              <div>
                <Label htmlFor="studentNumber">Student Number</Label>
                <Input id="studentNumber" autoComplete="username" {...register('studentNumber')} placeholder="e.g. S12345" />
                {errors.studentNumber && <p className="mt-2 text-sm text-red-600">{errors.studentNumber.message}</p>}
              </div>
            )}
            {mode === 'email' && (
              <div>
                <Label htmlFor="email">School Email</Label>
                <Input id="email" type="email" autoComplete="username" {...register('email')} placeholder="student@stmark.com" />
                {errors.email && <p className="mt-2 text-sm text-red-600">{errors.email.message}</p>}
              </div>
            )}
            {mode === 'token' && (
              <div>
                <Label htmlFor="token">Voting Token</Label>
                <Input id="token" autoComplete="one-time-code" {...register('token')} placeholder="Single-use token" />
                {errors.token && <p className="mt-2 text-sm text-red-600">{errors.token.message}</p>}
              </div>
            )}
            {mode !== 'token' && (
              <div>
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" autoComplete="current-password" {...register('password')} placeholder="Enter your password" />
                {errors.password && <p className="mt-2 text-sm text-red-600">{errors.password.message}</p>}
              </div>
            )}
            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </>
              ) : mode === 'token' ? 'Validate Token' : 'Login'}
            </Button>
            {message && <p className="text-sm text-slate-700">{message}</p>}
          </form>
        </div>
      </Card>
    </section>
  );
}