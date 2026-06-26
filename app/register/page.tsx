'use client';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { registerSchema } from '@/lib/validators';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { AuthGuard } from '@/components/auth-guard';
import { authHeaders, getSessionProfile } from '@/lib/clientAuth';
import type { UserRole } from '@/lib/types';

type RegisterFormValues = z.infer<typeof registerSchema>;

function RegisterForm() {
  const [message, setMessage] = useState<string | null>(null);
  const [callerRole, setCallerRole] = useState<UserRole | null>(null);
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { role: 'student' }
  });

  useEffect(() => {
    let active = true;
    getSessionProfile().then((profile) => {
      if (active) {
        setCallerRole(profile?.role ?? null);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  async function onSubmit(values: RegisterFormValues) {
    setMessage(null);

    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
      body: JSON.stringify(values)
    });

    const result = await response.json();
    if (!response.ok) {
      setMessage(result.error || 'Unable to complete registration.');
      return;
    }

    setMessage(result.message || 'Account created successfully.');
    reset({ role: 'student' });
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
            <h1 className="text-3xl font-semibold text-slate-900">{callerRole === 'admin' ? 'Register a User' : 'Register a Student'}</h1>
            <p className="mt-2 text-sm text-slate-600">
              {callerRole === 'admin'
                ? 'Admins can register student or election officer accounts here.'
                : 'Officers can register student accounts here.'}
            </p>
          </div>
          <form className="grid gap-5" onSubmit={handleSubmit(onSubmit)}>
            <div>
              <Label htmlFor="full_name">Full Name</Label>
              <Input id="full_name" {...register('full_name')} />
              {errors.full_name && <p className="mt-2 text-sm text-red-600">{errors.full_name.message}</p>}
            </div>
            <div>
              <Label htmlFor="student_number">Student Number</Label>
              <Input id="student_number" {...register('student_number')} />
              {errors.student_number && <p className="mt-2 text-sm text-red-600">{errors.student_number.message}</p>}
            </div>
            <div>
              <Label htmlFor="class_name">Class Name</Label>
              <Input id="class_name" {...register('class_name')} />
              {errors.class_name && <p className="mt-2 text-sm text-red-600">{errors.class_name.message}</p>}
            </div>
            <div>
              <Label htmlFor="email">School Email</Label>
              <Input id="email" type="email" {...register('email')} />
              {errors.email && <p className="mt-2 text-sm text-red-600">{errors.email.message}</p>}
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" {...register('password')} />
              {errors.password && <p className="mt-2 text-sm text-red-600">{errors.password.message}</p>}
            </div>
            {callerRole === 'admin' && (
              <div>
                <Label htmlFor="role">Account Role</Label>
                <select
                  id="role"
                  className="w-full rounded-md border border-slate-200 bg-white px-4 py-2"
                  {...register('role')}
                >
                  <option value="student">Student</option>
                  <option value="officer">Election Officer</option>
                </select>
                {errors.role && <p className="mt-2 text-sm text-red-600">{errors.role.message}</p>}
              </div>
            )}
            <Button type="submit" disabled={isSubmitting} className="w-full">
              {callerRole === 'admin' ? 'Create Account' : 'Register Student'}
            </Button>
            {message && <p className="text-sm text-slate-700">{message}</p>}
          </form>
        </div>
      </Card>
    </section>
  );
}

export default function RegisterPage() {
  return (
    <AuthGuard allow={['admin', 'officer']}>
      <RegisterForm />
    </AuthGuard>
  );
}
