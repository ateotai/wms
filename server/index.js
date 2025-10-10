// Minimal backend de producción para auth propia
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { createClient } = require('@supabase/supabase-js');

const APP_PORT = process.env.PORT || 8080;
const APP_JWT_SECRET = process.env.APP_JWT_SECRET || 'change_me_in_prod';
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Faltan variables SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const app = express();
// CORS: permitir frontend en localhost:5173 y responder preflight (OPTIONS)
app.use(
  cors({
    origin: ['http://localhost:5173'],
    methods: ['GET', 'POST', 'PUT', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: false,
  })
);
// Responder preflight globalmente ANTES de cualquier middleware de auth
app.options('*', cors());
app.use(express.json());

app.get('/', (_req, res) => {
  res.status(200).send('Auth backend running');
});

app.get('/health', (_req, res) => {
  res.status(200).json({
    ok: true,
    uptime: process.uptime(),
    port: APP_PORT,
    timestamp: new Date().toISOString(),
  });
});

function signToken(user) {
  const payload = { sub: user.id, email: user.email, role: user.role };
  return jwt.sign(payload, APP_JWT_SECRET, { expiresIn: '12h' });
}

function authMiddleware(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    const decoded = jwt.verify(token, APP_JWT_SECRET);
    req.user = decoded;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

app.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email y password requeridos' });
  const { data: appUser, error } = await supabase
    .from('app_users')
    .select('id,email,full_name,role,is_active,permissions,last_login,password_hash')
    .eq('email', email)
    .single();
  if (error) return res.status(500).json({ error: error.message });
  if (!appUser || appUser.is_active === false) return res.status(401).json({ error: 'Usuario inválido o inactivo' });
  const ok = appUser.password_hash ? await bcrypt.compare(password, appUser.password_hash) : false;
  if (!ok) return res.status(401).json({ error: 'Credenciales incorrectas' });
  await supabase.from('app_users').update({ last_login: new Date().toISOString() }).eq('id', appUser.id);
  const token = signToken(appUser);
  const { password_hash, ...safeUser } = appUser;
  return res.json({ token, user: safeUser });
});

app.get('/me', authMiddleware, async (req, res) => {
  const { sub } = req.user;
  const { data: appUser, error } = await supabase
    .from('app_users')
    .select('id,email,full_name,role,is_active,permissions,last_login')
    .eq('id', sub)
    .single();
  if (error) return res.status(500).json({ error: error.message });
  if (!appUser) return res.status(404).json({ error: 'Usuario no encontrado' });
  return res.json({ user: appUser });
});

app.post('/signup', async (req, res) => {
  const { email, password, full_name, role = 'OPERATOR' } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email y password requeridos' });
  const password_hash = await bcrypt.hash(password, 10);
  const { error } = await supabase.from('app_users').insert({
    email,
    password_hash,
    full_name,
    role,
    is_active: true,
    permissions: [],
  });
  if (error) return res.status(500).json({ error: error.message });
  return res.status(201).json({ ok: true });
});

// Listar usuarios del sistema
app.get('/users', authMiddleware, async (req, res) => {
  const { data, error } = await supabase
    .from('app_users')
    .select('id,email,full_name,role,is_active,permissions,last_login,created_at')
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  return res.json({ users: data || [] });
});

// Crear usuario
app.post('/users', authMiddleware, async (req, res) => {
  const { email, full_name, role = 'OPERATOR', is_active = true, password, permissions = [] } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email y password requeridos' });
  const password_hash = await bcrypt.hash(password, 10);
  const { data, error } = await supabase
    .from('app_users')
    .insert({ email, full_name, role, is_active, permissions, password_hash })
    .select('id,email,full_name,role,is_active,permissions,created_at')
    .single();
  if (error) return res.status(500).json({ error: error.message });
  return res.status(201).json({ user: data });
});

