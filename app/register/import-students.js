// scripts/import-students.js

/*
 * Usage:
 * node scripts/import-students.js <path-to-excel-file> [election-id]
 *
 * Example (just import students):
 * node scripts/import-students.js ./students.xlsx
 *
 * Example (import students and generate voting tokens):
 * node scripts/import-students.js ./students.xlsx "f47ac10b-58cc-4372-a567-0e02b2c3d479"
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');
const ExcelJS = require('exceljs');

// Load environment variables from .env.local
try {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf8');
    envConfig.split('\n').forEach((line) => {
      const [key, value] = line.split('=');
      if (key && value) {
        process.env[key.trim()] = value.trim();
      }
    });
  }
} catch (err) {
  console.warn('Could not load .env.local file', err);
}

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in your environment or .env.local file.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function main() {
  const [,, filePath, electionId] = process.argv;

  if (!filePath) {
    console.error('Usage: node scripts/import-students.js <path-to-excel-file> [election-id]');
    process.exit(1);
  }

  if (electionId) {
    console.log(`Importing students from ${filePath} for election ID: ${electionId}`);
  } else {
    console.log(`Importing students from ${filePath}. No election ID provided, so not generating tokens.`);
  }

  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.readFile(filePath);
  } catch (error) {
    console.error(`Error reading Excel file at ${filePath}:`, error.message);
    process.exit(1);
  }

  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    console.error('No worksheets found in the Excel file.');
    process.exit(1);
  }

  const students = [];
  // Assuming headers are: full_name, student_number, email, class_name, password
  worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return; // Skip header row
    const [full_name, student_number, email, class_name, password] = row.values.slice(1);
    if (full_name && student_number && email && class_name && password) {
      students.push({ full_name, student_number, email, class_name, password });
    }
  });

  console.log(`Found ${students.length} students to import.`);

  const createdStudents = [];
  const votingTokens = [];

  for (const student of students) {
    console.log(`Creating user for ${student.email}...`);

    // 1. Create user in Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: student.email,
      password: student.password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name: student.full_name,
        student_number: student.student_number,
        class_name: student.class_name,
        role: 'student'
      }
    });

    if (authError) {
      console.error(`  -> Error creating auth user for ${student.email}: ${authError.message}`);
      continue;
    }

    const userId = authData.user.id;

    // 2. Create user profile
    const { error: profileError } = await supabase.from('profiles').upsert({
      id: userId,
      full_name: student.full_name,
      student_number: student.student_number,
      email: student.email,
      class_name: student.class_name,
      role: 'student'
    });

    if (profileError) {
      console.error(`  -> Error creating profile for ${student.email}: ${profileError.message}`);
      // Rollback auth user creation
      await supabase.auth.admin.deleteUser(userId);
      continue;
    }

    console.log(`  -> Successfully created user and profile for ${student.email} (ID: ${userId})`);
    createdStudents.push({ ...student, id: userId });

    // 3. Generate voting token if electionId is provided
    if (electionId) {
      const token = crypto.randomBytes(16).toString('hex');
      const { error: tokenError } = await supabase.from('voting_tokens').insert({
        token,
        election_id: electionId,
        student_id: userId,
      });

      if (tokenError) {
        console.error(`  -> Error creating voting token for ${student.email}: ${tokenError.message}`);
      } else {
        console.log(`  -> Generated voting token for ${student.email}.`);
        votingTokens.push({
          full_name: student.full_name,
          student_number: student.student_number,
          email: student.email,
          token
        });
      }
    }
  }

  console.log(`\nSuccessfully created ${createdStudents.length} of ${students.length} students.`);

  if (votingTokens.length > 0) {
    const csvFileName = `voting-tokens-${electionId}-${Date.now()}.csv`;
    const csvPath = path.resolve(process.cwd(), csvFileName);
    const csvHeader = 'full_name,student_number,email,token\n';
    const csvBody = votingTokens.map(t => `${t.full_name},${t.student_number},${t.email},${t.token}`).join('\n');
    fs.writeFileSync(csvPath, csvHeader + csvBody);
    console.log(`\nExported ${votingTokens.length} voting tokens to ${csvFileName}`);
  }

  console.log('\nImport process finished.');
}

main().catch(console.error);