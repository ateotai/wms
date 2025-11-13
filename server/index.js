// Minimal backend de producción para auth propia
const path = require('path');
// Cargar primero variables desde server/.env
try {
  require('dotenv').config({ path: path.resolve(__dirname, '.env') });
} catch {}
// Cargar .env desde la raíz del proyecto como fallback (por ejemplo variables VITE_)
try {
  require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
} catch {}
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { createClient } = require('@supabase/supabase-js');
const webpush = require('web-push');
const { initErpAutoSyncScheduler } = require('./erp_auto_sync');

const APP_PORT = process.env.PORT || 8080;
const APP_JWT_SECRET = process.env.APP_JWT_SECRET || 'change_me_in_prod';
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
// Permitir modo desarrollo con anon key si falta service role
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const SUPABASE_API_KEY = SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY;
const CORS_ORIGINS = (process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:5174,http://localhost:5177,http://localhost:5178,http://127.0.0.1:5173,http://127.0.0.1:5174,http://127.0.0.1:5177,http://127.0.0.1:5178')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

if (!SUPABASE_URL || !SUPABASE_API_KEY) {
  console.error('Faltan variables SUPABASE_URL o SUPABASE_[SERVICE_ROLE|ANON]_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_API_KEY);
console.log(`[Auth backend] Usando clave ${SUPABASE_SERVICE_ROLE_KEY ? 'service role' : 'anon'} para Supabase`);
const ERP_RESTRICT_CATALOG_TO_PO = (process.env.ERP_RESTRICT_CATALOG_TO_PO || 'true') !== 'false';
const CREATE_VIRTUAL_LOCATIONS_ON_BOOT = (process.env.CREATE_VIRTUAL_LOCATIONS_ON_BOOT || 'true') !== 'false';

// Restringe el catálogo de productos a los presentes en items de órdenes de compra (DEV)
async function restrictProductsToPoItems() {
  const { data: usedRows } = await supabase
    .from('purchase_order_items')
    .select('product_id');
  const usedIds = Array.from(new Set((usedRows || []).map(r => r.product_id).filter(Boolean)));

  const { data: allProducts } = await supabase
    .from('products')
    .select('id');
  const allIds = (allProducts || []).map(p => p.id).filter(Boolean);

  const usedSet = new Set(usedIds);
  const toActivate = usedIds;
  const toDeactivate = allIds.filter(id => !usedSet.has(id));

  if (toActivate.length) {
    await supabase
      .from('products')
      .update({ is_active: true })
      .in('id', toActivate);
  }
  if (toDeactivate.length) {
    await supabase
      .from('products')
      .update({ is_active: false })
      .in('id', toDeactivate);
  }
  return { activated: toActivate.length, deactivated: toDeactivate.length };
}

const app = express();
app.set('etag', false);
// CORS: permitir orígenes configurables vía env (coma-separados) y responder preflight
// Permitir orígenes de localhost y 127.0.0.1 en cualquier puerto en desarrollo,
// además de los especificados en CORS_ORIGINS (puede venir de env).
const LOCAL_ORIGIN_REGEX = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i;
function isAllowedOrigin(origin) {
  if (!origin) return true; // solicitudes same-origin o sin Origin
  if (CORS_ORIGINS.includes(origin)) return true;
  if (LOCAL_ORIGIN_REGEX.test(origin)) return true;
  return false;
}

app.use(
  cors({
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) return callback(null, true);
      return callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST', 'PUT', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: false,
  })
);
// Responder preflight globalmente ANTES de cualquier middleware de auth
app.options('*', cors({
  origin: (origin, callback) => {
    if (isAllowedOrigin(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());

// ---------------------------------------
// Web Push setup
// ---------------------------------------
let WEB_PUSH_PUBLIC_KEY = process.env.WEB_PUSH_PUBLIC_KEY || '';
let WEB_PUSH_PRIVATE_KEY = process.env.WEB_PUSH_PRIVATE_KEY || '';
if (!WEB_PUSH_PUBLIC_KEY || !WEB_PUSH_PRIVATE_KEY) {
  console.warn('[WebPush] Faltan WEB_PUSH_PUBLIC_KEY/WEB_PUSH_PRIVATE_KEY. Generando par efímero para desarrollo.');
  try {
    const keys = webpush.generateVAPIDKeys();
    WEB_PUSH_PUBLIC_KEY = keys.publicKey;
    WEB_PUSH_PRIVATE_KEY = keys.privateKey;
  } catch (e) {
    console.warn('[WebPush] No se pudo generar claves VAPID:', e?.message || e);
  }
}
try {
  webpush.setVapidDetails('mailto:admin@example.com', WEB_PUSH_PUBLIC_KEY, WEB_PUSH_PRIVATE_KEY);
} catch (e) {
  console.warn('[WebPush] No se pudo configurar VAPID:', e?.message || e);
}

// Almacenamiento en memoria como fallback cuando no hay tabla en BD
const pushSubscriptions = new Map(); // key: endpoint, value: full subscription object

app.get('/push/vapidPublicKey', (_req, res) => {
  return res.json({ publicKey: WEB_PUSH_PUBLIC_KEY });
});

app.post('/push/subscribe', async (req, res) => {
  try {
    const subscription = req.body?.subscription;
    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({ error: 'Suscripción inválida' });
    }
    pushSubscriptions.set(subscription.endpoint, subscription);

    // Intentar guardar en tabla push_subscriptions si existe
    try {
      await supabase.from('push_subscriptions').upsert({
        endpoint: subscription.endpoint,
        p256dh: subscription?.keys?.p256dh || null,
        auth: subscription?.keys?.auth || null,
        created_at: new Date().toISOString(),
      });
    } catch (e) {
      console.warn('[WebPush] No se pudo guardar en BD push_subscriptions:', e?.message || e);
    }
    return res.json({ ok: true });
  } catch (e) {
    console.error('Error registrando suscripción push:', e);
    return res.status(500).json({ error: 'Error interno registrando suscripción' });
  }
});

// Confirmar picking de un ítem del lote: actualiza picked_quantity, libera reserva y registra movimiento OUT
app.post('/picking/batches/:batchId/items/:itemId/confirm', authMiddleware, async (req, res) => {
  try {
    const { batchId, itemId } = req.params;
    const qty = Math.max(0, Number(req.body?.quantity || 0));
    if (!qty) return res.status(400).json({ error: 'quantity debe ser > 0' });
    // Validar permiso: solo ADMIN o asignado
    const roleUp = String((req.user || {}).role || '').toUpperCase();
    const viewerEmail = (req.user || {}).email || '';
    let viewerName = '';
    try {
      const { data: meRow } = await supabase
        .from('app_users')
        .select('full_name')
        .eq('id', (req.user || {}).sub)
        .single();
      viewerName = String(meRow?.full_name || '');
    } catch {}
    if (roleUp !== 'ADMIN') {
      const { data: bRow } = await supabase
        .from('picking_batches')
        .select('assigned_to')
        .eq('id', batchId)
        .single();
      const assigned = String(bRow?.assigned_to || '');
      if (!(assigned === viewerEmail || assigned === viewerName)) {
        return res.status(403).json({ error: 'No autorizado para confirmar picking de este lote' });
      }
    }

    // Traer el item y validar límites
    const { data: item, error: itemErr } = await supabase
      .from('picking_batch_items')
      .select('id, batch_id, product_id, total_quantity, picked_quantity, source_location_id')
      .eq('id', itemId)
      .eq('batch_id', batchId)
      .single();
    if (itemErr) return res.status(500).json({ error: itemErr.message });
    if (!item) return res.status(404).json({ error: 'Item no encontrado' });
    const remaining = Math.max(0, Number(item.total_quantity || 0) - Number(item.picked_quantity || 0));
    const confirmQty = Math.min(remaining, qty);
    if (confirmQty <= 0) return res.status(400).json({ error: 'Nada por confirmar' });

    // Actualizar picked_quantity y status
    const newPicked = Number(item.picked_quantity || 0) + confirmQty;
    const newStatus = newPicked >= Number(item.total_quantity || 0) ? 'picking_confirmed' : 'picking_pending';
    const { error: updErr } = await supabase
      .from('picking_batch_items')
      .update({ picked_quantity: newPicked, status: newStatus })
      .eq('id', item.id);
    if (updErr) return res.status(500).json({ error: updErr.message });

    // Identificar warehouse desde la ubicación
    let whId = null;
    if (item.source_location_id) {
      const { data: locRow } = await supabase
        .from('locations')
        .select('warehouse_id')
        .eq('id', item.source_location_id)
        .single();
      whId = String(locRow?.warehouse_id || '');
    }

    // Liberar reserva por cantidad confirmada
    if (whId) {
      try {
        await supabase.rpc('release_inventory', {
          p_product_id: item.product_id,
          p_warehouse_id: whId,
          p_quantity: confirmQty
        });
      } catch (rpcErr) {
        console.warn('[ItemConfirm] Error liberando reserva:', rpcErr?.message || rpcErr);
      }
    }

    // Registrar movimiento OUT (ajuste por picking)
    if (whId) {
      try {
        await supabase
          .from('inventory_movements')
          .insert({
            product_id: item.product_id,
            warehouse_id: whId,
            location_id: item.source_location_id || null,
            movement_type: 'OUT',
            transaction_type: 'ADJUSTMENT_OUT',
            quantity: confirmQty,
            reference_number: String(batchId),
            reference_type: 'picking_batch',
            reason: 'Picking confirmado',
            notes: 'Consumo de reserva por confirmación de picking'
          });
      } catch (mvErr) {
        console.warn('[ItemConfirm] Error insertando movimiento de inventario:', mvErr?.message || mvErr);
      }
    }

    broadcastSSE({ type: 'item_confirmed', batchId, itemId, picked: newPicked, status: newStatus });
    return res.json({ ok: true, batchId, itemId, picked_quantity: newPicked, status: newStatus });
  } catch (e) {
    console.error('Error en /picking/batches/:batchId/items/:itemId/confirm', e);
    return res.status(500).json({ error: 'Error interno' });
  }
});

async function getAllPushSubscriptions() {
  const subs = [];
  for (const s of pushSubscriptions.values()) subs.push(s);
  try {
    const { data: rows } = await supabase.from('push_subscriptions').select('endpoint,p256dh,auth');
    for (const row of rows || []) {
      const sub = { endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } };
      subs.push(sub);
    }
  } catch (e) {
    console.warn('[WebPush] No se pudo leer push_subscriptions:', e?.message || e);
  }
  const uniq = new Map();
  for (const s of subs) {
    if (s && s.endpoint) uniq.set(s.endpoint, s);
  }
  return Array.from(uniq.values());
}

async function sendPushToAll(payload) {
  try {
    const allSubs = await getAllPushSubscriptions();
    let sent = 0;
    for (const sub of allSubs) {
      try {
        await webpush.sendNotification(sub, payload);
        sent++;
      } catch (e) {
        console.warn('Fallo al enviar push:', e?.message || e);
      }
    }
    return sent;
  } catch (e) {
    console.warn('[WebPush] Error enviando push a todos:', e?.message || e);
    return 0;
  }
}

app.post('/push/test', async (req, res) => {
  try {
    const title = req.body?.title || 'Test Push';
    const body = req.body?.body || 'Notificación de prueba';
    const url = req.body?.url || '/inventory/alerts';
    const payload = JSON.stringify({ title, body, url });
    const sent = await sendPushToAll(payload);
    return res.json({ ok: true, sent });
  } catch (e) {
    console.error('Error enviando test push:', e);
    return res.status(500).json({ error: 'Error interno enviando test' });
  }
});

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

// -----------------------------------------------
// Productos: fallback para obtener detalles por IDs (sku, name, description)
// Útil cuando el frontend (rol anon) no puede hacer join por RLS
// -----------------------------------------------
app.post('/products/byIds', async (req, res) => {
  try {
    const ids = Array.isArray(req.body?.ids) ? req.body.ids : [];
    const clean = ids
      .map((s) => String(s || '').trim())
      .filter((s) => s && /^([0-9a-fA-F-]{8,})$/.test(s));
    if (!clean.length) return res.status(400).json({ error: 'ids requeridos' });
    if (clean.length > 500) return res.status(400).json({ error: 'máximo 500 ids' });

    const { data, error } = await supabase
      .from('products')
      .select('id, sku, name, description')
      .in('id', clean);
    if (error) {
      console.warn('[Products/byIds] Error supabase:', error?.message || error);
      return res.status(500).json({ error: 'No se pudieron leer productos' });
    }
    return res.json({ items: data || [] });
  } catch (e) {
    console.error('Error en /products/byIds:', e);
    return res.status(500).json({ error: 'Error interno' });
  }
});

// -----------------------------------------------
// Integraciones ERP: Test de conexión SAP ES5 (OData)
// -----------------------------------------------
app.post('/erp/sap/test', async (req, res) => {
  try {
    const https = require('https');
    const http = require('http');

    const endpoint = String(req.body?.endpoint || '').trim();
    const username = String(req.body?.username || '').trim();
    const password = String(req.body?.password || '').trim();
    const apiKey = String(req.body?.apiKey || '').trim();
    const timeoutMs = Number(req.body?.timeout || 15000);

    if (!endpoint) return res.status(400).json({ error: 'endpoint requerido' });

    // Construir URL para ProductSet y forzar formato JSON
    function buildSapProductSetUrl(base, top) {
      let b = String(base || '').trim();
      b = b.replace(/\/$/, '');
      // Base esperada: https://sapes5.sap.com/sap/opu/odata/IWBEP/GWSAMPLE_BASIC
      // Añadimos el recurso ProductSet
      const t = Number(top) || 1;
      let url = `${b}/ProductSet?$top=${t}&$format=json`;
      return url;
    }

    const limit = Math.min(Math.max(Number(req.body?.limit || 1), 1), 50);
    const testUrl = buildSapProductSetUrl(endpoint, limit);

    let authHeader = '';
    if (username && password) {
      const basic = Buffer.from(`${username}:${password}`).toString('base64');
      authHeader = `Basic ${basic}`;
    } else if (apiKey) {
      // Fallback genérico: algunos endpoints aceptan Bearer
      authHeader = `Bearer ${apiKey}`;
    }

    const u = new URL(testUrl);
    const isHttps = u.protocol === 'https:';

    const options = {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        ...(authHeader ? { 'Authorization': authHeader } : {}),
      },
      timeout: timeoutMs,
    };

    const client = isHttps ? https : http;

    const reqOut = client.request(u, options, (resp) => {
      const status = resp.statusCode || 0;
      let raw = '';
      resp.on('data', (chunk) => { raw += chunk; });
      resp.on('end', () => {
        if (status >= 200 && status < 300) {
          let json = null;
          try { json = JSON.parse(raw); } catch {}

          // OData V2 (SAP Gateway) suele responder con { d: { results: [...] } }
          const rawResults = json?.d?.results || json?.d || json?.value || null;
          const arr = Array.isArray(rawResults) ? rawResults : (rawResults ? [rawResults] : []);
          const sample = arr[0] || null;

          return res.json({
            ok: true,
            status,
            url: testUrl,
            count: arr.length,
            sample,
            results: arr,
          });
        }

        // Manejar errores comunes
        if (status === 401 || status === 403) {
          return res.status(status).json({ error: 'Credenciales inválidas o acceso denegado', status });
        }
        return res.status(status || 500).json({ error: 'Error de conexión', status, body: raw?.slice(0, 300) || '' });
      });
    });

    reqOut.on('timeout', () => {
      try { reqOut.destroy(); } catch {}
      return res.status(504).json({ error: 'Timeout conectando a SAP', url: testUrl });
    });
    reqOut.on('error', (err) => {
      return res.status(500).json({ error: err?.message || String(err) });
    });

    reqOut.end();
  } catch (e) {
    console.error('Error en /erp/sap/test:', e);
    return res.status(500).json({ error: 'Error interno probando conexión SAP' });
  }
});

// -------------------------------------------------
// Endpoint mock local: SAP OData ProductSet (para pruebas sin internet)
// -------------------------------------------------
const MOCK_SAP_PRODUCTS = [
  { ProductID: 'HT-1000', Name: 'Notebook Basic 15', Description: 'Portátil 15" básico', Price: 799.0 },
  { ProductID: 'HT-1001', Name: 'Notebook Pro 17', Description: 'Portátil 17" profesional', Price: 1199.0 },
  { ProductID: 'HT-1002', Name: 'Teclado USB', Description: 'Teclado estándar', Price: 29.9 },
  { ProductID: 'HT-1003', Name: 'Mouse inalámbrico', Description: 'Mouse 2.4 GHz', Price: 24.5 },
  { ProductID: 'HT-1004', Name: 'Monitor LED 24"', Description: 'Pantalla Full HD', Price: 149.9 },
  { ProductID: 'HT-1005', Name: 'Docking Station USB-C', Description: 'Estación de acople', Price: 89.0 },
  { ProductID: 'HT-1006', Name: 'Disco externo 1TB', Description: 'Unidad portátil', Price: 59.0 },
  { ProductID: 'HT-1007', Name: 'Webcam HD 1080p', Description: 'Cámara para videollamadas', Price: 39.0 },
];

app.get('/mock/sap/ProductSet', (req, res) => {
  try {
    const top = Math.min(Math.max(Number(req.query['$top'] || req.query.top || 10), 1), 100);
    const results = MOCK_SAP_PRODUCTS.slice(0, top).map(p => ({
      ProductID: p.ProductID,
      Name: p.Name,
      Description: p.Description,
      Price: p.Price,
    }));
    return res.json({ d: { results } });
  } catch (e) {
    console.error('Error en mock SAP:', e);
    return res.status(500).json({ error: 'Error interno mock SAP' });
  }
});

// Mock de SAP OData: PurchaseOrderSet (para pruebas sin internet)
const MOCK_SAP_PURCHASE_ORDERS = [
  { PurchaseOrderID: 'PO-TEST-0001', SupplierName: 'Proveedor Demo', OrderDate: '2024-09-01', ExpectedDate: '2024-09-10', NetAmount: 12500.00 },
  { PurchaseOrderID: 'PO-TEST-0002', SupplierName: 'Proveedor Demo', OrderDate: '2024-09-03', ExpectedDate: '2024-09-12', NetAmount: 8900.50 },
  { PurchaseOrderID: 'PO-TEST-0003', SupplierName: 'Proveedor Demo', OrderDate: '2024-09-05', ExpectedDate: '2024-09-15', NetAmount: 1520.00 },
];

app.get('/mock/sap/PurchaseOrderSet', (req, res) => {
  try {
    const top = Math.min(Math.max(Number(req.query['$top'] || req.query.top || 10), 1), 100);
    const results = MOCK_SAP_PURCHASE_ORDERS.slice(0, top).map(o => ({
      PurchaseOrderID: o.PurchaseOrderID,
      SupplierName: o.SupplierName,
      OrderDate: o.OrderDate,
      ExpectedDate: o.ExpectedDate,
      NetAmount: o.NetAmount,
    }));
    return res.json({ d: { results } });
  } catch (e) {
    console.error('Error en mock SAP PO:', e);
    return res.status(500).json({ error: 'Error interno mock SAP PO' });
  }
});

// Mock de SAP OData: SalesOrderSet (para pruebas locales)
const MOCK_SAP_SALES_ORDERS = [
  { SalesOrderID: 'SO-TEST-0004', CustomerName: 'Cliente Demo', OrderDate: '2024-09-02', RequiredDate: '2024-09-08', NetAmount: 3200.00 },
  { SalesOrderID: 'SO-TEST-0005', CustomerName: 'Cliente Demo 2', OrderDate: '2024-09-04', RequiredDate: '2024-09-11', NetAmount: 1450.75 },
  { SalesOrderID: 'SO-TEST-0006', CustomerName: 'Cliente Demo 3', OrderDate: '2024-09-07', RequiredDate: '2024-09-20', NetAmount: 980.00 },
];

app.get('/mock/sap/SalesOrderSet', (req, res) => {
  try {
    const top = Math.min(Math.max(Number(req.query['$top'] || req.query.top || 10), 1), 100);
    const results = MOCK_SAP_SALES_ORDERS.slice(0, top).map(o => ({
      SalesOrderID: o.SalesOrderID,
      CustomerName: o.CustomerName,
      OrderDate: o.OrderDate,
      RequiredDate: o.RequiredDate,
      NetAmount: o.NetAmount,
    }));
    return res.json({ d: { results } });
  } catch (e) {
    console.error('Error en mock SAP SO:', e);
    return res.status(500).json({ error: 'Error interno mock SAP SO' });
  }
});

// Mock de SAP OData: TransferSet (para pruebas locales)
const MOCK_SAP_TRANSFERS = [
  { TransferID: 'TR-TEST-0004', TransferDate: '2024-09-03', ExpectedDate: '2024-09-09', Notes: 'Traslado demo 1' },
  { TransferID: 'TR-TEST-0005', TransferDate: '2024-09-06', ExpectedDate: '2024-09-14', Notes: 'Traslado demo 2' },
  { TransferID: 'TR-TEST-0006', TransferDate: '2024-09-10', ExpectedDate: '2024-09-18', Notes: 'Traslado demo 3' },
];

app.get('/mock/sap/TransferSet', (req, res) => {
  try {
    const top = Math.min(Math.max(Number(req.query['$top'] || req.query.top || 10), 1), 100);
    const results = MOCK_SAP_TRANSFERS.slice(0, top).map(t => ({
      TransferID: t.TransferID,
      TransferDate: t.TransferDate,
      ExpectedDate: t.ExpectedDate,
      Notes: t.Notes,
    }));
    return res.json({ d: { results } });
  } catch (e) {
    console.error('Error en mock SAP TR:', e);
    return res.status(500).json({ error: 'Error interno mock SAP TR' });
  }
});

// Endpoint de sincronización real de conectores ERP (SAP B1 soportado)
app.post('/erp/connectors/:id/sync', async (req, res) => {
  try {
    const id = String(req.params.id || '').trim();
    const limit = Math.min(Math.max(Number(req.body?.limit || 50), 1), 500);
    const target = String(req.body?.target || req.query?.target || 'products');
    if (!id) return res.status(400).json({ error: 'id requerido' });

    const { data: connector, error: cErr } = await supabase
      .from('erp_connectors')
      .select('*')
      .eq('id', id)
      .single();
    if (cErr || !connector) return res.status(404).json({ error: 'Conector no encontrado' });
    if (!connector?.endpoint) return res.status(400).json({ error: 'Conector sin endpoint' });

    // Marcar estado como syncing
    await supabase
      .from('erp_connectors')
      .update({ status: 'syncing', updated_at: new Date().toISOString() })
      .eq('id', id);

    const syncStartedAt = new Date().toISOString();
    let logRow = null;
    {
      const { data: log } = await supabase
        .from('erp_sync_logs')
        .insert([{ connector_id: id, sync_type: target, status: 'started', started_at: syncStartedAt }])
        .select()
        .single();
      logRow = log || null;
    }

    const https = require('https');
    const http = require('http');
    const endpoint = String(connector.endpoint || '').trim();
    const username = String(connector.username || '').trim();
    const password = String(connector.password || '').trim();
    const apiKey = String(connector.api_key || '').trim();
    const timeoutMs = Number((connector?.connection_settings || {}).timeout || req.body?.timeout || 30000);

    function buildSapUrl(base, resource, top) {
      let b = String(base || '').trim();
      b = b.replace(/\/$/, '');
      const t = Number(top) || 50;
      return `${b}/${resource}?$top=${t}&$format=json`;
    }

    function buildAuthHeader(username, password, apiKey) {
      if (username && password) {
        const basic = Buffer.from(`${username}:${password}`).toString('base64');
        return `Basic ${basic}`;
      }
      if (apiKey) return `Bearer ${apiKey}`;
      return '';
    }

    let records = [];
    let sourceName = connector.type || 'ERP';
    if ((connector.type || '').toLowerCase().includes('sap')) {
      let resource = 'ProductSet';
      if (target === 'purchase_orders') resource = 'PurchaseOrderSet';
      else if (target === 'sales_orders') resource = 'SalesOrderSet';
      else if (target === 'transfers') resource = 'TransferSet';
      const reqUrl = buildSapUrl(endpoint, resource, limit);
      const u = new URL(reqUrl);
      const isHttps = u.protocol === 'https:';
      const options = {
        method: 'GET',
        headers: { 'Accept': 'application/json', ...(buildAuthHeader(username, password, apiKey) ? { Authorization: buildAuthHeader(username, password, apiKey) } : {}) },
        timeout: timeoutMs,
      };
      const client = isHttps ? https : http;

      const raw = await new Promise((resolve, reject) => {
        const reqOut = client.request(u, options, (resp) => {
          const status = resp.statusCode || 0;
          let body = '';
          resp.on('data', (chunk) => { body += chunk; });
          resp.on('end', () => {
            if (status >= 200 && status < 300) {
              resolve(body);
            } else if (status === 401 || status === 403) {
              reject(new Error('Credenciales inválidas o acceso denegado'));
            } else {
              reject(new Error(`Error ${status} conectando a SAP`));
            }
          });
        });
        reqOut.on('timeout', () => {
          try { reqOut.destroy(); } catch {}
          reject(new Error('Timeout conectando a SAP'));
        });
        reqOut.on('error', (err) => reject(err));
        reqOut.end();
      });

      let json = null;
      try { json = JSON.parse(raw); } catch {}
      const rawResults = json?.d?.results || json?.d || json?.value || [];
      const arr = Array.isArray(rawResults) ? rawResults : (rawResults ? [rawResults] : []);
      if (target === 'purchase_orders') {
        records = arr.map((o) => {
          const po_number = String(o.PurchaseOrderID || o.DocNum || o.DocEntry || o.OrderNumber || '').trim() || `PO-${Math.random().toString(36).slice(2, 8)}`;
          const order_date_raw = o.OrderDate || o.DocumentDate || o.DocDate || null;
          const expected_date_raw = o.ExpectedDate || o.DueDate || null;
          const order_date = order_date_raw ? new Date(order_date_raw).toISOString().split('T')[0] : null;
          const expected_date = expected_date_raw ? new Date(expected_date_raw).toISOString().split('T')[0] : null;
          const total_amount = Number(o.NetAmount || o.Total || o.DocTotal || 0) || 0;
          return {
            po_number,
            status: 'confirmed',
            order_date,
            expected_date,
            total_amount,
            notes: 'Sincronizado desde SAP',
          };
        });
      } else if (target === 'sales_orders') {
        records = arr.map((o) => {
          const so_number = String(o.SalesOrderID || o.DocNum || o.DocEntry || o.OrderNumber || '').trim() || `SO-${Math.random().toString(36).slice(2, 8)}`;
          const order_date_raw = o.OrderDate || o.DocumentDate || o.DocDate || null;
          const required_date_raw = o.RequiredDate || o.DueDate || null;
          const order_date = order_date_raw ? new Date(order_date_raw).toISOString().split('T')[0] : null;
          const required_date = required_date_raw ? new Date(required_date_raw).toISOString().split('T')[0] : null;
          const total_amount = Number(o.NetAmount || o.Total || o.DocTotal || 0) || 0;
          return {
            so_number,
            customer_name: String(o.CustomerName || o.CardName || 'Cliente').trim(),
            status: 'confirmed',
            order_date,
            required_date,
            total_amount,
            notes: 'Sincronizado desde SAP',
          };
        });
      } else if (target === 'transfers') {
        records = arr.map((t) => {
          const transfer_number = String(t.TransferID || t.DocNum || t.DocEntry || t.Number || '').trim() || `TR-${Math.random().toString(36).slice(2, 8)}`;
          const transfer_date_raw = t.TransferDate || t.DocumentDate || t.DocDate || null;
          const expected_date_raw = t.ExpectedDate || t.DueDate || null;
          const transfer_date = transfer_date_raw ? new Date(transfer_date_raw).toISOString().split('T')[0] : null;
          const expected_date = expected_date_raw ? new Date(expected_date_raw).toISOString().split('T')[0] : null;
          return {
            transfer_number,
            status: 'sent',
            transfer_date,
            expected_date,
            notes: 'Sincronizado desde SAP',
          };
        });

        // Asignar almacenes por defecto para permitir generar ítems del traspaso
        try {
          const { data: whRows } = await supabase
            .from('warehouses')
            .select('id, is_active')
            .eq('is_active', true)
            .order('created_at', { ascending: true })
            .limit(2);
          const fromWh = (whRows && whRows[0]) ? whRows[0].id : null;
          const toWh = (whRows && whRows[1]) ? whRows[1].id : ((whRows && whRows[0]) ? whRows[0].id : null);
          if (fromWh) {
            records = records.map(r => ({
              ...r,
              from_warehouse_id: r.from_warehouse_id || fromWh,
              to_warehouse_id: r.to_warehouse_id || toWh,
            }));
          }
        } catch (e) {
          console.warn('No se pudieron consultar warehouses para traspasos:', e?.message || e);
        }
      } else {
        records = arr.map(p => {
          const sku = String(p.ProductID || p.ID || p.ItemCode || p.SKU || '').trim();
          const name = String(p.Name || p.ItemName || p.ProductName || p.Name1 || '').trim() || 'Producto';
          const description = String(p.Description || p.ShortDescription || '').trim() || null;
          const selling_price = Number(p.Price || p.SalesPrice || p.UnitPrice || 0) || 0;
          const cost_price = Number(p.Cost || p.UnitCost || p.ItemCost || p.StandardCost || p.PurchasePrice || p.AvgPrice || 0) || 0;
          return {
            sku: sku || name || `SKU_${Math.random().toString(36).slice(2, 8)}`,
            name,
            description,
            selling_price,
            cost_price,
            unit_of_measure: 'PCS',
            is_active: true,
          };
        });
      }
    } else {
      return res.status(400).json({ error: `Tipo de conector no soportado para sync: ${connector.type || ''}` });
    }

    if (!records.length) {
      await supabase.from('erp_connectors').update({ status: 'active', last_sync: new Date().toISOString() }).eq('id', id);
      if (logRow?.id) {
        await supabase.from('erp_sync_logs').update({ status: 'completed', ended_at: new Date().toISOString(), total_records: 0 }).eq('id', logRow.id);
      }
      return res.json({ ok: true, connector_id: id, processed: 0, source: sourceName, target });
    }

    let processed = 0;
    let newCount = 0;
    let newPoNumbers = [];
    if (target === 'purchase_orders') {
      // Calcular órdenes nuevas comparando po_number existentes
      const poNumbers = records.map(r => r.po_number).filter(Boolean);
      if (poNumbers.length > 0) {
        try {
          const { data: existingRows } = await supabase
            .from('purchase_orders')
            .select('po_number')
            .in('po_number', poNumbers);
          const existingSet = new Set((existingRows || []).map(r => r.po_number));
          newPoNumbers = poNumbers.filter(po => !existingSet.has(po));
          newCount = newPoNumbers.length;
        } catch (e) {
          console.warn('No se pudo consultar órdenes existentes:', e?.message || e);
        }
      }
      const { data: upserted, error: upErr } = await supabase
        .from('purchase_orders')
        .upsert(records, { onConflict: 'po_number' })
        .select('po_number');
      if (upErr) throw upErr;
      processed = (upserted || records).length;
    } else if (target === 'sales_orders') {
      let newSoNumbers = [];
      try {
        const soNumbers = records.map(r => r.so_number).filter(Boolean);
        if (soNumbers.length > 0) {
          const { data: existingRows } = await supabase
            .from('sales_orders')
            .select('so_number')
            .in('so_number', soNumbers);
          const existingSet = new Set((existingRows || []).map(r => r.so_number));
          newSoNumbers = soNumbers.filter(so => !existingSet.has(so));
          newCount = newSoNumbers.length;
        }
      } catch (e) {
        console.warn('No se pudo consultar órdenes de venta existentes:', e?.message || e);
      }
      const { data: upserted, error: upErr } = await supabase
        .from('sales_orders')
        .upsert(records, { onConflict: 'so_number' })
        .select('so_number');
      if (upErr) throw upErr;
      processed = (upserted || records).length;

      // Crear ítems de venta desde inventario con ubicación solo para nuevas órdenes
      if (newSoNumbers.length > 0) {
        try {
          const { data: newOrders, error: newOrdersErr } = await supabase
            .from('sales_orders')
            .select('id, warehouse_id')
            .in('so_number', newSoNumbers);
          if (newOrdersErr) throw newOrdersErr;

          // Inventario disponible con ubicación
          const { data: invRows, error: invErr } = await supabase
            .from('inventory')
            .select('product_id, warehouse_id, location_id, available_quantity, lot_number')
            .gt('available_quantity', 0)
            .not('location_id', 'is', null)
            .limit(100);
          if (invErr) throw invErr;

          const productIds = [...new Set((invRows || []).map(r => r.product_id).filter(Boolean))];
          const { data: prodRows, error: prodErr } = await supabase
            .from('products')
            .select('id, selling_price')
            .in('id', productIds);
          if (prodErr) throw prodErr;
          const priceMap = new Map((prodRows || []).map(p => [p.id, Number(p.selling_price || 1)]));

          const itemsBatch = [];
          for (const order of (newOrders || [])) {
            // Seleccionar hasta 3 productos con stock y ubicación, idealmente del almacén del pedido si existe
            const picks = (invRows || [])
              .filter(r => !order.warehouse_id || r.warehouse_id === order.warehouse_id)
              .slice(0, Math.min(3, (invRows || []).length));
            for (const r of picks) {
              const qtyAvail = Number(r.available_quantity || 0);
              const qty = Math.max(1, Math.min(3, qtyAvail || 1));
              const unitPrice = priceMap.get(r.product_id) || 1;
              itemsBatch.push({
                sales_order_id: order.id,
                product_id: r.product_id,
                quantity: qty,
                unit_price: unitPrice,
                notes: 'Sincronizado desde ERP (stock)'
              });
            }
          }
          if (itemsBatch.length) {
            const { error: insErr } = await supabase
              .from('sales_order_items')
              .insert(itemsBatch);
            if (insErr) throw insErr;
          }
        } catch (e) {
          console.warn('No se pudieron agregar ítems a nuevas órdenes de venta desde inventario:', e?.message || e);
        }
      }
    } else if (target === 'transfers') {
      let newTransferNumbers = [];
      try {
        const transferNumbers = records.map(r => r.transfer_number).filter(Boolean);
        if (transferNumbers.length > 0) {
          const { data: existingRows } = await supabase
            .from('transfers')
            .select('transfer_number')
            .in('transfer_number', transferNumbers);
          const existingSet = new Set((existingRows || []).map(r => r.transfer_number));
          newTransferNumbers = transferNumbers.filter(tr => !existingSet.has(tr));
          newCount = newTransferNumbers.length;
        }
      } catch (e) {
        console.warn('No se pudo consultar traspasos existentes:', e?.message || e);
      }
      const { data: upserted, error: upErr } = await supabase
        .from('transfers')
        .upsert(records, { onConflict: 'transfer_number' })
        .select('transfer_number');
      if (upErr) throw upErr;
      processed = (upserted || records).length;

      // Crear ítems de traspaso desde inventario del almacén origen (solo nuevas transferencias)
      if (newTransferNumbers.length > 0) {
        try {
          const { data: newTransfers, error: newTransErr } = await supabase
            .from('transfers')
            .select('id, from_warehouse_id')
            .in('transfer_number', newTransferNumbers);
          if (newTransErr) throw newTransErr;

          const itemsBatch = [];
          for (const tr of (newTransfers || [])) {
            let invRows = [];
            if (tr.from_warehouse_id) {
              const { data, error: invErr } = await supabase
                .from('inventory')
                .select('product_id, available_quantity, lot_number, warehouse_id, location_id')
                .eq('warehouse_id', tr.from_warehouse_id)
                .gt('available_quantity', 0)
                .not('location_id', 'is', null)
                .limit(20);
              if (invErr) throw invErr;
              invRows = data || [];
            } else {
              const { data, error: invErr } = await supabase
                .from('inventory')
                .select('product_id, available_quantity, lot_number, warehouse_id, location_id')
                .gt('available_quantity', 0)
                .not('location_id', 'is', null)
                .limit(20);
              if (invErr) throw invErr;
              invRows = data || [];
            }
            const picks = (invRows || []).slice(0, Math.min(3, (invRows || []).length));
            for (const r of picks) {
              const qtyAvail = Number(r.available_quantity || 0);
              const qty = Math.max(1, Math.min(5, qtyAvail || 1));
              itemsBatch.push({
                transfer_id: tr.id,
                product_id: r.product_id,
                quantity: qty,
                lot_number: r.lot_number || null,
                notes: 'Sincronizado desde ERP (stock)'
              });
            }
          }
          if (itemsBatch.length) {
            const { error: insErr } = await supabase
              .from('transfer_items')
              .insert(itemsBatch);
            if (insErr) throw insErr;
          }
        } catch (e) {
          console.warn('No se pudieron agregar ítems a nuevas transferencias desde inventario:', e?.message || e);
        }
      }
    } else {
      // Calcular productos nuevos comparando sku existentes
      try {
        const skus = records.map(r => r.sku).filter(Boolean);
        if (skus.length > 0) {
          const { data: existingProducts } = await supabase
            .from('products')
            .select('sku')
            .in('sku', skus);
          const existingSet = new Set((existingProducts || []).map(p => p.sku));
          const newSkus = skus.filter(sku => !existingSet.has(sku));
          newCount = newSkus.length;
        }
      } catch (e) {
        console.warn('No se pudo consultar productos existentes:', e?.message || e);
      }
      const { data: upserted, error: upErr } = await supabase
        .from('products')
        .upsert(records, { onConflict: 'sku' })
        .select('sku');
      if (upErr) throw upErr;
      processed = (upserted || records).length;
    }

    await supabase
      .from('erp_connectors')
      .update({
        status: 'active',
        last_sync: new Date().toISOString(),
        records_processed: Number(connector.records_processed || 0) + processed,
        error_count: Number(connector.error_count || 0),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (logRow?.id) {
      await supabase
        .from('erp_sync_logs')
        .update({
          status: 'completed',
          ended_at: new Date().toISOString(),
          total_records: processed,
          error_message: null,
        })
        .eq('id', logRow.id);
    }

    // Si se crearon nuevas órdenes de compra, agregar ítems válidos basados en productos existentes
    if (target === 'purchase_orders' && newPoNumbers.length > 0) {
      try {
        const { data: newOrders, error: newOrdErr } = await supabase
          .from('purchase_orders')
          .select('id, po_number')
          .in('po_number', newPoNumbers);
        if (newOrdErr) throw newOrdErr;
        const orderIds = (newOrders || []).map(o => o.id);

        const { data: prodRows, error: prodErr } = await supabase
          .from('products')
          .select('id, cost_price')
          .eq('is_active', true)
          .limit(10);
        if (prodErr) throw prodErr;
        let activeProds = prodRows || [];
        if (!activeProds.length) {
          try {
            const demoSkus = ['DEMO-PROD-1', 'DEMO-PROD-2', 'DEMO-PROD-3'];
            const { data: createdDemo, error: demoErr } = await supabase
              .from('products')
              .insert(demoSkus.map(sku => ({
                sku,
                name: sku,
                description: null,
                unit_of_measure: 'PCS',
                is_active: true,
                cost_price: 1,
                selling_price: null,
              })))
              .select('id, cost_price');
            if (!demoErr) {
              activeProds = createdDemo || [];
            }
          } catch (e) {
            console.warn('No se pudieron crear productos demo para PO:', e?.message || e);
          }
        }

        if (orderIds.length && activeProds.length) {
          console.log('Saltando ítems de ejemplo para órdenes de compra; se utilizarán ítems reales del inventario durante la sincronización.');
        }
      } catch (e) {
        console.warn('No se pudieron agregar ítems de ejemplo a órdenes nuevas:', e?.message || e);
      }
    }

    // Se omite la inserción de ítems de ejemplo para órdenes de venta.
    if (target === 'sales_orders' && newCount > 0) {
      console.log('Saltando ítems de ejemplo para órdenes de venta; se utilizarán ítems reales del inventario durante la sincronización.');
    }

    // Enviar notificación si hay nuevas órdenes
    if (target === 'purchase_orders' && newCount > 0) {
      try {
        const payload = JSON.stringify({
          title: 'Nuevas órdenes de compra',
          body: `Se han creado ${newCount} órdenes nuevas`,
          url: '/reception/orders'
        });
        // best-effort
        sendPushToAll(payload).catch(() => {});
      } catch (e) {
        console.warn('Error enviando push nuevas órdenes:', e?.message || e);
      }
    }

    // Notificación si hay nuevos pedidos (ventas)
    if (target === 'sales_orders' && newCount > 0) {
      try {
        const payload = JSON.stringify({
          title: 'Nuevos pedidos',
          body: `Se han creado ${newCount} pedidos nuevos`,
          url: '/picking/orders'
        });
        sendPushToAll(payload).catch(() => {});
      } catch (e) {
        console.warn('Error enviando push nuevos pedidos:', e?.message || e);
      }
    }

    // Notificación si hay nuevos traspasos
    if (target === 'transfers' && newCount > 0) {
      try {
        const payload = JSON.stringify({
          title: 'Nuevos traspasos',
          body: `Se han creado ${newCount} traspasos nuevos`,
          url: '/warehouse/transfers'
        });
        sendPushToAll(payload).catch(() => {});
      } catch (e) {
        console.warn('Error enviando push nuevos traspasos:', e?.message || e);
      }
    }

    // Enviar notificación si hay nuevos productos
    if (target === 'products' && newCount > 0) {
      try {
        const payload = JSON.stringify({
          title: 'Nuevos productos',
          body: `Se han agregado ${newCount} productos nuevos`,
          url: '/inventory/products'
        });
        // best-effort
        sendPushToAll(payload).catch(() => {});
      } catch (e) {
        console.warn('Error enviando push nuevos productos:', e?.message || e);
      }
    }

    if (ERP_RESTRICT_CATALOG_TO_PO && target === 'purchase_orders') {
      try {
        const result = await restrictProductsToPoItems();
        console.log('[ERP] Catálogo restringido a PO items', result);
      } catch (e) {
        console.warn('[ERP] No se pudo aplicar restricción de catálogo:', e?.message || e);
      }
    }
    return res.json({ ok: true, connector_id: id, processed, source: sourceName, target, newCount });
  } catch (e) {
    console.error('Error en /erp/connectors/:id/sync:', e);
    try {
      const id = String(req.params.id || '').trim();
      const { data: connector } = await supabase
        .from('erp_connectors')
        .select('*')
        .eq('id', id)
        .single();
      if (connector) {
        await supabase
          .from('erp_connectors')
          .update({
            status: 'error',
            error_count: Number(connector.error_count || 0) + 1,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id);
      }
    } catch {}
    try {
      const id = String(req.params.id || '').trim();
      const { data: logs } = await supabase
        .from('erp_sync_logs')
        .select('id')
        .eq('connector_id', id)
        .order('created_at', { ascending: false })
        .limit(1);
      const lastLog = (logs || [])[0];
      if (lastLog?.id) {
        await supabase
          .from('erp_sync_logs')
          .update({
            status: 'failed',
            ended_at: new Date().toISOString(),
            error_message: e?.message || String(e),
          })
          .eq('id', lastLog.id);
      }
    } catch {}
    return res.status(500).json({ error: e?.message || 'Error interno sincronizando conector' });
  }
});

// -------------------------------------------------
// Dashboard metrics (aggregados para tarjetas KPI)
// Público, usa clave de servicio para lecturas seguras
// -------------------------------------------------
app.get('/metrics/dashboard', async (_req, res) => {
  try {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const lastDay = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Inventario total en valor: sum(available_quantity * cost_price)
    let inventoryTotalValue = 0;
    {
      const { data, error } = await supabase
        .from('inventory')
        .select('available_quantity, products:product_id(cost_price)');
      if (error) throw error;
      for (const row of data || []) {
        const qty = Number(row?.available_quantity || 0);
        const cost = Number((row?.products || {}).cost_price || 0);
        inventoryTotalValue += qty * cost;
      }
    }

    // Precisión de inventario a partir de conteos cíclicos últimos 30 días
    let inventoryAccuracy = null;
    {
      const { data, error } = await supabase
        .from('cycle_count_items')
        .select('variance, system_quantity, created_at')
        .gte('created_at', last30Days.toISOString());
      if (error) throw error;
      const totalSystem = (data || []).reduce((acc, r) => acc + Number(r?.system_quantity || 0), 0);
      const totalVarianceAbs = (data || []).reduce((acc, r) => acc + Math.abs(Number(r?.variance || 0)), 0);
      if (totalSystem > 0) {
        inventoryAccuracy = Math.max(0, Math.min(100, (1 - totalVarianceAbs / totalSystem) * 100));
      }
    }

    // Órdenes procesadas en el último día (ventas enviadas)
    let ordersProcessed = 0;
    {
      const { count, error } = await supabase
        .from('sales_orders')
        .select('id', { count: 'exact', head: true })
        .gte('shipped_date', lastDay.toISOString().slice(0, 10));
      if (error) throw error;
      ordersProcessed = Number(count || 0);
    }

    // Productividad de picking: movimientos de envío hoy por hora
    let pickingProductivity = null;
    {
      const { count, error } = await supabase
        .from('inventory_movements')
        .select('id', { count: 'exact', head: true })
        .eq('transaction_type', 'SHIPMENT')
        .gte('created_at', startOfToday.toISOString());
      if (error) throw error;
      const hours = Math.max(1, (now.getTime() - startOfToday.getTime()) / (60 * 60 * 1000));
      pickingProductivity = Number(count || 0) / hours;
    }

    // OTIF: pedidos enviados a tiempo últimos 30 días
    let otif = null;
    {
      const { data, error } = await supabase
        .from('sales_orders')
        .select('required_date, shipped_date')
        .gte('order_date', last30Days.toISOString().slice(0, 10));
      if (error) throw error;
      let onTime = 0, total = 0;
      for (const r of data || []) {
        const req = r?.required_date ? new Date(r.required_date) : null;
        const shp = r?.shipped_date ? new Date(r.shipped_date) : null;
        if (shp) {
          total++;
          if (req && shp <= req) onTime++;
        }
      }
      if (total > 0) otif = (onTime / total) * 100;
    }

    // Rotación stock: razón simple de envíos últimos 90 días / productos distintos
    let stockRotation = null;
    {
      const last90Days = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      const { data, error } = await supabase
        .from('inventory_movements')
        .select('product_id')
        .eq('transaction_type', 'SHIPMENT')
        .gte('created_at', last90Days.toISOString());
      if (error) throw error;
      const totalShipments = (data || []).length;
      const distinctProducts = new Set((data || []).map(r => r.product_id)).size || 1;
      stockRotation = totalShipments / distinctProducts;
    }

    // Alertas activas: filas de inventario bajo punto de pedido
    let alertsActive = 0;
    {
      const { data, error } = await supabase
        .from('inventory')
        .select('available_quantity, product_id, products:product_id(reorder_point, is_active)');
      if (error) throw error;
      for (const r of data || []) {
        const avail = Number(r?.available_quantity || 0);
        const rp = Number((r?.products || {}).reorder_point || 0);
        const active = (r?.products || {}).is_active !== false;
        if (active && avail <= rp) alertsActive++;
      }
    }

    // Operarios activos: perfiles activos con rol operator
    let operatorsActive = 0;
    {
      const { count, error } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'operator')
        .eq('is_active', true);
      if (error) throw error;
      operatorsActive = Number(count || 0);
    }

    return res.json({
      inventory_total_value: inventoryTotalValue,
      inventory_accuracy: inventoryAccuracy, // porcentaje 0..100 o null
      orders_processed_last_day: ordersProcessed,
      picking_productivity_lines_per_hour: pickingProductivity, // líneas/h
      otif_percentage: otif, // porcentaje 0..100 o null
      stock_rotation_x: stockRotation, // factor
      alerts_active: alertsActive,
      operators_active: operatorsActive,
    });
  } catch (e) {
    console.error('Error calculando métricas del dashboard:', e);
    return res.status(500).json({ error: 'Error interno calculando métricas' });
  }
});

// -------------------------------------------------
// Actividad reciente (últimos movimientos y eventos)
// -------------------------------------------------
app.get('/activity/recent', async (_req, res) => {
  try {
    const items = [];

    // Últimos movimientos de inventario
    const { data: moves, error: movesErr } = await supabase
      .from('inventory_movements')
      .select('created_at, transaction_type, quantity, reference_number, reference_type, location_id, performed_by, locations:location_id(code, zone)')
      .order('created_at', { ascending: false })
      .limit(6);
    if (movesErr) throw movesErr;

    for (const m of moves || []) {
      const ts = new Date(m.created_at);
      const minutesAgo = Math.max(1, Math.round((Date.now() - ts.getTime()) / 60000));
      const loc = m.locations?.code ? `${m.locations.code}` : '';
      const base = {
        id: `${m.reference_number || ''}-${ts.getTime()}`,
        description: `${m.reference_type || ''} - ${m.quantity || 0} unidades`,
        location: loc,
        timestamp: `${minutesAgo} min`,
      };
      if (m.transaction_type === 'RECEIPT') {
        items.push({ ...base, type: 'inbound', title: 'Recepción completada', priority: 'medium' });
      } else if (m.transaction_type === 'SHIPMENT') {
        items.push({ ...base, type: 'outbound', title: 'Envío preparado', priority: 'medium' });
      } else if (m.transaction_type === 'CYCLE_COUNT') {
        items.push({ ...base, type: 'completed', title: 'Conteo cíclico registrado', priority: 'low' });
      } else {
        items.push({ ...base, type: 'pending', title: 'Movimiento de inventario', priority: 'low' });
      }
    }

    // Alerta de stock bajo (una muestra)
    const { data: invLow, error: invErr } = await supabase
      .from('inventory')
      .select('available_quantity, product_id, products:product_id(sku, name, reorder_point)')
      .lte('available_quantity', 0) // primero intentamos críticos
      .limit(1);
    if (invErr) throw invErr;
    const alertRow = (invLow || [])[0];
    if (alertRow) {
      const sku = alertRow.products?.sku || 'SKU';
      const avail = alertRow.available_quantity || 0;
      items.unshift({
        id: `alert-${sku}`,
        type: 'alert',
        title: 'Stock bajo detectado',
        description: `${sku} - Solo ${avail} unidades disponibles`,
        location: '',
        timestamp: 'justo ahora',
        priority: 'critical',
      });
    }

    return res.json({ items });
  } catch (e) {
    console.error('Error obteniendo actividad reciente:', e);
    return res.status(500).json({ error: 'Error interno obteniendo actividad' });
  }
});

// -------------------------------------------------
// Activity Logs: GET/POST sobre tabla activity_logs
// -------------------------------------------------
app.get('/activity/logs', authMiddleware, async (req, res) => {
  try {
    const limit = Math.max(1, Math.min(200, parseInt(req.query.limit, 10) || 50));
    const { data, error } = await supabase
      .from('activity_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return res.json({ items: data || [] });
  } catch (e) {
    console.error('Error obteniendo activity_logs:', e);
    return res.status(500).json({ error: 'Error interno obteniendo logs' });
  }
});

app.post('/activity/logs', authMiddleware, async (req, res) => {
  try {
    const user = req.user || {};
    const payload = req.body || {};
    const allowedActionTypes = new Set(['login','logout','create','update','delete','view','config','permission']);
    const allowedStatus = new Set(['success','warning','error']);

    const action_type = String(payload.action_type || '').trim();
    if (!allowedActionTypes.has(action_type)) {
      return res.status(400).json({ error: 'action_type inválido' });
    }
    const status = String(payload.status || 'success').trim();
    if (!allowedStatus.has(status)) {
      return res.status(400).json({ error: 'status inválido' });
    }

    const insertRow = {
      user_id: user.id || null,
      user_name: user.name || user.email || null,
      user_role: Array.isArray(user.roles) ? user.roles[0] || null : user.role || null,
      action_type,
      action: payload.action || null,
      resource: payload.resource || null,
      resource_id: payload.resource_id || null,
      details: payload.details || null,
      ip_address: req.ip || null,
      user_agent: req.headers['user-agent'] || null,
      status,
      duration: Number(payload.duration || 0) || null,
      created_at: new Date().toISOString(),
    };

    const { error } = await supabase.from('activity_logs').insert(insertRow);
    if (error) throw error;
    return res.json({ ok: true });
  } catch (e) {
    console.error('Error creando activity_log:', e);
    return res.status(500).json({ error: 'Error interno creando log' });
  }
});

// ---------------------------------------
// Realtime: inventario -> enviar Web Push
// ---------------------------------------
try {
  const channel = supabase
    .channel('realtime:inventory_push')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory' }, async (payload) => {
      try {
        const evt = payload?.eventType;
        const rowNew = payload?.new || {};
        const rowOld = payload?.old || {};

        const productId = rowNew?.product_id;
        if (!productId) return;

        const { data: product, error: pErr } = await supabase
          .from('products')
          .select('sku, name, min_stock_level, reorder_point')
          .eq('id', productId)
          .single();
        if (pErr || !product) return;

        const quantity = Number(rowNew?.quantity ?? 0);
        const minStock = Number(product.min_stock_level ?? 0);
        const reorderPoint = Number(product.reorder_point ?? minStock);

        const wasBelowReorder = rowOld?.quantity !== undefined ? Number(rowOld.quantity) <= reorderPoint : false;
        const nowBelowReorder = quantity <= reorderPoint;
        const wasBelowMin = rowOld?.quantity !== undefined ? Number(rowOld.quantity) <= minStock : false;
        const nowBelowMin = quantity <= minStock;

        // Caducidad
        const expiryDateStr = rowNew?.expiry_date ?? null;
        let expiryType = null;
        if (expiryDateStr) {
          const expiryDate = new Date(expiryDateStr);
          const diffDays = Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
          if (diffDays < 0) expiryType = 'expired';
          else if (diffDays <= 30) expiryType = 'expiry_soon';
        }

        if (evt !== 'DELETE') {
          let title = null;
          let body = null;
          if (!wasBelowReorder && nowBelowReorder) {
            title = 'Stock crítico';
            body = `${product.name} (${product.sku}) cayó a ${quantity}`;
          } else if (!wasBelowMin && nowBelowMin) {
            title = 'Stock bajo';
            body = `${product.name} (${product.sku}) bajo mínimo (${quantity}/${minStock})`;
          } else if (expiryType === 'expired') {
            title = 'Producto caducado';
            body = `${product.name} (${product.sku}) caducó`;
          } else if (expiryType === 'expiry_soon') {
            title = 'Caducidad próxima';
            body = `${product.name} (${product.sku}) caduca pronto`;
          }

          if (title && body) {
            const payload = JSON.stringify({ title, body, url: '/inventory/alerts' });
            for (const sub of pushSubscriptions.values()) {
              try { await webpush.sendNotification(sub, payload); } catch (e) { /* log y seguir */ }
            }
          }
        }
      } catch (err) {
        console.warn('Error procesando evento realtime push:', err);
      }
    });
  channel.subscribe();
} catch (e) {
  console.warn('No se pudo suscribir a realtime inventario en backend:', e?.message || e);
}

// -------------------------------------------------
// Tareas pendientes (picking/receiving/replenishment)
// -------------------------------------------------
app.get('/tasks/pending', async (_req, res) => {
  try {
    const tasks = [];

    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);

    // Órdenes de venta en picking o pendientes
    const { data: soList, error: soErr } = await supabase
      .from('sales_orders')
      .select('id, so_number, customer_name, status, required_date')
      .in('status', ['pending', 'picking'])
      .order('required_date', { ascending: true })
      .limit(3);
    if (soErr) throw soErr;
    for (const so of soList || []) {
      const due = so.required_date || todayStr;
      const overdue = new Date(due) < today;
      tasks.push({
        id: `so-${so.id}`,
        type: 'picking',
        title: 'Picking',
        description: `Orden ${so.so_number} - ${so.customer_name}`,
        priority: overdue ? 'urgent' : 'high',
        assignedTo: '',
        dueDate: due,
        estimatedTime: '—',
        location: 'Zona A',
        status: overdue ? 'overdue' : 'pending',
      });
    }

    // Órdenes de compra confirmadas para recepción
    const { data: poList, error: poErr } = await supabase
      .from('purchase_orders')
      .select('id, po_number, supplier_id, status, expected_date')
      .eq('status', 'confirmed')
      .order('expected_date', { ascending: true })
      .limit(2);
    if (poErr) throw poErr;
    for (const po of poList || []) {
      const due = po.expected_date || todayStr;
      const overdue = new Date(due) < today;
      tasks.push({
        id: `po-${po.id}`,
        type: 'receiving',
        title: 'Recepción',
        description: `PO ${po.po_number} - Programada`,
        priority: overdue ? 'high' : 'medium',
        assignedTo: '',
        dueDate: due,
        estimatedTime: '—',
        location: 'Muelle A',
        status: overdue ? 'overdue' : 'pending',
      });
    }

    // Reposición por stock bajo (hasta 2)
    const { data: lowInv, error: lowErr } = await supabase
      .from('inventory')
      .select('available_quantity, location_id, product_id, products:product_id(sku, name, reorder_point), locations:location_id(code, zone)')
      .lte('available_quantity', 5)
      .order('available_quantity', { ascending: true })
      .limit(2);
    if (lowErr) throw lowErr;
    for (const r of lowInv || []) {
      const sku = r.products?.sku || String(r.product_id || 'SKU');
      const locCode = r.locations?.code ? `${r.locations.code}` : '';
      const locId = r.location_id ? String(r.location_id) : 'none';
      // Usar combinación product_id + location_id para garantizar unicidad del ID
      tasks.push({
        id: `rep-${r.product_id || sku}-${locId}`,
        type: 'replenishment',
        title: 'Reposición',
        description: `${sku} bajo stock (${r.available_quantity})`,
        priority: 'medium',
        assignedTo: '',
        dueDate: todayStr,
        estimatedTime: '—',
        location: locCode || 'Zona',
        status: 'pending',
      });
    }

    // Deduplicar tareas por ID manteniendo el primer elemento
    const seenIds = new Set();
    const uniqueTasks = [];
    for (const t of tasks) {
      if (seenIds.has(t.id)) continue;
      seenIds.add(t.id);
      uniqueTasks.push(t);
    }

    return res.json({ tasks: uniqueTasks });
  } catch (e) {
    console.error('Error obteniendo tareas pendientes:', e);
    return res.status(500).json({ error: 'Error interno obteniendo tareas' });
  }
});

// =====================================================
// Picking: métricas y tareas reales
// =====================================================

app.get('/picking/metrics', async (_req, res) => {
  try {
    // 1) Tareas pendientes: órdenes en estados relevantes
    const { count: pendingOrdersCount, error: countErr } = await supabase
      .from('sales_orders')
      .select('id', { count: 'exact', head: true })
      .in('status', ['pending', 'confirmed', 'picking']);
    if (countErr) return res.status(500).json({ error: countErr.message });

    // 2) Productividad: % de avance en órdenes en picking (items pickeados / ordenados)
    const { data: pickingOrders, error: pickOrdersErr } = await supabase
      .from('sales_orders')
      .select('id')
      .eq('status', 'picking')
      .limit(100);
    if (pickOrdersErr) return res.status(500).json({ error: pickOrdersErr.message });

    let productivityPct = 0;
    if (pickingOrders && pickingOrders.length) {
      const orderIds = pickingOrders.map(o => o.id);
      const { data: orderItems, error: itemsErr } = await supabase
        .from('sales_order_items')
        .select('sales_order_id, quantity, picked_quantity')
        .in('sales_order_id', orderIds);
      if (itemsErr) return res.status(500).json({ error: itemsErr.message });
      const totals = (orderItems || []).reduce((acc, it) => {
        acc.req += it.quantity || 0;
        acc.picked += it.picked_quantity || 0;
        return acc;
      }, { req: 0, picked: 0 });
      productivityPct = totals.req > 0 ? Math.round((totals.picked / totals.req) * 1000) / 10 : 0; // 1 decimal
    }

    // 3) Tiempo promedio: duración promedio (min) de envíos por orden en el día
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const { data: todayShipMovs, error: movErr } = await supabase
      .from('inventory_movements')
      .select('reference_number, created_at')
      .eq('transaction_type', 'SHIPMENT')
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString());
    if (movErr) return res.status(500).json({ error: movErr.message });
    const byOrder = new Map();
    for (const m of (todayShipMovs || [])) {
      const key = m.reference_number || 'unknown';
      const t = new Date(m.created_at).getTime();
      const prev = byOrder.get(key) || { min: t, max: t };
      byOrder.set(key, { min: Math.min(prev.min, t), max: Math.max(prev.max, t) });
    }
    let avgMinutes = 0;
    if (byOrder.size > 0) {
      let sum = 0;
      for (const { min, max } of byOrder.values()) {
        sum += Math.max(0, (max - min) / 60000);
      }
      avgMinutes = Math.round((sum / byOrder.size) * 10) / 10; // 1 decimal
    }

    // 4) Operarios activos
    const { count: activeOps, error: opsErr } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'OPERATOR')
      .eq('is_active', true);
    if (opsErr) return res.status(500).json({ error: opsErr.message });

    // 5) Tareas completadas (órdenes con fecha de envío en últimos 7 días)
    const last7 = new Date();
    last7.setDate(last7.getDate() - 7);
    const { count: completedCount, error: compErr } = await supabase
      .from('sales_orders')
      .select('id', { count: 'exact', head: true })
      .not('shipped_date', 'is', null)
      .gte('shipped_date', last7.toISOString().slice(0, 10));
    if (compErr) return res.status(500).json({ error: compErr.message });

    return res.json({
      pendingTasks: pendingOrdersCount || 0,
      productivity: productivityPct, // porcentaje 0-100
      avgTimeMinutes: avgMinutes,
      activeOperators: activeOps || 0,
      completedTasks: completedCount || 0,
    });
  } catch (e) {
    console.error('Error en /picking/metrics', e);
    return res.status(500).json({ error: 'Error interno' });
  }
});

// =====================================================
// Picking: lotes (batch picking) derivados de órdenes reales
// =====================================================
// SSE: clientes conectados y canal de realtime
const sseClients = new Set();
let sseChannelInitialized = false;
let sseChannel = null;

function broadcastSSE(payload) {
  const data = `data: ${JSON.stringify(payload)}\n\n`;
  for (const res of sseClients) {
    try { res.write(data); } catch {}
  }
}

async function ensureRealtimeInit() {
  if (sseChannelInitialized) return;
  sseChannelInitialized = true;
  try {
    sseChannel = supabase.channel('realtime-batches')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'picking_batches' }, (payload) => {
        broadcastSSE({ type: 'picking_batches', payload });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'picking_batch_orders' }, (payload) => {
        broadcastSSE({ type: 'picking_batch_orders', payload });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'picking_batch_items' }, (payload) => {
        broadcastSSE({ type: 'picking_batch_items', payload });
        // Recalcular progreso del lote cuando cambian los ítems del lote
        const batchId = payload?.new?.batch_id || payload?.old?.batch_id;
        if (batchId) {
          (async () => {
            try {
              const { data: pitems } = await supabase
                .from('picking_batch_items')
                .select('total_quantity, picked_quantity')
                .eq('batch_id', batchId);
              const totalItems = (pitems || []).reduce((s, it) => s + (Number(it.total_quantity) || 0), 0);
              const pickedItems = (pitems || []).reduce((s, it) => s + (Number(it.picked_quantity) || 0), 0);
              const efficiency = totalItems ? Math.round((pickedItems / totalItems) * 100) : 0;
              await supabase
                .from('picking_batches')
                .update({ picked_items: pickedItems, total_items: totalItems, efficiency })
                .eq('id', batchId);
              broadcastSSE({ type: 'progress_update', batchId, pickedItems, totalItems, efficiency });
            } catch (err) {
              console.error('[Realtime] Error recalculando progreso de lote (items)', err);
            }
          })();
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'sales_order_items' }, async (payload) => {
        try {
          const soId = payload?.new?.sales_order_id || payload?.old?.sales_order_id;
          if (!soId) return;
          const { data: rel } = await supabase
            .from('picking_batch_orders')
            .select('batch_id')
            .eq('sales_order_id', soId)
            .limit(1);
          const batchId = rel && rel[0]?.batch_id;
          if (!batchId) return;
          // Recalcular progreso del lote usando picking_batch_items (no sales_order_items)
          const { data: pitems } = await supabase
            .from('picking_batch_items')
            .select('total_quantity, picked_quantity')
            .eq('batch_id', batchId);
          const totalItems = (pitems || []).reduce((s, it) => s + (Number(it.total_quantity) || 0), 0);
          const pickedItems = (pitems || []).reduce((s, it) => s + (Number(it.picked_quantity) || 0), 0);
          const efficiency = totalItems ? Math.round((pickedItems / totalItems) * 100) : 0;
          await supabase
            .from('picking_batches')
            .update({ picked_items: pickedItems, total_items: totalItems, efficiency })
            .eq('id', batchId);
          broadcastSSE({ type: 'progress_update', batchId, pickedItems, totalItems, efficiency });
        } catch (err) {
          console.error('[Realtime] Error recalculando progreso de lote', err);
        }
      })
      .subscribe();
  } catch (err) {
    console.error('Error inicializando Realtime para SSE', err);
  }
}

app.get('/picking/batches', authMiddleware, async (req, res) => {
  try {
    const userId = (req.user || {}).sub;
    const userEmail = (req.user || {}).email || '';
    const roleUp = String((req.user || {}).role || '').toUpperCase();
    let userFullName = '';
    try {
      const { data: meRow } = await supabase
        .from('app_users')
        .select('id, full_name')
        .eq('id', userId)
        .single();
      userFullName = String(meRow?.full_name || '');
    } catch {}
    const { status: statusParam, priority: priorityParam } = req.query || {};
    // Leer lotes persistidos
    let batchQuery = supabase
      .from('picking_batches')
      .select('id, name, status, assigned_to, zone, estimated_time, actual_time, created_at, completed_at, efficiency, total_items, picked_items, priority, grouping_criterion')
      .order('created_at', { ascending: false });
    if (String(statusParam) === 'completed') batchQuery = batchQuery.eq('status', 'completed');
    else if (String(statusParam) === 'pending') batchQuery = batchQuery.eq('status', 'pending');
    else if (String(statusParam) === 'in_progress') batchQuery = batchQuery.eq('status', 'in_progress');
    else if (String(statusParam) === 'cancelled') batchQuery = batchQuery.eq('status', 'cancelled');
    if (priorityParam && ['high','medium','low'].includes(String(priorityParam))) {
      batchQuery = batchQuery.eq('priority', String(priorityParam));
    }
    const { data: batchRows, error: batchErr } = await batchQuery.limit(50);
    if (batchErr) {
      const msg = String(batchErr?.message || '');
      if (/permission denied|does not exist|relation .* does not exist/i.test(msg)) {
        console.warn('[picking/batches] Fallback vacío por error:', msg);
        return res.json({ batches: [] });
      }
      return res.status(500).json({ error: batchErr.message });
    }

    const batchIds = (batchRows || []).map(b => b.id);
    const { data: joinRows, error: joinErr } = await supabase
      .from('picking_batch_orders')
      .select('batch_id, sales_order_id')
      .in('batch_id', batchIds);
    if (joinErr) {
      const msg = String(joinErr?.message || '');
      if (/permission denied|does not exist|relation .* does not exist/i.test(msg)) {
        console.warn('[picking/batches] Fallback vacío por error join:', msg);
        return res.json({ batches: [] });
      }
      return res.status(500).json({ error: joinErr.message });
    }
    const orderIds = Array.from(new Set((joinRows || []).map(r => r.sales_order_id)));
    const { data: orderRows } = await supabase
      .from('sales_orders')
      .select('id, so_number, customer_name, required_date')
      .in('id', orderIds);
    const { data: itemRows } = await supabase
      .from('sales_order_items')
      .select('sales_order_id, quantity')
      .in('sales_order_id', orderIds);
    const itemsByOrder = new Map();
    (itemRows || []).forEach(it => {
      itemsByOrder.set(it.sales_order_id, (itemsByOrder.get(it.sales_order_id) || 0) + (Number(it.quantity) || 0));
    });
    const ordersById = new Map((orderRows || []).map(o => [o.id, o]));

    let batches = (batchRows || []).map(b => {
      const relOrders = (joinRows || []).filter(r => r.batch_id === b.id).map(r => ordersById.get(r.sales_order_id)).filter(Boolean);
      const orders = relOrders.map(o => ({
        id: o.id,
        number: o.so_number,
        items: itemsByOrder.get(o.id) || 0,
        customer: o.customer_name,
        required_date: o.required_date,
      }));
      return {
        id: b.id,
        name: b.name,
        status: b.status,
        assignedTo: b.assigned_to || '',
        zone: b.zone || 'Zona A - Picking',
        orders,
        totalItems: b.total_items || 0,
        pickedItems: b.picked_items || 0,
        estimatedTime: b.estimated_time || 0,
        actualTime: b.actual_time || undefined,
        createdAt: b.created_at,
        completedAt: b.completed_at || undefined,
        efficiency: b.efficiency || 0,
        priority: b.priority || 'medium',
        groupingCriterion: b.grouping_criterion || null,
      };
    });

    // Filtrar por permisos: si no es ADMIN, solo ver lotes asignados al usuario
    if (roleUp !== 'ADMIN') {
      const candidates = new Set([userEmail, userFullName].filter(Boolean).map((s) => String(s)));
      batches = (batches || []).filter((b) => candidates.has(String(b.assignedTo || '')));
    }

    // Normalizar payload de órdenes (sin required_date)
    batches = batches.map(b => ({
      ...b,
      orders: (b.orders || []).map(o => ({ id: o.id, number: o.number, items: o.items, customer: o.customer }))
    }));

    return res.json({ batches });
  } catch (e) {
    console.error('Error en /picking/batches', e);
    return res.status(500).json({ error: 'Error interno' });
  }
});

// Iniciar lote: cambia estado a in_progress y marca hora de inicio
app.post('/picking/batches/:id/start', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    // Validar permiso: solo ADMIN o asignado
    const roleUp = String((req.user || {}).role || '').toUpperCase();
    const viewerEmail = (req.user || {}).email || '';
    let viewerName = '';
    try {
      const { data: meRow } = await supabase
        .from('app_users')
        .select('full_name')
        .eq('id', (req.user || {}).sub)
        .single();
      viewerName = String(meRow?.full_name || '');
    } catch {}
    if (roleUp !== 'ADMIN') {
      const { data: bRow } = await supabase
        .from('picking_batches')
        .select('assigned_to')
        .eq('id', id)
        .single();
      const assigned = String(bRow?.assigned_to || '');
      if (!(assigned === viewerEmail || assigned === viewerName)) {
        return res.status(403).json({ error: 'No autorizado para iniciar este lote' });
      }
    }
    const now = new Date().toISOString();
    const { error } = await supabase
      .from('picking_batches')
      .update({ status: 'in_progress', started_at: now })
      .eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    broadcastSSE({ type: 'batch_status', id, status: 'in_progress' });
    return res.json({ ok: true, id });
  } catch (e) {
    console.error('Error en /picking/batches/:id/start', e);
    return res.status(500).json({ error: 'Error interno' });
  }
});

