import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { BarChart3, Save, Edit2, RefreshCw } from 'lucide-react';

const AUTH_BACKEND_URL = import.meta.env.VITE_AUTH_BACKEND_URL || '';

interface MinMaxConfigProps {
  searchTerm?: string;
}

interface ProductRow {
  id: string;
  sku: string;
  name: string;
  min_stock_level: number | null;
  reorder_point: number | null;
}

export function MinMaxConfig({ searchTerm = '' }: MinMaxConfigProps) {
  const { token } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [editing, setEditing] = useState<Record<string, { min: number; reorder: number }>>({});

  const term = searchTerm.trim().toLowerCase();
  const filtered = useMemo(() => products.filter(p => !term || p.sku.toLowerCase().includes(term) || p.name.toLowerCase().includes(term)), [products, term]);

  const loadProducts = async () => {
    try {
      setError(null);
      if (AUTH_BACKEND_URL) {
        const url = new URL('/products/list', AUTH_BACKEND_URL);
        url.searchParams.set('limit', '500');
        const res = await fetch(url.toString());
        if (res.ok) {
          const json = await res.json();
          const rows = (json.products || []).map((r: any) => ({ id: r.id, sku: r.sku, name: r.name, min_stock_level: r.min_stock_level ?? null, reorder_point: r.reorder_point ?? null }));
          setProducts(rows);
          return;
        }
      }
      // Fallback directo a Supabase
      const { data, error: err } = await supabase
        .from('products')
        .select('id, sku, name, min_stock_level, reorder_point')
        .eq('is_active', true)
        .order('name', { ascending: true })
        .limit(500);
      if (err) throw err;
      setProducts((data || []) as any);
    } catch (e: any) {
      setError('No se pudo cargar el catálogo de productos');
    } finally {
      // no-op
    }
  };

  useEffect(() => { loadProducts(); }, []);

  const startEdit = (p: ProductRow) => {
    setEditing(prev => ({ ...prev, [p.id]: { min: Number(p.min_stock_level || 0), reorder: Number(p.reorder_point || 0) } }));
  };

  const cancelEdit = (id: string) => {
    setEditing(prev => { const n = { ...prev }; delete n[id]; return n; });
  };

  const saveEdit = async (id: string) => {
    const values = editing[id];
    if (!values) return;
    const payload = { min_stock_level: Number(values.min || 0), reorder_point: Number(values.reorder || 0) };

    if (AUTH_BACKEND_URL && token) {
      try {
        const res = await fetch(new URL(`/products/${id}`, AUTH_BACKEND_URL).toString(), {
          method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        await loadProducts();
        cancelEdit(id);
        return;
      } catch (e) {
        // fallback
      }
    }

    // Fallback: intentar actualizar vía Supabase directo (puede fallar con RLS)
    try {
      const { error: upErr } = await supabase
        .from('products')
        .update(payload)
        .eq('id', id);
      if (upErr) throw upErr;
      await loadProducts();
      cancelEdit(id);
    } catch (e) {
      alert('No se pudo actualizar umbrales (verifica permisos/backend)');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 text-gray-700">
          <BarChart3 className="w-5 h-5" />
          <span className="font-medium">Umbrales de Reposición (Min/Max, Reorder)</span>
        </div>
        <button onClick={loadProducts} className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
          <RefreshCw className="w-4 h-4 mr-2" />
          Recargar
        </button>
      </div>

      {!AUTH_BACKEND_URL && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">Configura `VITE_AUTH_BACKEND_URL` para persistir cambios con backend</div>
      )}
      {error && (<div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">{error}</div>)}

      <div className="overflow-x-auto bg-white border border-gray-200 rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Producto</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Min</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Reorder</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filtered.map(p => {
              const edit = editing[p.id];
              return (
                <tr key={p.id}>
                  <td className="px-4 py-2 text-sm text-gray-900">{p.sku}</td>
                  <td className="px-4 py-2 text-sm text-gray-900">{p.name}</td>
                  <td className="px-4 py-2 text-sm text-gray-900">
                    {edit ? (
                      <input type="number" value={edit.min} onChange={(e) => setEditing(prev => ({ ...prev, [p.id]: { ...prev[p.id], min: Number(e.target.value) } }))} className="w-24 border border-gray-300 rounded px-2 py-1" />
                    ) : (
                      <span>{p.min_stock_level ?? 0}</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-900">
                    {edit ? (
                      <input type="number" value={edit.reorder} onChange={(e) => setEditing(prev => ({ ...prev, [p.id]: { ...prev[p.id], reorder: Number(e.target.value) } }))} className="w-24 border border-gray-300 rounded px-2 py-1" />
                    ) : (
                      <span>{p.reorder_point ?? 0}</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-sm">
                    {!edit ? (
                      <button onClick={() => startEdit(p)} className="inline-flex items-center px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                        <Edit2 className="w-4 h-4 mr-2" />
                        Editar
                      </button>
                    ) : (
                      <div className="flex space-x-2">
                        <button onClick={() => saveEdit(p.id)} className="inline-flex items-center px-3 py-1 border border-transparent rounded-md text-sm font-medium text-white bg-green-600 hover:bg-green-700">
                          <Save className="w-4 h-4 mr-2" />
                          Guardar
                        </button>
                        <button onClick={() => cancelEdit(p.id)} className="inline-flex items-center px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                          Cancelar
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