// Actualizar usuario
app.put('/users/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { full_name, role, is_active, permissions } = req.body || {};
  const { data, error } = await supabase
    .from('app_users')
    .update({ full_name, role, is_active, permissions, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('id,email,full_name,role,is_active,permissions,updated_at')
    .single();
  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Usuario no encontrado' });
  return res.json({ user: data });
});

// -----------------------------------------------
// Endpoint: Crear ubicación (usa clave de servicio, evita RLS)
// -----------------------------------------------
app.post('/locations', authMiddleware, async (req, res) => {
  try {
    const { role } = req.user || {};
    const roleUp = String(role || '').toUpperCase();
    if (!['ADMIN', 'MANAGER'].includes(roleUp)) {
      return res.status(403).json({ error: 'Permisos insuficientes' });
    }

    const { warehouse_id, code, name, zone, location_type, capacity, is_active } = req.body || {};
    if (!warehouse_id || !code) {
      return res.status(400).json({ error: 'warehouse_id y code son requeridos' });
    }

    const payload = {
      warehouse_id,
      code,
      name: name || code,
      zone: zone || null,
      location_type: location_type || 'storage',
      capacity: typeof capacity === 'number' ? capacity : 100,
      is_active: typeof is_active === 'boolean' ? is_active : true,
    };

    const { data, error } = await supabase
      .from('locations')
      .insert(payload)
      .select('id, warehouse_id, code, name, zone, location_type, capacity, is_active')
      .single();
    if (error) {
      const code = error?.code || '';
      const message = error?.message || '';
      if (code === '23505' || /duplicate key value/i.test(message)) {
        return res.status(409).json({ error: 'Duplicado: el código ya existe en este almacén' });
      }
      return res.status(400).json({ error: message });
    }
    return res.status(201).json({ location: data });
  } catch (e) {
    console.error('Error creando ubicación (backend):', e);
    return res.status(500).json({ error: 'Error interno creando ubicación' });
  }
});

// -----------------------------------------------
// Endpoint: Listar ubicaciones (usa clave de servicio, lectura segura)
// -----------------------------------------------
app.get('/locations', authMiddleware, async (req, res) => {
  try {
    const { warehouse_id, zone } = req.query || {};
    let query = supabase
      .from('locations')
      .select('id, warehouse_id, code, name, zone, aisle, rack, shelf, bin, capacity, is_active, location_type')
      .order('code', { ascending: true });

    if (warehouse_id) query = query.eq('warehouse_id', warehouse_id);
    if (zone) query = query.eq('zone', zone);

    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ locations: data || [] });
  } catch (e) {
    console.error('Error listando ubicaciones (backend):', e);
    return res.status(500).json({ error: 'Error interno listando ubicaciones' });
  }
});

// -----------------------------------------------
// Endpoint: Editar ubicación por id (usa clave de servicio, evita RLS)
// -----------------------------------------------
app.put('/locations/:id', authMiddleware, async (req, res) => {
  try {
    const { role } = req.user || {};
    const roleUp = String(role || '').toUpperCase();
    if (!['ADMIN', 'MANAGER'].includes(roleUp)) {
      return res.status(403).json({ error: 'Permisos insuficientes' });
    }

    const { id } = req.params;
    const { name, zone, location_type, capacity, is_active } = req.body || {};

    const updates = {};
    if (name !== undefined) updates.name = name;
    if (zone !== undefined) updates.zone = zone;
    if (location_type !== undefined) updates.location_type = location_type;
    if (capacity !== undefined) updates.capacity = capacity;
    if (is_active !== undefined) updates.is_active = is_active;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'Nada para actualizar' });
    }

    const { data, error } = await supabase
      .from('locations')
      .update(updates)
      .eq('id', id)
      .select('id, warehouse_id, code, name, zone, location_type, capacity, is_active')
      .single();

    if (error) {
      const code = error?.code || '';
      const message = error?.message || '';
      if (code === '23505' || /duplicate key value/i.test(message)) {
        return res.status(409).json({ error: 'Duplicado: el código ya existe en este almacén' });
      }
      return res.status(400).json({ error: message });
    }
    if (!data) return res.status(404).json({ error: 'Ubicación no encontrada' });
    return res.json({ location: data });
  } catch (e) {
    console.error('Error editando ubicación (backend):', e);
    return res.status(500).json({ error: 'Error interno editando ubicación' });
  }
});

// Obtener usuario por id
app.get('/users/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { data, error } = await supabase
    .from('app_users')
    .select('id,email,full_name,role,is_active,permissions,last_login,created_at')
    .eq('id', id)
    .single();
  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Usuario no encontrado' });
  return res.json({ user: data });
});

