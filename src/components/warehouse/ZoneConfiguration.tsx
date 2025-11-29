import { useEffect, useState } from 'react';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  X, 
  Package, 
  Truck, 
  ShoppingCart,
  RotateCcw,
  Settings
} from 'lucide-react';

interface Zone {
  id: string;
  code?: string;
  name: string;
  type: 'receiving' | 'storage' | 'picking' | 'shipping' | 'returns' | 'staging';
  description: string;
  capacity: number;
  dimensions: {
    length: number;
    width: number;
    height: number;
  };
  coordinates: {
    x: number;
    y: number;
  };
  status: 'active' | 'inactive' | 'maintenance';
  temperature: 'ambient' | 'cold' | 'frozen';
  restrictions: string[];
  createdAt: string;
  updatedAt: string;
  warehouseId?: string | null;
}

interface DBLocation {
  id: string;
  warehouse_id: string | null;
  code: string;
  name: string | null;
  zone: string | null;
  aisle: string | null;
  rack: string | null;
  shelf: string | null;
  bin: string | null;
  capacity: number | null;
  is_active: boolean | null;
}

import { supabase } from '../../lib/supabase';

export function ZoneConfiguration() {
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usingZonesTable, setUsingZonesTable] = useState(false);
  const [setupHint, setSetupHint] = useState<string | null>(null);

  const [editingZone, setEditingZone] = useState<Zone | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<Partial<Zone>>({});
  // Almacenes y selección
  const [warehouses, setWarehouses] = useState<{ id: string; name: string }[]>([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('all');
  const [formWarehouseId, setFormWarehouseId] = useState<string | null>(null);

  const zoneTypes = [
    { value: 'receiving', label: 'Recepción', icon: Truck, color: 'blue' },
    { value: 'storage', label: 'Almacenamiento', icon: Package, color: 'green' },
    { value: 'picking', label: 'Picking', icon: ShoppingCart, color: 'purple' },
    { value: 'shipping', label: 'Envíos', icon: Truck, color: 'orange' },
    { value: 'returns', label: 'Devoluciones', icon: RotateCcw, color: 'gray' },
    { value: 'staging', label: 'Preparación', icon: Settings, color: 'indigo' }
  ];

  const temperatureOptions = [
    { value: 'ambient', label: 'Ambiente (15-25°C)' },
    { value: 'cold', label: 'Frío (2-8°C)' },
    { value: 'frozen', label: 'Congelado (-18°C)' }
  ];

  const statusOptions = [
    { value: 'active', label: 'Activa', color: 'green' },
    { value: 'inactive', label: 'Inactiva', color: 'gray' },
    { value: 'maintenance', label: 'Mantenimiento', color: 'yellow' }
  ];

  // Cargar lista de almacenes
  useEffect(() => {
    const loadWarehouses = async () => {
      try {
        const { data: dbWh, error: whErr } = await supabase
          .from('warehouses')
          .select('id, name, code')
          .order('name', { ascending: true });
        if (!whErr && dbWh) {
          type DBWarehouse = { id: string; name: string | null; code: string | null };
          const list = (dbWh as DBWarehouse[]).map((w) => ({ id: w.id, name: w.name || w.code || w.id }));
          setWarehouses(list);
          if (list.length === 1) setSelectedWarehouseId(list[0].id);
        } else {
          const { data: locs } = await supabase
            .from('locations')
            .select('warehouse_id')
            .not('warehouse_id', 'is', null);
          const ids = Array.from(new Set(((locs || []) as { warehouse_id: string | null }[]).map((l) => l.warehouse_id))).filter(Boolean) as string[];
          const list = ids.map((id: string) => ({ id, name: id }));
          setWarehouses(list);
          if (list.length === 1) setSelectedWarehouseId(list[0].id);
        }
      } catch (e) {
        console.warn('No se pudieron cargar almacenes:', e);
      }
    };
    loadWarehouses();
  }, []);

  useEffect(() => {
    const loadZones = async () => {
      try {
        setLoading(true);
        setError(null);
        // 1) Intentar cargar desde tabla real 'zones'
        type DBZone = {
          id: string;
          warehouse_id: string | null;
          code: string;
          name: string;
          zone_type: 'receiving' | 'storage' | 'picking' | 'packing' | 'shipping' | 'cross_dock';
          description: string | null;
          capacity: number | null;
          is_active: boolean | null;
          temperature_controlled: boolean | null;
          temperature_min: number | null;
          temperature_max: number | null;
          dimensions: { length: number; width: number; height: number } | null;
          coordinates: { x: number; y: number } | null;
          created_at: string;
          updated_at: string;
        };

        let zonesQuery = supabase
          .from('zones')
          .select('id, warehouse_id, code, name, zone_type, description, capacity, is_active, temperature_controlled, temperature_min, temperature_max, dimensions, coordinates, created_at, updated_at')
          .order('name', { ascending: true });
        if (selectedWarehouseId !== 'all') {
          zonesQuery = zonesQuery.eq('warehouse_id', selectedWarehouseId);
        }
        const { data: dbZones, error: zonesError } = await zonesQuery;

        if (!zonesError && dbZones) {
          const uiZones: Zone[] = (dbZones as DBZone[]).map((z) => ({
            id: z.id,
            code: z.code,
            name: z.name,
            type: (z.zone_type === 'packing' ? 'staging' : (z.zone_type as Zone['type'])) || 'storage',
            description: z.description || '',
            capacity: z.capacity || 0,
            dimensions: z.dimensions || { length: 0, width: 0, height: 0 },
            coordinates: z.coordinates || { x: 0, y: 0 },
            status: z.is_active ? 'active' : 'inactive',
            temperature: z.temperature_controlled
              ? (z.temperature_min !== null && z.temperature_min <= 0 ? 'frozen' : 'cold')
              : 'ambient',
            restrictions: [],
            createdAt: z.created_at?.split('T')[0] || '',
            updatedAt: z.updated_at?.split('T')[0] || '',
            warehouseId: z.warehouse_id
          }));
          setZones(uiZones);
          setUsingZonesTable(true);
          setSetupHint(null);
          return;
        }

        // 2) Si la tabla zones no existe, derivar desde locations y mostrar pista de configuración
        if (zonesError && (zonesError.code === '42P01' || `${zonesError.message}`.includes('relation') && `${zonesError.message}`.includes('zones'))) {
          setUsingZonesTable(false);
          setSetupHint('Para guardar y editar zonas reales, crea la tabla "zones" ejecutando database/create_zones_table.sql en Supabase. Actualmente se muestran zonas derivadas de locations.zone (solo lectura).');
        }

        const { data: dbLocations, error: locError } = await supabase
          .from('locations')
          .select('id, warehouse_id, code, name, zone, aisle, rack, shelf, bin, capacity, is_active');

        if (locError) throw locError;

        const zonesMap = new Map<string, { capacity: number; count: number; active: number }>();
        (dbLocations || [])
          .filter((loc: DBLocation) => selectedWarehouseId === 'all' ? true : loc.warehouse_id === selectedWarehouseId)
          .forEach((loc: DBLocation) => {
          const zoneKey = loc.zone || 'SIN-ZONA';
          const prev = zonesMap.get(zoneKey) || { capacity: 0, count: 0, active: 0 };
          zonesMap.set(zoneKey, {
            capacity: prev.capacity + (loc.capacity || 0),
            count: prev.count + 1,
            active: prev.active + (loc.is_active ? 1 : 0)
          });
        });

        const derivedZones: Zone[] = Array.from(zonesMap.entries()).map(([zoneCode, agg]) => {
          const type: Zone['type'] = zoneCode.toUpperCase().includes('REC')
            ? 'receiving'
            : zoneCode.toUpperCase().includes('PICK')
            ? 'picking'
            : zoneCode.toUpperCase().includes('SHIP')
            ? 'shipping'
            : 'storage';

          const status: Zone['status'] = agg.active > 0 ? 'active' : 'inactive';

          return {
            id: zoneCode,
            name: zoneCode === 'SIN-ZONA' ? 'Sin Zona' : `Zona ${zoneCode}`,
            type,
            description: `Agrupación automática por etiqueta de zona (${zoneCode}).`,
            capacity: agg.capacity,
            dimensions: { length: 0, width: 0, height: 0 },
            coordinates: { x: 0, y: 0 },
            status,
            temperature: 'ambient',
            restrictions: [],
            createdAt: new Date().toISOString().split('T')[0],
            updatedAt: new Date().toISOString().split('T')[0],
            warehouseId: selectedWarehouseId === 'all' ? null : selectedWarehouseId
          };
        });

        setZones(derivedZones);
      } catch (err: unknown) {
        console.error('Error cargando zonas:', err);
        setError('Error al cargar zonas desde la base de datos');
      } finally {
        setLoading(false);
      }
    };

    loadZones();
  }, [selectedWarehouseId]);

  const handleEdit = (zone: Zone) => {
    // Edición real requiere persistencia en BD (no implementada)
    setEditingZone(zone);
    setFormData(zone);
    setFormWarehouseId(zone.warehouseId ?? (selectedWarehouseId !== 'all' ? selectedWarehouseId : null));
    setShowForm(true);
  };

  const handleAdd = () => {
    // Alta de zonas reales debería crear etiquetas/atributos sobre locations
    setEditingZone(null);
    setFormData({
      code: '',
      name: '',
      type: 'storage',
      description: '',
      capacity: 0,
      dimensions: { length: 0, width: 0, height: 0 },
      coordinates: { x: 0, y: 0 },
      status: 'active',
      temperature: 'ambient',
      restrictions: []
    });
    setFormWarehouseId(selectedWarehouseId !== 'all' ? selectedWarehouseId : null);
    setShowForm(true);
  };

  const normalizeCode = (name: string) => {
    return name
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const generateZonePrefix = (name: string) => {
    const base = (name || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase()
      .replace(/[^A-Z]/g, '');
    if (base.length >= 3) return base.slice(0, 3);
    const words = (name || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase()
      .match(/[A-Z]+/g) || [];
    const initials = words.map(w => w[0]).join('');
    const candidate = (initials + base).slice(0, 3);
    return (candidate.padEnd(3, 'X')).slice(0, 3);
  };

  const handleSave = async () => {
    try {
      if (!formData.name || formData.name.trim() === '') {
        setError('El nombre de la zona es obligatorio');
        return;
      }
      if (usingZonesTable && !formWarehouseId) {
        setError('Selecciona un almacén para asociar la zona');
        return;
      }

      if (usingZonesTable) {
        let code = (formData.code || '').toUpperCase();
        if (!code || !/^[A-Z]{3}$/.test(code)) {
          code = generateZonePrefix(formData.name || '');
        }
        // Mapear tipo de zona de la UI al esquema permitido en BD
        const dbZoneType = (formData.type === 'staging')
          ? 'packing'
          : (formData.type === 'returns')
          ? 'cross_dock'
          : (formData.type || 'storage');
        const payload: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          name: string;
          code: string;
          zone_type: 'receiving' | 'storage' | 'picking' | 'packing' | 'shipping' | 'cross_dock';
          description: string;
          capacity: number;
          is_active: boolean;
          temperature_controlled: boolean;
          temperature_min: number | null;
          temperature_max: number | null;
          dimensions: { length: number; width: number; height: number };
          coordinates: { x: number; y: number };
          warehouse_id: string | null;
        } = {
          name: formData.name,
          code,
          zone_type: dbZoneType,
          description: formData.description || '',
          capacity: formData.capacity || 0,
          is_active: (formData.status || 'active') !== 'inactive',
          temperature_controlled: (formData.temperature || 'ambient') !== 'ambient',
          temperature_min: formData.temperature === 'frozen' ? -25 : formData.temperature === 'cold' ? 2 : null,
          temperature_max: formData.temperature === 'frozen' ? -10 : formData.temperature === 'cold' ? 8 : null,
          dimensions: formData.dimensions || { length: 0, width: 0, height: 0 },
          coordinates: formData.coordinates || { x: 0, y: 0 },
          warehouse_id: formWarehouseId
        };

        if (editingZone) {
          const { error: updError } = await supabase
            .from('zones')
            .update(payload)
            .eq('id', editingZone.id);
          if (updError) throw updError;
        } else {
          const { data: inserted, error: insError } = await supabase
            .from('zones')
            .insert(payload)
            .select('id, created_at, updated_at')
            .single();
          if (insError) throw insError;
          // Asignar ID recién creado
          payload.id = inserted?.id;
          payload.created_at = inserted?.created_at;
          payload.updated_at = inserted?.updated_at;
        }

        // Si se está editando y el prefijo cambió, ofrecer actualización en cascada de ubicaciones
        if (editingZone) {
          const oldCode = (editingZone.code || '').toUpperCase();
          const newCode = (code || '').toUpperCase();
          if (oldCode && newCode && oldCode !== newCode) {
            const confirmCascade = confirm(
              `Has cambiado el prefijo de la zona de "${oldCode}" a "${newCode}".\n\n` +
              `¿Quieres actualizar en cascada todas las ubicaciones del almacén asociadas a la zona "${oldCode}" para que usen "${newCode}"?\n` +
              `Esta acción modificará el campo Zona (locations.zone).`
            );
            if (confirmCascade) {
              try {
                let updateQuery = supabase
                  .from('locations')
                  .update({ zone: newCode })
                  .eq('zone', oldCode);
                if (formWarehouseId) {
                  updateQuery = updateQuery.eq('warehouse_id', formWarehouseId);
                }
                const { error: updLocErr } = await updateQuery;
                if (updLocErr) throw updLocErr;
              } catch (cascadeErr) {
                console.error('Error en actualización en cascada de ubicaciones:', cascadeErr);
                setError('La zona se guardó, pero no se pudo actualizar las ubicaciones en cascada. Verifica permisos/RLS.');
              }
            }
          }
        }

        // Refrescar listado desde BD
        let refreshQuery = supabase
          .from('zones')
          .select('id, warehouse_id, code, name, zone_type, description, capacity, is_active, temperature_controlled, temperature_min, temperature_max, dimensions, coordinates, created_at, updated_at')
          .order('name', { ascending: true });
        if (selectedWarehouseId !== 'all') {
          refreshQuery = refreshQuery.eq('warehouse_id', selectedWarehouseId);
        }
        const { data: dbZones } = await refreshQuery;
        const uiZones: Zone[] = (((dbZones ?? []) as unknown) as DBZone[]).map((z) => ({
          id: z.id,
          code: z.code,
          name: z.name,
          type: (z.zone_type === 'packing' ? 'staging' : z.zone_type) || 'storage',
          description: z.description || '',
          capacity: z.capacity || 0,
          dimensions: z.dimensions || { length: 0, width: 0, height: 0 },
          coordinates: z.coordinates || { x: 0, y: 0 },
          status: z.is_active ? 'active' : 'inactive',
          temperature: z.temperature_controlled
            ? (z.temperature_min !== null && z.temperature_min <= 0 ? 'frozen' : 'cold')
            : 'ambient',
          restrictions: [],
          createdAt: z.created_at?.split('T')[0] || '',
          updatedAt: z.updated_at?.split('T')[0] || '',
          warehouseId: z.warehouse_id
        }));
        setZones(uiZones);
      }

      setShowForm(false);
      setEditingZone(null);
      setFormData({});
      setFormWarehouseId(null);
      setError(null);
    } catch (err: unknown) {
      console.error('Error guardando zona:', err);
      const maybe = (err && typeof err === 'object') ? (err as { message?: unknown; error?: unknown }) : undefined;
      const msg = maybe?.message ? String(maybe.message) : maybe?.error ? String(maybe.error) : '';
      setError(msg ? `No se pudo guardar la zona: ${msg}` : 'No se pudo guardar la zona. Verifica políticas RLS y existencia de la tabla zones.');
    }
  };

  const handleDelete = async (zoneId: string) => {
    if (!usingZonesTable) {
      alert('Eliminación no disponible: zonas derivadas de locations (solo lectura).');
      return;
    }
    const confirmed = confirm('¿Estás seguro de que quieres eliminar esta zona?');
    if (!confirmed) return;
    try {
      const { error: delError } = await supabase
        .from('zones')
        .delete()
        .eq('id', zoneId);
      if (delError) throw delError;
      setZones(zones.filter(z => z.id !== zoneId));
    } catch (err: unknown) {
      console.error('Error eliminando zona:', err);
      setError('No se pudo eliminar la zona. Verifica políticas RLS.');
    }
  };

  const getTypeInfo = (type: string) => {
    return zoneTypes.find(t => t.value === type) || zoneTypes[0];
  };

  const getStatusColor = (status: string) => {
    const statusInfo = statusOptions.find(s => s.value === status);
    return statusInfo?.color || 'gray';
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Configuración de Zonas</h1>
          <p className="text-gray-600">Gestiona las zonas y áreas del almacén</p>
        </div>
        {loading && (
          <span className="text-sm text-gray-500">Cargando zonas...</span>
        )}
        <div className="flex items-center gap-2">
          <div>
            <label className="block text-xs font-medium text-gray-700">Almacén</label>
            <select
              value={selectedWarehouseId}
              onChange={(e) => setSelectedWarehouseId(e.target.value)}
              className="border border-gray-300 rounded-md px-2 py-1 text-sm focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">Todos</option>
              {warehouses.map(w => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </div>
          <button
            onClick={handleAdd}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nueva Zona
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded">
          {error}
        </div>
      )}

      {!usingZonesTable && setupHint && (
        <div className="p-3 bg-yellow-50 border border-yellow-200 text-yellow-800 rounded">
          {setupHint}
        </div>
      )}

      {/* Zones Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {zones.map((zone) => {
          const typeInfo = getTypeInfo(zone.type);
          const Icon = typeInfo.icon;
          const statusColor = getStatusColor(zone.status);

          return (
            <div key={zone.id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 bg-${typeInfo.color}-100 rounded-lg`}>
                    <Icon className={`w-5 h-5 text-${typeInfo.color}-600`} />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{zone.name}</h3>
                    <p className="text-sm text-gray-500">{typeInfo.label}</p>
                    {zone.code && (
                      <p className="text-xs text-gray-500 mt-0.5">Prefijo: {zone.code}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => handleEdit(zone)}
                    className="p-1 text-gray-400 hover:text-blue-600"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(zone.id)}
                    className="p-1 text-gray-400 hover:text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <p className="text-sm text-gray-600 mb-4">{zone.description}</p>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-500">Estado:</span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-${statusColor}-100 text-${statusColor}-800`}>
                    {statusOptions.find(s => s.value === zone.status)?.label}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-500">Capacidad:</span>
                  <span className="text-sm text-gray-900">{zone.capacity} posiciones</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-500">Dimensiones:</span>
                  <span className="text-sm text-gray-900">
                    {zone.dimensions.length}×{zone.dimensions.width}×{zone.dimensions.height}m
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-500">Temperatura:</span>
                  <span className="text-sm text-gray-900">
                    {temperatureOptions.find(t => t.value === zone.temperature)?.label}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-500">Coordenadas:</span>
                  <span className="text-sm text-gray-900">
                    ({zone.coordinates.x}, {zone.coordinates.y})
                  </span>
                </div>

                {zone.restrictions.length > 0 && (
                  <div>
                    <span className="text-sm font-medium text-gray-500">Restricciones:</span>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {zone.restrictions.map((restriction, index) => (
                        <span key={index} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-red-100 text-red-800">
                          {restriction}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200 text-xs text-gray-500">
                Actualizado: {zone.updatedAt}
              </div>
            </div>
          );
        })}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingZone ? 'Editar Zona' : 'Nueva Zona'}
              </h3>
              <button
                onClick={() => setShowForm(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Almacén
                  </label>
                  <select
                    value={formWarehouseId ?? ''}
                    onChange={(e) => setFormWarehouseId(e.target.value || null)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Selecciona un almacén</option>
                    {warehouses.map(w => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre de la Zona
                  </label>
                  <input
                    type="text"
                    value={formData.name || ''}
                    onChange={(e) => {
                      const name = e.target.value;
                      setFormData((prev) => {
                        const currentCode = (prev.code || '').toUpperCase();
                        const auto = generateZonePrefix(prev.name || '');
                        const shouldAuto = !currentCode || currentCode === auto;
                        const nextCode = shouldAuto ? generateZonePrefix(name) : currentCode;
                        return { ...prev, name, code: nextCode };
                      });
                    }}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Ej: Zona de Recepción A"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Prefijo de Zona (3 letras)
                  </label>
                  <input
                    type="text"
                    value={(formData.code || '').toUpperCase()}
                    onChange={(e) => {
                      const raw = e.target.value.toUpperCase();
                      const onlyLetters = raw.replace(/[^A-Z]/g, '').slice(0, 3);
                      setFormData({ ...formData, code: onlyLetters });
                    }}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Ej: REC, ALM, PKG"
                  />
                  <p className="mt-1 text-xs text-gray-500">Se usa en el campo Zona de las ubicaciones.</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo de Zona
                  </label>
                  <select
                    value={formData.type || 'storage'}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as Zone['type'] })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {zoneTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descripción
                </label>
                <textarea
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Descripción de la zona..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Capacidad (posiciones)
                  </label>
                  <input
                    type="number"
                    value={formData.capacity || 0}
                    onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Estado
                  </label>
                  <select
                    value={formData.status || 'active'}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as Zone['status'] })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {statusOptions.map((status) => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Dimensiones (metros)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="number"
                    placeholder="Largo"
                    value={formData.dimensions?.length || 0}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      dimensions: { 
                        ...formData.dimensions!, 
                        length: parseFloat(e.target.value) 
                      } 
                    })}
                    className="border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <input
                    type="number"
                    placeholder="Ancho"
                    value={formData.dimensions?.width || 0}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      dimensions: { 
                        ...formData.dimensions!, 
                        width: parseFloat(e.target.value) 
                      } 
                    })}
                    className="border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <input
                    type="number"
                    placeholder="Alto"
                    value={formData.dimensions?.height || 0}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      dimensions: { 
                        ...formData.dimensions!, 
                        height: parseFloat(e.target.value) 
                      } 
                    })}
                    className="border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Coordenada X
                  </label>
                  <input
                    type="number"
                    value={formData.coordinates?.x || 0}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      coordinates: { 
                        ...formData.coordinates!, 
                        x: parseInt(e.target.value) 
                      } 
                    })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Coordenada Y
                  </label>
                  <input
                    type="number"
                    value={formData.coordinates?.y || 0}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      coordinates: { 
                        ...formData.coordinates!, 
                        y: parseInt(e.target.value) 
                      } 
                    })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Temperatura
                  </label>
                  <select
                    value={formData.temperature || 'ambient'}
                    onChange={(e) => setFormData({ ...formData, temperature: e.target.value as Zone['temperature'] })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {temperatureOptions.map((temp) => (
                      <option key={temp.value} value={temp.value}>
                        {temp.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                <Save className="w-4 h-4 mr-2" />
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}