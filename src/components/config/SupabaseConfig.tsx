import React, { useEffect, useMemo, useState } from 'react';
import { Database, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

type TestResult = {
  name: string;
  ok: boolean;
  count?: number | null;
  message?: string | null;
};

export default function SupabaseConfig() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const env = useMemo(() => ({
    supabaseUrl: (import.meta as any).env?.VITE_SUPABASE_URL || '',
    supabaseKeyPresent: Boolean((import.meta as any).env?.VITE_SUPABASE_ANON_KEY),
    backendUrl: (import.meta as any).env?.VITE_AUTH_BACKEND_URL || '',
  }), []);

  const runChecks = async () => {
    setLoading(true);
    setError(null);
    const next: TestResult[] = [];
    try {
      // Productos
      {
        const { data, error, count } = await supabase
          .from('products')
          .select('id', { count: 'exact' })
          .limit(1);
        if (error) {
          next.push({ name: 'products', ok: false, count: null, message: error.message });
        } else {
          next.push({ name: 'products', ok: true, count: (count ?? (Array.isArray(data) ? data.length : 0)) });
        }
      }
      // Ubicaciones
      {
        const { data, error, count } = await supabase
          .from('locations')
          .select('id', { count: 'exact' })
          .limit(1);
        if (error) {
          next.push({ name: 'locations', ok: false, count: null, message: error.message });
        } else {
          next.push({ name: 'locations', ok: true, count: (count ?? (Array.isArray(data) ? data.length : 0)) });
        }
      }
      // Inventario
      {
        const { data, error, count } = await supabase
          .from('inventory')
          .select('id', { count: 'exact' })
          .limit(1);
        if (error) {
          next.push({ name: 'inventory', ok: false, count: null, message: error.message });
        } else {
          next.push({ name: 'inventory', ok: true, count: (count ?? (Array.isArray(data) ? data.length : 0)) });
        }
      }
      setResults(next);
    } catch (e: any) {
      setError(e?.message || 'Error inesperado ejecutando las pruebas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runChecks();
  }, []);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Database className="w-6 h-6 text-blue-600" />
          <h1 className="text-xl font-semibold text-gray-900">Estado de conexión a Supabase</h1>
        </div>
        <button
          onClick={runChecks}
          className="inline-flex items-center px-3 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
          disabled={loading}
        >
          <RefreshCw className={"w-4 h-4 mr-2 " + (loading ? 'animate-spin' : '')} />
          Reintentar
        </button>
      </div>

      {/* Entorno */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-sm text-gray-600">VITE_SUPABASE_URL</p>
          <p className="text-sm font-mono text-gray-900 break-all">{env.supabaseUrl || '(vacío)'}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-sm text-gray-600">VITE_SUPABASE_ANON_KEY</p>
          <p className="text-sm font-mono text-gray-900">{env.supabaseKeyPresent ? '•••••••• (presente)' : '(falta)'}{!env.supabaseKeyPresent && ' ← configura esta clave'}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-sm text-gray-600">VITE_AUTH_BACKEND_URL</p>
          <p className="text-sm font-mono text-gray-900 break-all">{env.backendUrl || '(no configurado)'}</p>
        </div>
      </div>

      {/* Resultados */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <span className="text-gray-800 font-medium">Pruebas rápidas</span>
          {loading && <span className="text-sm text-gray-500">Probando conexión…</span>}
        </div>
        <div className="p-4 space-y-4">
          {error && (
            <div className="flex items-center text-red-700 bg-red-50 border border-red-200 rounded p-3">
              <AlertCircle className="w-4 h-4 mr-2" />
              <span>{error}</span>
            </div>
          )}
          {results.map((r) => (
            <div key={r.name} className="flex items-center justify-between border border-gray-200 rounded p-3">
              <div className="flex items-center">
                {r.ok ? (
                  <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-600 mr-2" />
                )}
                <span className="font-medium text-gray-800">{r.name}</span>
              </div>
              <div className="text-sm text-gray-700">
                {typeof r.count === 'number' ? (
                  <span>Registros: {r.count}</span>
                ) : r.ok ? (
                  <span>OK</span>
                ) : (
                  <span>{r.message || 'Error'}</span>
                )}
              </div>
            </div>
          ))}
          {!loading && results.length === 0 && !error && (
            <div className="text-sm text-gray-600">No hay resultados. Pulsa Reintentar.</div>
          )}
        </div>
      </div>

      {/* Ayuda rápida */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-900">
          Si ves errores de CORS o el backend en <code className="font-mono">VITE_AUTH_BACKEND_URL</code> apunta a un puerto distinto al servidor activo,
          actualiza la URL del backend en tu archivo de entorno y reinicia el servidor de desarrollo.
        </p>
      </div>
    </div>
  );
}