// -----------------------------------------------
// Endpoint: Importar/Upsert de productos por SKU (service role)
// -----------------------------------------------
app.post('/products/import', authMiddleware, async (req, res) => {
  try {
    const roleUp = String((req.user || {}).role || '').toUpperCase();
    if (!['ADMIN', 'MANAGER'].includes(roleUp)) {
      return res.status(403).json({ error: 'Permisos insuficientes' });
    }

    const { products } = req.body || {};
    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ error: 'Lista de productos vacía o inválida' });
    }

    // Normalizador de unidad de medida para cumplir constraint
    const normalizeUOM = (value) => {
      const str = String(value || '').trim();
      if (!str) return 'PCS';
      const up = str.toUpperCase();
      const map = {
        'UND': 'PCS',
        'UNIDAD': 'PCS',
        'U': 'PCS',
        'EA': 'PCS',
        'EACH': 'PCS',
        'UNIT': 'PCS',
        'PIEZAS': 'PCS',
        'PZA': 'PCS',
        'LTR': 'LT',
        'LTS': 'LT',
        'L': 'LT',
        'KILO': 'KG',
        'KILOGRAMO': 'KG',
        'KGS': 'KG',
        'METER': 'M',
        'METRO': 'M',
        'M^2': 'M2',
        'M^3': 'M3'
      };
      const allowed = new Set(['PCS', 'KG', 'LT', 'M', 'M2', 'M3']);
      if (map[up]) return map[up];
      if (allowed.has(up)) return up;
      return 'PCS';
    };

    // Normalizar y sanear payload
    const toNumber = (v, def = 0) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : def;
    };
    const toInt = (v, def = 0) => {
      const n = parseInt(v, 10);
      return Number.isFinite(n) ? n : def;
    };

    const payload = products.map(p => ({
      sku: String(p.sku || '').trim(),
      name: String(p.name || '').trim(),
      description: (p.description ?? '').toString(),
      unit_of_measure: normalizeUOM(p.unit_of_measure || 'PCS'),
      cost_price: toNumber(p.cost_price, 0),
      selling_price: toNumber(p.selling_price, 0),
      min_stock_level: toInt(p.min_stock_level, 0),
      max_stock_level: toInt(p.max_stock_level, 1000),
      reorder_point: toInt(p.reorder_point, 10),
      barcode: p.barcode ? String(p.barcode) : null,
      weight: p.weight !== undefined && p.weight !== null ? toNumber(p.weight, null) : null,
      is_active: true
    })).filter(p => p.sku && p.name);

    if (payload.length === 0) {
      return res.status(400).json({ error: 'No hay productos válidos para procesar' });
    }

    // Calcular conteos nuevos vs actualizaciones antes del upsert
    const skus = payload.map(p => p.sku);
    const { data: existingRows, error: existingErr } = await supabase
      .from('products')
      .select('sku')
      .in('sku', skus);
    if (existingErr) {
      // No bloquea el proceso; sólo informa
      console.warn('No se pudo verificar SKUs existentes:', existingErr.message);
    }
    const existingSet = new Set((existingRows || []).map(r => r.sku));
    const newCount = payload.filter(p => !existingSet.has(p.sku)).length;
    const updateCount = payload.length - newCount;

    // Upsert por SKU
    const { data, error } = await supabase
      .from('products')
      .upsert(payload, { onConflict: 'sku' })
      .select('sku');
    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.status(200).json({ processed: (data || []).length, newCount, updateCount });
  } catch (e) {
    console.error('Error importando productos (backend):', e);
    return res.status(500).json({ error: 'Error interno importando productos' });
  }
});

// -----------------------------------------------
// Endpoint: Contar productos distintos (activos) por SKU
// -----------------------------------------------
app.get('/products/count', authMiddleware, async (req, res) => {
  try {
    const { count, error } = await supabase
      .from('products')
      .select('sku', { count: 'exact', head: true })
      .eq('is_active', true);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ productsCount: count || 0 });
  } catch (e) {
    console.error('Error contando productos (backend):', e);
    return res.status(500).json({ error: 'Error interno contando productos' });
  }
});

// -----------------------------------------------
// Módulo de Recepción: Órdenes de compra y recepción
// -----------------------------------------------

// Listar órdenes de compra (sin items para tabla)
app.get('/purchase_orders', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('purchase_orders')
      .select('id, po_number, supplier_id, warehouse_id, status, order_date, expected_date, total_amount, notes')
      .order('order_date', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ purchase_orders: data || [] });
  } catch (e) {
    console.error('Error listando órdenes de compra (backend):', e);
    return res.status(500).json({ error: 'Error interno listando órdenes de compra' });
  }
});

// -----------------------------------------------
// Módulo de Inventario: Movimientos manuales
// -----------------------------------------------