// Completar lote: cambia estado a completed y marca hora de fin
app.post('/picking/batches/:id/complete', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    // Validar permiso: solo ADMIN o asignado
    const roleUp = String((req.user || {}).role || '').toUpperCase();
    const viewerEmail = (req.user || {}).email || '';
    let viewerName = '';
    try {
      const { data: meRow } = await supabase
        .from('app_users')
        .select('full_name')
        .eq('id', (req.user || {}).sub)
        .single();
      viewerName = String(meRow?.full_name || '');
    } catch {}
    if (roleUp !== 'ADMIN') {
      const { data: bRow } = await supabase
        .from('picking_batches')
        .select('assigned_to')
        .eq('id', id)
        .single();
      const assigned = String(bRow?.assigned_to || '');
      if (!(assigned === viewerEmail || assigned === viewerName)) {
        return res.status(403).json({ error: 'No autorizado para completar este lote' });
      }
    }
    const now = new Date().toISOString();
    // traer started_at para calcular tiempo real si existe
    const { data: row } = await supabase
      .from('picking_batches')
      .select('started_at')
      .eq('id', id)
      .limit(1);
    let actualTime = null;
    const started = row && row[0]?.started_at;
    if (started) {
      actualTime = Math.max(1, Math.round((Date.now() - new Date(started).getTime()) / (1000 * 60)));
    }
    const { error } = await supabase
      .from('picking_batches')
      .update({ status: 'completed', completed_at: now, actual_time: actualTime, efficiency: 100, picked_items: supabase.rpc ? undefined : undefined })
      .eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    broadcastSSE({ type: 'batch_status', id, status: 'completed' });
    return res.json({ ok: true, id });
  } catch (e) {
    console.error('Error en /picking/batches/:id/complete', e);
    return res.status(500).json({ error: 'Error interno' });
  }
});

