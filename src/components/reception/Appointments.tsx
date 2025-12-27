import { useEffect, useState, useMemo, Fragment } from 'react';
import { Calendar, Plus, X, CheckCircle, ChevronRight, ChevronDown } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

type BackendAppointment = {
  id: string;
  appointment_number: string;
  scheduled_at: string;
  dock?: string | number | null;
  carrier?: string | null;
  status: string;
  notes?: string;
  orders?: BackendPurchaseOrder[];
  order_ids?: string[];
};

type BackendPurchaseOrder = {
  id: string | number;
  po_number: string;
  supplier_id?: string | number | null;
  status?: string;
  expected_date?: string;
  total_amount?: number;
};

export function Appointments() {
  const AUTH_BACKEND_URL = import.meta.env.VITE_AUTH_BACKEND_URL || '';
  const { hasPermissionId } = useAuth();
  const [appointments, setAppointments] = useState<BackendAppointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [appointmentStatusFilter, setAppointmentStatusFilter] = useState<string>('all');
  const [appointmentSearchTerm, setAppointmentSearchTerm] = useState<string>('');
  const filteredAppointments = useMemo(() => {
    const term = appointmentSearchTerm.trim().toLowerCase();
    return appointments.filter(a =>
      (appointmentStatusFilter === 'all' || String(a.status || '').toLowerCase() === appointmentStatusFilter) &&
      (term === '' || String(a.appointment_number || '').toLowerCase().includes(term))
    );
  }, [appointments, appointmentStatusFilter, appointmentSearchTerm]);

  const [createOpen, setCreateOpen] = useState(false);
  const [orders, setOrders] = useState<BackendPurchaseOrder[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [scheduledAt, setScheduledAt] = useState<string>(() => {
    const d = new Date();
    const iso = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    return iso;
  });
  const [dock, setDock] = useState<string>('');
  const [carrier, setCarrier] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Estados para edición de cita
  const STATUS_OPTIONS = ['scheduled','arrived','receiving','validated','completed','cancelled'];
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState<string>('');
  const [editScheduledAt, setEditScheduledAt] = useState<string>('');
  const [editDock, setEditDock] = useState<string>('');
  const [editCarrier, setEditCarrier] = useState<string>('');
  const [editNotes, setEditNotes] = useState<string>('');
  const [editStatus, setEditStatus] = useState<string>('scheduled');
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Estados para expandir citas y flujo de recepción
  const [expandedId, setExpandedId] = useState<string | null>(null);
  // Recepción deshabilitada desde gestión de citas. La lógica y modal fueron removidos.

  const ACTIVE_APPOINTMENT_STATUSES = new Set(['scheduled','arrived','receiving','validated']);
  const ordersInActiveAppointments = useMemo(() => {
    const ids = new Set<string>();
    for (const a of appointments) {
      const st = String(a?.status || '').toLowerCase();
      if (!ACTIVE_APPOINTMENT_STATUSES.has(st)) continue;
      for (const o of (a.orders || [])) ids.add(String(o.id));
      for (const id of (a.order_ids || [])) ids.add(String(id));
    }
    return ids;
  }, [appointments]);

  const loadAppointments = async () => {
    if (!AUTH_BACKEND_URL) return;
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('app_token');
      const resp = await fetch(`${AUTH_BACKEND_URL}/reception/appointments`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const ct = resp.headers.get('content-type') || '';
      if (!resp.ok) {
        const text = await resp.text();
        if (ct.includes('text/html')) {
          throw new Error('No se pudo cargar citas (respuesta HTML). Verifica el backend.');
        }
        throw new Error(text || 'Error HTTP al cargar citas');
      }
      const json = await resp.json();
      setAppointments(json.appointments || []);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error cargando citas';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const loadOrders = async () => {
    if (!AUTH_BACKEND_URL) return;
    try {
      const token = localStorage.getItem('app_token');
      const resp = await fetch(`${AUTH_BACKEND_URL}/purchase_orders`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!resp.ok) throw new Error(await resp.text());
      const json = await resp.json();
      setOrders(json.purchase_orders || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadAppointments();
  }, [AUTH_BACKEND_URL]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  // Flujo de recepción eliminado: la recepción se realiza exclusivamente desde Control de Recepción.

  const openEdit = (a: BackendAppointment) => {
    setEditError(null);
    setEditSubmitting(false);
    setEditId(a.id);
    const d = new Date(a.scheduled_at);
    const isoLocal = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    setEditScheduledAt(isoLocal);
    setEditDock(String(a.dock || ''));
    setEditCarrier(a.carrier || '');
    setEditNotes(a.notes || '');
    setEditStatus(String(a.status || 'scheduled'));
    setEditOpen(true);
  };

  const deleteAppointment = async (id: string) => {
    if (!AUTH_BACKEND_URL || !id) return;
    const confirmed = window.confirm('¿Eliminar esta cita?');
    if (!confirmed) return;
    try {
      const token = localStorage.getItem('app_token');
      const resp = await fetch(`${AUTH_BACKEND_URL}/reception/appointments/${id}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!resp.ok) {
        const txt = await resp.text();
        throw new Error(txt || 'Error eliminando cita');
      }
      await loadAppointments();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'No se pudo eliminar la cita';
      alert(msg);
    }
  };

  const updateAppointment = async () => {
    if (!AUTH_BACKEND_URL || !editId) return;
    try {
      setEditSubmitting(true);
      setEditError(null);
      const token = localStorage.getItem('app_token');
      type UpdateAppointmentPayload = {
        scheduled_at?: string;
        dock: string | null;
        carrier: string | null;
        notes: string | null;
        status: string;
      };
      const payload: UpdateAppointmentPayload = {
        scheduled_at: editScheduledAt ? new Date(editScheduledAt).toISOString() : undefined,
        dock: editDock || null,
        carrier: editCarrier || null,
        notes: editNotes || null,
        status: editStatus,
      };
      const resp = await fetch(`${AUTH_BACKEND_URL}/reception/appointments/${editId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(payload),
      });
      if (!resp.ok) {
        const txt = await resp.text();
        throw new Error(txt || 'Error actualizando cita');
      }
      setEditOpen(false);
      setEditId('');
      await loadAppointments();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'No se pudo actualizar la cita';
      setEditError(msg);
    } finally {
      setEditSubmitting(false);
    }
  };


  const createAppointment = async () => {
    if (!AUTH_BACKEND_URL) return;
    try {
      setError(null);
      const ineligible = selected.filter((id) => {
        const inAppt = ordersInActiveAppointments.has(String(id));
        const ord = orders.find((o) => String(o.id) === String(id));
        const isReceived = String(ord?.status || '').toLowerCase() === 'received';
        return inAppt || isReceived;
      });
      if (ineligible.length > 0) {
        alert('Hay órdenes en cita o ya recibidas; quítalas de la selección.');
        return;
      }
      const token = localStorage.getItem('app_token');
      const resp = await fetch(`${AUTH_BACKEND_URL}/reception/appointments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          order_ids: selected,
          scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
          dock,
          carrier,
          notes,
        }),
      });
      if (!resp.ok) throw new Error(await resp.text());
      setCreateOpen(false);
      setSelected([]);
      setDock('');
      setCarrier('');
      setNotes('');
      await loadAppointments();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error creando cita';
      setError(msg);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <Calendar className="w-6 h-6 mr-2 text-blue-500" />
          <h2 className="text-xl font-bold">Gestión de Citas</h2>
        </div>
        {hasPermissionId('reception_appointments.manage') && (
          <button
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            onClick={() => {
              setCreateOpen(true);
              loadOrders();
            }}
          >
            <Plus className="w-4 h-4 mr-2" /> Nueva Cita
          </button>
        )}
       </div>

      {error && <div className="mb-4 text-sm text-red-600">No se pudieron cargar las citas. {error}</div>}

      <div className="flex items-center gap-3 mb-4">
        <input
          type="text"
          value={appointmentSearchTerm}
          onChange={(e) => setAppointmentSearchTerm(e.target.value)}
          placeholder="Buscar número de cita"
          className="px-3 py-2 border border-gray-300 rounded-lg"
        />
        <select
          value={appointmentStatusFilter}
          onChange={(e) => setAppointmentStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg"
        >
          <option value="all">Todos</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Cita</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Programada</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Órdenes</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td className="px-4 py-4 text-gray-500" colSpan={4}>
                  Cargando…
                </td>
              </tr>
            ) : appointments.length === 0 ? (
              <tr>
                <td className="px-4 py-4 text-gray-500" colSpan={4}>
                  No hay citas registradas.
                </td>
              </tr>
            ) : (
              filteredAppointments.map((a) => {
                return (
                  <Fragment key={String(a.id)}>
                    <tr>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          <button
                            className="p-1 rounded hover:bg-gray-100"
                            onClick={() => toggleExpand(a.id)}
                            aria-label={expandedId === a.id ? 'Colapsar' : 'Expandir'}
                            title={expandedId === a.id ? 'Colapsar' : 'Expandir'}
                          >
                            {expandedId === a.id ? (
                              <ChevronDown className="w-4 h-4 text-gray-600" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-gray-600" />
                            )}
                          </button>
                          <span>{a.appointment_number}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2">{new Date(a.scheduled_at).toLocaleString()}</td>
                      <td className="px-4 py-2">{(a.orders || []).length}</td>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          <button
                            className="px-2 py-1 text-xs rounded border border-gray-300 hover:bg-gray-100"
                            onClick={() => toggleExpand(a.id)}
                          >
                            Ver
                          </button>
                          <span className="inline-flex items-center px-2 py-1 rounded bg-blue-100 text-blue-700 text-xs">
                            <CheckCircle className="w-3 h-3 mr-1" /> {a.status || 'scheduled'}
                          </span>
                          {hasPermissionId('reception_appointments.manage') && (
                            <button
                              className="px-2 py-1 text-xs rounded border border-gray-300 hover:bg-gray-100"
                              onClick={() => openEdit(a)}
                            >
                              Modificar
                            </button>
                          )}
                          {hasPermissionId('reception_appointments.manage') && (
                            <button
                              className="px-2 py-1 text-xs rounded border border-red-300 text-red-600 hover:bg-red-50"
                              onClick={() => deleteAppointment(a.id)}
                            >
                              Eliminar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    {expandedId === a.id && (
                      <tr>
                        <td colSpan={4} className="px-4 py-2 bg-gray-50">
                          {(a.orders || []).length === 0 ? (
                            <div className="text-sm text-gray-500">La cita no tiene órdenes asociadas.</div>
                          ) : (
                            <div className="space-y-2">
                              {(a.orders || []).map((o) => (
                                <div key={String(o.id)} className="flex items-center justify-between p-2 border rounded">
                                  <div>
                                    <div className="font-medium">{o.po_number}</div>
                                    <div className="text-xs text-gray-600">ETA: {o.expected_date || '—'}</div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {/* Acciones de recepción removidas; usar Control de Recepción para recibir */}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {createOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-3xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Nueva Cita</h3>
              <button className="p-2 rounded hover:bg-gray-100" onClick={() => setCreateOpen(false)}>
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Fecha y hora</label>
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Muelle</label>
                <input
                  type="text"
                  value={dock}
                  onChange={(e) => setDock(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="Ej. Muelle 1"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Transportista</label>
                <input
                  type="text"
                  value={carrier}
                  onChange={(e) => setCarrier(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="Transportista"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Notas</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="Notas de la cita"
                />
              </div>
            </div>
            <div className="mb-3">
              <label className="block text-sm text-gray-600 mb-1">Selecciona órdenes</label>
              <div className="max-h-48 overflow-y-auto border border-gray-200 rounded">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left">Sel.</th>
                      <th className="px-3 py-2 text-left">Orden</th>
                      <th className="px-3 py-2 text-left">Proveedor</th>
                      <th className="px-3 py-2 text-left">ETA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((o) => (
                      <tr key={String(o.id)} className="border-t">
                        <td className="px-3 py-2">
                          <input
                            type="checkbox"
                            checked={selected.includes(String(o.id))}
                            onChange={() => toggleSelect(String(o.id))}
                            disabled={ordersInActiveAppointments.has(String(o.id)) || String(o.status || '').toLowerCase() === 'received'}
                          />
                        </td>
                        <td className="px-3 py-2">
                          {o.po_number}
                          {ordersInActiveAppointments.has(String(o.id)) && (
                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-700">En cita</span>
                          )}
                          {String(o.status || '').toLowerCase() === 'received' && (
                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs bg-green-100 text-green-700">Recibida</span>
                          )}
                        </td>
                        <td className="px-3 py-2">{o.supplier_id ? `Proveedor #${o.supplier_id}` : 'Proveedor'}</td>
                        <td className="px-3 py-2">{o.expected_date || '—'}</td>
                      </tr>
                    ))}
                    {orders.length === 0 && (
                      <tr>
                        <td className="px-3 py-2 text-gray-500" colSpan={4}>
                          No hay órdenes disponibles.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button className="px-4 py-2 rounded border border-gray-300" onClick={() => setCreateOpen(false)}>
                Cancelar
              </button>
              <button
                className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
                onClick={createAppointment}
                disabled={selected.length === 0}
              >
                Crear Cita
              </button>
            </div>
          </div>
        </div>
      )}
      {editOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-3xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Modificar Cita</h3>
              <button className="p-2 rounded hover:bg-gray-100" onClick={() => setEditOpen(false)}>
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Fecha y hora</label>
                <input
                  type="datetime-local"
                  value={editScheduledAt}
                  onChange={(e) => setEditScheduledAt(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Muelle</label>
                <input
                  type="text"
                  value={editDock}
                  onChange={(e) => setEditDock(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="Ej. Muelle 1"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Transportista</label>
                <input
                  type="text"
                  value={editCarrier}
                  onChange={(e) => setEditCarrier(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="Transportista"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Notas</label>
                <input
                  type="text"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="Notas de la cita"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Estado</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>
            {editError && <div className="text-sm text-red-600 mb-2">{editError}</div>}
            <div className="flex justify-end gap-2">
              <button className="px-4 py-2 rounded border border-gray-300" onClick={() => setEditOpen(false)}>
                Cancelar
              </button>
              <button
                className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                onClick={updateAppointment}
                disabled={editSubmitting}
              >
                {editSubmitting ? 'Guardando…' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal de recepción eliminado: recepción se gestiona en Control de Recepción */}
    </div>
  );
}
