import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { requireProfile, unauthorizedResponse } from '@/lib/auth';
import ExcelJS from 'exceljs';

export async function POST(request: Request) {
  const profile = await requireProfile(request, ['admin', 'officer']);
  if (!profile) {
    return unauthorizedResponse();
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded.' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer as ArrayBuffer);




    let parsedRows: any[] = [];
    let skipped = 0;
    const fileName = file.name.toLowerCase();

    if (fileName.endsWith('.xlsx')) {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer as unknown as any);

      const worksheet = workbook.worksheets[0];
      if (!worksheet) {
        return NextResponse.json({ error: 'No worksheet found in Excel file.' }, { status: 400 });
      }

      let headers: string[] = [];
      worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
        const values = Array.isArray(row.values) ? row.values.slice(1) : Object.values(row.values);
        if (rowNumber === 1) {
          headers = values.map(v => String(v ?? '').trim().toLowerCase());
          return;
        }

        const getValue = (colName: string, index: number) => {
          const idx = headers.indexOf(colName);
          const finalIdx = idx !== -1 ? idx : index;
          const val = values[finalIdx];
          if (val && typeof val === 'object') {
            if ('result' in val) return String(val.result ?? '');
            if ('text' in val) return String(val.text ?? '');
            return String(val);
          }
          return val !== undefined && val !== null ? String(val) : '';
        };

        const full_name = getValue('full_name', 0);
        const student_number = getValue('student_number', 1);
        const email = getValue('email', 2);
        const class_name = getValue('class_name', 3);
        const password = getValue('password', 4);

        if (full_name || student_number || email || class_name || password) {
          if (full_name && student_number && email && class_name && password) {
            parsedRows.push({ full_name, student_number, email, class_name, password });
          } else {
            skipped += 1;
          }
        }
      });
    } else if (fileName.endsWith('.csv')) {
      const text = buffer.toString('utf-8');
      const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
      if (lines.length > 0) {
        const headers = lines.shift()!.split(',').map(h => h.trim().replace(/^["']|["']$/g, '').toLowerCase());
        const fullNameIdx = headers.indexOf('full_name');
        const studentNumberIdx = headers.indexOf('student_number');
        const emailIdx = headers.indexOf('email');
        const classNameIdx = headers.indexOf('class_name');
        const passwordIdx = headers.indexOf('password');

        for (const line of lines) {
          const cols = line.split(',').map(c => c.trim().replace(/^["']|["']$/g, ''));
          const getValue = (idx: number, fallbackIdx: number) => {
            const finalIdx = idx !== -1 ? idx : fallbackIdx;
            return cols[finalIdx] ?? '';
          };

          const full_name = getValue(fullNameIdx, 0);
          const student_number = getValue(studentNumberIdx, 1);
          const email = getValue(emailIdx, 2);
          const class_name = getValue(classNameIdx, 3);
          const password = getValue(passwordIdx, 4);

          if (full_name || student_number || email || class_name || password) {
            if (full_name && student_number && email && class_name && password) {
              parsedRows.push({ full_name, student_number, email, class_name, password });
            } else {
              skipped += 1;
            }
          }
        }
      }
    } else {
      return NextResponse.json({ error: 'Unsupported file format. Please upload a .csv or .xlsx file.' }, { status: 400 });
    }

    let created = 0;
    let exists = 0;
    const errors: string[] = [];

    for (const student of parsedRows) {
      try {
        // Idempotent: skip students that already have a profile
        const { data: existingProfile, error: profileErr } = await supabaseServer
          .from('profiles')
          .select('id')
          .eq('student_number', student.student_number)
          .maybeSingle();

        if (profileErr) {
          errors.push(`Error checking existence of ${student.student_number}: ${profileErr.message}`);
          continue;
        }

        if (existingProfile) {
          exists += 1;
          continue;
        }

        // Create auth user
        const { data: authData, error: authError } = await supabaseServer.auth.admin.createUser({
          email: student.email,
          password: student.password,
          email_confirm: true,
          user_metadata: {
            full_name: student.full_name,
            student_number: student.student_number,
            class_name: student.class_name,
            role: 'student'
          }
        });

        if (authError) {
          errors.push(`Error creating auth user for ${student.email}: ${authError.message}`);
          continue;
        }

        const userId = authData.user.id;

        // Create profile in database
        const { error: insertErr } = await supabaseServer.from('profiles').upsert({
          id: userId,
          full_name: student.full_name,
          student_number: student.student_number,
          email: student.email,
          class_name: student.class_name,
          role: 'student'
        });

        if (insertErr) {
          errors.push(`Error creating profile for ${student.email}: ${insertErr.message}`);
          // Rollback auth user creation
          await supabaseServer.auth.admin.deleteUser(userId);
          continue;
        }

        created += 1;
      } catch (studentErr: any) {
        errors.push(`Unexpected error for ${student.email || student.student_number}: ${studentErr.message || studentErr}`);
      }
    }

    // Write audit log entry
    await supabaseServer.from('audit_logs').insert({
      user_id: profile.id,
      action: 'student_bulk_import',
      details: { created, exists, skipped, errors_count: errors.length }
    });


    return NextResponse.json({ created, skipped, exists, errors });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Import failed.' }, { status: 500 });
  }
}
