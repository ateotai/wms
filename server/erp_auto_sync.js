const http = require('http');

function getEnvBool(name, defaultTrue) {
  const val = process.env[name];
  if (val === undefined) return !!defaultTrue;
  return String(val).toLowerCase() !== 'false';
}

function parseTargets() {
  const raw = process.env.ERP_AUTO_SYNC_TARGETS || '';
  const arr = raw.split(',').map(s => s.trim()).filter(Boolean);
  if (arr.length) return arr;
  const single = process.env.ERP_AUTO_SYNC_TARGET || 'products';
  return [single];
}

function initErpAutoSyncScheduler({ APP_PORT, supabase }) {
  const ERP_AUTO_SYNC_ENABLED = getEnvBool('ERP_AUTO_SYNC_ENABLED', true);
  const ERP_AUTO_SYNC_INTERVAL_MINUTES = Number(process.env.ERP_AUTO_SYNC_INTERVAL_MINUTES || 60);
  const ERP_AUTO_SYNC_LIMIT = Number(process.env.ERP_AUTO_SYNC_LIMIT || 50);
  const ERP_AUTO_SYNC_TARGETS = parseTargets();

  let autoSyncTimer = null;
  let autoSyncRunning = false;

  async function runConnectorSyncViaHttp(id, target, limit) {
    const url = `http://localhost:${APP_PORT}/erp/connectors/${encodeURIComponent(id)}/sync?target=${encodeURIComponent(target)}`;
    const body = JSON.stringify({ limit });
    return await new Promise((resolve, reject) => {
      const req = http.request(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
        timeout: 60000,
      }, (resp) => {
        let out = '';
        resp.on('data', (chunk) => { out += chunk; });
        resp.on('end', () => {
          if ((resp.statusCode || 0) >= 200 && (resp.statusCode || 0) < 300) {
            resolve({ statusCode: resp.statusCode, body: out });
          } else {
            reject(new Error(`AutoSync: fallo ${id} status ${resp.statusCode}: ${out}`));
          }
        });
      });
      req.on('error', (err) => reject(err));
      req.on('timeout', () => { try { req.destroy(); } catch {}; reject(new Error('AutoSync: timeout llamando sync endpoint')); });
      req.write(body);
      req.end();
    });
  }

  async function runErpAutoSyncOnce() {
    if (autoSyncRunning) return;
    autoSyncRunning = true;
    try {
      let connectors = [];
      let supportsAutoSync = true;
      {
        const { data, error } = await supabase
          .from('erp_connectors')
          .select('id,status,auto_sync');
        if (error) {
          const msg = error?.message || String(error);
          if (/auto_sync.*does not exist|column.*auto_sync/i.test(msg)) {
            supportsAutoSync = false;
            console.warn('[AutoSync] Columna auto_sync inexistente; sincronizando todos los conectores.');
            const { data: data2, error: err2 } = await supabase
              .from('erp_connectors')
              .select('id,status');
            if (err2) {
              console.warn('[AutoSync] Error listando conectores:', err2?.message || err2);
              return;
            }
            connectors = data2 || [];
          } else {
            console.warn('[AutoSync] Error listando conectores:', msg);
            return;
          }
        } else {
          connectors = data || [];
        }
      }

      const eligible = (connectors || [])
        .filter(c => String(c.status || '').toLowerCase() !== 'syncing')
        .filter(c => supportsAutoSync ? (c.auto_sync === true) : false);

      for (const c of eligible) {
        for (const target of ERP_AUTO_SYNC_TARGETS) {
          try {
            const res = await runConnectorSyncViaHttp(c.id, target, ERP_AUTO_SYNC_LIMIT);
            console.log(`[AutoSync] Conector ${c.id} sincronizado target=${target} (HTTP ${res.statusCode}).`);
          } catch (e) {
            console.warn(`[AutoSync] Error sincronizando conector ${c.id} target=${target}:`, e?.message || e);
          }
        }
      }
    } catch (e) {
      console.warn('[AutoSync] Error ejecutando ciclo:', e?.message || e);
    } finally {
      autoSyncRunning = false;
    }
  }

  function start() {
    if (!ERP_AUTO_SYNC_ENABLED) {
      console.log('[AutoSync] Deshabilitado por ERP_AUTO_SYNC_ENABLED=false');
      return;
    }
    const intervalMs = Math.max(Number(ERP_AUTO_SYNC_INTERVAL_MINUTES) || 60, 1) * 60 * 1000;
    console.log(`[AutoSync] Habilitado cada ${ERP_AUTO_SYNC_INTERVAL_MINUTES} minutos. targets=${ERP_AUTO_SYNC_TARGETS.join(',')}, limit=${ERP_AUTO_SYNC_LIMIT}`);
    autoSyncTimer = setInterval(() => { runErpAutoSyncOnce().catch(() => {}); }, intervalMs);
    setTimeout(() => { runErpAutoSyncOnce().catch(() => {}); }, 5000);
  }

  return { start };
}

module.exports = { initErpAutoSyncScheduler };
