/**
 * Bulk-import students as voter accounts from a CSV file.
 *
 * The CSV must have a header row with these columns (extra columns are ignored):
 *   class_name,admno,name,gender
 *
 * Each row becomes a Supabase Auth user (role: student) plus a `profiles` row.
 * Students log in with their admission number (admno) + the default password.
 * A synthetic email is generated per student because the rosters have no emails.
 *
 * Usage:
 *   NEXT_PUBLIC_SUPABASE_URL=... \
 *   SUPABASE_SERVICE_ROLE_KEY=... \
 *   STUDENT_DEFAULT_PASSWORD=<choose-a-strong-password> \
 *   node supabase/import-students.js path/to/students.csv
 *
 * Required env:
 *   STUDENT_DEFAULT_PASSWORD  the shared initial password for every student
 * Optional env:
 *   STUDENT_EMAIL_DOMAIN      default: students.stmarksnaminya.ug
 *
 * The script is idempotent: re-running skips students whose student_number
 * already has a profile, and reuses an existing auth user if the email exists.
 */
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const defaultPassword = process.env.STUDENT_DEFAULT_PASSWORD;
const emailDomain = process.env.STUDENT_EMAIL_DOMAIN || 'students.stmarksnaminya.ug';
const csvPath = process.argv[2];

if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL/SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}
if (!csvPath) {
  console.error('Usage: node supabase/import-students.js <path/to/students.csv>');
  process.exit(1);
}
if (!defaultPassword) {
  console.error('Set STUDENT_DEFAULT_PASSWORD (the shared initial password for every student).');
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  const header = lines.shift().split(',').map((h) => h.trim().toLowerCase());
  return lines.map((line) => {
    // Simple CSV: fields contain no embedded commas in these rosters.
    const cols = line.split(',');
    const row = {};
    header.forEach((h, i) => {
      row[h] = (cols[i] ?? '').trim();
    });
    return row;
  });
}

function emailForAdmno(admno) {
  const local = admno.toLowerCase().replace(/[^a-z0-9]/g, '');
  return `${local}@${emailDomain}`;
}

async function findUserIdByEmail(email) {
  // Paginate through users to find a matching email.
  for (let page = 1; page <= 50; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const match = data.users.find((u) => u.email === email);
    if (match) return match.id;
    if (data.users.length < 1000) break;
  }
  return null;
}

async function importStudent(row) {
  const studentNumber = row.admno;
  const fullName = row.name;
  const className = row.class_name;
  const email = emailForAdmno(studentNumber);

  if (!studentNumber || !fullName || !className) {
    return { status: 'skipped', reason: 'missing required field', studentNumber };
  }

  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('student_number', studentNumber)
    .maybeSingle();
  if (existingProfile) {
    return { status: 'exists', studentNumber };
  }

  let userId;
  const created = await supabase.auth.admin.createUser({
    email,
    password: defaultPassword,
    email_confirm: true,
    user_metadata: { full_name: fullName, student_number: studentNumber, class_name: className, role: 'student' }
  });

  if (created.error) {
    const alreadyExists = /already.*regist|already been registered|exists/i.test(created.error.message);
    if (!alreadyExists) {
      return { status: 'error', studentNumber, reason: created.error.message };
    }
    userId = await findUserIdByEmail(email);
    if (!userId) {
      return { status: 'error', studentNumber, reason: 'user exists but id not found' };
    }
  } else {
    userId = created.data.user.id;
  }

  const { error: profileError } = await supabase.from('profiles').upsert({
    id: userId,
    student_number: studentNumber,
    email,
    full_name: fullName,
    class_name: className,
    role: 'student'
  });
  if (profileError) {
    return { status: 'error', studentNumber, reason: profileError.message };
  }
  return { status: 'created', studentNumber };
}

async function main() {
  const rows = parseCsv(fs.readFileSync(csvPath, 'utf8'));
  console.log(`Importing ${rows.length} students from ${csvPath} ...`);
  const summary = { created: 0, exists: 0, skipped: 0, error: 0 };
  for (const row of rows) {
    const result = await importStudent(row);
    summary[result.status] += 1;
    if (result.status === 'error') {
      console.error(`  ERROR ${result.studentNumber}: ${result.reason}`);
    } else if (result.status === 'created' && summary.created % 50 === 0) {
      console.log(`  ...${summary.created} created so far`);
    }
  }
  console.log('Done.', summary);
  if (summary.error > 0) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