// Crear movimiento de inventario manual
// Body: {
//   product_id, warehouse_id, location_id,
//   movement_type: 'IN' | 'OUT' | 'TRANSFER' | 'ADJUSTMENT' | 'COUNT',
//   transaction_type: 'RECEIPT' | 'SHIPMENT' | 'TRANSFER_IN' | 'TRANSFER_OUT' | 'ADJUSTMENT_IN' | 'ADJUSTMENT_OUT' | 'CYCLE_COUNT',
//   quantity, unit_cost?, lot_number?, expiry_date?, reason?, notes?, reference_number?, reference_type?
// }
app.post('/inventory/movements', authMiddleware, async (req, res) => {
  try {
    const roleUp = String((req.user || {}).role || '').toUpperCase();
    if (!['ADMIN', 'MANAGER'].includes(roleUp)) {
      return res.status(403).json({ error: 'Permisos insuficientes' });
    }

    const {
      product_id,
      warehouse_id,
      location_id,
      movement_type,
      transaction_type,
      quantity,
      unit_cost,
      lot_number,
      expiry_date,
      reason,
      notes,
      reference_number,
      reference_type,
    } = req.body || {};

    if (!product_id) return res.status(400).json({ error: 'product_id requerido' });
    if (!warehouse_id) return res.status(400).json({ error: 'warehouse_id requerido' });
    if (!movement_type) return res.status(400).json({ error: 'movement_type requerido' });
    if (!transaction_type) return res.status(400).json({ error: 'transaction_type requerido' });

    const qty = Number(quantity);
    if (!qty || qty <= 0) return res.status(400).json({ error: 'quantity debe ser > 0' });

    // Validar consistencia tipo y subclasificación
    const txAllowed = [
      'RECEIPT', 'SHIPMENT', 'TRANSFER_IN', 'TRANSFER_OUT', 'ADJUSTMENT_IN', 'ADJUSTMENT_OUT', 'CYCLE_COUNT'
    ];
    if (!txAllowed.includes(String(transaction_type))) {
      return res.status(400).json({ error: 'transaction_type inválido' });
    }

    const moveAllowed = ['IN', 'OUT', 'TRANSFER', 'ADJUSTMENT', 'COUNT'];
    if (!moveAllowed.includes(String(movement_type))) {
      return res.status(400).json({ error: 'movement_type inválido' });
    }

    // Insertar movimiento
    const payload = {
      product_id,
      warehouse_id,
      location_id: location_id || null,
      movement_type,
      transaction_type,
      quantity: qty,
      unit_cost: unit_cost !== undefined && unit_cost !== null ? Number(unit_cost) : null,
      reference_number: reference_number || null,
      reference_type: reference_type || null,
      lot_number: lot_number || null,
      expiry_date: expiry_date || null,
      reason: reason || null,
      notes: notes || null,
      performed_by: (req.user || {}).id || null,
    };

    const { data, error } = await supabase
      .from('inventory_movements')
      .insert(payload)
      .select('*')
      .single();
    if (error) return res.status(500).json({ error: error.message });

    return res.status(201).json({ movement: data });
  } catch (e) {
    console.error('Error creando movimiento manual:', e);
    return res.status(500).json({ error: 'Error interno creando movimiento manual' });
  }
});

// Listar movimientos de inventario con filtros básicos
// Query: ?type=IN|OUT|TRANSFER|ADJUSTMENT|COUNT|all&period=1day|7days|30days|all
app.get('/inventory/movements', authMiddleware, async (req, res) => {
  try {
    const { type = 'all', period = '7days' } = req.query || {};

    // Construir filtros de fecha
    let fromDate = null;
    const now = new Date();
    const toISOString = (d) => new Date(d).toISOString();
    if (period === '1day') {
      const d = new Date(now);
      d.setDate(d.getDate() - 1);
      fromDate = toISOString(d);
    } else if (period === '7days') {
      const d = new Date(now);
      d.setDate(d.getDate() - 7);
      fromDate = toISOString(d);
    } else if (period === '30days') {
      const d = new Date(now);
      d.setDate(d.getDate() - 30);
      fromDate = toISOString(d);
    }

    let query = supabase
      .from('inventory_movements')
      .select('id, product_id, warehouse_id, location_id, movement_type, transaction_type, quantity, unit_cost, reference_number, reference_type, lot_number, expiry_date, reason, notes, created_at, products:product_id(name, sku), locations:location_id(code, name)')
      .order('created_at', { ascending: false })
      .limit(200);

    if (fromDate) {
      query = query.gte('created_at', fromDate);
    }
    if (type && type !== 'all') {
      query = query.eq('movement_type', String(type));
    }

    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ movements: data || [] });
  } catch (e) {
    console.error('Error listando movimientos:', e);
    return res.status(500).json({ error: 'Error interno listando movimientos' });
  }
});

