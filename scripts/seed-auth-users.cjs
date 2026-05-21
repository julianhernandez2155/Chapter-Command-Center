// scripts/seed-auth-users.cjs
// Run this local administrative script to provision Auth users and associate them in the database.
// Execute via: node scripts/seed-auth-users.cjs

const fs = require('fs');
const path = require('path');

// Manually parse .env.local to ensure values are resolved correctly
const envPath = path.resolve(__dirname, '../.env.local');
if (!fs.existsSync(envPath)) {
  console.error('Error: .env.local file not found. Please create it with VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] || '';
    // Remove quotes
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.substring(1, value.length - 1);
    } else if (value.startsWith("'") && value.endsWith("'")) {
      value = value.substring(1, value.length - 1);
    }
    env[match[1]] = value.trim();
  }
});

const supabaseUrl = env.VITE_SUPABASE_URL;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Error: VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing from .env.local.');
  process.exit(1);
}

const { createClient } = require('@supabase/supabase-js');

// Initialize admin client with service_role key
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const devPersonas = [
  { email: 'president@g.syr.edu', password: 'Password123!' },
  { email: 'secretary@g.syr.edu', password: 'Password123!' },
  { email: 'treasurer@g.syr.edu', password: 'Password123!' },
  { email: 'saa@g.syr.edu', password: 'Password123!' },
  { email: 'chairman@g.syr.edu', password: 'Password123!' },
  { email: 'member@g.syr.edu', password: 'Password123!' },
  { email: 'scholarship@g.syr.edu', password: 'Password123!' }
];

async function seed() {
  console.log('Fetching existing Supabase Auth users...');
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers({
    perPage: 1000
  });

  if (listError) {
    console.error('Error listing auth users:', listError.message);
    process.exit(1);
  }

  for (const persona of devPersonas) {
    console.log(`Processing persona: ${persona.email}`);
    const existingUser = users.find(u => u.email === persona.email);
    let userId;

    if (existingUser) {
      console.log(`- Persona already exists in Auth (ID: ${existingUser.id}). Updating password...`);
      const { data, error } = await supabase.auth.admin.updateUserById(existingUser.id, {
        password: persona.password
      });
      if (error) {
        console.error(`  Failed to update user: ${error.message}`);
        continue;
      }
      userId = existingUser.id;
    } else {
      console.log(`- Creating new auth user...`);
      const { data, error } = await supabase.auth.admin.createUser({
        email: persona.email,
        password: persona.password,
        email_confirm: true
      });
      if (error) {
        console.error(`  Failed to create user: ${error.message}`);
        continue;
      }
      userId = data.user.id;
      console.log(`  Created successfully (ID: ${userId})`);
    }

    console.log(`- Linking auth_user_id in public.members table...`);
    const { data: updateData, error: dbError } = await supabase
      .from('members')
      .update({ auth_user_id: userId })
      .eq('google_email', persona.email)
      .select();

    if (dbError) {
      console.error(`  Database update error: ${dbError.message}`);
    } else if (updateData.length === 0) {
      console.warn(`  Warning: No member record found with google_email = '${persona.email}' in public.members.`);
    } else {
      console.log(`  Linked member '${updateData[0].legal_first_name} ${updateData[0].legal_last_name}' successfully.`);
    }
  }

  console.log('\nSeeding completed successfully!');
}

seed().catch(err => {
  console.error('Unexpected seed error:', err);
  process.exit(1);
});
