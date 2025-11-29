const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Faltan SUPABASE_URL o clave de API');
  process.exit(1);
}
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function pickThree(arr) {
  const a = Array.isArray(arr) ? arr.slice(0, 3) : [];
  return a;
}

async function getInventoryWithLocation(limit = 50) {
  const { data, error } = await supabase
    .from('inventory')
    .select('product_id, warehouse_id, location_id, available_quantity, lot_number')
    .gt('available_quantity', 0)
    .not('location_id', 'is', null)
    .limit(limit);
  if (error) throw error;
  return data || [];
}

async function mapPrices(productIds) {
  if (!productIds.length) return new Map();
  const { data, error } = await supabase
    .from('products')
    .select('id, selling_price')
    .in('id', productIds);
  if (error) throw error;
  return new Map((data || []).map(p => [p.id, Number(p.selling_price || 1)]));
}

async function createSalesOrdersWithItems() {
  const inv = await getInventoryWithLocation(100);
  const productIds = [...new Set(inv.map(r => r.product_id).filter(Boolean))];
  const priceMap = await mapPrices(productIds);

  const orders = [
    { so_number: 'SO-TEST-1001', customer_name: 'Cliente Seed', status: 'confirmed' },
    { so_number: 'SO-TEST-1002', customer_name: 'Cliente Seed', status: 'confirmed' },
    { so_number: 'SO-TEST-1003', customer_name: 'Cliente Seed', status: 'confirmed' },
  ];

  // Filtrar los que no existan
  const { data: existing } = await supabase
    .from('sales_orders')
    .select('so_number')
    .in('so_number', orders.map(o => o.so_number));
  const existingSet = new Set((existing || []).map(r => r.so_number));
  const toInsert = orders.filter(o => !existingSet.has(o.so_number));

  if (toInsert.length) {
    const { data: upserted, error } = await supabase
      .from('sales_orders')
      .upsert(toInsert, { onConflict: 'so_number' })
      .select('id, so_number');
    if (error) throw error;

    const itemsBatch = [];
    for (const o of upserted || []) {
      const picks = pickThree(inv);
      for (const r of picks) {
        const qtyAvail = Number(r.available_quantity || 0);
        const qty = Math.max(1, Math.min(3, qtyAvail || 1));
        const unitPrice = priceMap.get(r.product_id) || 1;
        itemsBatch.push({
          sales_order_id: o.id,
          product_id: r.product_id,
          quantity: qty,
          unit_price: unitPrice,
          notes: 'Seed: ítem de prueba desde inventario'
        });
      }
    }
    if (itemsBatch.length) {
      const { error: insErr } = await supabase
        .from('sales_order_items')
        .insert(itemsBatch);
      if (insErr) throw insErr;
    }
    console.log(`SalesOrders creados: ${upserted.length}, items insertados: ${itemsBatch.length}`);
  } else {
    console.log('SalesOrders ya existen; no se insertó ninguno nuevo.');
  }

  // Asegurar que los pedidos sin ítems reciban 3 productos desde inventario
  const { data: orderItems } = await supabase
    .from('sales_order_items')
    .select('sales_order_id');
  const withItems = new Set((orderItems || []).map(i => i.sales_order_id));
  const { data: allOrders } = await supabase
    .from('sales_orders')
    .select('id, so_number')
    .limit(50);
  const missing = (allOrders || []).filter(o => !withItems.has(o.id));
  if (missing.length) {
    const itemsBatch = [];
    for (const o of missing) {
      const picks = pickThree(inv);
      for (const r of picks) {
        const qtyAvail = Number(r.available_quantity || 0);
        const qty = Math.max(1, Math.min(3, qtyAvail || 1));
        const unitPrice = priceMap.get(r.product_id) || 1;
        itemsBatch.push({
          sales_order_id: o.id,
          product_id: r.product_id,
          quantity: qty,
          unit_price: unitPrice,
          notes: 'Seed: ítem de prueba desde inventario'
        });
      }
    }
    if (itemsBatch.length) {
      const { error: insErr } = await supabase
        .from('sales_order_items')
        .insert(itemsBatch);
      if (insErr) throw insErr;
      console.log(`SalesOrders sin ítems atendidos: ${missing.length}, items insertados: ${itemsBatch.length}`);
    }
  }
}

async function createTransfersWithItems() {
  const inv = await getInventoryWithLocation(100);

  const transfers = [
    { transfer_number: 'TR-TEST-1001', status: 'sent' },
    { transfer_number: 'TR-TEST-1002', status: 'sent' },
    { transfer_number: 'TR-TEST-1003', status: 'sent' },
  ];

  const { data: existing } = await supabase
    .from('transfers')
    .select('transfer_number')
    .in('transfer_number', transfers.map(t => t.transfer_number));
  const existingSet = new Set((existing || []).map(r => r.transfer_number));
  const toInsert = transfers.filter(t => !existingSet.has(t.transfer_number));

  if (toInsert.length) {
    const { data: upserted, error } = await supabase
      .from('transfers')
      .upsert(toInsert, { onConflict: 'transfer_number' })
      .select('id, transfer_number');
    if (error) throw error;

    const itemsBatch = [];
    for (const tr of upserted || []) {
      const picks = pickThree(inv);
      for (const r of picks) {
        const qtyAvail = Number(r.available_quantity || 0);
        const qty = Math.max(1, Math.min(5, qtyAvail || 1));
        itemsBatch.push({
          transfer_id: tr.id,
          product_id: r.product_id,
          quantity: qty,
          lot_number: r.lot_number || null,
          notes: 'Seed: ítem de prueba desde inventario'
        });
      }
    }
    if (itemsBatch.length) {
      const { error: insErr } = await supabase
        .from('transfer_items')
        .insert(itemsBatch);
      if (insErr) throw insErr;
    }
    console.log(`Transfers creados: ${upserted.length}, items insertados: ${itemsBatch.length}`);
  } else {
    console.log('Transfers ya existen; no se insertó ninguno nuevo.');
  }

  // Asegurar que las transferencias sin ítems reciban 3 productos desde inventario
  const { data: trItems } = await supabase
    .from('transfer_items')
    .select('transfer_id');
  const withItemsTr = new Set((trItems || []).map(i => i.transfer_id));
  const { data: allTransfers } = await supabase
    .from('transfers')
    .select('id, transfer_number')
    .limit(50);
  const missingTr = (allTransfers || []).filter(t => !withItemsTr.has(t.id));
  if (missingTr.length) {
    const itemsBatch = [];
    for (const tr of missingTr) {
      const picks = pickThree(inv);
      for (const r of picks) {
        const qtyAvail = Number(r.available_quantity || 0);
        const qty = Math.max(1, Math.min(5, qtyAvail || 1));
        itemsBatch.push({
          transfer_id: tr.id,
          product_id: r.product_id,
          quantity: qty,
          lot_number: r.lot_number || null,
          notes: 'Seed: ítem de prueba desde inventario'
        });
      }
    }
    if (itemsBatch.length) {
      const { error: insErr } = await supabase
        .from('transfer_items')
        .insert(itemsBatch);
      if (insErr) throw insErr;
      console.log(`Transfers sin ítems atendidas: ${missingTr.length}, items insertados: ${itemsBatch.length}`);
    }
  }
}

(async () => {
  try {
    await createSalesOrdersWithItems();
    await createTransfersWithItems();
    console.log('Seed completado.');
  } catch (e) {
    console.error('Error en seed:', e?.message || e);
    process.exit(1);
  }
})();