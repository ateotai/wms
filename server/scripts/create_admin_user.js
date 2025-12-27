const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env'), override: true });
require('dotenv').config({ path: path.resolve(__dirname, '../../.env'), override: true });
const { createClient } = require('@supabase/supabase-js');

async function main() {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env');
    process.exit(1);
  }

  const email = process.argv[2] || 'admin@wms.com';
  const password = process.argv[3] || 'Admin123!';
  const fullName = process.argv[4] || 'Administrador Principal';

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const { data: existing, error: listErr } = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 });
    if (listErr) throw listErr;
    const found = (existing?.users || []).find(u => String(u?.email || '').toLowerCase() === email.toLowerCase());
    let userId = found?.id || null;

    if (!userId) {
      const { data: created, error } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName },
        app_metadata: { role: 'authenticated' },
      });
      if (error) throw error;
      userId = created?.user?.id;
      console.log('Usuario admin creado:', email);
    } else {
      console.log('Usuario ya existe:', email);
    }

    if (userId) {
      const { error: upErr } = await supabase.from('profiles').upsert({
        id: userId,
        email,
        full_name: fullName,
        role: 'admin',
        is_active: true,
        updated_at: new Date().toISOString(),
      });
      if (upErr) {
        console.warn('No se pudo insertar/upsert en profiles:', upErr.message || upErr);
      } else {
        console.log('Perfil admin asegurado en profiles');
      }
    }
  } catch (e) {
    console.error('Error creando admin:', e?.message || e);
    process.exitCode = 1;
  }
}

main();