// Cancelar lote: cambia estado a cancelled y libera inventario reservado
app.post('/picking/batches/:id/cancel', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    // Validar permiso: solo ADMIN o asignado
    const roleUp = String((req.user || {}).role || '').toUpperCase();
    const viewerEmail = (req.user || {}).email || '';
    let viewerName = '';
    try {
      const { data: meRow } = await supabase
        .from('app_users')
        .select('full_name')
        .eq('id', (req.user || {}).sub)
        .single();
      viewerName = String(meRow?.full_name || '');
    } catch {}
    if (roleUp !== 'ADMIN') {
      const { data: bRow } = await supabase
        .from('picking_batches')
        .select('assigned_to')
        .eq('id', id)
        .single();
      const assigned = String(bRow?.assigned_to || '');
      if (!(assigned === viewerEmail || assigned === viewerName)) {
        return res.status(403).json({ error: 'No autorizado para cancelar este lote' });
      }
    }
    // Traer ítems del lote
    const { data: items, error: itemsErr } = await supabase
      .from('picking_batch_items')
      .select('id, product_id, total_quantity, source_location_id')
      .eq('batch_id', id);
    if (itemsErr) return res.status(500).json({ error: itemsErr.message });
    const locIds = [...new Set((items || []).map(i => i.source_location_id).filter(Boolean))];
    let locWh = new Map();
    if (locIds.length > 0) {
      const { data: locs } = await supabase
        .from('locations')
        .select('id, warehouse_id')
        .in('id', locIds);
      locWh = new Map((locs || []).map(l => [String(l.id), String(l.warehouse_id || '')]));
    }
    // Liberar inventario reservado por cada item
    for (const it of (items || [])) {
      const whId = it.source_location_id ? locWh.get(String(it.source_location_id)) : null;
      if (!whId || !it.product_id || !it.total_quantity) continue;
      try {
        await supabase.rpc('release_inventory', {
          p_product_id: it.product_id,
          p_warehouse_id: whId,
          p_quantity: Number(it.total_quantity || 0)
        });
      } catch (rpcErr) {
        console.warn('[BatchCancel] Error liberando inventario:', rpcErr?.message || rpcErr);
      }
    }
    // Actualizar estados del lote e items
    const now = new Date().toISOString();
    const { error: bErr } = await supabase
      .from('picking_batches')
      .update({ status: 'cancelled', completed_at: now })
      .eq('id', id);
    if (bErr) return res.status(500).json({ error: bErr.message });
    await supabase
      .from('picking_batch_items')
      .update({ status: 'cancelled' })
      .eq('batch_id', id);
    broadcastSSE({ type: 'batch_status', id, status: 'cancelled' });
    return res.json({ ok: true, id });
  } catch (e) {
    console.error('Error en /picking/batches/:id/cancel', e);
    return res.status(500).json({ error: 'Error interno' });
  }
});

