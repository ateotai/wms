const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const fs = require('fs');
const { Client } = require('pg');

async function main() {
  const fileArg = process.argv[2] || '';
  if (!fileArg) {
    console.error('Falta ruta de archivo SQL');
    process.exit(1);
  }
  const sqlPath = path.resolve(__dirname, '..', '..', fileArg);
  const exists = fs.existsSync(sqlPath);
  if (!exists) {
    console.error('Archivo no encontrado:', sqlPath);
    process.exit(1);
  }
  const sql = fs.readFileSync(sqlPath, 'utf8');
  const dbUrl = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('Falta SUPABASE_DB_URL o DATABASE_URL en .env');
    process.exit(1);
  }
  try {
    const u = new URL(dbUrl);
    console.log('DEBUG: Conectando a host:', u.hostname);
  } catch (e) {
    console.log('DEBUG: dbUrl no es URL válida:', e.message);
  }

  const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  try {
    await client.connect();
    const res = await client.query(sql);
    console.log('OK:', path.basename(sqlPath));
    if (res.rows && res.rows.length > 0) {
      console.log('Resultado:', JSON.stringify(res.rows, null, 2));
    }
  } catch (e) {
    console.error('Error ejecutando SQL:', e.message || String(e));
    process.exitCode = 1;
  } finally {
    await client.end().catch(() => {});
  }
}

main().catch(e => {
  console.error('Error fatal:', e);
  process.exit(1);
});
