import { testDbConnection, pool } from '../src/db/postgres';

async function main() {
  console.log('Testing Supabase PostgreSQL 17 connection...');
  const status = await testDbConnection();
  console.log('Connection Result:\n', JSON.stringify(status, null, 2));
  await pool.end();
  process.exit(status.connected ? 0 : 1);
}

main();