// Actualizar lote genérico (por ejemplo pickedItems)
app.put('/picking/batches/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    // Validar permiso: solo ADMIN o asignado
    const roleUp = String((req.user || {}).role || '').toUpperCase();
    const viewerEmail = (req.user || {}).email || '';
    let viewerName = '';
    try {
      const { data: meRow } = await supabase
        .from('app_users')
        .select('full_name')
        .eq('id', (req.user || {}).sub)
        .single();
      viewerName = String(meRow?.full_name || '');
    } catch {}
    if (roleUp !== 'ADMIN') {
      const { data: bRow } = await supabase
        .from('picking_batches')
        .select('assigned_to')
        .eq('id', id)
        .single();
      const assigned = String(bRow?.assigned_to || '');
      if (!(assigned === viewerEmail || assigned === viewerName)) {
        return res.status(403).json({ error: 'No autorizado para actualizar este lote' });
      }
    }
    const payload = req.body || {};
    const { error } = await supabase
      .from('picking_batches')
      .update(payload)
      .eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    broadcastSSE({ type: 'batch_update', id, payload });
    return res.json({ ok: true, id });
  } catch (e) {
    console.error('Error en /picking/batches/:id', e);
    return res.status(500).json({ error: 'Error interno' });
  }
});

// Crear lote con órdenes seleccionadas
app.post('/picking/batches', authMiddleware, async (req, res) => {
  try {
    const { name, assignedTo, zone, order_ids, priority, grouping_criterion, assigned_to_user_id } = req.body || {};
    const selectedSkus = Array.isArray(req.body?.selected_skus)
      ? req.body.selected_skus.map(s => String(s || '').trim()).filter(Boolean)
      : [];
    const selectedLocations = Array.isArray(req.body?.selected_locations)
      ? req.body.selected_locations.map(x => ({ sku: String(x?.sku || ''), location_code: String(x?.location_code || '') })).filter(x => x.sku && x.location_code)
      : [];
    const selectedLocMap = new Map(selectedLocations.map(x => [x.sku, x.location_code]));
    if (!Array.isArray(order_ids) || !order_ids.length) {
      return res.status(400).json({ error: 'Parámetros inválidos' });
    }
    const pri = (priority && ['high','medium','low'].includes(String(priority))) ? String(priority) : 'medium';
    const groupCrit = (grouping_criterion && ['sku','zone','customer'].includes(String(grouping_criterion))) ? String(grouping_criterion) : null;
    const { data: itemsRows } = await supabase
      .from('sales_order_items')
      .select('sales_order_id, product_id, quantity')
      .in('sales_order_id', order_ids);
    let items = itemsRows || [];
    // Si el frontend envía SKUs seleccionados, filtrar ítems a esos productos
    if (selectedSkus.length > 0) {
      const { data: prodSel, error: prodSelErr } = await supabase
        .from('products')
        .select('id, sku')
        .in('sku', selectedSkus);
      if (prodSelErr) return res.status(500).json({ error: prodSelErr.message });
      const allowed = new Set((prodSel || []).map(p => p.id));
      items = (items || []).filter(it => allowed.has(it.product_id));
    }
    const totalItems = (items || []).reduce((s, it) => s + (Number(it.quantity) || 0), 0);

    // Generar código de lote si no viene nombre: PB-YYYYMMDD-HHMM-XXX
    function pad(n){return String(n).padStart(2,'0');}
    const now = new Date();
    const y = now.getFullYear();
    const m = pad(now.getMonth()+1);
    const d = pad(now.getDate());
    const hh = pad(now.getHours());
    const mm = pad(now.getMinutes());
    const rand = Math.random().toString(36).slice(2,5).toUpperCase();
    const batchCode = `PB-${y}${m}${d}-${hh}${mm}-${rand}`;
    // Insertar lote
    // Si viene assigned_to_user_id, intentar normalizar a email de app_users
    let assignedDisplay = assignedTo || '';
    if (assigned_to_user_id) {
      try {
        const { data: usr } = await supabase
          .from('app_users')
          .select('id, email, full_name')
          .eq('id', assigned_to_user_id)
          .limit(1);
        if (usr && usr[0]) assignedDisplay = usr[0].full_name || usr[0].email || assignedDisplay;
      } catch {}
    }

    // Construir payload evitando columnas que quizás no existan (robusto ante esquemas antiguos)
    const basePayload = {
      name: name || batchCode,
      status: 'pending',
      assigned_to: assignedDisplay || '',
      zone: zone || 'Zona A - Picking',
      total_items: totalItems,
      picked_items: 0,
      estimated_time: Math.max(15, Math.round(totalItems * 2)),
      efficiency: 0,
    };
    let insertPayload = { ...basePayload };
    if (pri) insertPayload.priority = pri;
    if (groupCrit) insertPayload.grouping_criterion = groupCrit;

    let inserted, error;
    try {
      ({ data: inserted, error } = await supabase
        .from('picking_batches')
        .insert(insertPayload)
        .select('id')
        .limit(1));
      if (error) throw error;
    } catch (err) {
      const msg = String(err?.message || '').toLowerCase();
      const colMissing = (s) => msg.includes(`could not find the '${s}' column`) || msg.includes(`${s} column`) || msg.includes('schema cache');
      // Reintentar sin columnas opcionales si el esquema no las tiene
      const retryPayload = { ...basePayload };
      if (!colMissing('priority') && pri) retryPayload.priority = pri; // mantener priority si no fue el problema
      // eliminar grouping_criterion si parece causar el error
      try {
        ({ data: inserted, error } = await supabase
          .from('picking_batches')
          .insert(retryPayload)
          .select('id')
          .limit(1));
        if (error) throw error;
      } catch (err2) {
        return res.status(500).json({ error: String(err2?.message || 'No se pudo crear lote') });
      }
    }
    const batchId = inserted && inserted[0]?.id;
    if (!batchId) return res.status(500).json({ error: 'No se pudo crear lote' });
    const rows = order_ids.map(soId => ({ batch_id: batchId, sales_order_id: soId }));
    const { error: relErr } = await supabase
      .from('picking_batch_orders')
      .insert(rows);
    if (relErr) return res.status(500).json({ error: relErr.message });

    // Agregar ítems agregados por producto
    const byProduct = new Map(); // product_id -> total_quantity
    for (const it of (items || [])) {
      const pid = it.product_id;
      const qty = Number(it.quantity || 0) || 0;
      if (!pid || qty <= 0) continue;
      byProduct.set(pid, (byProduct.get(pid) || 0) + qty);
    }
    const productIds = [...byProduct.keys()];
    let prodMap = new Map();
    if (productIds.length > 0) {
      const { data: prods, error: pErr } = await supabase
        .from('products')
        .select('id, sku, name, unit_of_measure')
        .in('id', productIds);
      if (pErr) return res.status(500).json({ error: pErr.message });
      prodMap = new Map((prods || []).map(p => [p.id, p]));
    }
    const toInsertItems = [];
    for (const pid of productIds) {
      const total = byProduct.get(pid) || 0;
      const { data: invRows } = await supabase
        .from('inventory')
        .select('location_id, available_quantity, expiry_date, locations:location_id(code)')
        .eq('product_id', pid);
      let bestLoc = null;
      let earliestExpiry = null;
      for (const r of (invRows || [])) {
        if (!bestLoc || (Number(r.available_quantity || 0) > Number(bestLoc.available_quantity || 0))) {
          bestLoc = r;
        }
        if (r.expiry_date && (!earliestExpiry || new Date(r.expiry_date) < new Date(earliestExpiry))) {
          earliestExpiry = r.expiry_date;
        }
      }
      const meta = prodMap.get(pid) || { sku: null, name: null, unit_of_measure: null };
      // Si el usuario seleccionó una ubicación por SKU, preferirla
      const preferredCode = selectedLocMap.get(String(meta?.sku || ''));
      if (preferredCode) {
        const match = (invRows || []).find(r => String(r?.locations?.code || '') === preferredCode);
        if (match) bestLoc = match;
      }
      toInsertItems.push({
        batch_id: batchId,
        product_id: pid,
        sku: meta.sku,
        description: meta.name,
        total_quantity: total,
        unit_of_measure: meta.unit_of_measure,
        source_location_id: bestLoc?.location_id || null,
        expiry_date: earliestExpiry || null,
        picked_quantity: 0,
      });
    }
    // Ordenar los ítems por orden de ubicación (código ascendente)
    if (toInsertItems.length > 0) {
      const locIds = [...new Set(toInsertItems.map(i => i.source_location_id).filter(Boolean))];
      let locMap = new Map();
      if (locIds.length > 0) {
        const { data: locs } = await supabase
          .from('locations')
          .select('id, code')
          .in('id', locIds);
        locMap = new Map((locs || []).map(l => [l.id, String(l.code || '')]));
      }
      toInsertItems.sort((a, b) => {
        const ca = locMap.get(a.source_location_id) || '';
        const cb = locMap.get(b.source_location_id) || '';
        return ca.localeCompare(cb);
      });
      const { error: itemsErr } = await supabase
        .from('picking_batch_items')
        .insert(toInsertItems.map(i => ({ ...i, status: 'picking_pending' })));
      if (itemsErr) {
        const msg = String(itemsErr?.message || '').toLowerCase();
        // Si la tabla aún no está disponible en el schema cache de PostgREST, continuar creando el lote
        if (msg.includes("could not find the table 'public.picking_batch_items'")) {
          console.warn('[BatchCreate] Tabla picking_batch_items no detectada aún por PostgREST. Se crea el lote sin ítems.');
        } else {
          return res.status(500).json({ error: itemsErr.message });
        }
      } else {
        broadcastSSE({ type: 'batch_items_created', id: batchId, count: toInsertItems.length });
        // Reservar inventario para cada ítem del lote (bloquea cantidad en inventario)
        try {
          // Mapear ubicaciones -> almacenes para saber dónde reservar
          const srcLocIds = [...new Set(toInsertItems.map(i => i.source_location_id).filter(Boolean))];
          let locWh = new Map();
          if (srcLocIds.length > 0) {
            const { data: locs } = await supabase
              .from('locations')
              .select('id, warehouse_id')
              .in('id', srcLocIds);
            locWh = new Map((locs || []).map(l => [String(l.id), String(l.warehouse_id || '')]));
          }
          for (const it of toInsertItems) {
            const whId = it.source_location_id ? locWh.get(String(it.source_location_id)) : null;
            if (!whId || !it.product_id || !it.total_quantity) continue;
            // Reservar cantidad disponible en el almacén correspondiente
            try {
              await supabase.rpc('reserve_inventory', {
                p_product_id: it.product_id,
                p_warehouse_id: whId,
                p_quantity: Number(it.total_quantity || 0)
              });
            } catch (rpcErr) {
              console.warn('[BatchCreate] Error reservando inventario:', rpcErr?.message || rpcErr);
            }
          }
        } catch (resErr) {
          console.warn('[BatchCreate] Error preparando reservas de inventario:', resErr?.message || resErr);
        }
      }
    }

    broadcastSSE({ type: 'batch_created', id: batchId });
    return res.json({ ok: true, id: batchId });
  } catch (e) {
    console.error('Error en POST /picking/batches', e);
    return res.status(500).json({ error: 'Error interno' });
  }
});

// Búsqueda de usuarios para asignación del lote (tiempo real)
app.get('/app_users/search', async (req, res) => {
  try {
    const q = String(req.query?.q || '').trim();
    // Si no hay término de búsqueda, devolver activos recientes
    if (!q) {
      const { data, error } = await supabase
        .from('app_users')
        .select('id, email, full_name, role, is_active')
        .eq('is_active', true)
        .order('last_login', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) return res.status(500).json({ error: error.message });
      const users = (data || []).map(u => ({ id: u.id, email: u.email, name: u.full_name || null, role: u.role }));
      return res.json({ users });
    }

    // Con término de búsqueda: email o nombre
    const { data, error } = await supabase
      .from('app_users')
      .select('id, email, full_name, role, is_active')
      .eq('is_active', true)
      .or(`email.ilike.%${q}%,full_name.ilike.%${q}%`)
      .limit(20);
    if (error) return res.status(500).json({ error: error.message });
    const users = (data || []).map(u => ({ id: u.id, email: u.email, name: u.full_name || null, role: u.role }));
    return res.json({ users });
  } catch (e) {
    console.error('Error en /app_users/search', e);
    return res.status(500).json({ error: 'Error interno' });
  }
});

// Ítems de un lote
app.get('/picking/batches/:id/items', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    // Validar permiso: solo ADMIN o asignado
    const roleUp = String((req.user || {}).role || '').toUpperCase();
    const viewerEmail = (req.user || {}).email || '';
    let viewerName = '';
    try {
      const { data: meRow } = await supabase
        .from('app_users')
        .select('full_name')
        .eq('id', (req.user || {}).sub)
        .single();
      viewerName = String(meRow?.full_name || '');
    } catch {}
    if (roleUp !== 'ADMIN') {
      const { data: bRow } = await supabase
        .from('picking_batches')
        .select('assigned_to')
        .eq('id', id)
        .single();
      const assigned = String(bRow?.assigned_to || '');
      if (!(assigned === viewerEmail || assigned === viewerName)) {
        return res.status(403).json({ error: 'No autorizado para ver ítems de este lote' });
      }
    }
    const { data: rows, error } = await supabase
      .from('picking_batch_items')
      .select('id, product_id, sku, description, total_quantity, unit_of_measure, source_location_id, expiry_date, picked_quantity, status')
      .eq('batch_id', id);
    if (error) return res.status(500).json({ error: error.message });
    // Enriquecer con código de ubicación
    const locIds = [...new Set((rows || []).map(r => r.source_location_id).filter(Boolean))];
    let locMap = new Map();
    if (locIds.length > 0) {
      const { data: locs } = await supabase
        .from('locations')
        .select('id, code')
        .in('id', locIds);
      locMap = new Map((locs || []).map(l => [l.id, l.code]));
    }
    let items = (rows || []).map(r => ({
      id: r.id,
      productId: r.product_id,
      sku: r.sku,
      description: r.description,
      quantity: r.total_quantity,
      unit: r.unit_of_measure,
      sourceLocation: r.source_location_id ? locMap.get(r.source_location_id) || null : null,
      expiryDate: r.expiry_date,
      pickedQuantity: r.picked_quantity || 0,
      status: r.status || 'picking_pending',
    }));
    // Ordenar por código de ubicación (nulos al final) y luego por SKU
    items = items.sort((a, b) => {
      const la = (a.sourceLocation || '').toString();
      const lb = (b.sourceLocation || '').toString();
      if (la && lb) {
        if (la < lb) return -1;
        if (la > lb) return 1;
      } else if (la && !lb) {
        return -1; // los que tienen ubicación primero
      } else if (!la && lb) {
        return 1;
      }
      // desempate por SKU
      const sa = (a.sku || '').toString();
      const sb = (b.sku || '').toString();
      if (sa < sb) return -1;
      if (sa > sb) return 1;
      return 0;
    });
    return res.json({ items });
  } catch (e) {
    console.error('Error en GET /picking/batches/:id/items', e);
    return res.status(500).json({ error: 'Error interno' });
  }
});

// Stream SSE para eventos de lotes y progreso
app.get('/picking/batches/stream', async (req, res) => {
  try {
    const origin = req.headers.origin || '*';
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();
    res.write('retry: 2000\n\n');
    sseClients.add(res);
    ensureRealtimeInit();
    req.on('close', () => {
      sseClients.delete(res);
    });
  } catch (e) {
    console.error('Error en /picking/batches/stream', e);
    res.status(500).end();
  }
});

