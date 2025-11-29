import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Plus, MapPin, Package, Settings, Filter, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabase';

type Warehouse = {
  id: string;
  name: string;
  code: string;
  is_active: boolean;
};

type Zone = {
  code: string;
  name: string | null;
  zone_type: 'receiving' | 'storage' | 'picking' | 'packing' | 'shipping' | 'cross_dock' | null;
  is_active: boolean | null;
};

type Location = {
  id: string;
  warehouse_id: string | null;
  code: string;
  name: string | null;
  zone: string | null;
  aisle: string | null;
  rack: string | null;
  shelf: string | null;
  bin: string | null;
  location_type: 'receiving' | 'storage' | 'picking' | 'shipping' | 'quarantine' | null;
  capacity: number | null;
  is_active: boolean | null;
};

export function WarehouseLocations() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    zone: '',
    location_type: 'storage' as Location['location_type'],
    capacity: 0,
    is_active: true,
  });

  // Filtros/estado de formulario
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('');
  const [filterByZone, setFilterByZone] = useState<string>('');

  const [form, setForm] = useState({
    warehouse_id: '',
    code: '',
    name: '',
    zone: '',
    aisle: '',
    rack: '',
    shelf: '',
    bin: '',
    location_type: 'storage' as Location['location_type'],
    capacity: 100,
    is_active: true,
  });

  useEffect(() => {
    const loadInitial = async () => {
      try {
        setLoading(true);
        setError(null);

        // Cargar warehouses
        const { data: dbWarehouses, error: whError } = await supabase
          .from('warehouses')
          .select('id, name, code, is_active')
          .order('created_at', { ascending: true });
        if (whError) throw whError;
        setWarehouses(dbWarehouses || []);
        if ((dbWarehouses || []).length > 0 && !selectedWarehouseId) {
          setSelectedWarehouseId(dbWarehouses![0].id);
          setForm((prev) => ({ ...prev, warehouse_id: dbWarehouses![0].id }));
        }

        // Cargar zonas (si existe la tabla zones)
        try {
          const { data: dbZones, error: zonesError } = await supabase
            .from('zones')
            .select('code, name, zone_type, is_active');
          if (!zonesError && dbZones) {
            type DBZoneListItem = {
              code: string;
              name: string | null;
              zone_type: 'receiving' | 'storage' | 'picking' | 'packing' | 'shipping' | 'cross_dock';
              is_active: boolean | null;
            };
            const uiZones: Zone[] = (dbZones as DBZoneListItem[]).map((z) => ({
              code: z.code,
              name: z.name,
              zone_type: z.zone_type,
              is_active: z.is_active,
            }));
            setZones(uiZones);
          }
        } catch {
          // Ignorar si no existe la tabla de zonas; el formulario seguirá permitiendo texto libre
          console.warn('Tabla zones no disponible, usando entrada libre para zona');
        }

        await loadLocations(dbWarehouses && dbWarehouses[0] ? dbWarehouses[0].id : undefined);
      } catch (err: unknown) {
        console.error('Error cargando Ubicaciones:', err);
        setError('Error al cargar datos. Verifica autenticación y políticas RLS.');
      } finally {
        setLoading(false);
      }
    };

    loadInitial();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadLocations = async (warehouseId?: string) => {
    setLoading(true);
    setError(null);
    try {
      const AUTH_BACKEND_URL = import.meta.env.VITE_AUTH_BACKEND_URL || '';
      const token = localStorage.getItem('app_token');
      if (!AUTH_BACKEND_URL || !token) {
        throw new Error('Backend de autenticación no configurado o sesión inválida');
      }
      const params = new URLSearchParams();
      const wid = warehouseId || selectedWarehouseId;
      if (wid) params.set('warehouse_id', wid);
      if (filterByZone) params.set('zone', filterByZone);
      const resp = await fetch(`${AUTH_BACKEND_URL}/locations?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!resp.ok) {
        const text = await resp.text().catch(() => '');
        throw new Error(text || 'No se pudieron cargar ubicaciones');
      }
      const data = await resp.json();
      setLocations((data && data.locations) || []);
    } catch (err: unknown) {
      console.error('Error cargando locations:', err);
      setError('No se pudieron cargar ubicaciones');
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (loc: Location) => {
    setEditingId(loc.id);
    setEditForm({
      name: loc.name || '',
      zone: loc.zone || '',
      location_type: (loc.location_type || 'storage') as Location['location_type'],
      capacity: typeof loc.capacity === 'number' ? loc.capacity : 0,
      is_active: !!loc.is_active,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const handleUpdateLocation = async () => {
    if (!editingId) return;
    setLoading(true);
    setError(null);
    try {
      const AUTH_BACKEND_URL = import.meta.env.VITE_AUTH_BACKEND_URL || '';
      const token = localStorage.getItem('app_token');
      if (!AUTH_BACKEND_URL || !token) {
        throw new Error('Backend de autenticación no configurado o sesión inválida');
      }
      const resp = await fetch(`${AUTH_BACKEND_URL}/locations/${editingId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(editForm),
      });
      if (!resp.ok) {
        let errMsg = 'No se pudo actualizar la ubicación';
        try {
          const data = await resp.json();
          errMsg = data?.error || errMsg;
        } catch {
          const text = await resp.text().catch(() => '');
          if (text) errMsg = text;
        }
        throw new Error(errMsg);
      }
      await loadLocations(selectedWarehouseId);
      setEditingId(null);
    } catch (err: unknown) {
      console.error('Error actualizando ubicación:', err);
      const maybe = (err && typeof err === 'object') ? (err as { message?: unknown; error?: unknown }) : undefined;
      const msg = maybe?.message ? String(maybe.message) : maybe?.error ? String(maybe.error) : '';
      setError(msg ? `No se pudo actualizar: ${msg}` : 'No se pudo actualizar la ubicación');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLocation = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (!form.warehouse_id) {
        setError('Selecciona un almacén');
        setLoading(false);
        return;
      }
      const rawCode = (form.code || '').trim();
      const composed = [form.zone, form.aisle, form.rack, form.shelf, form.bin]
        .map((p) => String(p || '').trim())
        .filter(Boolean)
        .join('-');
      const finalCode = rawCode || composed;
      if (!finalCode) {
        setError('Define un código o completa Zona, Pasillo, Rack, Nivel y Posición');
        setLoading(false);
        return;
      }
      const payload = {
        warehouse_id: form.warehouse_id,
        code: finalCode,
        name: form.name || finalCode,
        zone: form.zone || null,
        aisle: form.aisle || null,
        rack: form.rack || null,
        shelf: form.shelf || null,
        bin: form.bin || null,
        location_type: form.location_type || 'storage',
        capacity: form.capacity || 100,
        is_active: form.is_active,
      };
      const AUTH_BACKEND_URL = import.meta.env.VITE_AUTH_BACKEND_URL || '';
      const token = localStorage.getItem('app_token');
      if (!AUTH_BACKEND_URL || !token) {
        throw new Error('Backend de autenticación no configurado o sesión inválida');
      }
      const resp = await fetch(`${AUTH_BACKEND_URL}/locations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      if (!resp.ok) {
        let errMsg = 'No se pudo crear la ubicación';
        try {
          const data = await resp.json();
          errMsg = data?.error || errMsg;
        } catch {
          const text = await resp.text().catch(() => '');
          if (text) errMsg = text;
        }
        throw new Error(errMsg);
      }

      await loadLocations(selectedWarehouseId);
      setForm((prev) => ({
        ...prev,
        code: '',
        name: '',
        zone: prev.zone,
        aisle: '',
        rack: '',
        shelf: '',
        bin: '',
        capacity: 100,
        location_type: 'storage',
        is_active: true,
      }));
    } catch (err: unknown) {
      console.error('Error creando ubicación:', err);
      const maybe = (err && typeof err === 'object') ? (err as { message?: unknown; error?: unknown }) : undefined;
      const msg = maybe?.message ? String(maybe.message) : maybe?.error ? String(maybe.error) : '';
      setError(msg ? `No se pudo crear la ubicación: ${msg}` : 'No se pudo crear la ubicación. Revisa permisos y datos.');
    } finally {
      setLoading(false);
    }
  };

  const onWarehouseChange = async (id: string) => {
    setSelectedWarehouseId(id);
    setForm((prev) => ({ ...prev, warehouse_id: id }));
    await loadLocations(id);
  };

  const onZoneFilterChange = async (zoneCode: string) => {
    setFilterByZone(zoneCode);
    await loadLocations(selectedWarehouseId);
  };

  return (
    <div className="p-6">
      <div className="bg-white rounded-lg shadow border border-gray-200">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <MapPin className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">Ubicaciones del Almacén</h2>
          </div>
          <button
            onClick={() => loadLocations(selectedWarehouseId)}
            className="flex items-center px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Recargar
          </button>
        </div>

        {/* Filtros */}
        <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Almacén</label>
            <select
              value={selectedWarehouseId}
              onChange={(e) => onWarehouseChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Filtrar por Zona</label>
            {zones.length > 0 ? (
              <select
                value={filterByZone}
                onChange={(e) => onZoneFilterChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Todas</option>
                {zones.map((z) => (
                  <option key={z.code} value={z.code}>{z.name || z.code}</option>
                ))}
              </select>
            ) : (
              <input
                value={filterByZone}
                onChange={(e) => onZoneFilterChange(e.target.value)}
                placeholder="Ej. A, B, C"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Estado</label>
            <div className="flex items-center space-x-3">
              <span className="text-sm text-gray-700">{loading ? 'Cargando...' : `${locations.length} ubicaciones`}</span>
            </div>
          </div>
        </div>

        {/* Contenido principal: lista y creación */}
        <div className="p-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Lista de ubicaciones */}
          <div className="lg:col-span-2">
            <div className="bg-gray-50 border border-gray-200 rounded-lg">
              <div className="p-3 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Package className="w-4 h-4 text-gray-700" />
                  <span className="text-sm font-medium text-gray-800">Ubicaciones</span>
                </div>
                <div className="flex items-center text-xs text-gray-500">
                  <Filter className="w-3 h-3 mr-1" />
                  Ordenadas por código
                </div>
              </div>
              <div className="divide-y">
                {locations.map((loc) => (
                  <div key={loc.id} className="p-3 hover:bg-white">
                    {editingId === loc.id ? (
                      <div className="space-y-3">
                        <div className="text-sm font-semibold text-gray-900">Editar: {loc.code}</div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Nombre</label>
                            <input
                              value={editForm.name}
                              onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Zona</label>
                            <input
                              value={editForm.zone}
                              onChange={(e) => setEditForm((p) => ({ ...p, zone: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Tipo</label>
                            <select
                              value={editForm.location_type || 'storage'}
                              onChange={(e) => setEditForm((p) => ({ ...p, location_type: e.target.value as 'receiving' | 'storage' | 'picking' | 'shipping' | 'quarantine' }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                              <option value="receiving">receiving</option>
                              <option value="storage">storage</option>
                              <option value="picking">picking</option>
                              <option value="shipping">shipping</option>
                              <option value="quarantine">quarantine</option>
                            </select>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Capacidad</label>
                            <input
                              type="number"
                              min={0}
                              value={editForm.capacity}
                              onChange={(e) => setEditForm((p) => ({ ...p, capacity: Number(e.target.value) }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>
                          <div className="flex items-center space-x-2">
                            <input
                              id={`is_active_${loc.id}`}
                              type="checkbox"
                              checked={editForm.is_active}
                              onChange={(e) => setEditForm((p) => ({ ...p, is_active: e.target.checked }))}
                            />
                            <label htmlFor={`is_active_${loc.id}`} className="text-xs text-gray-700">Activa</label>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button onClick={handleUpdateLocation} className="px-3 py-2 text-xs rounded bg-blue-600 text-white hover:bg-blue-700">Guardar</button>
                          <button onClick={cancelEdit} className="px-3 py-2 text-xs rounded border border-gray-300 hover:bg-gray-50">Cancelar</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{loc.code}</div>
                          <div className="text-xs text-gray-600">Zona: {loc.zone || 'Sin zona'} · Tipo: {loc.location_type || 'storage'} · Capacidad: {loc.capacity ?? 0}</div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {loc.is_active ? (
                            <span className="px-2 py-1 text-xs rounded bg-green-100 text-green-800">Activa</span>
                          ) : (
                            <span className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-800">Inactiva</span>
                          )}
                          <button
                            onClick={() => startEdit(loc)}
                            className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 flex items-center"
                          >
                            <Settings className="w-3 h-3 mr-1" />
                            Editar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {locations.length === 0 && (
                  <div className="p-6 text-center text-sm text-gray-600">No hay ubicaciones en este almacén. Crea la primera a la derecha.</div>
                )}
              </div>
            </div>
          </div>

          {/* Formulario de creación */}
          <div>
            <div className="bg-white border border-gray-200 rounded-lg">
              <div className="p-3 border-b border-gray-200 flex items-center space-x-2">
                <Plus className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-gray-800">Crear Ubicación</span>
              </div>
              <form onSubmit={handleCreateLocation} className="p-4 space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Almacén</label>
                  <select
                    value={form.warehouse_id}
                    onChange={(e) => setForm((prev) => ({ ...prev, warehouse_id: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Código</label>
                    <input
                      value={form.code}
                      onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value }))}
                      placeholder="Ej. Z-A01-R01-S01-B01 (Zona-Pasillo-Rack-Nivel-Posición)"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required={false}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Nombre</label>
                    <input
                      value={form.name}
                      onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                      placeholder="Descripción opcional"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Zona</label>
                  {zones.length > 0 ? (
                    <select
                      value={form.zone}
                      onChange={(e) => setForm((prev) => ({ ...prev, zone: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Sin zona</option>
                      {zones.map((z) => (
                        <option key={z.code} value={z.code}>{z.name || z.code}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      value={form.zone}
                      onChange={(e) => setForm((prev) => ({ ...prev, zone: e.target.value }))}
                      placeholder="Ej. A, B, C"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Pasillo</label>
                    <input
                      value={form.aisle}
                      onChange={(e) => setForm((prev) => ({ ...prev, aisle: e.target.value }))}
                      placeholder="Ej. A-01"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Rack</label>
                    <input
                      value={form.rack}
                      onChange={(e) => setForm((prev) => ({ ...prev, rack: e.target.value }))}
                      placeholder="Ej. R01"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Nivel</label>
                    <input
                      value={form.shelf}
                      onChange={(e) => setForm((prev) => ({ ...prev, shelf: e.target.value }))}
                      placeholder="Ej. S01"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Bin</label>
                    <input
                      value={form.bin}
                      onChange={(e) => setForm((prev) => ({ ...prev, bin: e.target.value }))}
                      placeholder="Ej. B01"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Tipo</label>
                    <select
                      value={form.location_type || 'storage'}
                      onChange={(e) => setForm((prev) => ({ ...prev, location_type: e.target.value as 'receiving' | 'storage' | 'picking' | 'shipping' | 'quarantine' }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="receiving">receiving</option>
                      <option value="storage">storage</option>
                      <option value="picking">picking</option>
                      <option value="shipping">shipping</option>
                      <option value="quarantine">quarantine</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Capacidad</label>
                    <input
                      type="number"
                      min={0}
                      value={form.capacity}
                      onChange={(e) => setForm((prev) => ({ ...prev, capacity: Number(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    id="is_active"
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(e) => setForm((prev) => ({ ...prev, is_active: e.target.checked }))}
                  />
                  <label htmlFor="is_active" className="text-xs text-gray-700">Activa</label>
                </div>

                {error && (
                  <div className="text-xs text-red-600">{error}</div>
                )}

                <button
                  type="submit"
                  className="w-full flex items-center justify-center px-3 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                  disabled={loading}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Crear Ubicación
                </button>
              </form>
              <div className="px-4 pb-4 text-xs text-gray-500">
                Las ubicaciones nuevas aparecerán en el Mapa del Almacén (vista "Ubicaciones").
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}