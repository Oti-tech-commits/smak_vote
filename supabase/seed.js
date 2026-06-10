const { createClient } = require('@supabase/supabase-js');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const adminEmail = process.env.SEED_ADMIN_EMAIL;
const adminPassword = process.env.SEED_ADMIN_PASSWORD;
const adminStudentNumber = process.env.SEED_ADMIN_STUDENT_NUMBER || 'ADMIN001';

if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

if (!adminEmail || !adminPassword) {
  console.error('Provide SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD to create the initial admin.');
  process.exit(1);
}

const supabase = createClient(url, key);

async function main() {
  const userResponse = await supabase.auth.admin.createUser({
    email: adminEmail,
    password: adminPassword,
    email_confirm: true,
    user_metadata: { role: 'admin', full_name: 'Election Administrator', student_number: adminStudentNumber, class_name: 'Staff' }
  });

  if (userResponse.error && userResponse.error.message.includes('already exists')) {
    console.log('Admin user already exists.');
  } else if (userResponse.error) {
    throw userResponse.error;
  }

  let userId = userResponse.user?.id;
  if (!userId) {
    const { data } = await supabase.auth.admin.listUsers();
    const admin = data.find((user) => user.email === adminEmail);
    if (!admin) throw new Error('Failed to find created admin user');
    userId = admin.id;
  }

  const { error } = await supabase.from('profiles').upsert({
    id: userId,
    student_number: adminStudentNumber,
    email: adminEmail,
    full_name: 'Election Administrator',
    class_name: 'Staff',
    role: 'admin'
  });

  if (error) throw error;
  console.log('Seed complete. Admin user registered.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