app.get('/picking/tasks', async (req, res) => {
  try {
    const { status: statusParam } = req.query || {};

    // Órdenes para picking
    let ordersQuery = supabase
      .from('sales_orders')
      .select('id, so_number, customer_name, status, required_date, shipped_date');

    if (String(statusParam) === 'completed') {
      ordersQuery = ordersQuery
        .not('shipped_date', 'is', null)
        .order('shipped_date', { ascending: false });
    } else {
      ordersQuery = ordersQuery
        .in('status', ['pending', 'confirmed', 'picking'])
        .order('required_date', { ascending: true });
    }

    const { data: orders, error: ordersErr } = await ordersQuery.limit(20);
    if (ordersErr) return res.status(500).json({ error: ordersErr.message });

    const orderIds = (orders || []).map(o => o.id);
    const { data: items, error: itemsErr } = await supabase
      .from('sales_order_items')
      .select('sales_order_id, product_id, quantity, picked_quantity')
      .in('sales_order_id', orderIds);
    if (itemsErr) return res.status(500).json({ error: itemsErr.message });

    const productIds = [...new Set((items || []).map(i => i.product_id).filter(Boolean))];
    const { data: products, error: prodErr } = await supabase
      .from('products')
      .select('id, sku, name')
      .in('id', productIds);
    if (prodErr) return res.status(500).json({ error: prodErr.message });
    const productMap = new Map((products || []).map(p => [p.id, p]));

    // Calcular cantidad restante por orden y ocultar órdenes sin artículos
    const qtyPerOrder = new Map();
    (items || []).forEach(it => {
      const prev = qtyPerOrder.get(it.sales_order_id) || 0;
      qtyPerOrder.set(it.sales_order_id, prev + (Number(it.quantity || 0)));
    });
    const sourceOrders = (orders || []).filter(o => (qtyPerOrder.get(o.id) || 0) > 0);

    const tasks = (sourceOrders || []).map(o => {
      const its = (items || []).filter(it => it.sales_order_id === o.id).map(it => {
        const p = productMap.get(it.product_id) || { sku: 'N/A', name: 'Producto' };
        return {
          sku: p.sku,
          name: p.name,
          quantity: it.quantity || 0,
          picked: it.picked_quantity || 0,
          location: '—',
        };
      });
      const priority = (() => {
        if (!o.required_date) return 'medium';
        const days = (new Date(o.required_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
        if (days <= 0) return 'high';
        if (days < 2) return 'high';
        if (days < 5) return 'medium';
        return 'low';
      })();
      const statusMap = { pending: 'pending', confirmed: 'pending', picking: 'in_progress', shipped: 'completed' };

      return {
        id: o.id,
        orderNumber: o.so_number,
        customer: o.customer_name,
        priority,
        status: String(statusParam) === 'completed' ? 'completed' : (statusMap[o.status] || 'pending'),
        assignedTo: '',
        zone: 'Zona A - Picking',
        location: its[0]?.location || '—',
        items: its,
        estimatedTime: Math.max(5, its.length * 5),
        createdAt: new Date().toISOString(),
        dueDate: String(statusParam) === 'completed' ? (o.shipped_date || o.required_date || new Date().toISOString()) : (o.required_date || new Date().toISOString()),
        notes: '',
      };
    });

    // Incluir tareas creadas y persistidas en DB si existe la tabla
    let dbTasks = [];
    try {
      let dbQuery = supabase.from('picking_tasks').select('*').order('createdAt', { ascending: false });
      if (String(statusParam) === 'completed') {
        dbQuery = dbQuery.eq('status', 'completed');
      }
      const { data: ptasks, error: pterr } = await dbQuery;
      if (!pterr && Array.isArray(ptasks)) {
        dbTasks = ptasks.map(t => ({
          id: t.id,
          orderNumber: t.orderNumber,
          customer: t.customer,
          priority: t.priority || 'medium',
          status: t.status || 'pending',
          assignedTo: t.assignedTo || '',
          zone: t.zone || 'Zona A - Picking',
          location: t.location || '—',
          items: Array.isArray(t.items) ? t.items : [],
          estimatedTime: t.estimatedTime || 10,
          actualTime: t.actualTime || undefined,
          createdAt: t.createdAt || new Date().toISOString(),
          dueDate: t.dueDate || new Date().toISOString(),
          notes: t.notes || '',
          originZone: t.originZone || undefined,
          destinationZone: t.destinationZone || undefined,
          creator: t.creator || undefined,
        }));
      }
    } catch (_e) {
      // Silenciar errores si la tabla no existe
    }
    return res.json({ tasks: [...dbTasks, ...tasks] });
  } catch (e) {
    console.error('Error en /picking/tasks', e);
    return res.status(500).json({ error: 'Error interno' });
  }
});

app.post('/picking/tasks', authMiddleware, async (req, res) => {
  try {
    const payload = req.body || {};
    // Si es una tarea de acomodo, requerir permiso específico de gestión
    try {
      const isPutaway = /acomodo/i.test(String((payload.customer || '')).toLowerCase());
      if (isPutaway) {
        const userId = (req.user || {}).sub;
        const { role, permissions } = await getUserPermissionsFromDb(userId);
        const candidates = buildPermissionAliases('putaway.manage');
        if (!hasPermissionCandidates(permissions, candidates, role)) {
          return res.status(403).json({ error: 'Permiso insuficiente', required: 'putaway.manage' });
        }
      }
    } catch (authErr) {
      console.error('Error validando permiso putaway.manage en POST /picking/tasks:', authErr);
      return res.status(500).json({ error: 'Error validando permisos' });
    }
    // Normalizar estructura básica
    const task = {
      id: payload.id || `${Date.now()}`,
      orderNumber: payload.orderNumber,
      customer: payload.customer || '',
      priority: payload.priority || 'medium',
      status: payload.status || 'pending',
      assignedTo: payload.assignedTo || '',
      zone: payload.zone || 'Zona A - Picking',
      location: payload.location || '—',
      items: Array.isArray(payload.items) ? payload.items : [],
      estimatedTime: payload.estimatedTime || 10,
      createdAt: payload.createdAt || new Date().toISOString(),
      dueDate: payload.dueDate || new Date().toISOString(),
      notes: payload.notes || '',
      originZone: payload.originZone || null,
      destinationZone: payload.destinationZone || null,
      creator: payload.creator || (req?.user?.email || req?.user?.sub || ''),
    };
    if (!task.orderNumber) {
      return res.status(400).json({ error: 'orderNumber requerido' });
    }

    // 1) Bloquear asignación duplicada de la misma orden a tareas activas
    try {
      const { data: existingActive, error: existErr } = await supabase
        .from('picking_tasks')
        .select('id,status')
        .eq('orderNumber', task.orderNumber)
        .in('status', ['pending', 'in_progress']);
      if (existErr) {
        return res.status(500).json({ error: `Error verificando tareas existentes: ${existErr.message}` });
      }
      if ((existingActive || []).length > 0) {
        return res.status(409).json({
          error: 'La orden ya está asignada a una tarea activa',
          orderNumber: task.orderNumber,
          tasks: (existingActive || []).map(t => t.id),
        });
      }
    } catch (dupErr) {
      console.error('Error validando duplicados en picking_tasks:', dupErr);
      return res.status(500).json({ error: 'Error interno validando duplicados' });
    }

    // 2) Ajustar cantidades de items según reservas en tareas activas y disponibilidad
    try {
      const { data: activeTasks, error: activeErr } = await supabase
        .from('picking_tasks')
        .select('items,status')
        .in('status', ['pending', 'in_progress']);
      if (activeErr) {
        return res.status(500).json({ error: `Error consultando tareas activas: ${activeErr.message}` });
      }
      const reservedByProduct = new Map(); // product_id -> qty
      for (const t of (activeTasks || [])) {
        const arr = Array.isArray(t.items) ? t.items : [];
        for (const it of arr) {
          const pid = it?.product_id ?? it?.productId ?? it?.product ?? null;
          const qty = Number(it?.quantity ?? it?.qty ?? 0) || 0;
          if (pid && qty > 0) {
            reservedByProduct.set(pid, (reservedByProduct.get(pid) || 0) + qty);
          }
        }
      }
      // Disponibilidad total por producto (suma de available_quantity)
      const productsInTask = [...new Set((task.items || [])
        .map(it => it?.product_id ?? it?.productId ?? it?.product ?? null)
        .filter(Boolean))];
      let availableByProduct = new Map();
      if (productsInTask.length > 0) {
        const { data: invRows, error: invErr } = await supabase
          .from('inventory')
          .select('product_id, available_quantity')
          .in('product_id', productsInTask);
        if (invErr) {
          return res.status(500).json({ error: `Error consultando inventario: ${invErr.message}` });
        }
        availableByProduct = new Map();
        for (const r of (invRows || [])) {
          const pid = r.product_id;
          const aq = Number(r.available_quantity || 0) || 0;
          availableByProduct.set(pid, (availableByProduct.get(pid) || 0) + aq);
        }
      }

      // Ajustar items: no permitir sobreasignación; filtrar items con cantidad 0
      const adjustedItems = [];
      for (const it of (task.items || [])) {
        const pid = it?.product_id ?? it?.productId ?? it?.product ?? null;
        const requested = Number(it?.quantity ?? it?.qty ?? 0) || 0;
        if (!pid || requested <= 0) {
          continue; // ignorar ítems inválidos
        }
        const reserved = reservedByProduct.get(pid) || 0;
        const available = availableByProduct.get(pid) || 0;
        const free = Math.max(0, available - reserved);
        const assignQty = Math.min(requested, free);
        if (assignQty > 0) {
          const updated = { ...it };
          if ('quantity' in updated || !('qty' in updated)) {
            updated.quantity = assignQty;
          } else {
            updated.qty = assignQty;
          }
          if (assignQty < requested) {
            updated.notes = `${(updated.notes || '').trim()} [ajustada por reservas: ${reserved}/${available}]`.trim();
          }
          adjustedItems.push(updated);
        }
      }
      if (adjustedItems.length === 0 && (task.items || []).length > 0) {
        return res.status(409).json({
          error: 'Sin disponibilidad por reservas en tareas activas para los productos solicitados',
        });
      }
      task.items = adjustedItems;
    } catch (reserveErr) {
      console.error('Error ajustando cantidades según reservas:', reserveErr);
      return res.status(500).json({ error: 'Error interno ajustando cantidades' });
    }
    // Intento de inserción. Si falla por columnas inexistentes (schema cache), reintentar con whitelist mínima
    let insertPayload = { ...task };
    // Omitir campos potencialmente ausentes en instancias antiguas
    delete insertPayload.actualTime; // evitar error "Could not find the 'actualTime' column"
    try {
      const { data, error } = await supabase
        .from('picking_tasks')
        .insert([insertPayload])
        .select('*')
        .single();
      if (error) {
        const msg = String(error.message || '').toLowerCase();
        // Si el error menciona esquema/columna no encontrada, reintentar con un conjunto mínimo de columnas
        if (msg.includes('schema cache') || msg.includes('column') || msg.includes('could not find')) {
          // Usar nombres de columnas en minúsculas para compatibilidad con Postgres
          const minimal = {
            id: insertPayload.id,
            ordernumber: insertPayload.orderNumber,
            customer: insertPayload.customer,
            priority: insertPayload.priority,
            status: insertPayload.status,
            zone: insertPayload.zone,
            location: insertPayload.location,
            items: insertPayload.items,
            estimatedtime: insertPayload.estimatedTime,
            notes: insertPayload.notes,
          };
          const retry = await supabase
            .from('picking_tasks')
            .insert([minimal])
            .select('*')
            .single();
          if (retry.error) return res.status(500).json({ error: retry.error.message });
          return res.json({ task: retry.data });
        }
        return res.status(500).json({ error: error.message });
      }
      return res.json({ task: data });
    } catch (e) {
      console.error('Fallo insertando picking_tasks:', e);
      return res.status(500).json({ error: 'Error interno insertando tarea' });
    }
  } catch (e) {
    console.error('Error en POST /picking/tasks', e);
    return res.status(500).json({ error: 'Error interno' });
  }
});

// Actualizar tarea de picking/acomodo (items y destino)
app.put('/picking/tasks/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    // Validar permiso de gestión si se trata de una tarea de acomodo
    try {
      const { data: existing, error: readErr } = await supabase
        .from('picking_tasks')
        .select('customer')
        .eq('id', id)
        .single();
      if (!readErr && existing && /acomodo/i.test(String(existing.customer || ''))) {
        const userId = (req.user || {}).sub;
        const { role, permissions } = await getUserPermissionsFromDb(userId);
        const candidates = buildPermissionAliases('putaway.manage');
        if (!hasPermissionCandidates(permissions, candidates, role)) {
          return res.status(403).json({ error: 'Permiso insuficiente', required: 'putaway.manage' });
        }
      }
    } catch (authErr) {
      console.error('Error validando permiso putaway.manage en PUT /picking/tasks/:id:', authErr);
      return res.status(500).json({ error: 'Error validando permisos' });
    }
  const payload = req.body || {};
  const updates = {};
  if (payload.items !== undefined) updates.items = Array.isArray(payload.items) ? payload.items : [];
  if (payload.destinationZone !== undefined) updates.destinationZone = payload.destinationZone || null;
  if (payload.assignedTo !== undefined) updates.assignedTo = payload.assignedTo || '';
  if (payload.status !== undefined) updates.status = payload.status || 'pending';
  if (payload.notes !== undefined) updates.notes = payload.notes || '';
  if (payload.actualTime !== undefined) updates.actualTime = Number(payload.actualTime) || 0;

    const { data, error } = await supabase
      .from('picking_tasks')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ task: data });
  } catch (e) {
    console.error('Error en PUT /picking/tasks/:id', e);
    return res.status(500).json({ error: 'Error interno' });
  }
});

app.delete('/picking/tasks/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const role = req?.user?.role;
    if (!role || String(role).toUpperCase() !== 'ADMIN') {
      return res.status(403).json({ error: 'Solo administradores pueden eliminar tareas' });
    }

    // Soportar dos tipos de IDs:
    // - ID de tarea persistida en 'picking_tasks' (UUID/aleatorio)
    // - ID de orden de venta (prefijo opcional 'so-123') para tareas derivadas
    const soMatch = String(id).match(/^so-(\d+)$/);
    if (soMatch) {
      const soId = Number(soMatch[1]);
      const { error: soErr } = await supabase
        .from('sales_orders')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', soId);
      if (soErr) return res.status(500).json({ error: soErr.message });
      return res.json({ ok: true, cancelled_sales_order_id: soId });
    }

    // Intentar eliminar de la tabla picking_tasks por ID exacto
    const { data: delRows, error: delErr } = await supabase
      .from('picking_tasks')
      .delete()
      .eq('id', id)
      .select('id');
    if (delErr) return res.status(500).json({ error: delErr.message });

    // Si no se eliminó ningún registro, intentar como ID de sales_order directo
    if (!delRows || delRows.length === 0) {
      const { error: soErr2 } = await supabase
        .from('sales_orders')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', id);
      if (soErr2) return res.status(500).json({ error: soErr2.message });
      return res.json({ ok: true, cancelled_sales_order_id: id });
    }

    return res.json({ ok: true, deleted_task_id: id });
  } catch (e) {
    console.error('Error en DELETE /picking/tasks/:id', e);
    return res.status(500).json({ error: 'Error interno' });
  }
});

// Borrado masivo de tareas de picking/acomodo
app.delete('/picking/tasks', authMiddleware, async (req, res) => {
  try {
    const roleUp = String((req?.user?.role || '')).toUpperCase();
    if (roleUp !== 'ADMIN') {
      return res.status(403).json({ error: 'Solo administradores pueden borrar tareas masivamente' });
    }
    // Filtrar por tipo vía query: type=all|putaway|picking
    const type = String(req.query?.type || 'all').toLowerCase();
    let q = supabase.from('picking_tasks').delete().not('id', 'is', null).select('id, customer');
    if (type === 'putaway') {
      q = supabase
        .from('picking_tasks')
        .delete()
        .ilike('customer', '%acomodo%')
        .select('id, customer');
    } else if (type === 'picking') {
      // Borrar las que NO son de acomodo
      const { data: rows, error: readErr } = await supabase
        .from('picking_tasks')
        .select('id, customer');
      if (readErr) return res.status(500).json({ error: readErr.message });
      const ids = (rows || [])
        .filter(r => !String(r.customer || '').toLowerCase().includes('acomodo'))
        .map(r => r.id)
        .filter(Boolean);
      if (ids.length === 0) return res.json({ ok: true, deleted: 0 });
      const { data: delRows, error: delErr } = await supabase
        .from('picking_tasks')
        .delete()
        .in('id', ids)
        .select('id');
      if (delErr) return res.status(500).json({ error: delErr.message });
      return res.json({ ok: true, deleted: (delRows || []).length });
    }
    const { data: delAll, error: delAllErr } = await q;
    if (delAllErr) return res.status(500).json({ error: delAllErr.message });
    return res.json({ ok: true, deleted: (delAll || []).length, type });
  } catch (e) {
    console.error('Error en DELETE /picking/tasks', e);
    return res.status(500).json({ error: 'Error interno' });
  }
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

// Permisos: utilidades y middlewares para validar por identificador
const userPermissionsCache = new Map(); // key: userId, value: { ts, data: { role, permissions } }

async function getUserPermissionsFromDb(userId) {
  const cached = userPermissionsCache.get(userId);
  if (cached && Date.now() - cached.ts < 60_000) {
    return cached.data;
  }
  const { data, error } = await supabase
    .from('app_users')
    .select('role, permissions')
    .eq('id', userId)
    .single();
  if (error || !data) {
    return { role: 'OPERATOR', permissions: [] };
  }
  userPermissionsCache.set(userId, { ts: Date.now(), data });
  return data;
}

function buildPermissionAliases(pid) {
  const [rawRes, rawAct] = String(pid).toLowerCase().split('.') ;
  const action = rawAct || 'view';
  const actionAliases = action === 'view' ? ['view', 'read']
    : action === 'manage' ? ['manage', 'write', 'update', 'edit', 'create']
    : [action];
  const resourceAliasesMap = {
    warehouse: ['warehouse', 'warehouses'],
    warehouses: ['warehouse', 'warehouses'],
    settings: ['settings', 'config'],
    config: ['settings', 'config'],
    reception: ['reception', 'receiving'],
    reception_appointments: ['reception_appointments', 'appointments', 'appointment', 'citas'],
    reception_asn: ['reception_asn', 'asn'],
    reception_tasks: ['reception_tasks', 'receiving_tasks', 'tasks'],
  };
  const resKey = rawRes || '';
  const resAliases = resourceAliasesMap[resKey] || [resKey];
  const out = [];
  for (const r of resAliases) {
    for (const a of actionAliases) {
      out.push(`${r}.${a}`);
      out.push(`${r}_${a}`);
    }
  }
  return Array.from(new Set(out));
}

function hasPermissionCandidates(permissions, candidates, role) {
  if (String(role).toUpperCase() === 'ADMIN') return true;
  return (permissions || []).some((p) => {
    if (p === 'all') return true;
    if (typeof p === 'string') return candidates.includes(String(p).toLowerCase());
    if (p && typeof p === 'object') {
      const id = (p.id || '').toLowerCase();
      if (id && candidates.includes(id)) return true;
      const res = (p.resource || '').toLowerCase();
      const act = (p.action || '').toLowerCase();
      const combinedDot = res && act ? `${res}.${act}` : '';
      const combinedUnd = res && act ? `${res}_${act}` : '';
      const allowed = p.allowed;
      return (candidates.includes(combinedDot) || candidates.includes(combinedUnd)) && (allowed ?? true);
    }
    return false;
  });
}

function requirePermissionId(pid) {
  return async function (req, res, next) {
    try {
      const userId = (req.user || {}).sub;
      if (!userId) return res.status(401).json({ error: 'No autenticado' });
      const { role, permissions } = await getUserPermissionsFromDb(userId);
      const candidates = buildPermissionAliases(pid);
      if (hasPermissionCandidates(permissions, candidates, role)) return next();
      return res.status(403).json({ error: 'Permiso insuficiente', required: pid });
    } catch (e) {
      console.error('Error validando permiso:', e);
      return res.status(500).json({ error: 'Error validando permisos' });
    }
  };
}

function requireAnyPermissionId(pids) {
  return async function (req, res, next) {
    try {
      const userId = (req.user || {}).sub;
      if (!userId) return res.status(401).json({ error: 'No autenticado' });
      const { role, permissions } = await getUserPermissionsFromDb(userId);
      for (const pid of pids) {
        const candidates = buildPermissionAliases(pid);
        if (hasPermissionCandidates(permissions, candidates, role)) return next();
      }
      return res.status(403).json({ error: 'Permiso insuficiente', required_any: pids });
    } catch (e) {
      console.error('Error validando alguno de los permisos:', e);
      return res.status(500).json({ error: 'Error validando permisos' });
    }
  };
}

app.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email y password requeridos' });
  // Intentar obtener usuario leyendo primero password_hash (producción) y si no existe, usar password (solo dev)
  let appUser = null;
  let gotPasswordHash = false;
  try {
    const res1 = await supabase
      .from('app_users')
      .select('id,email,full_name,role,is_active,permissions,last_login,password_hash')
      .eq('email', email)
      .single();
    if (res1.error) throw res1.error;
    appUser = res1.data;
    gotPasswordHash = appUser && typeof appUser.password_hash === 'string';
  } catch (err1) {
    // Si falla por columna inexistente u otro motivo, intentamos con la columna legacy 'password'
    const res2 = await supabase
      .from('app_users')
      .select('id,email,full_name,role,is_active,permissions,last_login,password')
      .eq('email', email)
      .single();
    if (res2.error) return res.status(500).json({ error: res2.error.message });
    appUser = res2.data;
  }

  if (!appUser || appUser.is_active === false) {
    return res.status(401).json({ error: 'Usuario inválido o inactivo' });
  }

  // Validación de contraseña: soportar password_hash (bcrypt) o password texto (solo dev)
  let ok = false;
  const passwordHash = gotPasswordHash ? appUser.password_hash : undefined;
  const passwordPlain = appUser.password;
  if (typeof passwordHash === 'string') {
    ok = await bcrypt.compare(password, passwordHash);
  } else if (typeof passwordPlain === 'string') {
    ok = password === passwordPlain;
  } else {
    ok = false;
  }
  if (!ok) return res.status(401).json({ error: 'Credenciales incorrectas' });

  await supabase.from('app_users').update({ last_login: new Date().toISOString() }).eq('id', appUser.id);
  const token = signToken(appUser);
  const { password_hash, password: _pw, ...safeUser } = appUser;
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
  try {
    const password_hash = await bcrypt.hash(password, 10);
    const { error } = await supabase.from('app_users').insert({
      email,
      password_hash,
      full_name,
      role,
      is_active: true,
      permissions: [],
    });
    if (error) {
      console.error('Signup error inserting with password_hash:', error);
      return res.status(500).json({ error: error.message });
    }
    return res.status(201).json({ ok: true });
  } catch (err) {
    console.error('Signup unexpected error (hash/generate):', err);
    return res.status(500).json({ error: 'Error interno creando usuario' });
  }
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
  try {
    const password_hash = await bcrypt.hash(password, 10);
    const { data, error } = await supabase
      .from('app_users')
      .insert({ email, full_name, role, is_active, permissions, password_hash })
      .select('id,email,full_name,role,is_active,permissions,created_at')
      .single();
    if (error) throw error;
    return res.status(201).json({ user: data });
  } catch (err) {
    const { data, error: err2 } = await supabase
      .from('app_users')
      .insert({ email, full_name, role, is_active, permissions, password })
      .select('id,email,full_name,role,is_active,permissions,created_at')
      .single();
    if (err2) return res.status(500).json({ error: err2.message });
    return res.status(201).json({ user: data });
  }
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

    const { warehouse_id, code, name, zone, location_type, capacity, is_active, aisle, rack, shelf, bin } = req.body || {};
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
      aisle: aisle || null,
      rack: rack || null,
      shelf: shelf || null,
      bin: bin || null,
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
// Endpoint: Generar ubicaciones por Pasillo (batch)
// -----------------------------------------------
app.post('/locations/generate_by_aisle', authMiddleware, async (req, res) => {
  try {
    const { role } = req.user || {};
    const roleUp = String(role || '').toUpperCase();
    if (!['ADMIN', 'MANAGER'].includes(roleUp)) {
      return res.status(403).json({ error: 'Permisos insuficientes' });
    }

    const {
      warehouse_id,
      zone,
      aisle,
      racks_count = 0,
      shelves_per_rack = 0,
      bins_per_shelf = 0,
      rack_prefix = 'R',
      shelf_prefix = 'S',
      bin_prefix = 'B',
      location_type = 'storage',
      capacity = 100,
      is_active = true,
      code_padding = { rack: 2, shelf: 2, bin: 2 },
    } = req.body || {};

    if (!warehouse_id) return res.status(400).json({ error: 'warehouse_id es requerido' });
    if (!zone || String(zone).trim() === '') return res.status(400).json({ error: 'zone es requerida' });
    if (!aisle || String(aisle).trim() === '') return res.status(400).json({ error: 'aisle es requerido' });
    const R = parseInt(racks_count, 10) || 0;
    const S = parseInt(shelves_per_rack, 10) || 0;
    const B = parseInt(bins_per_shelf, 10) || 0;
    if (R <= 0) {
      return res.status(400).json({ error: 'racks_count debe ser mayor a 0' });
    }

    const pad = (n, width) => String(n).padStart(Math.max(1, parseInt(width, 10) || 1), '0');

    const rows = [];
    if (S > 0 && B > 0) {
      for (let r = 1; r <= R; r++) {
        for (let s = 1; s <= S; s++) {
          for (let b = 1; b <= B; b++) {
            const rackCode = `${rack_prefix}${pad(r, code_padding?.rack ?? 2)}`;
            const shelfCode = `${shelf_prefix}${pad(s, code_padding?.shelf ?? 2)}`;
            const binCode = `${bin_prefix}${pad(b, code_padding?.bin ?? 2)}`;
            const code = `${String(zone)}-${String(aisle)}-${rackCode}-${shelfCode}-${binCode}`;
            rows.push({
              warehouse_id,
              code,
              name: code,
              zone: String(zone),
              location_type,
              capacity: typeof capacity === 'number' ? capacity : 100,
              is_active: !!is_active,
              aisle: String(aisle),
              rack: rackCode,
              shelf: shelfCode,
              bin: binCode,
            });
          }
        }
      }
    } else {
      // Generación simplificada: solo hasta nivel de rack
      for (let r = 1; r <= R; r++) {
        const rackCode = `${rack_prefix}${pad(r, code_padding?.rack ?? 2)}`;
        const code = `${String(zone)}-${String(aisle)}-${rackCode}`;
        rows.push({
          warehouse_id,
          code,
          name: code,
          zone: String(zone),
          location_type,
          capacity: typeof capacity === 'number' ? capacity : 100,
          is_active: !!is_active,
          aisle: String(aisle),
          rack: rackCode,
          shelf: null,
          bin: null,
        });
      }
    }

    // Evitar duplicados usando upsert por (warehouse_id, code) si existe el índice único
    const { data, error } = await supabase
      .from('locations')
      .upsert(rows, { onConflict: 'warehouse_id,code' })
      .select('id, warehouse_id, code');
    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.status(201).json({ created: Array.isArray(data) ? data.length : rows.length });
  } catch (e) {
    console.error('Error generando ubicaciones por pasillo (backend):', e);
    return res.status(500).json({ error: 'Error interno generando ubicaciones' });
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
    // Permiso ya validado por middleware requirePermissionId('reception.manage')

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
// Endpoint: Listar productos activos (catálogo)
// -----------------------------------------------
app.get('/products/list', async (req, res) => {
  try {
    const { q = '', limit = 200, include_inactive = 'false' } = req.query || {};
    const includeInactive = String(include_inactive).toLowerCase() === 'true' || include_inactive === true;
    let query = supabase
      .from('products')
      .select('id, sku, name, cost_price, min_stock_level, reorder_point, is_active, created_at, categories(name), default_location_id, default_location:default_location_id(code, name, location_type)')
      .order('name', { ascending: true })
      .limit(Number(limit) || 200);

    if (!includeInactive) {
      query = query.eq('is_active', true);
    }

    const term = String(q || '').trim();
    if (term) {
      // Buscar por SKU o nombre (usar * comodín para evitar errores del parser)
      query = query.or(`sku.ilike.*${term}*,name.ilike.*${term}*`);
    }

    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ products: data || [] });
  } catch (e) {
    console.error('Error listando productos (backend):', e);
    return res.status(500).json({ error: 'Error interno listando productos' });
  }
});

// -----------------------------------------------
// Endpoint: Obtener producto por SKU exacto (incluye default_location)
// -----------------------------------------------
app.get('/products/bySku/:sku', async (req, res) => {
  try {
    const sku = String(req.params?.sku || '').trim();
    if (!sku) return res.status(400).json({ error: 'SKU requerido' });
    const { data, error } = await supabase
      .from('products')
      .select('id, sku, name, is_active, default_location_id, default_location:default_location_id(code, name, location_type)')
      .eq('sku', sku)
      .limit(1)
      .maybeSingle();
    if (error) return res.status(500).json({ error: error.message });
    if (!data) return res.status(404).json({ error: 'Producto no encontrado' });
    return res.json({ product: data });
  } catch (e) {
    console.error('Error en GET /products/bySku/:sku', e);
    return res.status(500).json({ error: 'Error interno resolviendo producto por SKU' });
  }
});

// -----------------------------------------------
// Endpoint: Actualizar umbrales Min/Max/Reorder por producto
// -----------------------------------------------
app.put('/products/:id', authMiddleware, async (req, res) => {
  try {
    // Acceso validado por requirePermissionId('reception.manage')

    const { id } = req.params;
    const { min_stock_level, reorder_point, max_stock_level, default_location_id } = req.body || {};

    const updates = { updated_at: new Date().toISOString() };
    if (min_stock_level !== undefined) updates.min_stock_level = Number(min_stock_level) || 0;
    if (reorder_point !== undefined) updates.reorder_point = Number(reorder_point) || 0;
    if (max_stock_level !== undefined) updates.max_stock_level = Number(max_stock_level) || null;
    if (default_location_id !== undefined) updates.default_location_id = default_location_id || null;

    const { data, error } = await supabase
      .from('products')
      .update(updates)
      .eq('id', id)
      .select('id, sku, name, min_stock_level, reorder_point, max_stock_level, default_location_id, updated_at')
      .single();
    if (error) return res.status(500).json({ error: error.message });
    if (!data) return res.status(404).json({ error: 'Producto no encontrado' });
    // Si se actualizó default_location_id, asegurar inventario en esa ubicación
    if (default_location_id) {
      try {
        const locId = String(default_location_id);
        const { data: loc, error: locErr } = await supabase
          .from('locations')
          .select('id, warehouse_id')
          .eq('id', locId)
          .single();
        if (!locErr && loc && loc.warehouse_id) {
          const { data: exists, error: invErr } = await supabase
            .from('inventory')
            .select('id')
            .eq('product_id', id)
            .eq('location_id', loc.id)
            .eq('warehouse_id', loc.warehouse_id)
            .limit(1);
          if (!invErr && (!exists || exists.length === 0)) {
            const nowIso = new Date().toISOString();
            await supabase
              .from('inventory')
              .insert({
                product_id: id,
                warehouse_id: loc.warehouse_id,
                location_id: loc.id,
                quantity: 0,
                reserved_quantity: 0,
                last_movement_at: nowIso,
                created_at: nowIso,
                updated_at: nowIso,
              });
          }
        }
      } catch (ensureErr) {
        console.warn('No se pudo asegurar inventario para la nueva ubicación:', ensureErr?.message || ensureErr);
      }
    }
    return res.json({ product: data });
  } catch (e) {
    console.error('Error actualizando producto (umbrales):', e);
    return res.status(500).json({ error: 'Error interno actualizando producto' });
  }
});

// -----------------------------------------------
// Endpoint: Listar inventario con joins
// -----------------------------------------------
app.get('/inventory/list', async (req, res) => {
  try {
    const { q = '', warehouse_id = null, limit = 500 } = req.query || {};
    let query = supabase
      .from('inventory')
      .select(`
        id,
        product_id,
        warehouse_id,
        location_id,
        quantity,
        reserved_quantity,
        available_quantity,
        last_movement_at,
        products:product_id(id, sku, name, cost_price, min_stock_level, reorder_point, is_active, categories(name)),
        locations:location_id(code, name, location_type)
      `)
      .eq('products.is_active', true)
      .order('last_movement_at', { ascending: false })
      .limit(Number(limit) || 500);

    const term = String(q || '').trim();
    if (term) {
      // Evitar OR cruzando tablas: resolver IDs de productos por separado y filtrar con IN
      const { data: bySku } = await supabase
        .from('products')
        .select('id')
        .ilike('sku', `%${term}%`)
        .eq('is_active', true)
        .limit(500);
      const { data: byName } = await supabase
        .from('products')
        .select('id')
        .ilike('name', `%${term}%`)
        .eq('is_active', true)
        .limit(500);
      const ids = Array.from(new Set([...(bySku || []).map((r) => r.id), ...(byName || []).map((r) => r.id)]));
      if (ids.length === 0) {
        return res.json({ inventory: [] });
      }
      query = query.in('product_id', ids);
    }
    if (warehouse_id) {
      query = query.eq('warehouse_id', warehouse_id);
    }

    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });

    // Normalizar respuesta para la UI
    const inventory = (data || []).map((row) => {
      const product = row.products || {};
      const loc = row.locations || {};
      const quantity = Number(row.quantity || 0);
      const reserved = Number(row.reserved_quantity || 0);
      const available = Number(
        row.available_quantity !== undefined && row.available_quantity !== null
          ? row.available_quantity
          : quantity - reserved
      );
      return {
        id: row.id,
        product_id: row.product_id,
        sku: product.sku || '',
        name: product.name || '',
        category: product.categories?.name || null,
        location_code: loc.code || '—',
        location_name: loc.name || null,
        location_type: loc.location_type || null,
        quantity,
        reserved_quantity: reserved,
        available_quantity: available,
        unit_cost: Number(product.cost_price || 0),
        min_stock_level: Number(product.min_stock_level || 0),
        reorder_point: Number(product.reorder_point || 0),
        last_movement_at: row.last_movement_at || null,
      };
    });

    // Reservas por tareas activas (pending, in_progress)
    let inventoryWithNet = inventory;
    try {
      const { data: activeTasks, error: tErr } = await supabase
        .from('picking_tasks')
        .select('status, items')
        .in('status', ['pending', 'in_progress']);
      if (!tErr && Array.isArray(activeTasks)) {
        const reservedByProduct = new Map();
        for (const t of activeTasks) {
          const items = Array.isArray(t.items) ? t.items : [];
          for (const it of items) {
            const pid = it.product_id ?? it.productId ?? it.sku ?? it.code;
            const qty = Number(it.quantity ?? it.qty ?? 0);
            if (!pid || !qty || Number.isNaN(qty) || qty <= 0) continue;
            reservedByProduct.set(
              pid,
              Number(reservedByProduct.get(pid) || 0) + qty
            );
          }
        }

        // Agrupar inventario por producto y distribuir proporcionalmente la reserva
        const groups = new Map(); // pid -> { totalAvailable, idxs }
        inventory.forEach((row, idx) => {
          const pid = row.product_id || row.sku || row.id;
          const available = Number(row.available_quantity || 0);
          const g = groups.get(pid) || { totalAvailable: 0, idxs: [] };
          g.totalAvailable += available;
          g.idxs.push(idx);
          groups.set(pid, g);
        });

        inventoryWithNet = inventory.map((row) => {
          const pid = row.product_id || row.sku || row.id;
          const reservedTasks = Number(reservedByProduct.get(pid) || 0);
          const group = groups.get(pid);
          const available = Number(row.available_quantity || 0);
          let netAvailable = available;
          if (group && group.totalAvailable > 0 && reservedTasks > 0) {
            const share = available / group.totalAvailable;
            const deduct = reservedTasks * share;
            netAvailable = Math.max(0, available - deduct);
          }
          return {
            ...row,
            reserved_by_tasks_product: reservedTasks,
            net_available_quantity: Number(netAvailable.toFixed(3)),
          };
        });
      }
    } catch (netErr) {
      console.warn('No se pudo calcular reservas por tareas en inventario:', netErr?.message || netErr);
    }

    return res.json({ inventory: inventoryWithNet });
  } catch (e) {
    console.error('Error listando inventario (backend):', e);
    return res.status(500).json({ error: 'Error interno listando inventario' });
  }
});

// -----------------------------------------------
// Endpoint: Inventario por SKUs (resumen para UI de picking)
// -----------------------------------------------
app.post('/inventory/bySkus', async (req, res) => {
  try {
    const skus = Array.isArray(req.body?.skus)
      ? req.body.skus.map((s) => String(s || '').trim()).filter(Boolean)
      : [];
    if (!skus.length) return res.status(400).json({ error: 'Parámetros inválidos' });

    // Resolver productos por SKU
    const { data: prods, error: pErr } = await supabase
      .from('products')
      .select('id, sku, name, unit_of_measure')
      .in('sku', skus);
    if (pErr) return res.status(500).json({ error: pErr.message });
    const bySku = new Map((prods || []).map((p) => [String(p.sku || ''), p]));

    const results = [];
    for (const sku of skus) {
      const meta = bySku.get(sku);
      if (!meta) {
        results.push({ sku, productId: null, name: null, unit: null, totalAvailable: 0, bestLocation: null, earliestExpiry: null });
        continue;
      }
      const pid = meta.id;
      // Inventario por producto, con join de ubicación
      const { data: invRows, error: iErr } = await supabase
        .from('inventory')
        .select('location_id, available_quantity, expiry_date, locations:location_id(code, zone, location_type)')
        .eq('product_id', pid);
      if (iErr) return res.status(500).json({ error: iErr.message });
      let totalAvailable = 0;
      let bestLoc = null;
      let earliestExpiry = null;
      for (const r of invRows || []) {
        const avail = Number(r.available_quantity || 0);
        totalAvailable += avail;
        if (!bestLoc || avail > Number(bestLoc.available_quantity || 0)) {
          bestLoc = r;
        }
        if (r.expiry_date && (!earliestExpiry || new Date(r.expiry_date) < new Date(earliestExpiry))) {
          earliestExpiry = r.expiry_date;
        }
      }
      results.push({
        sku,
        productId: pid,
        name: meta.name || null,
        unit: meta.unit_of_measure || null,
        totalAvailable: Number(totalAvailable.toFixed(3)),
        bestLocation: bestLoc?.locations?.code || null,
        earliestExpiry: earliestExpiry || null,
        locations: (invRows || []).map(r => ({ code: r?.locations?.code || null, available: Number(r?.available_quantity || 0) }))
      });
    }

    return res.json({ inventory: results });
  } catch (e) {
    console.error('Error en POST /inventory/bySkus', e);
    return res.status(500).json({ error: 'Error interno' });
  }
});

// -----------------------------------------------
// Endpoint: Sugerencias de reposición (WMS)
// -----------------------------------------------
app.get('/replenishment/suggestions', authMiddleware, async (req, res) => {
  try {
    const { warehouse_id = '', zone = '' } = req.query || {};
    let query = supabase
      .from('inventory')
      .select('product_id, warehouse_id, location_id, available_quantity, products:product_id(sku, name, min_stock_level, reorder_point), locations:location_id(code, zone, location_type)')
      .limit(10000);
    const wh = String(warehouse_id || '').trim();
    const zn = String(zone || '').trim();
    if (wh) query = query.eq('warehouse_id', wh);
    if (zn) query = query.eq('locations.zone', zn);

    const { data: rows, error } = await query;
    if (error) return res.status(500).json({ error: error.message });

    const byWh = new Map();
    for (const r of rows || []) {
      const w = String(r.warehouse_id || '');
      if (!byWh.has(w)) byWh.set(w, []);
      byWh.get(w).push(r);
    }

    const suggestions = [];
    for (const [wId, invRows] of byWh.entries()) {
      const pickRows = invRows.filter(r => {
        const lt = String(r?.locations?.location_type || '').toUpperCase();
        const z = String(r?.locations?.zone || '');
        return lt === 'PICKING' || /pick/i.test(z);
      });
      for (const pr of pickRows) {
        const threshold = Number(pr?.products?.reorder_point || pr?.products?.min_stock_level || 0);
        const current = Number(pr?.available_quantity || 0);
        if (threshold > 0 && current < threshold) {
          const need = Math.max(0, threshold - current);
          // Buscar mejor origen con mayor disponibilidad en reserva
          const reserve = invRows
            .filter(r => r.product_id === pr.product_id && r.warehouse_id === pr.warehouse_id && String(r.location_id) !== String(pr.location_id))
            .filter(r => {
              const lt = String(r?.locations?.location_type || '').toUpperCase();
              const z = String(r?.locations?.zone || '');
              return lt === 'RESERVE' || /reserva|bulk|buffer/i.test(z);
            })
            .sort((a, b) => Number(b.available_quantity || 0) - Number(a.available_quantity || 0))[0];

          const availableFrom = Number(reserve?.available_quantity || 0);
          const suggested = Math.min(need, availableFrom);
          if (suggested > 0) {
            suggestions.push({
              product_id: pr.product_id,
              warehouse_id: pr.warehouse_id,
              sku: pr?.products?.sku || '',
              name: pr?.products?.name || '',
              threshold,
              current_pick_qty: current,
              needed_qty: need,
              suggested_qty: suggested,
              from_location_id: reserve?.location_id || null,
              from_location_code: reserve?.locations?.code || null,
              to_location_id: pr.location_id || null,
              to_location_code: pr?.locations?.code || null,
            });
          }
        }
      }
    }

    return res.json({ suggestions });
  } catch (e) {
    console.error('Error generando sugerencias de reposición:', e);
    return res.status(500).json({ error: 'Error interno generando sugerencias' });
  }
});

// -----------------------------------------------
// Endpoint: Ejecutar reposición (wrapper) a partir de sugerencias
// -----------------------------------------------
app.post('/replenishment/execute', authMiddleware, async (req, res) => {
  try {
    const roleUp = String((req.user || {}).role || '').toUpperCase();
    if (!['ADMIN', 'MANAGER'].includes(roleUp)) {
      return res.status(403).json({ error: 'Permisos insuficientes' });
    }
    const { items } = req.body || {};
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'items vacío o inválido' });
    }

    const movements = [];
    for (const i of items) {
      if (!i?.product_id || !i?.warehouse_id || !i?.from_location_id || !i?.to_location_id || !i?.suggested_qty) {
        continue;
      }
      movements.push({
        product_id: i.product_id,
        warehouse_id: i.warehouse_id,
        location_id: i.from_location_id,
        movement_type: 'OUT',
        transaction_type: 'TRANSFER_OUT',
        quantity: Number(i.suggested_qty || 0),
        reference_type: 'REPLENISHMENT',
        notes: `Auto-reposición ${i.sku || ''}`,
      });
      movements.push({
        product_id: i.product_id,
        warehouse_id: i.warehouse_id,
        location_id: i.to_location_id,
        movement_type: 'IN',
        transaction_type: 'TRANSFER_IN',
        quantity: Number(i.suggested_qty || 0),
        reference_type: 'REPLENISHMENT',
        notes: `Auto-reposición ${i.sku || ''}`,
      });
    }

    if (movements.length === 0) {
      return res.status(400).json({ error: 'No hay movimientos a ejecutar' });
    }

    // Reutiliza lógica de batch insert
    req.body = { movements };
    return app._router.handle({ ...req, method: 'POST', url: '/inventory/movements/batch' }, res, () => {});
  } catch (e) {
    console.error('Error ejecutando reposición:', e);
    return res.status(500).json({ error: 'Error interno ejecutando reposición' });
  }
});

