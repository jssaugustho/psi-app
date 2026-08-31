import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL || 'postgres://postgres:foxbase_secure_pwd@localhost:5432/postgres?sslmode=disable';

async function main() {
  const sql = postgres(DATABASE_URL);
  try {
    const user = await sql`SELECT id FROM auth.users WHERE email = 'joseaugustholi@gmail.com'`;
    if (user.length === 0) {
      console.error('❌ User not found in auth.users');
      process.exit(1);
    }
    const newId = user[0].id;
    console.log(`👤 Found auth.users ID: ${newId}`);

    const profile = await sql`SELECT id FROM public.profiles WHERE email = 'joseaugustholi@gmail.com'`;
    if (profile.length === 0) {
      console.log('👤 Profile not found, creating new one...');
      await sql`INSERT INTO public.profiles (id, first_name, last_name, email, role) VALUES (${newId}, 'José Augustho', 'Oliveira', 'joseaugustholi@gmail.com', 'admin')`;
    } else {
      const oldId = profile[0].id;
      console.log(`👤 Found profiles ID: ${oldId}`);
      if (oldId !== newId) {
        await sql`UPDATE public.profiles SET id = ${newId} WHERE email = 'joseaugustholi@gmail.com'`;
        console.log(`✅ Updated profiles ID to match auth.users ID: ${newId}`);
      } else {
        console.log('✅ IDs already match!');
      }
    }
    process.exit(0);
  } catch (err: any) {
    console.error('❌ Error updating profile:', err.message || err);
    process.exit(1);
  }
}

main();
