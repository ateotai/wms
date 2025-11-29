import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, RefreshCw, Filter, Calendar, Search } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

interface IncidentItem {
  id: string
  created_at: string
  user_name: string | null
  user_role: string | null
  action_type: string
  action: string | null
  resource: string | null
  resource_id: string | null
  status: 'success' | 'warning' | 'error'
  details: string | null
}

export function IncidenciasDashboard() {
  const { token } = useAuth()
  const [items, setItems] = useState<IncidentItem[]>([])
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState('')
  const [dateFilter, setDateFilter] = useState<'today'|'week'|'month'|'all'>('week')

  const AUTH_BACKEND_URL = import.meta.env.VITE_AUTH_BACKEND_URL || ''

  const fetchIncidents = async () => {
    try {
      setLoading(true)
      const url = `${AUTH_BACKEND_URL}/incidents?limit=200&date=${dateFilter}`
      const resp = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      if (!resp.ok) {
        setItems([])
        return
      }
      const data = await resp.json()
      setItems(Array.isArray(data.items) ? data.items : [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchIncidents() }, [dateFilter])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter(it =>
      (it.details || '').toLowerCase().includes(q) ||
      (it.resource || '').toLowerCase().includes(q) ||
      (it.user_name || '').toLowerCase().includes(q)
    )
  }, [items, query])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-amber-100 rounded-lg">
            <AlertTriangle className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Incidencias</h1>
            <p className="text-sm text-gray-600">Control y administración de faltantes en picking y olas</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button onClick={fetchIncidents} className="inline-flex items-center px-3 py-2 text-sm bg-blue-600 text-white rounded-md">
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualizar
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-4 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center border rounded-md px-2 py-1">
            <Search className="w-4 h-4 text-gray-400 mr-2" />
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar" className="outline-none text-sm" />
          </div>
          <div className="flex items-center border rounded-md px-2 py-1">
            <Calendar className="w-4 h-4 text-gray-400 mr-2" />
            <select value={dateFilter} onChange={e => setDateFilter(e.target.value as any)} className="text-sm outline-none">
              <option value="today">Hoy</option>
              <option value="week">Semana</option>
              <option value="month">Mes</option>
              <option value="all">Todo</option>
            </select>
          </div>
          <div className="flex items-center text-gray-500 text-sm">
            <Filter className="w-4 h-4 mr-1" />
            Mostrando {filtered.length} registros
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-600 border-b">
                <th className="py-2 px-3">Fecha</th>
                <th className="py-2 px-3">Recurso</th>
                <th className="py-2 px-3">Acción</th>
                <th className="py-2 px-3">Estado</th>
                <th className="py-2 px-3">Detalle</th>
                <th className="py-2 px-3">Usuario</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td className="py-4 px-3" colSpan={6}>Cargando...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td className="py-4 px-3" colSpan={6}>Sin incidencias en el rango seleccionado</td></tr>
              ) : (
                filtered.map(it => (
                  <tr key={it.id} className="border-b hover:bg-gray-50">
                    <td className="py-2 px-3">{new Date(it.created_at).toLocaleString()}</td>
                    <td className="py-2 px-3">{it.resource || '-'}</td>
                    <td className="py-2 px-3">{it.action || it.action_type}</td>
                    <td className="py-2 px-3">
                      <span className={`px-2 py-1 rounded text-xs ${it.status === 'warning' ? 'bg-amber-100 text-amber-700' : it.status === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{it.status}</span>
                    </td>
                    <td className="py-2 px-3"><pre className="whitespace-pre-wrap break-words text-xs text-gray-700">{it.details || ''}</pre></td>
                    <td className="py-2 px-3">{it.user_name || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}