// -------------------------------------------------
// Cycle Counts: listar y crear con clave de servicio
// -------------------------------------------------
app.get('/inventory/cycle_counts', async (req, res) => {
  try {
    const status = String(req.query.status || '').trim();
    const warehouseId = String(req.query.warehouseId || '').trim();
    const dateRange = String(req.query.dateRange || '7days').trim();

    let fromDate = null;
    const now = new Date();
    if (dateRange === '1day') fromDate = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
    else if (dateRange === '7days') fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    else if (dateRange === '30days') fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    // 'all' => fromDate = null

    let query = supabase
      .from('cycle_counts')
      .select('id, count_number, warehouse_id, location_id, status, count_date, count_type, notes, warehouses:warehouse_id(name,code), locations:location_id(code)')
      .order('created_at', { ascending: false })
      .limit(200);

    if (status && status !== 'all') query = query.eq('status', status);
    if (warehouseId) query = query.eq('warehouse_id', warehouseId);
    if (fromDate) query = query.gte('count_date', fromDate.toISOString().slice(0, 10));

    const { data, error } = await query;
    if (error) throw error;
    return res.json({ counts: data || [] });
  } catch (e) {
    console.error('Error listando cycle_counts:', e);
    return res.status(500).json({ error: 'Error interno listando recuentos' });
  }
});

function generateCountNumber() {
  const now = new Date();
  const yr = now.getFullYear();
  const rnd = Math.floor(100000 + Math.random() * 900000);
  return `CC-${yr}-${rnd}`;
}

app.post('/inventory/cycle_counts', authMiddleware, async (req, res) => {
  try {
    const user = req.user || {};
    const payload = req.body || {};
    const warehouseId = String(payload.warehouseId || '').trim();
    const locationId = payload.locationId ? String(payload.locationId).trim() : null;
    const countType = String(payload.countType || 'cycle').trim();
    const countDate = String(payload.countDate || new Date().toISOString().slice(0, 10)).trim();
    const notes = payload.notes ? String(payload.notes) : null;
    const countNumber = String(payload.countNumber || generateCountNumber());

    if (!warehouseId) {
      return res.status(400).json({ error: 'warehouseId es requerido' });
    }

    // Crear recuento
    const { data: created, error: insErr } = await supabase
      .from('cycle_counts')
      .insert({
        count_number: countNumber,
        warehouse_id: warehouseId,
        location_id: locationId || null,
        status: 'planned',
        count_date: countDate,
        count_type: countType,
        notes,
        created_by: user.id || null,
      })
      .select('id')
      .single();
    if (insErr) throw insErr;

    const countId = created?.id;
    if (!countId) {
      return res.status(500).json({ error: 'No se obtuvo ID del recuento creado' });
    }

    // Prellenar items desde inventario
    let invQuery = supabase
      .from('inventory')
      .select('product_id, location_id, quantity, lot_number')
      .eq('warehouse_id', warehouseId)
      .limit(10000);
    if (locationId) invQuery = invQuery.eq('location_id', locationId);
    const { data: rows, error: invErr } = await invQuery;
    if (invErr) throw invErr;

    const itemsToInsert = (rows || []).map((r) => ({
      cycle_count_id: countId,
      product_id: r.product_id,
      location_id: r.location_id,
      system_quantity: Number(r.quantity || 0),
      counted_quantity: null,
      lot_number: r.lot_number || null,
    }));

    if (itemsToInsert.length > 0) {
      const { error: itemsErr } = await supabase.from('cycle_count_items').insert(itemsToInsert);
      if (itemsErr) throw itemsErr;
    }

    return res.json({ ok: true, count: { id: countId, count_number: countNumber }, itemsInserted: itemsToInsert.length });
  } catch (e) {
    console.error('Error creando cycle_count:', e);
    return res.status(500).json({ error: 'Error interno creando recuento' });
  }
});

// -----------------------------------------------
// Módulo de Recepción: Órdenes de compra y recepción
// -----------------------------------------------

// Métricas reales para dashboard de Recepción
app.get('/reception/metrics', authMiddleware, requirePermissionId('reception.view'), async (_req, res) => {
  try {
    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);

    const yStart = new Date(start);
    yStart.setDate(yStart.getDate() - 1);
    const yEnd = new Date(end);
    yEnd.setDate(yEnd.getDate() - 1);

    // Backlog: órdenes pendientes (incluye confirmadas)
    const { count: pendingOrders, error: pendingErr } = await supabase
      .from('purchase_orders')
      .select('id', { count: 'exact', head: true })
      .in('status', ['pending', 'confirmed']);
    if (pendingErr) return res.status(500).json({ error: pendingErr.message });

    // Backlog: órdenes en recepción (parciales)
    const { count: inReceiving, error: receivingErr } = await supabase
      .from('purchase_orders')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'partial');
    if (receivingErr) return res.status(500).json({ error: receivingErr.message });

    // Completadas hoy (recibidas totalmente hoy)
    const { count: completedToday, error: compTodayErr } = await supabase
      .from('purchase_orders')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'received')
      .gte('received_date', start.toISOString())
      .lte('received_date', end.toISOString());
    if (compTodayErr) return res.status(500).json({ error: compTodayErr.message });

    const { count: completedYesterday, error: compYErr } = await supabase
      .from('purchase_orders')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'received')
      .gte('received_date', yStart.toISOString())
      .lte('received_date', yEnd.toISOString());
    if (compYErr) return res.status(500).json({ error: compYErr.message });

    // ASN recibidos: referencias únicas de movimientos de recepción (RECEIPT) hoy
    const { data: asnTodayRows, error: asnTodayErr } = await supabase
      .from('inventory_movements')
      .select('reference_number')
      .eq('transaction_type', 'RECEIPT')
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString())
      .limit(10000);
    if (asnTodayErr) return res.status(500).json({ error: asnTodayErr.message });
    const asnToday = new Set((asnTodayRows || []).map(r => r.reference_number || 'unknown')).size;

    const { data: asnYRows, error: asnYErr } = await supabase
      .from('inventory_movements')
      .select('reference_number')
      .eq('transaction_type', 'RECEIPT')
      .gte('created_at', yStart.toISOString())
      .lte('created_at', yEnd.toISOString())
      .limit(10000);
    if (asnYErr) return res.status(500).json({ error: asnYErr.message });
    const asnYesterday = new Set((asnYRows || []).map(r => r.reference_number || 'unknown')).size;

    // Cambios vs ayer (métricas diarias)
    const completedChange = (completedToday || 0) - (completedYesterday || 0);
    const asnChange = (asnToday || 0) - (asnYesterday || 0);

    // Backlog: diferencia de nuevas órdenes creadas hoy vs ayer
    const { count: newOrdersToday, error: newTodayErr } = await supabase
      .from('purchase_orders')
      .select('id', { count: 'exact', head: true })
      .gte('order_date', start.toISOString())
      .lte('order_date', end.toISOString());
    if (newTodayErr) return res.status(500).json({ error: newTodayErr.message });

    const { count: newOrdersYesterday, error: newYErr } = await supabase
      .from('purchase_orders')
      .select('id', { count: 'exact', head: true })
      .gte('order_date', yStart.toISOString())
      .lte('order_date', yEnd.toISOString());
    if (newYErr) return res.status(500).json({ error: newYErr.message });

    const pendingChange = (newOrdersToday || 0) - (newOrdersYesterday || 0);

    // En recepción: órdenes que entraron a 'partial' hoy vs ayer (aprox por updated_at)
    const { count: partialToday, error: partialTodayErr } = await supabase
      .from('purchase_orders')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'partial')
      .gte('updated_at', start.toISOString())
      .lte('updated_at', end.toISOString());
    if (partialTodayErr) return res.status(500).json({ error: partialTodayErr.message });

    const { count: partialYesterday, error: partialYErr } = await supabase
      .from('purchase_orders')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'partial')
      .gte('updated_at', yStart.toISOString())
      .lte('updated_at', yEnd.toISOString());
    if (partialYErr) return res.status(500).json({ error: partialYErr.message });

    const inReceivingChange = (partialToday || 0) - (partialYesterday || 0);

    return res.json({
      pendingOrders: pendingOrders || 0,
      pendingChange,
      asnReceived: asnToday || 0,
      asnChange,
      inReceiving: inReceiving || 0,
      inReceivingChange,
      completedToday: completedToday || 0,
      completedChange,
    });
  } catch (e) {
    console.error('Error en /reception/metrics', e);
    return res.status(500).json({ error: 'Error interno calculando métricas de recepción' });
  }
});

// Listar órdenes de compra (sin items para tabla)
app.get('/purchase_orders', authMiddleware, async (req, res) => {
  try {
    const {
      exclude_in_appointments,
      exclude_received,
      received_only,
      status,
      search,
      limit,
    } = req.query;

    const excludeAppointments = String(exclude_in_appointments ?? 'true') !== 'false';
    // Si se especifica un estado explícito, no aplicar exclusiones que contradigan el filtro
    const hasStatusFilter = Boolean(status && String(status).trim());
    const excludeReceived = !hasStatusFilter && (String(exclude_received ?? 'true') !== 'false');
    const receivedOnly = String(received_only ?? 'false') === 'true';
    const limitNum = Math.min(Number(limit || 200) || 200, 500);

    let query = supabase
      .from('purchase_orders')
      .select('id, po_number, supplier_id, warehouse_id, status, order_date, expected_date, total_amount, notes, updated_at');

    if (search && String(search).trim()) {
      query = query.ilike('po_number', `%${String(search).trim()}%`);
    }

    if (status && String(status).trim() && String(status).toLowerCase() !== 'all') {
      query = query.eq('status', String(status).trim().toLowerCase());
    }

    if (excludeReceived) {
      query = query.neq('status', 'received');
    }

    // Excluir órdenes que están en citas activas
    let excludeAppointmentPoIds = [];
    if (excludeAppointments) {
      const activeStatuses = ['scheduled', 'arrived', 'in_progress', 'rescheduled'];
      const { data: activeAppointments, error: apptsErr } = await supabase
        .from('reception_appointments')
        .select('id, status')
        .in('status', activeStatuses);

      if (apptsErr) {
        console.warn('No se pudo obtener citas activas:', apptsErr?.message || apptsErr);
      }

      const activeIds = (activeAppointments || []).map(a => a.id).filter(Boolean);
      if (activeIds.length > 0) {
        const { data: appOrders, error: appOrdersErr } = await supabase
          .from('reception_appointment_orders')
          .select('purchase_order_id')
          .in('appointment_id', activeIds);

        if (appOrdersErr) {
          console.warn('No se pudo obtener órdenes en citas activas:', appOrdersErr?.message || appOrdersErr);
        }

        // Saneamos y validamos UUIDs para evitar comillas extra y errores de sintaxis
        const poIdsRaw = (appOrders || []).map(o => o.purchase_order_id).filter(Boolean);
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        excludeAppointmentPoIds = poIdsRaw
          .map(id => String(id).trim())
          .filter(id => uuidRegex.test(id));
      }
    }

    query = query.order('order_date', { ascending: false }).limit(limitNum);

    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });

    let result = data || [];
    if (excludeAppointments && excludeAppointmentPoIds.length > 0) {
      // Filtramos en memoria para evitar posibles errores con not.in
      const set = new Set(excludeAppointmentPoIds);
      result = result.filter(po => po && !set.has(po.id));
    }

    if (receivedOnly) {
      // Incluir órdenes que estén en estado 'partial' o 'received'.
      // Esto cubre tanto órdenes con items recibidos como aquellas completadas
      // mediante flujo de ejemplo (sin items en la tabla).
      result = result.filter(po => {
        const st = String(po?.status || '').toLowerCase();
        return st === 'partial' || st === 'received';
      });
    }

    return res.json({ purchase_orders: result });
  } catch (e) {
    console.error('Error listando órdenes de compra (backend):', e);
    return res.status(500).json({ error: 'Error interno listando órdenes de compra' });
  }
});