// Crear movimientos en lote (JSON)
// Body: { movements: [{ product_id, warehouse_id, location_id?, movement_type, transaction_type, quantity, unit_cost?, lot_number?, expiry_date?, reason?, notes?, reference_number?, reference_type? }] }
app.post('/inventory/movements/batch', authMiddleware, async (req, res) => {
  try {
    const roleUp = String((req.user || {}).role || '').toUpperCase();
    if (!['ADMIN', 'MANAGER'].includes(roleUp)) {
      return res.status(403).json({ error: 'Permisos insuficientes' });
    }

    const { movements } = req.body || {};
    if (!Array.isArray(movements) || movements.length === 0) {
      return res.status(400).json({ error: 'movements vacío o inválido' });
    }

    const txAllowed = [
      'RECEIPT', 'SHIPMENT', 'TRANSFER_IN', 'TRANSFER_OUT', 'ADJUSTMENT_IN', 'ADJUSTMENT_OUT', 'CYCLE_COUNT'
    ];
    const moveAllowed = ['IN', 'OUT', 'TRANSFER', 'ADJUSTMENT', 'COUNT'];

    const results = [];
    const errors = [];

    for (let idx = 0; idx < movements.length; idx++) {
      const m = movements[idx] || {};
      const {
        product_id, warehouse_id, location_id, movement_type, transaction_type,
        quantity, unit_cost, lot_number, expiry_date, reason, notes, reference_number, reference_type
      } = m;

      if (!product_id || !warehouse_id || !movement_type || !transaction_type) {
        errors.push({ index: idx, error: 'Campos obligatorios faltantes' });
        continue;
      }
      if (!txAllowed.includes(String(transaction_type)) || !moveAllowed.includes(String(movement_type))) {
        errors.push({ index: idx, error: 'Tipos inválidos' });
        continue;
      }
      const qty = Number(quantity);
      if (!qty || qty <= 0) {
        errors.push({ index: idx, error: 'quantity debe ser > 0' });
        continue;
      }

      const payload = {
        product_id,
        warehouse_id,
        location_id: location_id || null,
        movement_type,
        transaction_type,
        quantity: qty,
        unit_cost: unit_cost !== undefined && unit_cost !== null ? Number(unit_cost) : null,
        reference_number: reference_number || null,
        reference_type: reference_type || null,
        lot_number: lot_number || null,
        expiry_date: expiry_date || null,
        reason: reason || null,
        notes: notes || null,
        performed_by: (req.user || {}).id || null,
      };
      const { data, error } = await supabase
        .from('inventory_movements')
        .insert(payload)
        .select('id')
        .single();
      if (error) {
        errors.push({ index: idx, error: error.message });
      } else {
        results.push({ index: idx, id: data?.id });
      }
    }

    return res.status(201).json({ created: results.length, results, errors });
  } catch (e) {
    console.error('Error creando movimientos en lote:', e);
    return res.status(500).json({ error: 'Error interno creando movimientos en lote' });
  }
});

// Crear nueva orden de compra (header y opcionalmente items)
// Body: { supplier_id, warehouse_id, expected_date, notes, items?: [{ product_id, quantity, unit_price, notes? }] }
app.post('/purchase_orders', authMiddleware, async (req, res) => {
  try {
    const roleUp = String((req.user || {}).role || '').toUpperCase();
    if (!['ADMIN', 'MANAGER'].includes(roleUp)) {
      return res.status(403).json({ error: 'Permisos insuficientes' });
    }

    const { supplier_id, warehouse_id, expected_date, notes, items } = req.body || {};
    if (!warehouse_id) return res.status(400).json({ error: 'warehouse_id requerido' });
    // supplier_id opcional

    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const rand = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
    const po_number = `PO-${y}${m}${d}-${rand}`;

    // Crear header
    const { data: created, error: createErr } = await supabase
      .from('purchase_orders')
      .insert({
        po_number,
        supplier_id: supplier_id || null,
        warehouse_id,
        status: 'draft',
        order_date: new Date().toISOString().slice(0, 10),
        expected_date: expected_date || null,
        notes: notes || null,
        total_amount: 0,
        updated_at: new Date().toISOString(),
      })
      .select('id, po_number, supplier_id, warehouse_id, status, order_date, expected_date, total_amount, notes')
      .single();
    if (createErr) return res.status(500).json({ error: createErr.message });

    let total = 0;
    if (Array.isArray(items) && items.length > 0) {
      const toInsert = [];
      for (const it of items) {
        if (!it || !it.product_id || !it.quantity || !it.unit_price) continue;
        const qty = Number(it.quantity) || 0;
        const price = Number(it.unit_price) || 0;
        if (qty <= 0 || price < 0) continue;
        total += qty * price;
        toInsert.push({
          purchase_order_id: created.id,
          product_id: it.product_id,
          quantity: qty,
          unit_price: price,
          notes: it.notes || null,
        });
      }
      if (toInsert.length > 0) {
        const { error: itemsErr } = await supabase
          .from('purchase_order_items')
          .insert(toInsert);
        if (itemsErr) return res.status(500).json({ error: itemsErr.message });
      }
    }

    // Actualiza total si hubo items
    if (total > 0) {
      const { error: updErr } = await supabase
        .from('purchase_orders')
        .update({ total_amount: total, updated_at: new Date().toISOString() })
        .eq('id', created.id);
      if (updErr) return res.status(500).json({ error: updErr.message });
      created.total_amount = total;
    }

    return res.status(201).json({ purchase_order: { ...created, items: Array.isArray(items) ? items : [] } });
  } catch (e) {
    console.error('Error creando orden de compra (backend):', e);
    return res.status(500).json({ error: 'Error interno creando orden de compra' });
  }
});

