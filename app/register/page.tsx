'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
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

const extendedSchema = registerSchema.extend({
  role: z.enum(['student', 'officer'])
});

type RegisterFormValues = z.infer<typeof extendedSchema>;

function RegisterForm() {
  const [message, setMessage] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<'admin' | 'officer' | null>(null);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<RegisterFormValues>({
    resolver: zodResolver(extendedSchema),
    defaultValues: {
      full_name: '',
      student_number: '',
      class_name: '',
      email: '',
      password: '',
      role: 'student'
    }
  });

  useEffect(() => {
    async function loadRole() {
      const profile = await getSessionProfile();
      if (profile && (profile.role === 'admin' || profile.role === 'officer')) {
        setUserRole(profile.role);
      }
    }
    loadRole();
  }, []);

  async function onSubmit(values: RegisterFormValues) {
    setMessage(null);

    const response = await fetch('/api/admin/students', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
      body: JSON.stringify(values)
    });

    const result = await response.json();
    if (!response.ok) {
      setMessage(result.error || 'Unable to complete registration.');
      return;
    }

    setMessage(`${values.role === 'officer' ? 'Officer' : 'Student'} account created successfully.`);
    reset();
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
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-950">Register Student / Officer</h1>
              <p className="mt-1 text-sm text-slate-500">Create new student or election officer accounts manually.</p>
            </div>
            {userRole && (
              <Link
                href={userRole === 'admin' ? '/admin' : '/officer'}
                className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 shadow-sm"
              >
                Back to Dashboard
              </Link>
            )}
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
              <Label htmlFor="role">Role</Label>
              <select
                id="role"
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-600"
                {...register('role')}
              >
                <option value="student">Student</option>
                <option value="officer">Election Officer</option>
              </select>
              {errors.role && <p className="mt-2 text-sm text-red-600">{errors.role.message}</p>}
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
            <Button type="submit" disabled={isSubmitting} className="w-full">
              Register Account
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