// -----------------------------------------------
// Utilidad: Crear ubicaciones ficticias por producto
// -----------------------------------------------
async function ensureVirtualLocationsForAllProducts(targetWarehouseId = null, locType = 'quarantine') {
  try {
    // Seleccionar warehouse por defecto si no se pasa uno
    let warehouseId = targetWarehouseId;
    if (!warehouseId) {
      const { data: warehouses, error: wErr } = await supabase
        .from('warehouses')
        .select('id, name, is_active')
        .eq('is_active', true)
        .order('created_at', { ascending: true })
        .limit(1);
      if (wErr) throw wErr;
      warehouseId = warehouses && warehouses[0] ? warehouses[0].id : null;
    }
    if (!warehouseId) {
      console.warn('[VirtualLocations] No hay warehouse activo disponible. Abortando.');
      return { created: 0, updated: 0, skipped: 0 };
    }

    // Obtener productos activos
    const { data: products, error: pErr } = await supabase
      .from('products')
      .select('id, sku, name, is_active')
      .eq('is_active', true);
    if (pErr) throw pErr;

    const toUpsert = [];
    for (const p of (products || [])) {
      const sku = String(p.sku || '').trim();
      if (!sku) continue;
      const code = `VIRT-${sku}`.slice(0, 64);
      toUpsert.push({
        warehouse_id: warehouseId,
        code,
        name: `Ubicación virtual para ${sku}`,
        zone: 'V',
        aisle: '00',
        rack: 'VIRT',
        shelf: '00',
        bin: '00',
        location_type: locType,
        capacity: 0,
        is_active: true,
      });
    }

    if (toUpsert.length === 0) {
      console.log('[VirtualLocations] No hay productos activos para crear ubicaciones.');
      return { created: 0, updated: 0, skipped: 0 };
    }

    // Upsert por conflicto (warehouse_id, code)
    const { data: upserted, error: uErr } = await supabase
      .from('locations')
      .upsert(toUpsert, { onConflict: 'warehouse_id,code' })
      .select('id, code');
    if (uErr) throw uErr;

    console.log(`[VirtualLocations] Aseguradas ${upserted?.length || 0} ubicaciones virtuales en warehouse ${warehouseId}.`);
    return { total: upserted?.length || 0 };
  } catch (e) {
    console.error('[VirtualLocations] Error asegurando ubicaciones virtuales:', e?.message || e);
    return { error: e?.message || String(e) };
  }
}

// Endpoint para lanzar manualmente la creación de ubicaciones virtuales
app.post('/maintenance/create_virtual_locations', authMiddleware, requirePermissionId('config_write'), async (req, res) => {
  try {
    const { warehouse_id, location_type } = req.body || {};
    const result = await ensureVirtualLocationsForAllProducts(warehouse_id || null, location_type || 'quarantine');
    return res.json({ ok: true, result });
  } catch (e) {
    console.error('Error en /maintenance/create_virtual_locations:', e);
    return res.status(500).json({ error: 'Error creando ubicaciones virtuales' });
  }
});

// Ruta DEV sin autenticación para facilitar pruebas locales
app.post('/maintenance/create_virtual_locations/dev', async (req, res) => {
  try {
    const { warehouse_id, location_type } = req.body || {};
    const result = await ensureVirtualLocationsForAllProducts(warehouse_id || null, location_type || 'quarantine');
    return res.json({ ok: true, result, env: 'dev' });
  } catch (e) {
    console.error('Error en /maintenance/create_virtual_locations/dev:', e);
    return res.status(500).json({ error: 'Error creando ubicaciones virtuales (dev)' });
  }
});

// =====================================================
// Ruta DEV: asegurar un almacén por defecto
// Crea o devuelve el primer warehouse activo; si no existe, crea "Almacén Central CDMX"
// =====================================================
app.post('/maintenance/dev/ensure_default_warehouse', async (req, res) => {
  try {
    // Intentar obtener el primer almacén activo
    const { data: warehouses, error: wErr } = await supabase
      .from('warehouses')
      .select('id, name, code, is_active')
      .eq('is_active', true)
      .order('created_at', { ascending: true })
      .limit(1);
    if (wErr) throw wErr;

    if (warehouses && warehouses.length > 0) {
      return res.json({ ok: true, warehouse: warehouses[0], created: false });
    }

    // No hay almacenes activos: crear uno por defecto
    const defaultWarehouse = {
      name: 'Almacén Central CDMX',
      code: 'CDMX-01',
      address: 'CDMX',
      is_active: true,
    };

    const { data: created, error: cErr } = await supabase
      .from('warehouses')
      .insert(defaultWarehouse)
      .select('id, name, code, is_active')
      .single();
    if (cErr) throw cErr;

    return res.json({ ok: true, warehouse: created, created: true });
  } catch (e) {
    console.error('Error en /maintenance/dev/ensure_default_warehouse:', e);
    return res.status(500).json({ error: 'No se pudo asegurar warehouse por defecto' });
  }
});

// Consulta rápida: contar ubicaciones virtuales
app.get('/maintenance/virtual_locations/count', async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from('locations')
      .select('id', { count: 'exact', head: true })
      .ilike('code', 'VIRT-%');
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ count: data?.length || 0 });
  } catch (e) {
    return res.status(500).json({ error: 'Error contando ubicaciones virtuales' });
  }
});

// -----------------------------------------------
// Citas de Recepción: crear y listar citas basadas en órdenes existentes
// -----------------------------------------------
const receptionAppointmentsMemory = new Map();

function generateAppointmentNumber() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `APT-${y}${m}${day}-${rand}`;
}

async function getOrdersByIds(ids) {
  if (!Array.isArray(ids) || ids.length === 0) return [];
  try {
    const { data, error } = await supabase
      .from('purchase_orders')
      .select('id, po_number, supplier_id, status, expected_date, total_amount')
      .in('id', ids);
    if (error) return [];
    return data || [];
  } catch {
    return [];
  }
}

// Listar citas con resumen de órdenes (persistencia en DB con fallback)
app.get('/reception/appointments', authMiddleware, requirePermissionId('reception_appointments.view'), async (req, res) => {
  try {
    const { data: appointments, error } = await supabase
      .from('reception_appointments')
      .select('id, appointment_number, scheduled_at, dock, carrier, status, notes, created_by, updated_at')
      .order('updated_at', { ascending: false });
    if (error) throw error;
    const enriched = [];
    for (const apt of (appointments || [])) {
      const { data: rel, error: relErr } = await supabase
        .from('reception_appointment_orders')
        .select('purchase_order_id')
        .eq('appointment_id', apt.id);
      if (relErr) throw relErr;
      const orderIds = (rel || []).map(r => r.purchase_order_id);
      const orders = await getOrdersByIds(orderIds);
      enriched.push({ ...apt, order_ids: orderIds, orders });
    }
    return res.json({ appointments: enriched });
  } catch (e) {
    console.warn('Fallo en DB de citas, usando memoria:', e?.message || e);
    try {
      const list = Array.from(receptionAppointmentsMemory.values());
      const enriched = [];
      for (const apt of list) {
        const orders = await getOrdersByIds(apt.order_ids || []);
        enriched.push({ ...apt, orders });
      }
      return res.json({ appointments: enriched });
    } catch (err) {
      console.error('Error listando citas:', err);
      return res.status(500).json({ error: 'Error interno listando citas' });
    }
  }
});

// Crear cita basada en órdenes existentes (persistencia en DB con fallback)
app.post('/reception/appointments', authMiddleware, requirePermissionId('reception_appointments.manage'), async (req, res) => {
  try {
    const { order_ids, scheduled_at, dock, carrier, notes } = req.body || {};
    const ids = Array.isArray(order_ids) ? order_ids.map(String) : [];
    if (ids.length === 0) {
      return res.status(400).json({ error: 'Debe seleccionar al menos una orden' });
    }
    const orders = await getOrdersByIds(ids);
    if (!orders || orders.length === 0) {
      return res.status(404).json({ error: 'Órdenes no encontradas' });
    }

    try {
      const payload = {
        appointment_number: generateAppointmentNumber(),
        scheduled_at: scheduled_at || new Date().toISOString(),
        dock: dock || null,
        carrier: carrier || null,
        status: 'scheduled',
        notes: notes || '',
        created_by: req.user?.id || null,
      };
      const { data: inserted, error: insErr } = await supabase
        .from('reception_appointments')
        .insert([payload])
        .select('*')
        .single();
      if (insErr) throw insErr;

      const rows = ids.map(poId => ({ appointment_id: inserted.id, purchase_order_id: poId }));
      const { error: relErr } = await supabase
        .from('reception_appointment_orders')
        .insert(rows);
      if (relErr) throw relErr;

      return res.status(201).json({ appointment: { ...inserted, order_ids: ids, orders } });
    } catch (dbErr) {
      console.warn('Fallo al persistir cita en DB, usando memoria:', dbErr?.message || dbErr);
      const id = Math.random().toString(36).slice(2);
      const appointment = {
        id,
        appointment_number: generateAppointmentNumber(),
        scheduled_at: scheduled_at || new Date().toISOString(),
        dock: dock || null,
        carrier: carrier || null,
        status: 'scheduled',
        notes: notes || '',
        order_ids: ids,
      };
      receptionAppointmentsMemory.set(id, appointment);
      return res.status(201).json({ appointment: { ...appointment, orders } });
    }
  } catch (e) {
    console.error('Error creando cita:', e);
    return res.status(500).json({ error: 'Error interno creando cita' });
  }
});

// Obtener detalle de cita (persistencia en DB con fallback)
app.get('/reception/appointments/:id', authMiddleware, requirePermissionId('reception_appointments.view'), async (req, res) => {
  try {
    const { id } = req.params;
    try {
      const { data: apt, error } = await supabase
        .from('reception_appointments')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      const { data: rel, error: relErr } = await supabase
        .from('reception_appointment_orders')
        .select('purchase_order_id')
        .eq('appointment_id', id);
      if (relErr) throw relErr;
      const orderIds = (rel || []).map(r => r.purchase_order_id);
      const orders = await getOrdersByIds(orderIds);
      return res.json({ appointment: { ...apt, order_ids: orderIds, orders } });
    } catch (dbErr) {
      console.warn('Fallo al obtener cita en DB, usando memoria:', dbErr?.message || dbErr);
      const apt = receptionAppointmentsMemory.get(id);
      if (!apt) return res.status(404).json({ error: 'Cita no encontrada' });
      const orders = await getOrdersByIds(apt.order_ids || []);
      return res.json({ appointment: { ...apt, orders } });
    }
  } catch (e) {
    console.error('Error obteniendo cita:', e);
    return res.status(500).json({ error: 'Error interno obteniendo cita' });
  }
});