// Obtener orden de compra con sus items y datos básicos de producto
app.get('/purchase_orders/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { data: po, error: poErr } = await supabase
      .from('purchase_orders')
      .select('id, po_number, supplier_id, warehouse_id, status, order_date, expected_date, total_amount, notes')
      .eq('id', id)
      .single();
    if (poErr) return res.status(500).json({ error: poErr.message });
    if (!po) return res.status(404).json({ error: 'Orden no encontrada' });

    const { data: items, error: itemsErr } = await supabase
      .from('purchase_order_items')
      .select('id, product_id, quantity, received_quantity, unit_price, total_price, notes, products:product_id(sku, name, description)')
      .eq('purchase_order_id', id);
    if (itemsErr) return res.status(500).json({ error: itemsErr.message });

    return res.json({ purchase_order: { ...po, items: items || [] } });
  } catch (e) {
    console.error('Error obteniendo orden de compra (backend):', e);
    return res.status(500).json({ error: 'Error interno obteniendo orden de compra' });
  }
});

// -----------------------------------------------
// Ventas: Obtener orden de venta por número (con items y datos de producto)
// -----------------------------------------------
app.get('/sales_orders/:orderNumber', authMiddleware, async (req, res) => {
  try {
    const { orderNumber } = req.params;
    if (!orderNumber) return res.status(400).json({ error: 'orderNumber requerido' });

    const { data: so, error: soErr } = await supabase
      .from('sales_orders')
      .select('id, so_number, customer_name, customer_email, customer_phone, warehouse_id, status, order_date, required_date, shipped_date, total_amount, shipping_amount, shipping_address, notes')
      .eq('so_number', orderNumber)
      .single();
    if (soErr) return res.status(500).json({ error: soErr.message });
    if (!so) return res.status(404).json({ error: 'Orden de venta no encontrada' });

    const { data: items, error: itemsErr } = await supabase
      .from('sales_order_items')
      .select('id, product_id, quantity, unit_price, notes, products:product_id(sku, name, weight, dimensions)')
      .eq('sales_order_id', so.id);
    if (itemsErr) return res.status(500).json({ error: itemsErr.message });

    return res.json({ sales_order: { ...so, items: items || [] } });
  } catch (e) {
    console.error('Error obteniendo orden de venta:', e);
    return res.status(500).json({ error: 'Error interno obteniendo orden de venta' });
  }
});

