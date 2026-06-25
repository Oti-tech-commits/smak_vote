'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema } from '@/lib/validators';
import { supabaseClient } from '@/lib/supabaseClient';
import { dashboardPathForRole, getSessionProfile, VOTING_TOKEN_KEY } from '@/lib/clientAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';

type LoginForm = z.infer<typeof loginSchema>;

function getRedirectParam(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  const redirect = new URLSearchParams(window.location.search).get('redirect');
  if (redirect && redirect.startsWith('/')) {
    return redirect;
  }
  return null;
}

export default function LoginPage() {
  const [message, setMessage] = useState<string | null>(null);
  const [mode, setMode] = useState<'student' | 'email' | 'token'>('student');

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { studentNumber: '', email: '', password: '', token: '' }
  });

  async function onSubmit(values: LoginForm) {
    setMessage(null);

    if (mode === 'token' && !values.token) {
      setMessage('Voting token is required for token login.');
      return;
    }

    if (mode === 'student') {
      const sn = values.studentNumber?.trim() ?? '';
      if (!sn || sn.length < 3) {
        setMessage('Student number must be at least 3 characters.');
        return;
      }
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
          window.location.href = getRedirectParam() ?? '/vote';
        } else {
          setMessage(result.error ?? 'Invalid voting token.');
        }
        return;
      }

      let email = values.email;
      if (mode === 'student' && values.studentNumber) {
        const response = await fetch('/api/auth/lookup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ student_number: values.studentNumber })
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
      const destination = getRedirectParam() ?? (profile ? dashboardPathForRole(profile.role) : '/vote');
      setMessage('Login successful. Redirecting to your dashboard...');
      window.location.href = destination;
    } catch (error) {
      setMessage('Unable to complete login.');
    }
  }

  return (
    <section className="mx-auto max-w-3xl px-6 py-16 lg:px-8">
      <div className="mb-8 flex flex-col items-center text-center">
        <img src="/logo.png" alt="St. Mark’s S.S. Naminya crest" className="h-20 w-20 object-contain" />
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
            {['student', 'email', 'token'].map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setMode(option as 'student' | 'email' | 'token')}
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
                <Input id="studentNumber" {...register('studentNumber')} placeholder="e.g. S12345" />
                {errors.studentNumber && <p className="mt-2 text-sm text-red-600">{errors.studentNumber.message}</p>}
              </div>
            )}
            {mode === 'email' && (
              <div>
                <Label htmlFor="email">School Email</Label>
                <Input id="email" type="email" {...register('email')} placeholder="student@stmark.com" />
                {errors.email && <p className="mt-2 text-sm text-red-600">{errors.email.message}</p>}
              </div>
            )}
            {mode === 'token' && (
              <div>
                <Label htmlFor="token">Voting Token</Label>
                <Input id="token" {...register('token')} placeholder="Single-use token" />
                {errors.token && <p className="mt-2 text-sm text-red-600">{errors.token.message}</p>}
              </div>
            )}
            {mode !== 'token' && (
              <div>
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" {...register('password')} placeholder="Enter your password" />
                {errors.password && <p className="mt-2 text-sm text-red-600">{errors.password.message}</p>}
              </div>
            )}
            <Button type="submit" disabled={isSubmitting} className="w-full">
              {mode === 'token' ? 'Validate Token' : 'Login'}
            </Button>
            {message && <p className="text-sm text-slate-700">{message}</p>}
          </form>
        </div>
      </Card>
    </section>
  );
}