// Actualizar cita (estado y detalles) con persistencia en DB y fallback a memoria
app.put('/reception/appointments/:id', authMiddleware, requirePermissionId('reception_appointments.manage'), async (req, res) => {
  try {
    const { id } = req.params;
    const { scheduled_at, dock, carrier, status, notes } = req.body || {};

    const allowedStatuses = ['scheduled', 'arrived', 'receiving', 'validated', 'completed', 'cancelled'];
    const payload = {};

    if (scheduled_at !== undefined) payload.scheduled_at = scheduled_at;
    if (dock !== undefined) payload.dock = dock || null;
    if (carrier !== undefined) payload.carrier = carrier || null;
    if (notes !== undefined) payload.notes = notes || '';
    if (status !== undefined) {
      const s = String(status).toLowerCase();
      if (!allowedStatuses.includes(s)) {
        return res.status(400).json({ error: 'Estado inválido' });
      }
      payload.status = s;
    }

    if (Object.keys(payload).length === 0) {
      return res.status(400).json({ error: 'No hay cambios para actualizar' });
    }

    try {
      const { data: updated, error: updErr } = await supabase
        .from('reception_appointments')
        .update(payload)
        .eq('id', id)
        .select('*')
        .single();
      if (updErr) throw updErr;

      const { data: rel, error: relErr } = await supabase
        .from('reception_appointment_orders')
        .select('purchase_order_id')
        .eq('appointment_id', id);
      if (relErr) throw relErr;
      const orderIds = (rel || []).map(r => r.purchase_order_id);
      const orders = await getOrdersByIds(orderIds);
      return res.json({ appointment: { ...updated, order_ids: orderIds, orders } });
    } catch (dbErr) {
      console.warn('Fallo al actualizar cita en DB, usando memoria:', dbErr?.message || dbErr);
      const apt = receptionAppointmentsMemory.get(id);
      if (!apt) return res.status(404).json({ error: 'Cita no encontrada' });

      let newStatus = status !== undefined ? String(status).toLowerCase() : undefined;
      if (newStatus && !allowedStatuses.includes(newStatus)) {
        return res.status(400).json({ error: 'Estado inválido' });
      }
      const updated = {
        ...apt,
        scheduled_at: scheduled_at !== undefined ? scheduled_at : apt.scheduled_at,
        dock: dock !== undefined ? (dock || null) : apt.dock,
        carrier: carrier !== undefined ? (carrier || null) : apt.carrier,
        notes: notes !== undefined ? (notes || '') : apt.notes,
        status: newStatus !== undefined ? newStatus : apt.status,
      };
      receptionAppointmentsMemory.set(id, updated);
      const orders = await getOrdersByIds(updated.order_ids || []);
      return res.json({ appointment: { ...updated, orders } });
    }
  } catch (e) {
    console.error('Error actualizando cita:', e);
    return res.status(500).json({ error: 'Error interno actualizando cita' });
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

    // Validar disponibilidad para salidas
    if (String(movement_type).toUpperCase() === 'OUT') {
      let invQuery = supabase
        .from('inventory')
        .select('available_quantity')
        .eq('product_id', product_id)
        .eq('warehouse_id', warehouse_id);
      if (location_id) invQuery = invQuery.eq('location_id', location_id);
      const { data: invRows, error: invErr } = await invQuery;
      if (invErr) {
        return res.status(500).json({ error: `Error validando inventario: ${invErr.message}` });
      }
      const available = (invRows || []).reduce((sum, r) => sum + Number(r?.available_quantity || 0), 0);
      if (qty > available) {
        return res.status(400).json({ error: `La cantidad (${qty}) excede la disponibilidad (${available})` });
      }
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
    const { type = 'all', period = '7days', transaction_type = 'all', limit = 200 } = req.query || {};

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
      .select('id, product_id, warehouse_id, location_id, movement_type, transaction_type, quantity, unit_cost, reference_number, reference_type, lot_number, expiry_date, reason, notes, products:product_id(sku, name), created_at')
      .order('created_at', { ascending: false })
      .limit(Math.max(1, Math.min(500, parseInt(limit, 10) || 200)));

    if (fromDate) {
      query = query.gte('created_at', fromDate);
    }
    if (type && type !== 'all') {
      query = query.eq('movement_type', String(type));
    }
    if (transaction_type && transaction_type !== 'all') {
      query = query.eq('transaction_type', String(transaction_type));
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

      // Validar disponibilidad para salidas en lote
      if (String(movement_type).toUpperCase() === 'OUT') {
        let invQuery = supabase
          .from('inventory')
          .select('available_quantity')
          .eq('product_id', product_id)
          .eq('warehouse_id', warehouse_id);
        if (location_id) invQuery = invQuery.eq('location_id', location_id);
        const { data: invRows, error: invErr } = await invQuery;
        if (invErr) {
          errors.push({ index: idx, error: `Error validando inventario: ${invErr.message}` });
          continue;
        }
        const available = (invRows || []).reduce((sum, r) => sum + Number(r?.available_quantity || 0), 0);
        if (qty > available) {
          errors.push({ index: idx, error: `La cantidad (${qty}) excede la disponibilidad (${available})` });
          continue;
        }
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

// Crear ajuste masivo: sumar cantidad a todos los productos activos
// Body: { quantity?: number, warehouse_id?: string, transaction_type?: 'ADJUSTMENT_IN' | 'RECEIPT', use_default_location?: boolean }
app.post('/inventory/add_quantity_all', authMiddleware, async (req, res) => {
  try {
    const roleUp = String((req.user || {}).role || '').toUpperCase();
    if (!['ADMIN', 'MANAGER'].includes(roleUp)) {
      return res.status(403).json({ error: 'Permisos insuficientes' });
    }

    const {
      quantity = 5,
      warehouse_id = null,
      transaction_type = 'ADJUSTMENT_IN',
      use_default_location = true,
    } = req.body || {};

    const qty = Number(quantity);
    if (!qty || qty <= 0) {
      return res.status(400).json({ error: 'quantity debe ser > 0' });
    }

    // 1) Determinar warehouse
    let warehouseId = warehouse_id;
    if (!warehouseId) {
      const { data: warehouses, error: wErr } = await supabase
        .from('warehouses')
        .select('id, name, code, is_active')
        .eq('is_active', true)
        .order('created_at', { ascending: true })
        .limit(1);
      if (wErr) return res.status(500).json({ error: wErr.message });
      warehouseId = warehouses && warehouses[0] ? warehouses[0].id : null;
    }
    if (!warehouseId) {
      return res.status(400).json({ error: 'No hay warehouse activo disponible' });
    }

    // 2) Obtener productos activos
    const { data: products, error: pErr } = await supabase
      .from('products')
      .select('id, is_active, default_location_id')
      .eq('is_active', true)
      .limit(10000);
    if (pErr) return res.status(500).json({ error: pErr.message });
    const list = Array.isArray(products) ? products : [];
    if (list.length === 0) {
      return res.json({ created: 0, results: [], errors: [], info: 'No hay productos activos' });
    }

    // 3) Mapear ubicaciones por defecto a su warehouse
    let locationMap = new Map();
    if (use_default_location) {
      const locIds = [...new Set(list.map((p) => p.default_location_id).filter(Boolean))];
      if (locIds.length > 0) {
        const { data: locs, error: lErr } = await supabase
          .from('locations')
          .select('id, warehouse_id')
          .in('id', locIds);
        if (!lErr && Array.isArray(locs)) {
          for (const l of locs) {
            locationMap.set(String(l.id), String(l.warehouse_id || ''));
          }
        }
      }
    }

    // 4) Construir movimientos
    const movements = [];
    for (const p of list) {
      const locId = use_default_location ? (p.default_location_id || null) : null;
      const whId = locId && locationMap.get(String(locId)) ? locationMap.get(String(locId)) : warehouseId;
      movements.push({
        product_id: p.id,
        warehouse_id: whId,
        location_id: locId || null,
        movement_type: 'IN',
        transaction_type,
        quantity: qty,
        reference_type: 'MASS_UPDATE',
        notes: `Ajuste masivo +${qty}`,
      });
    }

    // 5) Insertar en lote usando la misma tabla de movimientos
    // Dividir en chunks para evitar límites
    const CHUNK = 500;
    const results = [];
    const errors = [];
    for (let i = 0; i < movements.length; i += CHUNK) {
      const slice = movements.slice(i, i + CHUNK);
      const { data, error } = await supabase
        .from('inventory_movements')
        .insert(slice)
        .select('id');
      if (error) {
        errors.push({ index: i, error: error.message });
      } else {
        const ids = Array.isArray(data) ? data.map((r) => r.id) : [];
        results.push(...ids.map((id, j) => ({ index: i + j, id })));
      }
    }

    return res.status(201).json({ created: results.length, results, errors });
  } catch (e) {
    console.error('Error en ajuste masivo de inventario:', e);
    return res.status(500).json({ error: 'Error interno ajustando inventario masivamente' });
  }
});

// Asignar ubicaciones aleatorias a productos sin ubicación (storage/picking)
// Body opcional: { warehouse_id?, location_types?: ['storage','picking'], only_missing?: true }
app.post('/inventory/assign_random_locations', authMiddleware, requirePermissionId('inventory_write'), async (req, res) => {
  try {
    const { warehouse_id = null, location_types = ['storage', 'picking'], only_missing = true } = req.body || {};

    // 1) Seleccionar warehouse por defecto si no se pasa uno
    let warehouseId = warehouse_id;
    if (!warehouseId) {
      const { data: warehouses, error: wErr } = await supabase
        .from('warehouses')
        .select('id, name, is_active')
        .eq('is_active', true)
        .order('created_at', { ascending: true })
        .limit(1);
      if (wErr) return res.status(500).json({ error: wErr.message });
      warehouseId = warehouses && warehouses[0] ? warehouses[0].id : null;
    }
    if (!warehouseId) {
      return res.status(400).json({ error: 'No hay warehouse activo disponible' });
    }

    // 2) Ubicaciones candidatas
    const { data: locs, error: lErr } = await supabase
      .from('locations')
      .select('id, code, location_type, is_active, warehouse_id')
      .eq('warehouse_id', warehouseId)
      .eq('is_active', true)
      .in('location_type', location_types);
    if (lErr) return res.status(500).json({ error: lErr.message });
    const locations = (locs || []).filter((l) => (l.location_type || '').toLowerCase() !== 'receiving' && (l.location_type || '').toLowerCase() !== 'quarantine');
    if (locations.length === 0) {
      return res.status(400).json({ error: 'No hay ubicaciones activas de storage/picking para asignar' });
    }

    // 3) Productos activos
    const { data: products, error: pErr } = await supabase
      .from('products')
      .select('id, sku, is_active, default_location_id')
      .eq('is_active', true);
    if (pErr) return res.status(500).json({ error: pErr.message });
    const productIds = (products || []).map((p) => p.id);
    if (productIds.length === 0) return res.json({ created: 0 });

    // 4) Inventario existente para decidir qué falta (considerando solo storage/picking)
    const { data: invRows, error: iErr } = await supabase
      .from('inventory')
      .select('product_id, location_id, locations:location_id(location_type)')
      .in('product_id', productIds);
    if (iErr) return res.status(500).json({ error: iErr.message });

    const hasAssigned = new Map(); // product_id -> boolean si ya tiene storage/picking
    (invRows || []).forEach((r) => {
      const pId = String(r.product_id);
      const locType = String(r?.locations?.location_type || '').toLowerCase();
      if (['storage', 'picking'].includes(locType)) {
        hasAssigned.set(pId, true);
      }
    });

    // 5) Preparar inserts para los que no tienen ubicación (storage/picking)
    const nowIso = new Date().toISOString();
    const toInsert = [];
    const productDefaultUpdates = [];
    for (const p of (products || [])) {
      const pid = String(p.id);
      const already = Boolean(hasAssigned.get(pid));
      if (only_missing && already) continue;
      // Elegir ubicación aleatoria
      const rnd = Math.floor(Math.random() * locations.length);
      const targetLoc = locations[rnd];
      toInsert.push({
        product_id: pid,
        warehouse_id: warehouseId,
        location_id: targetLoc.id,
        quantity: 0,
        reserved_quantity: 0,
        last_movement_at: nowIso,
        created_at: nowIso,
        updated_at: nowIso,
      });
      // Actualizar ubicación por defecto del producto si no tiene
      const hasDefault = p?.default_location_id ? String(p.default_location_id) : null;
      if (!hasDefault) {
        productDefaultUpdates.push({ id: pid, default_location_id: targetLoc.id });
      }
    }

    if (toInsert.length === 0) {
      return res.json({ created: 0 });
    }

    const { error: insErr } = await supabase
      .from('inventory')
      .insert(toInsert);
    if (insErr) return res.status(500).json({ error: insErr.message });

    // Upsert de ubicaciones por defecto en productos (solo para los que no tenían)
    if (productDefaultUpdates.length > 0) {
      const { error: upErr } = await supabase
        .from('products')
        .upsert(productDefaultUpdates, { onConflict: 'id' });
      if (upErr) return res.status(500).json({ error: upErr.message });
    }

    return res.json({ created: toInsert.length, updated_defaults: productDefaultUpdates.length });
  } catch (e) {
    console.error('Error asignando ubicaciones aleatorias:', e);
    return res.status(500).json({ error: 'Error interno asignando ubicaciones' });
  }
});

// -----------------------------------------------
// Módulo de Inventario: Trazabilidad por producto
// -----------------------------------------------
// Devuelve línea de tiempo de movimientos con filtros
// Query params:
// - q: SKU/ID/nombre de producto (parcial). Alternativa: product_id.
// - product_id: UUID del producto (prioridad sobre q)
// - warehouse_id: filtrar por almacén específico
// - lot: filtrar por número de lote (ilike)
// - type: IN|OUT|TRANSFER|ADJUSTMENT|COUNT|all
// - dateRange: 7days|30days|90days|all (default 90days)
// - limit: número máximo de eventos (default 500)
app.get('/inventory/traceability', authMiddleware, async (req, res) => {
  try {
    const {
      q = '',
      product_id = '',
      warehouse_id = '',
      lot = '',
      type = 'all',
      dateRange = '90days',
      limit = 500,
    } = req.query || {};

    // Resolver IDs de producto a partir de q si no viene product_id
    let productIds = [];
    const pid = String(product_id || '').trim();
    const term = String(q || '').trim();
    if (pid) {
      productIds = [pid];
    } else if (term) {
      // Buscar coincidencias por SKU y por nombre (evitar OR cruzando tablas en la consulta principal)
      const { data: bySku } = await supabase
        .from('products')
        .select('id')
        .ilike('sku', `%${term}%`)
        .eq('is_active', true)
        .limit(300);
      const { data: byName } = await supabase
        .from('products')
        .select('id')
        .ilike('name', `%${term}%`)
        .eq('is_active', true)
        .limit(300);
      productIds = Array.from(new Set([...(bySku || []).map((r) => r.id), ...(byName || []).map((r) => r.id)]));
    }

    // Construir filtro de fechas
    const now = new Date();
    const toISOString = (d) => new Date(d).toISOString();
    let fromDate = null;
    if (dateRange === '7days') {
      const d = new Date(now); d.setDate(d.getDate() - 7); fromDate = toISOString(d);
    } else if (dateRange === '30days') {
      const d = new Date(now); d.setDate(d.getDate() - 30); fromDate = toISOString(d);
    } else if (dateRange === '90days') {
      const d = new Date(now); d.setDate(d.getDate() - 90); fromDate = toISOString(d);
    }

    let query = supabase
      .from('inventory_movements')
      .select('id, product_id, warehouse_id, location_id, movement_type, transaction_type, quantity, unit_cost, reference_number, reference_type, lot_number, expiry_date, reason, notes, created_at, products:product_id(name, sku), locations:location_id(code, name)')
      .order('created_at', { ascending: false })
      .limit(Number(limit) || 500);

    if (fromDate) {
      query = query.gte('created_at', fromDate);
    }
    if (type && type !== 'all') {
      query = query.eq('movement_type', String(type));
    }
    if (warehouse_id) {
      query = query.eq('warehouse_id', String(warehouse_id));
    }
    if (lot) {
      query = query.ilike('lot_number', `%${String(lot)}%`);
    }
    if (productIds.length > 0) {
      query = query.in('product_id', productIds);
    }

    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });

    const events = data || [];

    // Resumen simple
    let inbound = 0; let outbound = 0; const locSet = new Set();
    let lastMovementAt = null;
    for (const e of events) {
      if (String(e.movement_type).toUpperCase() === 'IN') inbound += Number(e.quantity || 0);
      if (String(e.movement_type).toUpperCase() === 'OUT') outbound += Number(e.quantity || 0);
      if (e.location_id) locSet.add(String(e.location_id));
      if (!lastMovementAt) lastMovementAt = e.created_at; // ya vienen ordenados desc
    }

    const summary = {
      inbound,
      outbound,
      net: inbound - outbound,
      last_movement_at: lastMovementAt || null,
      distinct_locations: locSet.size,
    };

    return res.json({ events, summary });
  } catch (e) {
    console.error('Error listando trazabilidad:', e);
    return res.status(500).json({ error: 'Error interno listando trazabilidad' });
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
      // Normaliza ítems: admite product_id directo o sku/product_sku para resolver el producto
      const normalized = [];
      const skusToResolve = [];
      for (const it of items) {
        if (!it) continue;
        const qty = Number(it.quantity ?? it.qty ?? 0) || 0;
        const price = Number(it.unit_price ?? it.price ?? 0) || 0;
        const sku = String(it.sku ?? it.product_sku ?? '').trim();
        const pid = it.product_id ?? null;
        const notes = it.notes || null;
        normalized.push({ product_id: pid, sku, qty, price, notes });
        if (!pid && sku) skusToResolve.push(sku);
      }

      // Resuelve SKUs a product_id
      let skuToId = new Map();
      if (skusToResolve.length > 0) {
        const { data: skuRows, error: skuErr } = await supabase
          .from('products')
          .select('id, sku')
          .in('sku', skusToResolve);
        if (skuErr) return res.status(500).json({ error: skuErr.message });
        for (const r of skuRows || []) {
          skuToId.set(r.sku, r.id);
        }
        // Crea productos mínimos para SKUs faltantes en catálogo
        const missingSkus = skusToResolve.filter(s => !skuToId.has(s));
        if (missingSkus.length > 0) {
          const toCreate = missingSkus.map(sku => ({
            sku,
            name: sku,
            description: null,
            unit_of_measure: 'PCS',
            is_active: true,
            cost_price: 0,
            selling_price: null,
          }));
          const { data: createdProducts, error: createErr } = await supabase
            .from('products')
            .insert(toCreate)
            .select('id, sku');
          if (createErr) return res.status(500).json({ error: createErr.message });
          for (const p of createdProducts || []) {
            skuToId.set(p.sku, p.id);
          }
        }
      }
      for (const n of normalized) {
        if (!n.product_id && n.sku && skuToId.has(n.sku)) {
          n.product_id = skuToId.get(n.sku);
        }
      }

      // Valida que los product_id existan y cantidades/precios sean válidos
      const ids = Array.from(new Set(normalized.map(n => n.product_id).filter(Boolean)));
      if (ids.length === 0) {
        return res.status(400).json({ error: 'Items inválidos: se requiere product_id o sku válido' });
      }
      const { data: validRows, error: valErr } = await supabase
        .from('products')
        .select('id')
        .in('id', ids);
      if (valErr) return res.status(500).json({ error: valErr.message });
      const validIdSet = new Set((validRows || []).map(r => r.id));
      const invalidItems = normalized.filter(n => !n.product_id || !validIdSet.has(n.product_id) || n.qty <= 0 || n.price < 0);
      if (invalidItems.length > 0) {
        return res.status(400).json({ error: 'Items contienen producto inexistente o cantidades/precios inválidos' });
      }

      const toInsert = [];
      for (const n of normalized) {
        total += n.qty * n.price;
        toInsert.push({
          purchase_order_id: created.id,
          product_id: n.product_id,
          quantity: n.qty,
          unit_price: n.price,
          notes: n.notes || null,
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

    // Notificar creación de nueva orden (best-effort)
    try {
      const payload = JSON.stringify({
        title: 'Nueva orden de compra',
        body: `Se creó ${created.po_number}`,
        url: '/reception/orders'
      });
      sendPushToAll(payload).catch(() => {});
    } catch (e) {
      console.warn('No se pudo enviar push de nueva orden:', e?.message || e);
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

    // Si la orden no tiene ítems, devuelve algunos productos como ejemplo (cantidad 2)
    if (!items || items.length === 0) {
      const { data: sampleProds, error: prodErr } = await supabase
        .from('products')
        .select('id, sku, name, description, cost_price')
        .eq('is_active', true)
        .limit(3);
      if (prodErr) return res.status(500).json({ error: prodErr.message });
      const sampleItems = (sampleProds || []).map(p => {
        const unit = Number(p.cost_price || 0);
        const qty = 2;
        return {
          id: `sample-${p.id}`,
          product_id: p.id,
          quantity: qty,
          received_quantity: 0,
          unit_price: unit,
          total_price: unit * qty,
          notes: 'Producto de ejemplo',
          products: { sku: p.sku, name: p.name, description: p.description },
        };
      });
      const sampleTotal = sampleItems.reduce((sum, it) => sum + Number(it.total_price || 0), 0);
      return res.json({ purchase_order: { ...po, total_amount: sampleTotal, items: sampleItems } });
    }

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
app.post('/purchase_orders/:id/receive', authMiddleware, requirePermissionId('reception.manage'), async (req, res) => {
  try {
    // Acceso validado por requirePermissionId('reception.manage')

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
      const itemIdRaw = it.item_id;
      const requestedQty = Number(it.quantity) || 0;
      if (!itemIdRaw || requestedQty <= 0) continue;

      // Sanitizar posibles comillas o espacios del item_id
      const itemIdSan = String(itemIdRaw).trim().replace(/^"+|"+$/g, '');

      let itemRow;
      let itemId = itemIdSan;

      // Soporte para ítems de muestra: id "sample-<product_uuid>"
      if (itemIdSan.startsWith('sample-')) {
        // Extraer y sanitizar product_id
        const productId = String(itemIdSan.slice('sample-'.length)).trim().replace(/^"+|"+$/g, '');
        // Validar formato de UUID para evitar errores de Postgrest
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(productId)) {
          return res.status(400).json({ error: `Formato inválido de UUID en ítem de muestra: ${productId}` });
        }
        // Validar producto
        const { data: prod, error: prodErr } = await supabase
          .from('products')
          .select('id, cost_price')
          .eq('id', productId)
          .single();
        if (prodErr) return res.status(500).json({ error: prodErr.message });
        if (!prod) return res.status(400).json({ error: `Producto ${productId} inválido para ítem de muestra` });

        // Crear item real con la cantidad solicitada (o 1 por seguridad)
        const qtyToSet = requestedQty > 0 ? requestedQty : 1;
        const { data: inserted, error: insErr } = await supabase
          .from('purchase_order_items')
          .insert({
            purchase_order_id: id,
            product_id: prod.id,
            quantity: qtyToSet,
            received_quantity: 0,
            unit_price: Number(prod.cost_price ?? 0),
            notes: 'Generado automáticamente desde recepción de ítem de ejemplo',
          })
          .select('id, product_id, quantity, received_quantity, unit_price')
          .single();
        if (insErr) return res.status(500).json({ error: insErr.message });
        itemRow = inserted;
        itemId = inserted.id;
      } else {
        // Validar formato UUID del item_id para evitar 400 del parser
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(itemId)) {
          return res.status(400).json({ error: `item_id inválido: ${itemId}` });
        }
        const { data: fetchedItem, error: itemErr } = await supabase
          .from('purchase_order_items')
          .select('id, product_id, quantity, received_quantity, unit_price')
          .eq('id', itemId)
          .eq('purchase_order_id', id)
          .single();
        if (itemErr) return res.status(500).json({ error: itemErr.message });
        if (!fetchedItem) return res.status(404).json({ error: `Item ${itemId} no encontrado en la orden` });
        itemRow = fetchedItem;
      }

      const pending = Math.max(0, (itemRow.quantity || 0) - (itemRow.received_quantity || 0));
      const receiveQty = Math.min(pending, requestedQty);
      if (receiveQty <= 0) continue;

      const unitCost = it.unit_cost !== undefined && it.unit_cost !== null ? Number(it.unit_cost) : (itemRow.unit_price || null);

      // Registrar movimiento de inventario (sanitizando location_id)
      const locIdSan = it.location_id ? String(it.location_id).trim().replace(/^"+|"+$/g, '') : null;
      const { error: movErr } = await supabase
        .from('inventory_movements')
        .insert({
          product_id: itemRow.product_id,
          warehouse_id: po.warehouse_id,
          location_id: locIdSan,
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

      // Si la ubicación es de tipo receiving/quarantine, reservar la cantidad recibida
      try {
        let locType = null;
        if (locIdSan) {
          const { data: locRow, error: locErr } = await supabase
            .from('locations')
            .select('id, location_type')
            .eq('id', locIdSan)
            .single();
          if (!locErr && locRow) {
            locType = String(locRow.location_type || '').toLowerCase();
          }
        }
        if (['receiving', 'quarantine'].includes(locType)) {
          const invKey = {
            product_id: itemRow.product_id,
            warehouse_id: po.warehouse_id,
            location_id: locIdSan,
            lot_number: it.lot_number || null
          };
          const { data: invRow, error: invErr } = await supabase
            .from('inventory')
            .select('id, reserved_quantity')
            .eq('product_id', invKey.product_id)
            .eq('warehouse_id', invKey.warehouse_id)
            .eq('location_id', invKey.location_id)
            .eq('lot_number', invKey.lot_number)
            .limit(1)
            .maybeSingle();
          if (!invErr && invRow && invRow.id) {
            await supabase
              .from('inventory')
              .update({ reserved_quantity: (invRow.reserved_quantity || 0) + receiveQty, updated_at: new Date().toISOString() })
              .eq('id', invRow.id);
          } else if (!invErr && !invRow) {
            await supabase
              .from('inventory')
              .insert({
                product_id: invKey.product_id,
                warehouse_id: invKey.warehouse_id,
                location_id: invKey.location_id,
                quantity: 0,
                reserved_quantity: receiveQty,
                lot_number: invKey.lot_number,
                last_movement_at: new Date().toISOString(),
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              });
          }
        }
      } catch (e) {
        console.warn('No se pudo reservar inventario en ubicación de recepción/cuarentena:', e?.message || e);
      }

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

// Generar backorder a partir de una orden (o items especificados)
app.post('/purchase_orders/:id/backorder', authMiddleware, requirePermissionId('reception.manage'), async (req, res) => {
  try {
    // Acceso validado por requirePermissionId('reception.manage')

    const { id } = req.params;
    const { items, expected_date, notes } = req.body || {};

    const { data: po, error: poErr } = await supabase
      .from('purchase_orders')
      .select('id, po_number, supplier_id, warehouse_id, status, expected_date')
      .eq('id', id)
      .single();
    if (poErr) return res.status(500).json({ error: poErr.message });
    if (!po) return res.status(404).json({ error: 'Orden no encontrada' });

    let backItems = [];

    if (Array.isArray(items) && items.length > 0) {
      for (const it of items) {
        if (!it) continue;
        const qty = Number(it.quantity ?? it.qty ?? 0) || 0;
        const price = Number(it.unit_price ?? it.price ?? 0) || 0;
        const product_id = it.product_id ?? null;
        const notesIt = it.notes || null;
        if (qty > 0 && product_id) {
          backItems.push({ product_id, qty, price, notes: notesIt });
        }
      }
    } else {
      const { data: poItems, error: itemsErr } = await supabase
        .from('purchase_order_items')
        .select('product_id, quantity, received_quantity, unit_price, notes')
        .eq('purchase_order_id', id);
      if (itemsErr) return res.status(500).json({ error: itemsErr.message });
      for (const r of poItems || []) {
        const pending = Math.max(0, (r.quantity || 0) - (r.received_quantity || 0));
        if (pending > 0) {
          backItems.push({ product_id: r.product_id, qty: pending, price: r.unit_price || 0, notes: r.notes || null });
        }
      }
    }

    if (backItems.length === 0) {
      return res.status(400).json({ error: 'No hay ítems pendientes para backorder' });
    }

    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const rand = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
    const po_number = `PO-${y}${m}${d}-${rand}`;

    const { data: created, error: createErr } = await supabase
      .from('purchase_orders')
      .insert({
        po_number,
        supplier_id: po.supplier_id || null,
        warehouse_id: po.warehouse_id,
        status: 'open',
        order_date: new Date().toISOString().slice(0, 10),
        expected_date: expected_date || po.expected_date || null,
        notes: notes || `Backorder de ${po.po_number}`,
        total_amount: 0,
        updated_at: new Date().toISOString(),
      })
      .select('id, po_number, supplier_id, warehouse_id, status, order_date, expected_date, total_amount, notes')
      .single();
    if (createErr) return res.status(500).json({ error: createErr.message });

    let total = 0;
    const toInsert = [];
    for (const n of backItems) {
      total += n.qty * n.price;
      toInsert.push({
        purchase_order_id: created.id,
        product_id: n.product_id,
        quantity: n.qty,
        unit_price: n.price,
        notes: n.notes || null,
      });
    }

    const { error: itemsErr2 } = await supabase
      .from('purchase_order_items')
      .insert(toInsert);
    if (itemsErr2) return res.status(500).json({ error: itemsErr2.message });

    if (total > 0) {
      const { error: updErr } = await supabase
        .from('purchase_orders')
        .update({ total_amount: total, updated_at: new Date().toISOString() })
        .eq('id', created.id);
      if (updErr) return res.status(500).json({ error: updErr.message });
      created.total_amount = total;
    }

    try {
      const payload = JSON.stringify({
        title: 'Backorder generado',
        body: `Se generó ${created.po_number} desde ${po.po_number}`,
        url: '/reception/orders'
      });
      sendPushToAll(payload).catch(() => {});
    } catch (e) {
      console.warn('No se pudo enviar push de backorder:', e?.message || e);
    }

    return res.status(201).json({ backorder: created });
  } catch (e) {
    console.error('Error generando backorder:', e);
    return res.status(500).json({ error: 'Error interno generando backorder' });
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
  { id: 'config_write', name: 'Modificar configuración', description: 'Modificar configuraciones del sistema', category: 'Configuración', isSystem: true },
  // Recepción: permisos granulares
  { id: 'reception.view', name: 'Ver Recepción', description: 'Acceder a dashboard y listas de recepción', category: 'Recepción', isSystem: true },
  { id: 'reception.manage', name: 'Gestionar Recepción', description: 'Crear, editar y completar procesos de recepción', category: 'Recepción', isSystem: true },
  { id: 'reception_appointments.view', name: 'Ver Citas', description: 'Listar y consultar citas de recepción', category: 'Recepción', isSystem: true },
  { id: 'reception_appointments.manage', name: 'Gestionar Citas', description: 'Crear y modificar citas de recepción', category: 'Recepción', isSystem: true },
  { id: 'reception_asn.view', name: 'Ver ASN', description: 'Consultar avisos de envío (ASN) de recepción', category: 'Recepción', isSystem: true },
  { id: 'reception_asn.manage', name: 'Gestionar ASN', description: 'Crear, vincular y modificar ASN', category: 'Recepción', isSystem: true },
  { id: 'reception_tasks.view', name: 'Ver Tareas de Recepción', description: 'Listar tareas asignadas de recepción', category: 'Recepción', isSystem: true },
  { id: 'reception_tasks.manage', name: 'Gestionar Tareas de Recepción', description: 'Crear y actualizar tareas de recepción', category: 'Recepción', isSystem: true }
  ,
  // Putaway: permisos granulares
  { id: 'putaway.view', name: 'Ver Acomodo', description: 'Acceder al módulo y tareas de acomodo', category: 'Acomodo', isSystem: true },
  { id: 'putaway.manage', name: 'Gestionar Acomodo', description: 'Crear y editar tareas de acomodo', category: 'Acomodo', isSystem: true }
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

// Limpieza administrativa de órdenes y productos
app.post('/admin/cleanup', authMiddleware, async (req, res) => {
  try {
    const roleUp = String((req.user || {}).role || '').toUpperCase();
    if (roleUp !== 'ADMIN') {
      return res.status(403).json({ error: 'Solo administradores pueden limpiar tablas' });
    }
    const body = req.body || {};
    const scope = body.scope ?? 'all';
    const hard = body.hard ?? true; // por defecto, elimina dependencias que bloquean FK
    const wantsOrders = scope === 'all' || scope === 'orders' || (Array.isArray(scope) && scope.includes('orders'));
    const wantsProducts = scope === 'all' || scope === 'products' || (Array.isArray(scope) && scope.includes('products'));
    const wantsAppointments = scope === 'all' || scope === 'appointments' || (Array.isArray(scope) && scope.includes('appointments'));

    const summary = {};

    // 1) Órdenes (cascada de items)
    if (wantsOrders) {
      const { data: soDel, error: soErr } = await supabase
        .from('sales_orders')
        .delete()
        .not('id', 'is', null)
        .select('id');
      if (soErr) return res.status(500).json({ error: `Error borrando sales_orders: ${soErr.message}` });
      summary.sales_orders_deleted = (soDel || []).length;

      const { data: poDel, error: poErr } = await supabase
        .from('purchase_orders')
        .delete()
        .not('id', 'is', null)
        .select('id');
      if (poErr) return res.status(500).json({ error: `Error borrando purchase_orders: ${poErr.message}` });
      summary.purchase_orders_deleted = (poDel || []).length;
    }

    // 2) Productos (inventory e inventory_movements tienen ON DELETE CASCADE)
    if (wantsProducts) {
      // Eliminar dependencias que NO tienen cascade sobre products
      if (hard) {
        const { data: trDel, error: trErr } = await supabase
          .from('transfers')
          .delete()
          .not('id', 'is', null)
          .select('id');
        if (trErr) return res.status(500).json({ error: `Error borrando transfers: ${trErr.message}` });
        summary.transfers_deleted = (trDel || []).length;

        const { data: ccDel, error: ccErr } = await supabase
          .from('cycle_counts')
          .delete()
          .not('id', 'is', null)
          .select('id');
        if (ccErr) return res.status(500).json({ error: `Error borrando cycle_counts: ${ccErr.message}` });
        summary.cycle_counts_deleted = (ccDel || []).length;
      }

      const { data: prodDel, error: prodErr } = await supabase
        .from('products')
        .delete()
        .not('id', 'is', null)
        .select('id');
      if (prodErr) {
        return res.status(500).json({
          error: `Error borrando products: ${prodErr.message}`,
          hint: 'Elimine transfers y cycle_counts para evitar FK, o envíe hard=true.'
        });
      }
      summary.products_deleted = (prodDel || []).length;
    }

    // 3) Citas de recepción (relaciones y citas)
    if (wantsAppointments) {
      const { data: relDel, error: relErr } = await supabase
        .from('reception_appointment_orders')
        .delete()
        .not('appointment_id', 'is', null)
        .select('appointment_id');
      if (relErr) return res.status(500).json({ error: `Error borrando reception_appointment_orders: ${relErr.message}` });
      summary.reception_appointment_orders_deleted = (relDel || []).length;

      const { data: aptDel, error: aptErr } = await supabase
        .from('reception_appointments')
        .delete()
        .not('id', 'is', null)
        .select('id');
      if (aptErr) return res.status(500).json({ error: `Error borrando reception_appointments: ${aptErr.message}` });
      summary.reception_appointments_deleted = (aptDel || []).length;
    }

    return res.json({ ok: true, scope, summary });
  } catch (e) {
    console.error('Error en /admin/cleanup:', e);
    return res.status(500).json({ error: 'Error interno limpiando tablas' });
  }
});

app.listen(APP_PORT, () => {
  console.log(`Auth backend escuchando en puerto ${APP_PORT}`);
  try {
    const { start } = initErpAutoSyncScheduler({ APP_PORT, supabase });
    start();
  } catch (e) {
    console.warn('[AutoSync] No se pudo iniciar:', e?.message || e);
  }
  if (CREATE_VIRTUAL_LOCATIONS_ON_BOOT) {
    ensureVirtualLocationsForAllProducts()
      .then((r) => {
        if (r && r.total) {
          console.log(`[Boot] Ubicaciones virtuales aseguradas: total=${r.total}`);
        } else {
          console.log('[Boot] ensureVirtualLocationsForAllProducts ejecutado.');
        }
      })
      .catch((e) => console.warn('[Boot] Error creando ubicaciones virtuales:', e?.message || e));
  }
});