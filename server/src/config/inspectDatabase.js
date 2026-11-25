import 'dotenv/config';
import pg from 'pg';

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });

try {
  await client.connect();
  const target = await client.query(
    'SELECT current_database() AS database, inet_server_addr()::text AS host, inet_server_port() AS port',
  );
  const tables = await client.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name",
  );
  console.log(JSON.stringify({ target: target.rows[0], tables: tables.rows.map(({ table_name }) => table_name) }, null, 2));
} catch {
  console.error('Database inspection failed. Check local PostgreSQL availability and configuration.');
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}