// Recepción de items de una orden de compra
// Body: { items: [{ item_id, quantity, location_id?, lot_number?, unit_cost? }] }
app.post('/purchase_orders/:id/receive', authMiddleware, async (req, res) => {
  try {
    const roleUp = String((req.user || {}).role || '').toUpperCase();
    if (!['ADMIN', 'MANAGER'].includes(roleUp)) {
      return res.status(403).json({ error: 'Permisos insuficientes' });
    }

    const { id } = req.params;
    const { items } = req.body || {};
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Items de recepción vacíos o inválidos' });
    }

    const { data: po, error: poErr } = await supabase
      .from('purchase_orders')
      .select('id, po_number, warehouse_id, status')
      .eq('id', id)
      .single();
    if (poErr) return res.status(500).json({ error: poErr.message });
    if (!po) return res.status(404).json({ error: 'Orden no encontrada' });

    let totalReceivedNow = 0;

    for (const it of items) {
      const itemId = it.item_id;
      const requestedQty = Number(it.quantity) || 0;
      if (!itemId || requestedQty <= 0) continue;

      const { data: itemRow, error: itemErr } = await supabase
        .from('purchase_order_items')
        .select('id, product_id, quantity, received_quantity, unit_price')
        .eq('id', itemId)
        .eq('purchase_order_id', id)
        .single();
      if (itemErr) return res.status(500).json({ error: itemErr.message });
      if (!itemRow) return res.status(404).json({ error: `Item ${itemId} no encontrado en la orden` });

      const pending = Math.max(0, (itemRow.quantity || 0) - (itemRow.received_quantity || 0));
      const receiveQty = Math.min(pending, requestedQty);
      if (receiveQty <= 0) continue;

      const unitCost = it.unit_cost !== undefined && it.unit_cost !== null ? Number(it.unit_cost) : (itemRow.unit_price || null);

      // Registrar movimiento de inventario
      const { error: movErr } = await supabase
        .from('inventory_movements')
        .insert({
          product_id: itemRow.product_id,
          warehouse_id: po.warehouse_id,
          location_id: it.location_id || null,
          movement_type: 'IN',
          transaction_type: 'RECEIPT',
          quantity: receiveQty,
          unit_cost: unitCost,
          reference_number: po.po_number,
          reference_type: 'purchase_order',
          lot_number: it.lot_number || null,
          reason: 'Recepción de orden de compra',
          notes: `Recepción ${receiveQty} unidades`
        });
      if (movErr) return res.status(500).json({ error: movErr.message });

      // Actualizar cantidad recibida del item
      const { error: updErr } = await supabase
        .from('purchase_order_items')
        .update({ received_quantity: (itemRow.received_quantity || 0) + receiveQty })
        .eq('id', itemId)
        .eq('purchase_order_id', id);
      if (updErr) return res.status(500).json({ error: updErr.message });

      totalReceivedNow += receiveQty;
    }

    // Recalcular estado de la orden
    const { data: allItems, error: allErr } = await supabase
      .from('purchase_order_items')
      .select('quantity, received_quantity')
      .eq('purchase_order_id', id);
    if (allErr) return res.status(500).json({ error: allErr.message });

    const fullyReceived = (allItems || []).every(i => (i.received_quantity || 0) >= (i.quantity || 0));
    const newStatus = fullyReceived ? 'received' : 'partial';

    const updates = { status: newStatus, updated_at: new Date().toISOString() };
    if (fullyReceived) updates.received_date = new Date().toISOString();
    const { error: poUpdErr } = await supabase
      .from('purchase_orders')
      .update(updates)
      .eq('id', id);
    if (poUpdErr) return res.status(500).json({ error: poUpdErr.message });

    return res.json({ ok: true, receivedQty: totalReceivedNow, status: newStatus });
  } catch (e) {
    console.error('Error en recepción de orden de compra (backend):', e);
    return res.status(500).json({ error: 'Error interno recepcionando orden de compra' });
  }
});

// -----------------------------------------------
// Endpoints de Gestión de Roles (basados en app_users)
// -----------------------------------------------

// Catálogo de permisos disponibles (categorías y acciones comunes)
const AVAILABLE_PERMISSIONS = [
  { id: 'inventory_read', name: 'Ver inventario', description: 'Consultar información del inventario', category: 'Inventario', isSystem: true },
  { id: 'inventory_write', name: 'Modificar inventario', description: 'Crear y modificar registros de inventario', category: 'Inventario', isSystem: true },
  { id: 'orders_read', name: 'Ver pedidos', description: 'Consultar información de pedidos', category: 'Pedidos', isSystem: true },
  { id: 'orders_write', name: 'Gestionar pedidos', description: 'Crear y modificar pedidos', category: 'Pedidos', isSystem: true },
  { id: 'reports_read', name: 'Ver reportes', description: 'Acceder a reportes y analíticas', category: 'Reportes', isSystem: true },
  { id: 'reports_write', name: 'Crear reportes', description: 'Crear y modificar reportes personalizados', category: 'Reportes', isSystem: true },
  { id: 'users_read', name: 'Ver usuarios', description: 'Consultar información de usuarios', category: 'Usuarios', isSystem: true },
  { id: 'users_write', name: 'Gestionar usuarios', description: 'Crear y modificar usuarios', category: 'Usuarios', isSystem: true },
  { id: 'config_read', name: 'Ver configuración', description: 'Acceder a configuraciones del sistema', category: 'Configuración', isSystem: true },
  { id: 'config_write', name: 'Modificar configuración', description: 'Modificar configuraciones del sistema', category: 'Configuración', isSystem: true }
];

