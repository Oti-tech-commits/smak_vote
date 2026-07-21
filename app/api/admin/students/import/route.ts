import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { requireProfile, unauthorizedResponse } from '@/lib/auth';
import ExcelJS from 'exceljs';

export const dynamic = 'force-dynamic';

// Helper function to validate email structure
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Robust CSV parser supporting quotes, nested commas, and line endings
function parseCSV(text: string): string[][] {
  const lines: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const next = text[i + 1];

    if (c === '"') {
      if (inQuotes && next === '"') {
        cell += '"';
        i++; // skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      row.push(cell.trim());
      cell = '';
    } else if ((c === '\r' || c === '\n') && !inQuotes) {
      if (c === '\r' && next === '\n') i++;
      row.push(cell.trim());
      if (row.some(x => x.length > 0)) {
        lines.push(row);
      }
      row = [];
      cell = '';
    } else {
      cell += c;
    }
  }

  if (cell || row.length > 0) {
    row.push(cell.trim());
    if (row.some(x => x.length > 0)) {
      lines.push(row);
    }
  }

  return lines;
}

export async function POST(request: Request) {
  const profile = await requireProfile(request, ['admin', 'officer']);
  if (!profile) {
    return unauthorizedResponse();
  }

  try {
    const url = new URL(request.url);
    const isPreview = url.searchParams.get('preview') === 'true';

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded.' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer as ArrayBuffer);

    let parsedRows: any[] = [];
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
          parsedRows.push({
            full_name: full_name.trim(),
            student_number: student_number.trim(),
            email: email.trim(),
            class_name: class_name.trim(),
            password: password.trim()
          });
        }
      });

      // Header validation
      const required = ['full_name', 'student_number', 'email', 'class_name', 'password'];
      const missing = required.filter(h => !headers.includes(h));
      if (missing.length > 0) {
        return NextResponse.json({
          error: `Header validation failed. Missing required columns: ${missing.join(', ')}. Found headers: ${headers.join(', ')}`
        }, { status: 400 });
      }

    } else if (fileName.endsWith('.csv')) {
      const text = buffer.toString('utf-8');
      const allLines = parseCSV(text);
      if (allLines.length === 0) {
        return NextResponse.json({ error: 'The uploaded CSV file is empty.' }, { status: 400 });
      }

      const headers = allLines.shift()!.map(h => h.toLowerCase());
      const required = ['full_name', 'student_number', 'email', 'class_name', 'password'];
      const missing = required.filter(h => !headers.includes(h));
      if (missing.length > 0) {
        return NextResponse.json({
          error: `Header validation failed. Missing required columns: ${missing.join(', ')}. Found headers: ${headers.join(', ')}`
        }, { status: 400 });
      }

      const fullNameIdx = headers.indexOf('full_name');
      const studentNumberIdx = headers.indexOf('student_number');
      const emailIdx = headers.indexOf('email');
      const classNameIdx = headers.indexOf('class_name');
      const passwordIdx = headers.indexOf('password');

      for (const cols of allLines) {
        const getValue = (idx: number, fallbackIdx: number) => {
          return cols[idx] ?? '';
        };

        const full_name = getValue(fullNameIdx, 0);
        const student_number = getValue(studentNumberIdx, 1);
        const email = getValue(emailIdx, 2);
        const class_name = getValue(classNameIdx, 3);
        const password = getValue(passwordIdx, 4);

        if (full_name || student_number || email || class_name || password) {
          parsedRows.push({
            full_name: full_name.trim(),
            student_number: student_number.trim(),
            email: email.trim(),
            class_name: class_name.trim(),
            password: password.trim()
          });
        }
      }
    } else {
      return NextResponse.json({ error: 'Unsupported file format. Please upload a .csv or .xlsx file.' }, { status: 400 });
    }

    // Fetch existing database profiles to check for conflicts
    const { data: dbProfiles, error: dbError } = await supabaseServer
      .from('profiles')
      .select('email, student_number');

    if (dbError) {
      return NextResponse.json({ error: `Failed to query database for duplicates: ${dbError.message}` }, { status: 500 });
    }

    const dbEmails = new Set((dbProfiles || []).map(p => p.email.toLowerCase()));
    const dbStudentNumbers = new Set((dbProfiles || []).map(p => p.student_number.toLowerCase()));

    // Track duplicates inside the uploaded file
    const fileEmails = new Set<string>();
    const fileStudentNumbers = new Set<string>();
    const duplicateEmailsInFile = new Set<string>();
    const duplicateStudentNumbersInFile = new Set<string>();

    for (const row of parsedRows) {
      const emailLower = row.email.toLowerCase();
      const snLower = row.student_number.toLowerCase();
      if (emailLower) {
        if (fileEmails.has(emailLower)) {
          duplicateEmailsInFile.add(emailLower);
        }
        fileEmails.add(emailLower);
      }
      if (snLower) {
        if (fileStudentNumbers.has(snLower)) {
          duplicateStudentNumbersInFile.add(snLower);
        }
        fileStudentNumbers.add(snLower);
      }
    }

    // Process rows & run validation
    const processedRows = parsedRows.map((student, index) => {
      const emailLower = student.email.toLowerCase();
      const snLower = student.student_number.toLowerCase();

      // Check missing fields
      const missingFields = [];
      if (!student.full_name) missingFields.push('full_name');
      if (!student.student_number) missingFields.push('student_number');
      if (!student.email) missingFields.push('email');
      if (!student.class_name) missingFields.push('class_name');
      if (!student.password) missingFields.push('password');

      if (missingFields.length > 0) {
        return {
          ...student,
          status: 'invalid',
          message: `Missing required field(s): ${missingFields.join(', ')}`
        };
      }

      // Format validations
      if (!isValidEmail(student.email)) {
        return {
          ...student,
          status: 'invalid',
          message: 'Invalid email format'
        };
      }

      if (student.student_number.length < 3) {
        return {
          ...student,
          status: 'invalid',
          message: 'Student number must be at least 3 characters'
        };
      }

      if (student.password.length < 6) {
        return {
          ...student,
          status: 'invalid',
          message: 'Password must be at least 6 characters'
        };
      }

      // Check file duplicates
      if (duplicateEmailsInFile.has(emailLower)) {
        return {
          ...student,
          status: 'duplicate_in_file',
          message: `Duplicate email '${student.email}' in this file`
        };
      }

      if (duplicateStudentNumbersInFile.has(snLower)) {
        return {
          ...student,
          status: 'duplicate_in_file',
          message: `Duplicate student number '${student.student_number}' in this file`
        };
      }

      // Check database duplicates
      if (dbEmails.has(emailLower)) {
        return {
          ...student,
          status: 'duplicate_in_db',
          message: `Email '${student.email}' already exists in database`
        };
      }

      if (dbStudentNumbers.has(snLower)) {
        return {
          ...student,
          status: 'duplicate_in_db',
          message: `Student number '${student.student_number}' already exists in database`
        };
      }

      return {
        ...student,
        status: 'valid',
        message: 'Valid'
      };
    });

    const summary = {
      total: processedRows.length,
      valid: processedRows.filter(r => r.status === 'valid').length,
      invalid: processedRows.filter(r => r.status === 'invalid').length,
      duplicate_file: processedRows.filter(r => r.status === 'duplicate_in_file').length,
      duplicate_db: processedRows.filter(r => r.status === 'duplicate_in_db').length
    };

    if (isPreview) {
      return NextResponse.json({
        preview: processedRows,
        summary
      });
    }

    // Write mode: Import valid rows
    let created = 0;
    let exists = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const student of processedRows) {
      if (student.status === 'duplicate_in_db') {
        exists++;
        continue;
      }

      if (student.status !== 'valid') {
        skipped++;
        continue;
      }

      try {
        // Double check database existence just in case of race conditions
        const { data: checkProfile } = await supabaseServer
          .from('profiles')
          .select('id')
          .eq('student_number', student.student_number)
          .maybeSingle();

        if (checkProfile) {
          exists++;
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
          errors.push(`Row ${student.student_number} (${student.email}): Auth creation error: ${authError.message}`);
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
          errors.push(`Row ${student.student_number} (${student.email}): Profile db insert error: ${insertErr.message}`);
          // Rollback auth user creation
          await supabaseServer.auth.admin.deleteUser(userId);
          continue;
        }

        created++;
      } catch (studentErr: any) {
        errors.push(`Row ${student.student_number} (${student.email}): Unexpected error: ${studentErr.message || studentErr}`);
      }
    }

    // Write audit log entry
    await supabaseServer.from('audit_logs').insert({
      user_id: profile.id,
      action: 'student_bulk_import',
      details: { created, exists, skipped, errors_count: errors.length, filename: file.name }
    });

    return NextResponse.json({ created, skipped, exists, errors });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Import failed.' }, { status: 500 });
  }
}
