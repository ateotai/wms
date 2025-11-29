import { useState, useEffect } from 'react';
import { AlertTriangle, Clock, Package, MapPin, Calendar, TrendingDown, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabase';
const AUTH_BACKEND_URL = import.meta.env.VITE_AUTH_BACKEND_URL || '';

interface StockAlert {
  id: string;
  sku: string;
  productName: string;
  currentStock: number;
  minStock: number;
  reorderPoint: number;
  location: string;
  category: string;
  lastMovement: Date;
  expiryDate?: Date;
  alertType: 'low_stock' | 'critical_stock' | 'expiry_soon' | 'expired';
  daysUntilExpiry?: number;
}

export function LowStockAlerts() {
  const [filterType, setFilterType] = useState<'all' | 'low_stock' | 'critical_stock' | 'expiry_soon' | 'expired'>('all');
  const [sortBy, setSortBy] = useState<'priority' | 'stock' | 'expiry'>('priority');
  const [alerts, setAlerts] = useState<StockAlert[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(false);
  const [notificationsSupported, setNotificationsSupported] = useState<boolean>(false);
  const [notificationError, setNotificationError] = useState<string | null>(null);

  // Tipos locales para filas devueltas por Supabase
  type ProductRow = {
    id: string;
    sku: string;
    name: string;
    min_stock_level?: number | null;
    reorder_point?: number | null;
    is_active?: boolean | null;
    categories?: { name?: string | null } | null;
  };

  type LocationRow = {
    code?: string | null;
    name?: string | null;
  };

  type InventoryRow = {
    id: string;
    quantity?: number | null;
    last_counted_at?: string | null;
    products: ProductRow;
    locations?: LocationRow | null;
    // expiry_date?: string | null; // si existe en el esquema, se puede usar
  };

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: invError } = await supabase
        .from('inventory')
        .select(`
          id,
          quantity,
          last_counted_at,
          products!inner(
            id,
            sku,
            name,
            min_stock_level,
            reorder_point,
            is_active,
            categories(name)
          ),
          locations(code, name)
        `)
        .eq('products.is_active', true);

      if (invError) throw invError;

      const rows: InventoryRow[] = Array.isArray(data) ? (data as unknown as InventoryRow[]) : [];

      const computedAlerts: StockAlert[] = rows
        .map((row) => {
          const product = row.products;
          const location = row.locations ?? { code: '—', name: null };
          const currentStock = Number(row.quantity ?? 0);
          const minStock = Number(product.min_stock_level ?? 0);
          const reorderPoint = Number(product.reorder_point ?? minStock);
          const lastMovement = new Date(row.last_counted_at ?? new Date());

          // Tipo de alerta por stock
          let alertType: StockAlert['alertType'] | null = null;
          if (currentStock <= reorderPoint) {
            alertType = 'critical_stock';
          } else if (currentStock <= minStock) {
            alertType = 'low_stock';
          }

          // Caducidad (si existiera expiry_date en el esquema)
          let expiryDate: Date | undefined;
          let daysUntilExpiry: number | undefined;
          // if (row.expiry_date) {
          //   expiryDate = new Date(row.expiry_date);
          //   const diff = Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
          //   daysUntilExpiry = diff;
          //   if (diff < 0) {
          //     alertType = 'expired';
          //   } else if (diff <= 30) {
          //     alertType = 'expiry_soon';
          //   }
          // }

          if (!alertType) return null; // sólo incluimos filas con alerta

          const category = product.categories?.name ?? 'Sin categoría';

          const alert: StockAlert = {
            id: row.id,
            sku: product.sku,
            productName: product.name,
            currentStock,
            minStock,
            reorderPoint,
            location: location.code ?? '—',
            category,
            lastMovement,
            alertType,
            expiryDate,
            daysUntilExpiry,
          };
          return alert;
        })
        .filter(Boolean) as StockAlert[];

      setAlerts(computedAlerts);
    } catch (e) {
      console.error('Error cargando alertas de stock:', e);
      setError('Error al cargar las alertas de stock');
      // Fallback: datos de ejemplo
      const fallback: StockAlert[] = [
        {
          id: 'fallback-1',
          sku: 'SKU-002',
          productName: 'Camiseta Algodón Básica',
          currentStock: 45,
          minStock: 100,
          reorderPoint: 150,
          location: 'B-02-15',
          category: 'clothing',
          lastMovement: new Date('2024-01-14'),
          alertType: 'critical_stock'
        },
        {
          id: 'fallback-2',
          sku: 'SKU-003',
          productName: 'Yogur Natural Ecológico',
          currentStock: 89,
          minStock: 200,
          reorderPoint: 300,
          location: 'C-01-08',
          category: 'food',
          lastMovement: new Date('2024-01-16'),
          alertType: 'low_stock'
        }
      ];
      setAlerts(fallback);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const supported = 'Notification' in window;
    setNotificationsSupported(supported);
    if (supported && Notification.permission === 'granted') {
      setNotificationsEnabled(true);
    }
  }, []);

  const requestNotificationPermission = async () => {
    try {
      setNotificationError(null);
      if (!notificationsSupported) {
        setNotificationError('Las notificaciones no son soportadas por este navegador.');
        return;
      }
      const permission = await Notification.requestPermission();
      const granted = permission === 'granted';
      setNotificationsEnabled(granted);
      if (granted) {
        // Intentar registrar suscripción Push
        subscribePush();
      }
      if (permission !== 'granted') {
        setNotificationError('Permiso de notificaciones denegado.');
      }
    } catch {
      setNotificationError('No se pudo solicitar permiso de notificaciones.');
    }
  };

  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const subscribePush = async () => {
    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        setNotificationError('El navegador no soporta Push API.');
        return;
      }
      const reg = await navigator.serviceWorker.ready;

      // Obtener clave pública VAPID desde backend (o env)
      let publicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';
      if (!publicKey && AUTH_BACKEND_URL) {
        try {
          const resp = await fetch(`${AUTH_BACKEND_URL}/push/vapidPublicKey`);
          if (resp.ok) {
            const json = await resp.json();
            publicKey = json?.publicKey || '';
          }
        } catch {
          // noop
        }
      }
      if (!publicKey) {
        setNotificationError('No hay clave pública VAPID configurada.');
        return;
      }

      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      // Enviar suscripción al backend
      if (AUTH_BACKEND_URL) {
        await fetch(`${AUTH_BACKEND_URL}/push/subscribe`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subscription }),
        });
      }
    } catch (e) {
      console.warn('Error suscribiendo a Push:', e);
      setNotificationError('No se pudo registrar la suscripción Push.');
    }
  };

  const showNotification = (title: string, body: string) => {
    try {
      if (!notificationsEnabled || !notificationsSupported) return;
      new Notification(title, { body });
    } catch (e) {
      // Silenciar errores en navegadores con restricciones
      console.debug('Notification error:', e);
    }
  };

  useEffect(() => {
    // Suscripción en tiempo real a cambios en inventario
    type InventoryChangePayload = {
      eventType?: 'INSERT' | 'UPDATE' | 'DELETE';
      new?: { product_id?: string; quantity?: number; location_id?: string; expiry_date?: string | null };
      old?: { quantity?: number };
    };
    const channel = supabase
      .channel('realtime:inventory_alerts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory' }, async (payload) => {
        try {
          const p = payload as InventoryChangePayload;
          const evt = p.eventType;
          const rowNew = p.new;
          const rowOld = p.old;

          // Siempre refresca lista para mantener UI al día
          fetchAlerts();

          if (!rowNew?.product_id) return;

          // Buscar producto para umbrales
          const { data: product, error: pErr } = await supabase
            .from('products')
            .select('sku, name, min_stock_level, reorder_point, categories(name)')
            .eq('id', rowNew.product_id)
            .single();
          if (pErr || !product) return;

          // Buscar código de ubicación
          let locationCode = '';
          if (rowNew?.location_id) {
            const { data: loc, error: lErr } = await supabase
              .from('locations')
              .select('code')
              .eq('id', rowNew.location_id)
              .single();
            if (!lErr && loc) {
              const locRow = loc as { code?: string };
              locationCode = locRow.code || '';
            }
          }

          const quantity = Number(rowNew?.quantity ?? 0);
          const minStock = Number(product.min_stock_level ?? 0);
          const reorderPoint = Number(product.reorder_point ?? minStock);

          // Detectar transición a estados críticos
          const wasBelowReorder = rowOld?.quantity !== undefined ? Number(rowOld.quantity) <= reorderPoint : false;
          const nowBelowReorder = quantity <= reorderPoint;
          const wasBelowMin = rowOld?.quantity !== undefined ? Number(rowOld.quantity) <= minStock : false;
          const nowBelowMin = quantity <= minStock;

          const expiryDateStr = rowNew?.expiry_date ?? null;
          let expiryType: 'expired' | 'expiry_soon' | null = null;
          if (expiryDateStr) {
            const expiryDate = new Date(expiryDateStr);
            const diffDays = Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
            if (diffDays < 0) expiryType = 'expired';
            else if (diffDays <= 30) expiryType = 'expiry_soon';
          }

          // Notificar sólo en condiciones relevantes
          if (evt !== 'DELETE') {
            if (!wasBelowReorder && nowBelowReorder) {
              showNotification('Stock crítico', `${product.name} (${product.sku}) cayó a ${quantity} en ${locationCode}`);
              return;
            }
            if (!wasBelowMin && nowBelowMin) {
              showNotification('Stock bajo', `${product.name} (${product.sku}) bajo mínimo (${quantity}/${minStock})`);
              return;
            }
            if (expiryType === 'expired') {
              showNotification('Producto caducado', `${product.name} (${product.sku}) caducó en ${locationCode}`);
              return;
            }
            if (expiryType === 'expiry_soon') {
              showNotification('Caducidad próxima', `${product.name} (${product.sku}) caduca pronto en ${locationCode}`);
              return;
            }
          }
        } catch (err) {
          console.warn('Error procesando notificación de inventario:', err);
        }
      });

    channel.subscribe();
    return () => {
      try { channel.unsubscribe(); } catch { /* noop */ }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notificationsEnabled]);

  const filteredAlerts = alerts.filter(alert => {
    if (filterType === 'all') return true;
    return alert.alertType === filterType;
  });

  const sortedAlerts = [...filteredAlerts].sort((a, b) => {
    switch (sortBy) {
      case 'priority':
        {
          const priorityOrder = { 'expired': 0, 'critical_stock': 1, 'expiry_soon': 2, 'low_stock': 3 };
          return priorityOrder[a.alertType] - priorityOrder[b.alertType];
        }
      case 'stock':
        return (a.currentStock / a.minStock) - (b.currentStock / b.minStock);
      case 'expiry':
        if (!a.daysUntilExpiry && !b.daysUntilExpiry) return 0;
        if (!a.daysUntilExpiry) return 1;
        if (!b.daysUntilExpiry) return -1;
        return a.daysUntilExpiry - b.daysUntilExpiry;
      default:
        return 0;
    }
  });

  const getAlertIcon = (alertType: StockAlert['alertType']) => {
    switch (alertType) {
      case 'expired':
        return <AlertTriangle className="w-5 h-5 text-red-600" />;
      case 'critical_stock':
        return <TrendingDown className="w-5 h-5 text-red-600" />;
      case 'expiry_soon':
        return <Clock className="w-5 h-5 text-orange-600" />;
      case 'low_stock':
        return <Package className="w-5 h-5 text-yellow-600" />;
      default:
        return <AlertTriangle className="w-5 h-5 text-gray-600" />;
    }
  };

  const getAlertColor = (alertType: StockAlert['alertType']) => {
    switch (alertType) {
      case 'expired':
        return 'bg-red-50 border-red-200';
      case 'critical_stock':
        return 'bg-red-50 border-red-200';
      case 'expiry_soon':
        return 'bg-orange-50 border-orange-200';
      case 'low_stock':
        return 'bg-yellow-50 border-yellow-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const getAlertLabel = (alertType: StockAlert['alertType']) => {
    switch (alertType) {
      case 'expired':
        return 'Caducado';
      case 'critical_stock':
        return 'Stock Crítico';
      case 'expiry_soon':
        return 'Próximo a Caducar';
      case 'low_stock':
        return 'Stock Bajo';
      default:
        return 'Alerta';
    }
  };

  const getStockPercentage = (current: number, min: number) => {
    return Math.round((current / min) * 100);
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertTriangle className="w-8 h-8 text-red-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-red-800">Críticos</p>
              <p className="text-2xl font-bold text-red-900">
                {alerts.filter(a => a.alertType === 'critical_stock' || a.alertType === 'expired').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-center">
            <Clock className="w-8 h-8 text-orange-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-orange-800">Próximos a Caducar</p>
              <p className="text-2xl font-bold text-orange-900">
                {alerts.filter(a => a.alertType === 'expiry_soon').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center">
            <Package className="w-8 h-8 text-yellow-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-yellow-800">Stock Bajo</p>
              <p className="text-2xl font-bold text-yellow-900">
                {alerts.filter(a => a.alertType === 'low_stock').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center">
            <RefreshCw className="w-8 h-8 text-blue-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-blue-800">Total Alertas</p>
              <p className="text-2xl font-bold text-blue-900">{alerts.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-700">Filtrar:</span>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as typeof filterType)}
              className="border border-gray-300 rounded-md px-3 py-1 text-sm"
            >
              <option value="all">Todas las alertas</option>
              <option value="expired">Caducados</option>
              <option value="critical_stock">Stock crítico</option>
              <option value="expiry_soon">Próximos a caducar</option>
              <option value="low_stock">Stock bajo</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-700">Ordenar:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="border border-gray-300 rounded-md px-3 py-1 text-sm"
            >
              <option value="priority">Por prioridad</option>
              <option value="stock">Por nivel de stock</option>
              <option value="expiry">Por fecha de caducidad</option>
            </select>
          </div>

          {/* Toggle de notificaciones */}
          <div className="flex items-center space-x-2">
            {!notificationsEnabled ? (
              <button
                onClick={requestNotificationPermission}
                className="inline-flex items-center px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Activar notificaciones
              </button>
            ) : (
              <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-green-100 text-green-700">
                Notificaciones activas
              </span>
            )}
          </div>
        </div>

        <button
          onClick={async () => { setRefreshing(true); await fetchAlerts(); setRefreshing(false); }}
          disabled={loading || refreshing}
          className={`inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
            loading || refreshing ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          {refreshing ? 'Actualizando...' : 'Actualizar Alertas'}
        </button>
      </div>

      {/* Alerts List */}
      <div className="space-y-3">
        {sortedAlerts.map((alert) => (
          <div
            key={alert.id}
            className={`rounded-lg border p-4 ${getAlertColor(alert.alertType)}`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  {getAlertIcon(alert.alertType)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <h4 className="text-sm font-medium text-gray-900">
                      {alert.productName}
                    </h4>
                    <span className="text-xs text-gray-500">({alert.sku})</span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      alert.alertType === 'expired' || alert.alertType === 'critical_stock'
                        ? 'bg-red-100 text-red-800'
                        : alert.alertType === 'expiry_soon'
                        ? 'bg-orange-100 text-orange-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {getAlertLabel(alert.alertType)}
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-4 text-xs text-gray-600 mb-2">
                    <div className="flex items-center">
                      <MapPin className="w-3 h-3 mr-1" />
                      {alert.location}
                    </div>
                    <div className="flex items-center">
                      <Calendar className="w-3 h-3 mr-1" />
                      Último mov: {alert.lastMovement.toLocaleDateString('es-ES')}
                    </div>
                    {alert.expiryDate && (
                      <div className="flex items-center">
                        <Clock className="w-3 h-3 mr-1" />
                        Caduca: {alert.expiryDate.toLocaleDateString('es-ES')}
                      </div>
                    )}
                  </div>

                  {/* Stock Level Bar */}
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        alert.currentStock <= alert.reorderPoint
                          ? 'bg-red-500'
                          : alert.currentStock <= alert.minStock
                          ? 'bg-orange-500'
                          : 'bg-green-500'
                      }`}
                      style={{
                        width: `${Math.min(getStockPercentage(alert.currentStock, alert.minStock), 100)}%`
                      }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>Stock actual: {alert.currentStock}</span>
                    <span>Mínimo: {alert.minStock}</span>
                  </div>
                </div>
              </div>
              
              <div className="text-right">
                <div className="text-lg font-bold text-gray-900">
                  {alert.currentStock}
                </div>
                <div className="text-xs text-gray-500">unidades</div>
                {alert.daysUntilExpiry !== undefined && (
                  <div className={`text-xs font-medium mt-1 ${
                    alert.daysUntilExpiry < 0
                      ? 'text-red-600'
                      : alert.daysUntilExpiry <= 7
                      ? 'text-orange-600'
                      : 'text-yellow-600'
                  }`}>
                    {alert.daysUntilExpiry < 0
                      ? `Caducado hace ${Math.abs(alert.daysUntilExpiry)} días`
                      : `${alert.daysUntilExpiry} días restantes`
                    }
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {sortedAlerts.length === 0 && (
        <div className="text-center py-12">
          <AlertTriangle className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No hay alertas</h3>
          <p className="mt-1 text-sm text-gray-500">
            No se encontraron alertas para los filtros seleccionados.
          </p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
            <p className="text-red-800">{error}</p>
          </div>
        </div>
      )}

      {notificationError && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertTriangle className="w-5 h-5 text-yellow-600 mr-2" />
            <p className="text-yellow-800">{notificationError}</p>
          </div>
        </div>
      )}
    </div>
  );
}