// Utilidad: intentar obtener roles desde app_roles; si no existen, derivar desde app_users
async function getRolesWithFallback() {
  // Primero intentamos leer app_roles
  const { data: rolesData, error: rolesErr } = await supabase
    .from('app_roles')
    .select('name, description, is_system, permissions, created_at, updated_at');
  if (!rolesErr && Array.isArray(rolesData) && rolesData.length > 0) {
    // Obtener conteo de usuarios por rol
    const { data: usersData } = await supabase
      .from('app_users')
      .select('role');
    const counts = new Map();
    for (const u of usersData || []) {
      const key = (u.role || 'OPERATOR').toString();
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    return rolesData.map(r => ({
      name: r.name,
      description: r.description || '',
      isSystem: !!r.is_system,
      permissions: Array.isArray(r.permissions) ? r.permissions : [],
      userCount: counts.get(r.name) || 0,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    })).sort((a, b) => a.name.localeCompare(b.name));
  }

  // Fallback: derivar roles desde app_users
  const { data, error } = await supabase
    .from('app_users')
    .select('role, permissions');
  if (error) throw new Error(error.message);
  const roleMap = new Map();
  for (const row of data || []) {
    const key = (row.role || 'OPERATOR').toString();
    const current = roleMap.get(key) || { name: key, userCount: 0, permissions: [] };
    current.userCount += 1;
    const perms = Array.isArray(row.permissions) ? row.permissions : [];
    const existing = new Set(current.permissions.map(p => p.id || p));
    for (const p of perms) {
      const id = typeof p === 'string' ? p : p?.id || p?.action || p;
      if (!id) continue;
      existing.add(id);
    }
    current.permissions = Array.from(existing);
    roleMap.set(key, current);
  }
  return Array.from(roleMap.values()).sort((a, b) => a.name.localeCompare(b.name));
}

// Listar roles (app_roles si existe, caso contrario agregado de app_users)
app.get('/roles', authMiddleware, async (_req, res) => {
  try {
    const roles = await getRolesWithFallback();
    return res.json({ roles });
  } catch (e) {
    console.error('Error listando roles:', e);
    return res.status(500).json({ error: 'Error interno listando roles' });
  }
});

// Crear rol (app_roles)
app.post('/roles', authMiddleware, async (req, res) => {
  const { name, description = '', permissions = [], is_system = false } = req.body || {};
  if (!name) return res.status(400).json({ error: 'Nombre de rol requerido' });
  try {
    const { data, error } = await supabase
      .from('app_roles')
      .insert({ name, description, is_system, permissions })
      .select('name, description, is_system, permissions, created_at, updated_at')
      .single();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json({ role: data });
  } catch (e) {
    console.error('Error creando rol:', e);
    return res.status(500).json({ error: 'Error interno creando rol' });
  }
});

// Actualizar permisos de un rol (aplica a todos los usuarios con ese rol)
app.put('/roles/:role', authMiddleware, async (req, res) => {
  const { role } = req.params;
  const { permissions, description, is_system } = req.body || {};
  if (!role) return res.status(400).json({ error: 'Rol requerido' });

  try {
    // Actualiza app_roles si existe
    const updatePayload = {};
    if (Array.isArray(permissions)) updatePayload['permissions'] = permissions.map(p => (typeof p === 'string' ? p : p?.id || p));
    if (typeof description === 'string') updatePayload['description'] = description;
    if (typeof is_system === 'boolean') updatePayload['is_system'] = is_system;

    let updatedRole = null;
    if (Object.keys(updatePayload).length > 0) {
      const { data: roleData, error: roleErr } = await supabase
        .from('app_roles')
        .update({ ...updatePayload })
        .eq('name', role)
        .select('name, description, is_system, permissions, updated_at')
        .single();
      if (!roleErr) updatedRole = roleData;
    }

    // Sincroniza permisos a usuarios del rol (si se enviaron permisos)
    if (Array.isArray(permissions)) {
      const { error: usersErr } = await supabase
        .from('app_users')
        .update({ permissions: permissions.map(p => (typeof p === 'string' ? p : p?.id || p)), updated_at: new Date().toISOString() })
        .eq('role', role);
      if (usersErr) return res.status(500).json({ error: usersErr.message });
    }

    return res.json({ ok: true, role: updatedRole });
  } catch (e) {
    console.error('Error actualizando rol:', e);
    return res.status(500).json({ error: 'Error interno actualizando rol' });
  }
});

// Permisos disponibles para construir la matriz en el frontend
app.get('/permissions/available', authMiddleware, async (_req, res) => {
  return res.json({ permissions: AVAILABLE_PERMISSIONS });
});

app.listen(APP_PORT, () => {
  console.log(`Auth backend escuchando en puerto ${APP_PORT}`);
});