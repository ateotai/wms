import React, { useEffect, useState } from 'react';
import { Warehouse as WarehouseIcon, Plus, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabase';

type Warehouse = {
  id: string;
  name: string;
  code: string;
  address?: string | null;
  is_active: boolean;
};

export function Warehouses() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '',
    code: '',
    address: '',
    is_active: true,
  });

  const loadWarehouses = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('warehouses')
        .select('id, name, code, address, is_active')
        .order('name', { ascending: true });
      if (error) throw error;
      setWarehouses(data || []);
    } catch (e: any) {
      console.error('Error cargando almacenes:', e);
      setError(e.message || 'No se pudieron cargar los almacenes');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateWarehouse = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (!form.name || !form.code) {
        throw new Error('Nombre y Código son obligatorios');
      }

      const payload = {
        name: form.name.trim(),
        code: form.code.trim(),
        address: form.address?.trim() || null,
        is_active: form.is_active,
      };

      const { data, error } = await supabase
        .from('warehouses')
        .insert(payload)
        .select('id')
        .single();
      if (error) throw error;

      setForm({ name: '', code: '', address: '', is_active: true });
      await loadWarehouses();
    } catch (e: any) {
      console.error('Error creando almacén:', e);
      setError(e.message || 'No se pudo crear el almacén');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWarehouses();
  }, []);

  return (
    <div className="p-6">
      <div className="bg-white rounded-lg shadow border border-gray-200">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <WarehouseIcon className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">Almacenes</h2>
          </div>
          <button
            onClick={loadWarehouses}
            className="flex items-center px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Recargar
          </button>
        </div>

        <div className="p-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Listado */}
          <div className="lg:col-span-2">
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Lista de Almacenes</span>
                <span className="text-xs text-gray-500">{warehouses.length} registros</span>
              </div>
              <div className="divide-y divide-gray-200">
                {warehouses.map((w) => (
                  <div key={w.id} className="px-4 py-3 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{w.name}</div>
                      <div className="text-xs text-gray-600">Código: {w.code}</div>
                      {w.address && (
                        <div className="text-xs text-gray-500">{w.address}</div>
                      )}
                    </div>
                    <span
                      className={`inline-flex items-center px-2 py-1 text-xs rounded ${w.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}
                    >
                      {w.is_active ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                ))}
                {warehouses.length === 0 && (
                  <div className="p-6 text-center text-sm text-gray-600">No hay almacenes todavía. Crea el primero a la derecha.</div>
                )}
              </div>
            </div>
          </div>

          {/* Formulario de creación */}
          <div>
            <div className="bg-white border border-gray-200 rounded-lg">
              <div className="p-3 border-b border-gray-200 flex items-center space-x-2">
                <Plus className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-gray-800">Crear Almacén</span>
              </div>
              <form onSubmit={handleCreateWarehouse} className="p-4 space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Nombre</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ej. Almacén Central"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Código</label>
                  <input
                    type="text"
                    value={form.code}
                    onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ej. WH-001"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Dirección (opcional)</label>
                  <input
                    type="text"
                    value={form.address}
                    onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Calle y número"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    id="is_active"
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(e) => setForm((prev) => ({ ...prev, is_active: e.target.checked }))}
                  />
                  <label htmlFor="is_active" className="text-xs text-gray-700">Activo</label>
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
                  Crear Almacén
                </button>
              </form>
              <div className="px-4 pb-4 text-xs text-gray-500">
                Los almacenes creados aparecerán en el selector de la vista "Ubicaciones".
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}