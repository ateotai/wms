import React, { useState, useEffect } from 'react';
import { getSortComparator } from '../../config/sorting';
import { useSearchParams } from 'react-router-dom';
import { 
  ShoppingCart, 
  MapPin, 
  Clock, 
  User, 
  Package, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Play,
  Pause,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Printer,
  Plus
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { TaskLabelModal } from './TaskLabelModal';
import { supabase } from '../../lib/supabase';

const AUTH_BACKEND_URL = import.meta.env.VITE_AUTH_BACKEND_URL || '';

interface PickingTask {
  id: string;
  orderNumber: string;
  customer: string;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  assignedTo: string;
  zone: string;
  location: string;
  items: {
    sku: string;
    name: string;
    quantity: number;
    picked: number;
    location: string;
    destination?: string;
  }[];
  estimatedTime: number;
  actualTime?: number;
  createdAt: string;
  dueDate: string;
  notes?: string;
}

export function PickingTasks() {
  const { user } = useAuth();
  const isAdmin = (user?.role as any) === 'ADMIN';
  const token = typeof window !== 'undefined' ? localStorage.getItem('app_token') : null;
  const [searchParams, setSearchParams] = useSearchParams();
  const statusFilter = (searchParams.get('status') || '').toLowerCase();
  const priorityFilter = (searchParams.get('priority') || '').toLowerCase();
  const zoneFilter = (searchParams.get('zone') || '').toLowerCase();
  const searchFilter = (searchParams.get('q') || '').toLowerCase();
  const onlyFilter = (searchParams.get('only') || '').toLowerCase();
  const isPutawayView = onlyFilter === 'putaway';
  const [showLabelModal, setShowLabelModal] = useState(false);
  const [labelTask, setLabelTask] = useState<{ id: string; orderNumber: string; customer?: string; assignedTo?: string; location?: string; notes?: string } | null>(null);
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);

  const initialTasks: PickingTask[] = [
    {
      id: '1',
      orderNumber: 'ORD-2024-001',
      customer: 'Distribuidora ABC',
      priority: 'high',
      status: 'pending',
      assignedTo: 'Juan Pérez',
      zone: 'Zona A - Picking',
      location: 'A-01-15',
      items: [
        { sku: 'PROD-001', name: 'Producto A', quantity: 5, picked: 0, location: 'A-01-15' },
        { sku: 'PROD-002', name: 'Producto B', quantity: 3, picked: 0, location: 'A-02-08' },
        { sku: 'PROD-003', name: 'Producto C', quantity: 2, picked: 0, location: 'A-03-12' }
      ],
      estimatedTime: 15,
      createdAt: '2024-01-20T08:30:00',
      dueDate: '2024-01-20T12:00:00'
    },
    {
      id: '2',
      orderNumber: 'ORD-2024-002',
      customer: 'Comercial XYZ',
      priority: 'medium',
      status: 'in_progress',
      assignedTo: 'María García',
      zone: 'Zona A - Picking',
      location: 'A-04-20',
      items: [
        { sku: 'PROD-004', name: 'Producto D', quantity: 8, picked: 5, location: 'A-04-20' },
        { sku: 'PROD-005', name: 'Producto E', quantity: 4, picked: 4, location: 'A-05-03' }
      ],
      estimatedTime: 20,
      actualTime: 12,
      createdAt: '2024-01-20T09:15:00',
      dueDate: '2024-01-20T14:00:00'
    },
    {
      id: '3',
      orderNumber: 'ORD-2024-003',
      customer: 'Retail 123',
      priority: 'low',
      status: 'completed',
      assignedTo: 'Carlos López',
      zone: 'Zona B - Reserva',
      location: 'B-01-05',
      items: [
        { sku: 'PROD-006', name: 'Producto F', quantity: 1, picked: 1, location: 'B-01-05' }
      ],
      estimatedTime: 8,
      actualTime: 6,
      createdAt: '2024-01-20T07:45:00',
      dueDate: '2024-01-20T11:00:00',
      notes: 'Completado sin incidencias'
    }
  ];

  const [tasks, setTasks] = useState<PickingTask[]>(() => {
    const filterForUser = (list: PickingTask[]) => {
      if (isAdmin) return list;
      const meEmail = (user?.email || '').toLowerCase();
      const meName = (user?.full_name || user?.name || '').toLowerCase();
      return (list || []).filter(t => {
        const assigned = String(t.assignedTo || '').toLowerCase();
        return assigned === meEmail || assigned === meName || assigned.includes(meEmail) || assigned.includes(meName);
      });
    };
    try {
      const raw = localStorage.getItem('picking_tasks');
      if (raw) return filterForUser(JSON.parse(raw));
    } catch (e) {
      console.warn('No se pudo leer picking_tasks de localStorage', e);
    }
    return filterForUser(initialTasks);
  });

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const isPutawayTask = (t: PickingTask) => String(t.customer || '').toLowerCase().includes('acomodo');

  useEffect(() => {
    try {
      const raw = localStorage.getItem('picking_tasks');
      const existing = raw ? JSON.parse(raw) : [];
      const byId = new Map<string, any>();
      for (const t of Array.isArray(existing) ? existing : []) {
        if (t && t.id) byId.set(String(t.id), t);
      }
      for (const t of Array.isArray(tasks) ? tasks : []) {
        if (t && t.id) byId.set(String(t.id), t);
      }
      localStorage.setItem('picking_tasks', JSON.stringify(Array.from(byId.values())));
    } catch (e) {
      console.warn('No se pudo guardar picking_tasks en localStorage', e);
    }
  }, [tasks]);

  // Escucha actualizaciones externas (creación desde el dashboard)
  useEffect(() => {
    const handler = () => {
      try {
        const raw = localStorage.getItem('picking_tasks');
        if (raw) {
          const all = JSON.parse(raw);
          const meEmail = (user?.email || '').toLowerCase();
          const meName = (user?.full_name || user?.name || '').toLowerCase();
          let visible = isAdmin ? all : (all || []).filter((t: PickingTask) => {
            const assigned = String(t.assignedTo || '').toLowerCase();
            return assigned === meEmail || assigned === meName || assigned.includes(meEmail) || assigned.includes(meName);
          });
          // Separación: mostrar solo acomodo si only=putaway; de lo contrario, excluir acomodo
          visible = (visible || []).filter((t: PickingTask) => {
            const isPutaway = isPutawayTask(t);
            return onlyFilter === 'putaway' ? isPutaway : !isPutaway;
          });
          setTasks(visible);
        }
      } catch {}
    };
    window.addEventListener('picking_tasks_updated', handler as EventListener);
    return () => window.removeEventListener('picking_tasks_updated', handler as EventListener);
  }, [user?.email, user?.full_name, user?.role, onlyFilter]);

  // Cargar tareas reales desde el backend (con filtro opcional de estado)
  useEffect(() => {
    const fetchTasks = async () => {
      if (!AUTH_BACKEND_URL) return;
      setLoading(true);
      setError(null);
      try {
        const qs = statusFilter ? `?status=${encodeURIComponent(statusFilter)}` : '';
        let data: any = null;

        // Preferir endpoint específico de acomodo si estamos en esa vista
        if (isPutawayView) {
          try {
            const respPutaway = await fetch(`${AUTH_BACKEND_URL}/putaway/tasks${qs}`);
            if (respPutaway.ok) {
              data = await respPutaway.json();
            }
          } catch {}
        }

        // Fallback a picking/tasks (con posible tipo=putaway) si no obtuvimos datos
        if (!data) {
          const qs2 = isPutawayView
            ? (qs ? `${qs}&type=putaway` : `?type=putaway`)
            : qs;
          const resp = await fetch(`${AUTH_BACKEND_URL}/picking/tasks${qs2}`);
          if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
          data = await resp.json();
        }

        if (Array.isArray(data?.tasks)) {
          const all: PickingTask[] = data.tasks;
          // Mezclar con tareas locales para preservar las creadas desde el UI
          let local: PickingTask[] = [];
          try {
            const raw = localStorage.getItem('picking_tasks');
            local = raw ? JSON.parse(raw) : [];
          } catch {}
          const byId = new Map<string, PickingTask>();
          for (const t of Array.isArray(all) ? all : []) {
            if (t && t.id) byId.set(String(t.id), t);
          }
          for (const t of Array.isArray(local) ? local : []) {
            if (t && t.id && !byId.has(String(t.id))) byId.set(String(t.id), t);
          }
          const merged: PickingTask[] = Array.from(byId.values());
          const meEmail = (user?.email || '').toLowerCase();
          const meName = (user?.full_name || user?.name || '').toLowerCase();
          let visible = isAdmin ? merged : (merged || []).filter(t => {
            const assigned = String(t.assignedTo || '').toLowerCase();
            return assigned === meEmail || assigned === meName || assigned.includes(meEmail) || assigned.includes(meName);
          });
          // Separación: mostrar solo acomodo si only=putaway; de lo contrario, excluir acomodo
          visible = (visible || []).filter((t: PickingTask) => {
            const isPutaway = isPutawayTask(t);
            return onlyFilter === 'putaway' ? isPutaway : !isPutaway;
          });
          setTasks(visible);
        }
      } catch (e: any) {
        console.error('Error cargando tareas de picking:', e);
        setError(e?.message || 'No se pudo cargar tareas');
      } finally {
        setLoading(false);
      }
    };
    fetchTasks();
  }, [statusFilter, user?.email, user?.full_name, user?.role, onlyFilter]);

  const [selectedTask, setSelectedTask] = useState<PickingTask | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const highlightParam = (searchParams.get('highlight') || '').toLowerCase();
  const [locations, setLocations] = useState<Array<{ id: string; code: string; name?: string; zone?: string; warehouse_id?: string }>>([]);
  const [editedDestinations, setEditedDestinations] = useState<Record<string, string>>({});
  const [savingSku, setSavingSku] = useState<string | null>(null);
  const [completingSku, setCompletingSku] = useState<string | null>(null);
  const [productLocationsBySku, setProductLocationsBySku] = useState<Record<string, string>>({});
  const [productIdsBySku, setProductIdsBySku] = useState<Record<string, string>>({});
  const [editingSkus, setEditingSkus] = useState<Record<string, boolean>>({});
  const [taskTimes, setTaskTimes] = useState<Record<string, { startedAt?: string; completedAt?: string }>>(() => {
    try {
      const raw = localStorage.getItem('picking_task_times');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  const saveTaskTimes = (next: Record<string, { startedAt?: string; completedAt?: string }>) => {
    try {
      localStorage.setItem('picking_task_times', JSON.stringify(next));
      window.dispatchEvent(new Event('picking_task_times_updated'));
    } catch {}
  };

  useEffect(() => {
    const loadLocations = async () => {
      if (!AUTH_BACKEND_URL || !token || !showDetails) return;
      try {
        const resp = await fetch(`${AUTH_BACKEND_URL}/locations`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!resp.ok) return;
        const data = await resp.json();
        setLocations(Array.isArray(data?.locations) ? data.locations : []);
      } catch {}
    };
    loadLocations();
  }, [showDetails, token]);

  // Cargar ubicación por catálogo (default_location) por SKU al abrir detalles
  useEffect(() => {
    const loadProductLocations = async () => {
      if (!AUTH_BACKEND_URL || !showDetails || !selectedTask) return;
      try {
        const skus = Array.from(new Set((selectedTask.items || []).map(i => i.sku))).slice(0, 50);
        const requests = skus.map(async (sku) => {
          try {
            const resp = await fetch(`${AUTH_BACKEND_URL}/products/list?q=${encodeURIComponent(sku)}&limit=1`);
            if (!resp.ok) return;
            const data = await resp.json();
            const prod = Array.isArray(data?.products) ? data.products[0] : null;
            const code = prod?.default_location?.code || '';
            if (code) return { sku, code };
            return { sku, code: '' };
          } catch { return { sku, code: '' }; }
        });
        const results = await Promise.all(requests);
        const locMap: Record<string, string> = {};
        const idMap: Record<string, string> = {};
        for (const r of results) {
          if (r && r.sku) {
            locMap[r.sku] = (r as any).code || '';
            if ((r as any).id) idMap[r.sku] = String((r as any).id);
          }
        }
        setProductLocationsBySku(locMap);
        setProductIdsBySku(idMap);
      } catch {}
    };
    loadProductLocations();
  }, [showDetails, selectedTask, AUTH_BACKEND_URL]);

  const getItemCatalogLocation = (item: PickingTask['items'][number]) => {
    const catalog = productLocationsBySku[item.sku];
    return catalog ?? (item as any)?.destination ?? item.location ?? '';
  };

  const setItemDestination = (sku: string, value: string) => {
    setEditedDestinations(prev => ({ ...prev, [sku]: value }));
  };

  const saveItemDestination = async (task: PickingTask, sku: string) => {
    const newDest = editedDestinations[sku] ?? '';
    if (!newDest) {
      alert('Selecciona o escribe una ubicación destino');
      return;
    }
    setSavingSku(sku);
    try {
      const updatedItems = (task.items || []).map(it => it.sku === sku ? { ...it, destination: newDest } : it);
      if (AUTH_BACKEND_URL && token) {
        const resp = await fetch(`${AUTH_BACKEND_URL}/picking/tasks/${task.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ items: updatedItems }),
        });
        if (!resp.ok) {
          const text = await resp.text().catch(() => '');
          throw new Error(text || `HTTP ${resp.status}`);
        }
      }

      // También actualizar default_location del producto en catálogo
      try {
        if (AUTH_BACKEND_URL && token) {
          const loc = locations.find(l => String(l.code).toLowerCase() === String(newDest).toLowerCase());
          if (!loc || !loc.id) {
            console.warn('No se encontró la ubicación por código para actualizar catálogo:', newDest);
          } else {
            let productId = productIdsBySku[sku];
            if (!productId) {
              try {
                const r = await fetch(`${AUTH_BACKEND_URL}/products/list?q=${encodeURIComponent(sku)}&limit=1`);
                if (r.ok) {
                  const j = await r.json();
                  const p = Array.isArray(j?.products) ? j.products[0] : null;
                  if (p?.id) productId = String(p.id);
                }
              } catch {}
            }
            if (productId) {
              const upd = await fetch(`${AUTH_BACKEND_URL}/products/${productId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ default_location_id: loc.id }),
              });
              if (!upd.ok) {
                const t = await upd.text().catch(() => '');
                console.warn('Fallo al actualizar default_location del producto:', t || `HTTP ${upd.status}`);
              } else {
                setProductLocationsBySku(prev => ({ ...prev, [sku]: newDest }));
                setProductIdsBySku(prev => ({ ...prev, [sku]: productId! }));
              }
            } else {
              console.warn('No se pudo resolver id de producto para SKU:', sku);
            }
          }
        }
      } catch (e) {
        console.warn('Error al actualizar default_location del producto:', (e as any)?.message || e);
      }

      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, items: updatedItems } : t));
      setSelectedTask(cur => cur && cur.id === task.id ? { ...cur, items: updatedItems } as PickingTask : cur);
      try {
        const raw = localStorage.getItem('picking_tasks');
        let all = raw ? JSON.parse(raw) : [];
        all = (all || []).map((t: any) => t?.id === task.id ? { ...t, items: updatedItems } : t);
        localStorage.setItem('picking_tasks', JSON.stringify(all));
        window.dispatchEvent(new Event('picking_tasks_updated'));
      } catch {}
      alert('Destino actualizado para el artículo');
      setEditingSkus(prev => ({ ...prev, [sku]: false }));
    } catch (e) {
      console.error('Error guardando destino por artículo:', e);
      alert('No se pudo guardar el destino');
    } finally {
      setSavingSku(null);
    }
  };

  // Acción masiva: aplicar ubicaciones del catálogo como destino a todos los ítems
  const applyCatalogLocationsToTask = async () => {
    const task = selectedTask;
    if (!task) return;
    try {
      const updatedItems = (task.items || []).map(it => {
        const code = productLocationsBySku[it.sku] || '';
        return { ...it, destination: code || it.destination || it.location };
      });
      // Guardar en backend si está configurado
      if (AUTH_BACKEND_URL && token) {
        const resp = await fetch(`${AUTH_BACKEND_URL}/picking/tasks/${task.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ items: updatedItems }),
        });
        if (!resp.ok) {
          const text = await resp.text().catch(() => '');
          throw new Error(text || `HTTP ${resp.status}`);
        }
      }
      // Actualizar estado local y almacenamiento
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, items: updatedItems } : t));
      setSelectedTask(cur => cur && cur.id === task.id ? { ...cur, items: updatedItems } as PickingTask : cur);
      try {
        const raw = localStorage.getItem('picking_tasks');
        let all = raw ? JSON.parse(raw) : [];
        all = (all || []).map((t: any) => t?.id === task.id ? { ...t, items: updatedItems } : t);
        localStorage.setItem('picking_tasks', JSON.stringify(all));
        window.dispatchEvent(new Event('picking_tasks_updated'));
      } catch {}
      alert('Destinos sincronizados con el catálogo para todos los artículos de la tarea');
    } catch (e) {
      console.error('Error aplicando ubicaciones de catálogo a la tarea:', e);
      alert('No se pudo aplicar las ubicaciones del catálogo');
    }
  };
  
  // Completar artículo: mover al stock general (default_location) creando movimiento IN
  const completeItemToGeneralStock = async (task: PickingTask, item: PickingTask['items'][number]) => {
    const sku = item.sku;
    setCompletingSku(sku);
    try {
      const destCode = (productLocationsBySku[sku] || editedDestinations[sku] || item.destination || item.location || '').trim();
      const location = locations.find(l => String(l.code).toLowerCase() === destCode.toLowerCase())
        || locations.find(l => String(l.code).toLowerCase() === String(item.location || '').toLowerCase());

      if (!location || !location.id || !location.warehouse_id) {
        alert('No se pudo resolver la ubicación/almacén para el movimiento de inventario.');
        return;
      }

      let productId = productIdsBySku[sku];
      if (!productId && AUTH_BACKEND_URL) {
        try {
          const r = await fetch(`${AUTH_BACKEND_URL}/products/list?q=${encodeURIComponent(sku)}&limit=1`);
          if (r.ok) {
            const j = await r.json();
            const p = Array.isArray(j?.products) ? j.products[0] : null;
            if (p?.id) productId = String(p.id);
          }
        } catch {}
      }

      if (!productId) {
        alert('No se encontró el producto para este SKU.');
        return;
      }

      if (AUTH_BACKEND_URL) {
        const resp = await fetch(`${AUTH_BACKEND_URL}/inventory/movements`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: token ? `Bearer ${token}` : '' },
          body: JSON.stringify({
            product_id: productId,
            warehouse_id: location.warehouse_id,
            location_id: location.id,
            movement_type: 'IN',
            transaction_type: 'RECEIPT',
            quantity: item.quantity,
            reason: 'Completo desde tarea de picking',
            reference_number: task.orderNumber,
            reference_type: 'picking_task',
          }),
        });
        if (!resp.ok) {
          const t = await resp.text().catch(() => '');
          throw new Error(t || `HTTP ${resp.status}`);
        }
      }

      const updatedItems = (task.items || []).map(it => it.sku === sku ? { ...it, picked: it.quantity } : it);
      if (AUTH_BACKEND_URL && token) {
        try {
          const upd = await fetch(`${AUTH_BACKEND_URL}/picking/tasks/${task.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ items: updatedItems }),
          });
          if (!upd.ok) {
            const t = await upd.text().catch(() => '');
            console.warn('No se pudo persistir picked en la tarea:', t || `HTTP ${upd.status}`);
          }
        } catch {}
      }

      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, items: updatedItems } : t));
      setSelectedTask(cur => cur && cur.id === task.id ? { ...cur, items: updatedItems } as PickingTask : cur);
      try {
        const raw = localStorage.getItem('picking_tasks');
        let all = raw ? JSON.parse(raw) : [];
        all = (all || []).map((t: any) => t?.id === task.id ? { ...t, items: updatedItems } : t);
        localStorage.setItem('picking_tasks', JSON.stringify(all));
        window.dispatchEvent(new Event('picking_tasks_updated'));
      } catch {}

      // Si todos los ítems están completos, cerrar automáticamente la tarea
      const allCompleted = (updatedItems || []).every(it => (it.picked || 0) >= (it.quantity || 0));
      if (allCompleted) {
        // Calcular tiempos y persistir estado en backend
        const completedAt = new Date().toISOString();
        const startedAt = taskTimes[task.id]?.startedAt;
        let actualMinutes = 0;
        if (startedAt) {
          const ms = Date.now() - new Date(startedAt).getTime();
          actualMinutes = Math.max(0, Math.round(ms / 60000));
        }
        // Actualizar tiempos locales
        setTaskTimes(prev => {
          const next = { ...prev, [task.id]: { ...(prev[task.id] || {}), completedAt, startedAt: prev[task.id]?.startedAt || startedAt } };
          saveTaskTimes(next);
          return next;
        });
        // Persistir estado y tiempo real en backend
        try {
          if (AUTH_BACKEND_URL && token) {
            const resp = await fetch(`${AUTH_BACKEND_URL}/picking/tasks/${task.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
              body: JSON.stringify({ status: 'completed', actualTime: actualMinutes }),
            });
            if (!resp.ok) {
              const t = await resp.text().catch(() => '');
              console.warn('No se pudo cerrar la tarea en backend:', t || `HTTP ${resp.status}`);
            }
          }
        } catch (e) {
          console.warn('Fallo al actualizar estado de la tarea:', e);
        }

        // Actualizar estado local y almacenamiento
        setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: 'completed', actualTime: actualMinutes } : t));
        setSelectedTask(cur => cur && cur.id === task.id ? { ...(cur as PickingTask), status: 'completed', actualTime: actualMinutes } : cur);
        try {
          const raw2 = localStorage.getItem('picking_tasks');
          let all2 = raw2 ? JSON.parse(raw2) : [];
          all2 = (all2 || []).map((t: any) => t?.id === task.id ? { ...t, status: 'completed', actualTime: actualMinutes } : t);
          localStorage.setItem('picking_tasks', JSON.stringify(all2));
          window.dispatchEvent(new Event('picking_tasks_updated'));
        } catch {}
      }

      alert('Artículo completado y movido al stock general.');
    } catch (e) {
      console.error('Error al completar artículo y alimentar stock general:', e);
      alert('No se pudo completar el artículo.');
    } finally {
      setCompletingSku(null);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'red';
      case 'medium': return 'yellow';
      case 'low': return 'green';
      default: return 'gray';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'gray';
      case 'in_progress': return 'blue';
      case 'completed': return 'green';
      case 'cancelled': return 'red';
      default: return 'gray';
    }
  };

  

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return Clock;
      case 'in_progress': return Play;
      case 'completed': return CheckCircle;
      case 'cancelled': return XCircle;
      default: return AlertCircle;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Pendiente';
      case 'in_progress': return 'En Progreso';
      case 'completed': return 'Completado';
      case 'cancelled': return 'Cancelado';
      default: return 'Desconocido';
    }
  };

  const getPriorityText = (priority: string) => {
    switch (priority) {
      case 'high': return 'Alta';
      case 'medium': return 'Media';
      case 'low': return 'Baja';
      default: return 'Normal';
    }
  };

  const handleStartTask = async (taskId: string) => {
    const nowIso = new Date().toISOString();
    setTasks(tasks.map(task => 
      task.id === taskId 
        ? { ...task, status: 'in_progress' as const }
        : task
    ));
    // Guardar hora de inicio localmente
    setTaskTimes(prev => {
      const next = { ...prev, [taskId]: { ...(prev[taskId] || {}), startedAt: prev[taskId]?.startedAt || nowIso } };
      saveTaskTimes(next);
      return next;
    });
    // Si estamos filtrando por 'pending', cambiar automáticamente a 'in_progress' y resaltar la tarea
    try {
      const nextParams = new URLSearchParams(searchParams);
      if (statusFilter === 'pending') {
        nextParams.set('status', 'in_progress');
        nextParams.set('highlight', String(taskId));
        setSearchParams(nextParams);
      }
    } catch {}
    // Persistir estado en backend
    try {
      if (AUTH_BACKEND_URL && token) {
        const resp = await fetch(`${AUTH_BACKEND_URL}/picking/tasks/${taskId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ status: 'in_progress' }),
        });
        if (!resp.ok) {
          const t = await resp.text().catch(() => '');
          console.warn('No se pudo actualizar estado a in_progress:', t || `HTTP ${resp.status}`);
        }
      }
    } catch (e) {
      console.warn('Fallo al persistir inicio de tarea:', e);
    }
  };

  const handleCompleteTask = async (taskId: string) => {
    const completedAt = new Date().toISOString();
    const startedAt = taskTimes[taskId]?.startedAt;
    let actualMinutes = 0;
    if (startedAt) {
      const ms = Date.now() - new Date(startedAt).getTime();
      actualMinutes = Math.max(0, Math.round(ms / 60000));
    }
    setTasks(tasks.map(task => 
      task.id === taskId 
        ? { ...task, status: 'completed' as const, actualTime: actualMinutes }
        : task
    ));
    setTaskTimes(prev => {
      const next = { ...prev, [taskId]: { ...(prev[taskId] || {}), completedAt } };
      saveTaskTimes(next);
      return next;
    });
    // Persistir estado y tiempo real en backend
    try {
      if (AUTH_BACKEND_URL && token) {
        const resp = await fetch(`${AUTH_BACKEND_URL}/picking/tasks/${taskId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ status: 'completed', actualTime: actualMinutes }),
        });
        if (!resp.ok) {
          const t = await resp.text().catch(() => '');
          console.warn('No se pudo cerrar la tarea en backend:', t || `HTTP ${resp.status}`);
        }
      }
    } catch (e) {
      console.warn('Fallo al persistir cierre de tarea:', e);
    }
  };

  const handleViewDetails = (task: PickingTask) => {
    // Usa configuración central para ordenar ítems
    const sorted = { ...task, items: [...(task.items || [])].sort(getSortComparator('picking')) };
    setSelectedTask(sorted);
    setShowDetails(true);
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      if (!AUTH_BACKEND_URL || !token) return;
      const resp = await fetch(`${AUTH_BACKEND_URL}/picking/tasks/${taskId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!resp.ok) {
        const text = await resp.text().catch(() => '');
        throw new Error(text || `HTTP ${resp.status}`);
      }
      setTasks(prev => prev.filter(t => t.id !== taskId));
    } catch (e) {
      console.error('Error eliminando tarea de picking:', e);
      alert('No se pudo eliminar la tarea');
    }
  };

  const calculateProgress = (items: PickingTask['items']) => {
    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
    const pickedItems = items.reduce((sum, item) => sum + item.picked, 0);
    return totalItems > 0 ? (pickedItems / totalItems) * 100 : 0;
  };

  return (
    <div className="space-y-6">
      {/* Task List */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">{isPutawayView ? 'Tareas de Acomodo' : 'Tareas de Picking'}</h2>
          <div className="flex items-center space-x-3">
            <div className="relative">
              <label className="sr-only">Buscar</label>
              <input
                type="text"
                placeholder="Buscar (orden, cliente, SKU)"
                value={searchFilter || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  const next = new URLSearchParams(searchParams);
                  if (val) next.set('q', val); else next.delete('q');
                  setSearchParams(next);
                }}
                className="border border-gray-300 rounded-md px-3 py-1 text-sm w-64"
                title="Buscar por orden, cliente o SKU"
              />
            </div>
            <div className="flex items-center">
              <label className="sr-only">Filtrar por estado</label>
              <select
                value={statusFilter || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  const next = new URLSearchParams(searchParams);
                  if (val) next.set('status', val); else next.delete('status');
                  setSearchParams(next);
                }}
                className="border border-gray-300 rounded-md px-2 py-1 text-sm"
                title="Filtrar por estado"
              >
                <option value="">Todos</option>
                <option value="pending">Pendientes</option>
                <option value="in_progress">Iniciados</option>
                <option value="completed">Completas</option>
              </select>
            </div>
            <div className="flex items-center">
              <label className="sr-only">Filtrar por prioridad</label>
              <select
                value={priorityFilter || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  const next = new URLSearchParams(searchParams);
                  if (val) next.set('priority', val); else next.delete('priority');
                  setSearchParams(next);
                }}
                className="border border-gray-300 rounded-md px-2 py-1 text-sm"
                title="Filtrar por prioridad"
              >
                <option value="">Todas prioridades</option>
                <option value="high">Alta</option>
                <option value="medium">Media</option>
                <option value="low">Baja</option>
              </select>
            </div>
            <div className="flex items-center">
              <label className="sr-only">Filtrar por zona</label>
              <select
                value={zoneFilter || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  const next = new URLSearchParams(searchParams);
                  if (val) next.set('zone', val); else next.delete('zone');
                  setSearchParams(next);
                }}
                className="border border-gray-300 rounded-md px-2 py-1 text-sm"
                title="Filtrar por zona"
              >
                <option value="">Todas zonas</option>
                {Array.from(new Set((tasks || []).map(t => String(t.zone ?? (t as any)?.destinationZone ?? '').trim()).filter(Boolean))).map(z => (
                  <option key={z} value={z.toLowerCase()}>{z}</option>
                ))}
              </select>
            </div>
            <button
              onClick={() => setShowNewTaskModal(true)}
              className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              title="Nueva Tarea"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nueva Tarea
            </button>
          </div>
        </div>
        
        <div className="divide-y divide-gray-200">
          {!AUTH_BACKEND_URL && (
            <div className="px-6 py-4 text-sm text-yellow-700 bg-yellow-50 border-b border-yellow-200">
              Configura `VITE_AUTH_BACKEND_URL` para cargar tareas reales.
            </div>
          )}
          {loading && (
            <div className="px-6 py-4 text-sm text-gray-600">Cargando tareas…</div>
          )}
          {error && (
            <div className="px-6 py-4 text-sm text-red-700 bg-red-50 border-b border-red-200">{error}</div>
          )}
          {(() => {
            let visible = tasks;
            if (statusFilter) visible = visible.filter(t => String(t.status || '').toLowerCase() === statusFilter);
            if (priorityFilter) visible = visible.filter(t => String(t.priority || '').toLowerCase() === priorityFilter);
            if (zoneFilter) {
              visible = visible.filter(t => {
                const z = String(t.zone ?? (t as any)?.destinationZone ?? '').toLowerCase();
                return z === zoneFilter;
              });
            }
            if (searchFilter) {
              const q = searchFilter;
              visible = visible.filter(t => {
                const textFields = [
                  String(t.orderNumber || '').toLowerCase(),
                  String(t.customer || '').toLowerCase(),
                  String(t.assignedTo || '').toLowerCase(),
                  String(t.zone ?? (t as any)?.destinationZone ?? '').toLowerCase(),
                  String(t.location || '').toLowerCase(),
                ];
                const itemFields = (t.items || []).flatMap(i => [
                  String(i.sku || '').toLowerCase(),
                  String(i.name || '').toLowerCase(),
                ]);
                const haystack = [...textFields, ...itemFields].join(' ');
                return haystack.includes(q);
              });
            }
            if (!loading && !error && visible.length === 0) {
              // Evitar devolver JSX aquí porque fuera se encadena .map().
              // Devolvemos un arreglo vacío para no romper el render.
              return [] as any[];
            }
            return visible;
          })().map((task) => {
            const StatusIcon = getStatusIcon(task.status);
            const priorityColor = getPriorityColor(task.priority);
            const statusColor = getStatusColor(task.status);
            const progress = calculateProgress(task.items);
            const isPutaway = String(task.customer || '').toLowerCase().includes('acomodo');

            return (
              <div key={task.id} className={`p-6 hover:bg-gray-50 ${isPutaway ? 'bg-indigo-50 border-l-4 border-indigo-400' : ''}`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-medium text-gray-900">{task.orderNumber}</h3>
                      {isPutaway && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                          Acomodo
                        </span>
                      )}
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-${priorityColor}-100 text-${priorityColor}-800`}>
                        {getPriorityText(task.priority)}
                      </span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-${statusColor}-100 text-${statusColor}-800`}>
                        <StatusIcon className="w-3 h-3 mr-1" />
                        {getStatusText(task.status)}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div className="flex items-center text-sm text-gray-600">
                        <User className="w-4 h-4 mr-2" />
                        <span className="font-medium">Cliente:</span>
                        <span className="ml-1">{task.customer}</span>
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <User className="w-4 h-4 mr-2" />
                        <span className="font-medium">Asignado:</span>
                        <span className="ml-1">{task.assignedTo}</span>
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <MapPin className="w-4 h-4 mr-2" />
                        <span className="font-medium">Zona:</span>
                        <span className="ml-1">{task.zone ?? (task as any)?.destinationZone ?? '-'}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div className="flex items-center text-sm text-gray-600">
                        <Package className="w-4 h-4 mr-2" />
                        <span className="font-medium">Items:</span>
                        <span className="ml-1">{task.items.length} productos</span>
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <Clock className="w-4 h-4 mr-2" />
                        <span className="font-medium">Tiempo est.:</span>
                        <span className="ml-1">{task.estimatedTime} min</span>
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <Clock className="w-4 h-4 mr-2" />
                        <span className="font-medium">Vencimiento:</span>
                        <span className="ml-1">{new Date(task.dueDate).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                    {/* Origen/Destino/Creador */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div className="flex items-center text-sm text-gray-600">
                        <MapPin className="w-4 h-4 mr-2" />
                        <span className="font-medium">Origen:</span>
                        <span className="ml-1">{(task as any)?.originZone || '-'}</span>
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <MapPin className="w-4 h-4 mr-2" />
                        <span className="font-medium">Destino sugerido:</span>
                        <span className="ml-1">{(task as any)?.destinationZone || '-'}</span>
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <User className="w-4 h-4 mr-2" />
                        <span className="font-medium">Creador:</span>
                        <span className="ml-1">{(task as any)?.creator || '-'}</span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    {task.status === 'in_progress' && (
                      <div className="mb-4">
                        <div className="flex justify-between text-sm text-gray-600 mb-1">
                          <span>Progreso</span>
                          <span>{progress.toFixed(0)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Items Summary */}
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">Productos:</span>
                      <span className="ml-1">
                        {[...(task.items || [])]
                          .slice()
                          .sort(getSortComparator('picking'))
                          .map(item => `${item.name} (${item.picked}/${item.quantity})`)
                          .join(', ')}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => handleViewDetails(task)}
                      className="p-2 text-gray-400 hover:text-blue-600"
                      title="Ver detalles"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    
                    {task.status === 'pending' && (
                      <button
                        onClick={() => handleStartTask(task.id)}
                        className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                      >
                        <Play className="w-4 h-4 mr-1" />
                        Iniciar
                      </button>
                    )}
                    
                    {task.status === 'in_progress' && (
                      <button
                        onClick={() => handleCompleteTask(task.id)}
                        className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Completar
                      </button>
                    )}

                    {isAdmin && (
                      <button
                        onClick={() => handleDeleteTask(task.id)}
                        className="p-2 text-red-600 hover:text-red-800"
                        title="Eliminar tarea"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}

                    <button
                      onClick={() => { setLabelTask({ id: task.id, orderNumber: task.orderNumber, customer: task.customer, assignedTo: task.assignedTo, location: task.location, notes: task.notes }); setShowLabelModal(true); }}
                      className="p-2 text-gray-400 hover:text-gray-600"
                      title="Imprimir etiqueta"
                    >
                      <Printer className="w-4 h-4" />
                    </button>

                    <button className="p-2 text-gray-400 hover:text-gray-600">
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Task Details Modal */}
      {showDetails && selectedTask && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative sm:top-20 top-0 sm:mx-auto mx-0 sm:p-5 p-3 border w-full sm:max-w-4xl max-w-full shadow-lg sm:rounded-md rounded-none bg-white h-full">
            <div className="sticky top-0 z-20 bg-white border-b flex items-center justify-between mb-4 py-3">
              <div className="flex items-center space-x-3">
                <h3 className="text-xl font-semibold text-gray-900">
                  Detalles de Tarea - {selectedTask.orderNumber}
                </h3>
                <button
                  onClick={applyCatalogLocationsToTask}
                  className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium text-blue-700 border border-blue-300 bg-white hover:bg-blue-50"
                  title="Aplicar ubicaciones de catálogo a todos"
                >
                  Aplicar catálogo a todos
                </button>
              </div>
              <button
                onClick={() => setShowDetails(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-6 pb-24 overflow-y-auto max-h-[calc(100vh-160px)]">
              {/* Task Info */}
              <div className="space-y-3">
                <div>
                  <h4 className="text-lg font-medium text-gray-900 mb-2">Información General</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-gray-500">Cliente</span>
                      <span className="text-xs text-gray-900 truncate max-w-[60%]">{selectedTask.customer}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-gray-500">Asignado</span>
                      <span className="text-xs text-gray-900 truncate max-w-[60%]">{selectedTask.assignedTo}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-500">Creador:</span>
                      <span className="text-sm text-gray-900">{(selectedTask as any)?.creator || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-500">Zona:</span>
                      <span className="text-sm text-gray-900">{selectedTask.zone ?? (selectedTask as any)?.destinationZone ?? '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-500">Origen:</span>
                      <span className="text-sm text-gray-900">{(selectedTask as any)?.originZone || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-500">Destino sugerido:</span>
                      <span className="text-sm text-gray-900">{(selectedTask as any)?.destinationZone || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-500">Prioridad:</span>
                      <span className={`text-sm font-medium text-${getPriorityColor(selectedTask.priority)}-600`}>
                        {getPriorityText(selectedTask.priority)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-gray-500">Estado</span>
                      <span className={`text-xs font-medium text-${getStatusColor(selectedTask.status)}-600`}>
                        {getStatusText(selectedTask.status)}
                      </span>
                    </div>
                  </div>
                </div>

                {selectedTask.notes && (
                  <div>
                    <h4 className="text-lg font-medium text-gray-900 mb-2">Notas</h4>
                    <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md">
                      {selectedTask.notes}
                    </p>
                  </div>
                )}
              </div>

              {/* Items List (responsive table) */}
              <div className="flex flex-col">
                <h4 className="text-lg font-medium text-gray-900 mb-3">Productos a Recoger</h4>
                <div className="overflow-x-auto overflow-y-auto border border-gray-200 rounded-md max-h-[calc(100vh-280px)]">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50 sticky top-0 z-10">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-gray-700">Producto</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-700">SKU</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-700">Ubicación</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-700">Destino</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-700">Progreso</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-700">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {[...(selectedTask.items || [])]
                        .slice()
                        .sort(getSortComparator('picking'))
                        .map((item, index) => (
                          <tr key={index} className="align-top">
                            <td className="px-3 py-2 whitespace-nowrap">
                              <div className="font-medium text-gray-900 text-sm">{item.name}</div>
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap">
                              <div className="text-gray-700 text-xs">{item.sku}</div>
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap">
                              <div className="flex items-center text-xs text-gray-700"><MapPin className="w-3 h-3 mr-1" />{item.location}</div>
                            </td>
                            <td className="px-3 py-2 min-w-[160px]">
                              <input
                                type="text"
                                list={`dest-options-${index}`}
                                value={editingSkus[item.sku] ? (editedDestinations[item.sku] ?? getItemCatalogLocation(item)) : getItemCatalogLocation(item)}
                                onChange={(e) => setItemDestination(item.sku, e.target.value)}
                                placeholder="Ej. A-01-15"
                                className="w-full px-2 py-1 border border-gray-300 rounded-md text-xs bg-gray-100 disabled:cursor-not-allowed"
                                disabled={!editingSkus[item.sku]}
                              />
                              <datalist id={`dest-options-${index}`}>
                                {locations
                                  .filter(l => !((selectedTask as any)?.destinationZone) || String(l.zone || '').toLowerCase() === String((selectedTask as any)?.destinationZone || '').toLowerCase() || true)
                                  .slice(0, 50)
                                  .map(l => (
                                    <option key={l.id} value={l.code} label={`${l.code} ${l.name || ''}`} />
                                  ))}
                              </datalist>
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap">
                              <div className="flex items-center space-x-2">
                                <span className="text-xs text-gray-700">{item.picked}/{item.quantity}</span>
                                <div className="w-20 bg-gray-200 rounded-full h-2">
                                  <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${(item.picked / item.quantity) * 100}%` }} />
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-2 min-w-[220px]">
                              {!editingSkus[item.sku] ? (
                                <button
                                  onClick={() => { setEditingSkus(prev => ({ ...prev, [item.sku]: true })); setItemDestination(item.sku, getItemCatalogLocation(item)); }}
                                  className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium text-blue-700 border border-blue-300 bg-white hover:bg-blue-50"
                                  title="Habilitar reacomodo"
                                >
                                  Reacomodo
                                </button>
                              ) : (
                                <div className="flex items-center space-x-2">
                                  <button
                                    onClick={() => saveItemDestination(selectedTask!, item.sku)}
                                    disabled={savingSku === item.sku}
                                    className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium text-white ${savingSku === item.sku ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'}`}
                                    title="Guardar nueva ubicación"
                                  >
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    {savingSku === item.sku ? 'Guardando…' : 'Guardar'}
                                  </button>
                                  <button
                                    onClick={() => setEditingSkus(prev => ({ ...prev, [item.sku]: false }))}
                                    className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium text-gray-700 border border-gray-300 bg-white hover:bg-gray-50"
                                    title="Cancelar"
                                  >
                                    Cancelar
                                  </button>
                                </div>
                              )}
                              <button
                                onClick={() => completeItemToGeneralStock(selectedTask!, item)}
                                disabled={completingSku === item.sku}
                                className={`ml-2 inline-flex items-center px-2 py-1 rounded-md text-xs font-medium text-white ${completingSku === item.sku ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'}`}
                                title="Completar y mover a stock general"
                              >
                                <CheckCircle className="w-3 h-3 mr-1" />
                                {completingSku === item.sku ? 'Procesando…' : 'Completo'}
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 left-0 right-0 bg-white border-t p-3 flex justify-end space-x-3">
              <button
                onClick={() => setShowDetails(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Cerrar
              </button>
              {selectedTask.status === 'pending' && (
                <button
                  onClick={() => {
                    handleStartTask(selectedTask.id);
                  }}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Iniciar Tarea
                </button>
              )}
              {selectedTask.status === 'in_progress' && (
                <button
                  onClick={() => {
                    handleCompleteTask(selectedTask.id);
                    setShowDetails(false);
                  }}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Completar Tarea
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      {showLabelModal && (
        <TaskLabelModal
          isOpen={showLabelModal}
          onClose={() => { setShowLabelModal(false); }}
          task={labelTask}
        />
      )}
      {showNewTaskModal && (
        <NewPickingTaskModal onClose={() => setShowNewTaskModal(false)} />
      )}
    </div>
  );
}

function NewPickingTaskModal({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const [customer, setCustomer] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [location, setLocation] = useState('');
  const [estimatedTime, setEstimatedTime] = useState(10);
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<'pending' | 'in_progress' | 'completed' | 'cancelled'>('pending');
  const [originZone, setOriginZone] = useState('Recepción');
  const [destinationZone, setDestinationZone] = useState('');
  const [creator, setCreator] = useState<string>(user?.name || user?.email || '');
  const [skuInput, setSkuInput] = useState('');
  const [qtyInput, setQtyInput] = useState<number>(1);
  const [modalItems, setModalItems] = useState<{ sku: string; name: string; quantity: number; picked: number; location: string; unit?: string | null; weight?: number | null; dimensions?: string | null }[]>([]);
  const [showLabelModal, setShowLabelModal] = useState(false);
  const [labelTask, setLabelTask] = useState<{ id: string; orderNumber: string; customer?: string; assignedTo?: string; location?: string; notes?: string } | null>(null);
  const [usersCache, setUsersCache] = useState<Array<{ id: string; name: string; email: string }>>([]);
  const [userSuggestions, setUserSuggestions] = useState<Array<{ id: string; name: string; email: string }>>([]);
  const [showUserSuggestions, setShowUserSuggestions] = useState(false);
  const [zones, setZones] = useState<Array<{ code: string; name: string }>>([]);
  const [skuSuggestions, setSkuSuggestions] = useState<Array<{ sku: string; name: string }>>([]);

  const normalize = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  useEffect(() => {
    const bootstrapUsers = async () => {
      try {
        const { getLocalUsers } = await import('../../utils/localAuth');
        const locals = (getLocalUsers() || []).map(u => ({ id: u.id, name: u.full_name || u.email, email: u.email }));
        let merged = [...locals];
        const token = localStorage.getItem('app_token');
        if (AUTH_BACKEND_URL && token) {
          try {
            const resp = await fetch(`${AUTH_BACKEND_URL}/users?limit=200`, { headers: { Authorization: `Bearer ${token}` } });
            if (resp.ok) {
              const data = await resp.json();
              const remote = Array.isArray(data?.users) ? data.users : data;
              const mapped = (remote || []).map((u: any) => ({ id: String(u.id), name: String(u.full_name || u.email || ''), email: String(u.email || '') }));
              const byEmail = new Map<string, { id: string; name: string; email: string }>();
              [...locals, ...mapped].forEach(u => { if (u.email) byEmail.set(u.email, u); });
              merged = Array.from(byEmail.values());
            }
          } catch {}
        }
        setUsersCache(merged);
      } catch {}
    };
    bootstrapUsers();
  }, []);

  useEffect(() => {
    const term = assignedTo.trim();
    if (!term) { setUserSuggestions([]); return; }
    const n = normalize(term);
    const suggestions = usersCache.filter(u => normalize(u.name).includes(n) || normalize(u.email).includes(n)).slice(0, 8);
    setUserSuggestions(suggestions);
    setShowUserSuggestions(true);
  }, [assignedTo, usersCache]);

  useEffect(() => {
    const loadZones = async () => {
      try {
        const { data, error } = await supabase.from('zones').select('code, name').order('name', { ascending: true });
        if (!error && data) {
          const zs = (data as any[]).map(z => ({ code: String(z.code), name: String(z.name || z.code) }));
          setZones(zs);
          if (!destinationZone && zs.length > 0) setDestinationZone(zs[0].code);
          return;
        }
      } catch {}
      try {
        const { data: locs } = await supabase.from('locations').select('zone').order('zone', { ascending: true });
        const codes = Array.from(new Set((locs || []).map((l: any) => String(l.zone || '').trim()).filter(Boolean)));
        const zs = codes.map(code => ({ code, name: code === 'SIN-ZONA' ? 'Sin Zona' : code }));
        setZones(zs);
        if (!destinationZone && zs.length > 0) setDestinationZone(zs[0].code);
      } catch {}
    };
    loadZones();
  }, []);

  useEffect(() => {
    const term = skuInput.trim();
    const fetcher = setTimeout(async () => {
      if (!term || term.length < 2) { setSkuSuggestions([]); return; }
      try {
        if (AUTH_BACKEND_URL) {
          const resp = await fetch(`${AUTH_BACKEND_URL}/products/list?q=${encodeURIComponent(term)}&limit=20`);
          if (resp.ok) {
            const { products } = await resp.json();
            const sugg = (products || []).map((p: any) => ({ sku: String(p.sku), name: String(p.name || '') }));
            setSkuSuggestions(sugg.slice(0, 10));
            return;
          }
        }
        const { data } = await supabase.from('products').select('sku, name').or(`sku.ilike.%${term}%,name.ilike.%${term}%`).limit(10);
        const sugg = (data || []).map((p: any) => ({ sku: String(p.sku), name: String(p.name || '') }));
        setSkuSuggestions(sugg);
      } catch {
        setSkuSuggestions([]);
      }
    }, 250);
    return () => clearTimeout(fetcher);
  }, [skuInput]);

  const resolveProductInfo = async (sku: string): Promise<{ unit: string | null; weight: number | null; dimensionsStr: string | null; locationCode: string | null }> => {
    let unit: string | null = null;
    let weight: number | null = null;
    let dimensionsStr: string | null = null;
    let locationCode: string | null = null;
    try {
      if (AUTH_BACKEND_URL) {
        const qs = new URLSearchParams({ q: sku, limit: '10' });
        const respInv = await fetch(`${AUTH_BACKEND_URL}/inventory/list?${qs.toString()}`);
        if (respInv.ok) {
          const json = await respInv.json();
          const rows = Array.isArray(json.inventory) ? json.inventory : [];
          if (rows.length > 0) {
            const withAvail = rows.find((r: any) => Number(r.available_quantity || r.quantity || 0) > 0);
            locationCode = String((withAvail || rows[0]).location_code || '—');
          }
        }
      }
    } catch {}
    try {
      const { data } = await supabase.from('products').select('unit_of_measure, weight, dimensions').eq('sku', sku).limit(1).maybeSingle();
      if (data) {
        unit = (data as any).unit_of_measure ?? null;
        weight = (data as any).weight !== undefined && (data as any).weight !== null ? Number((data as any).weight) : null;
        const dims = (data as any).dimensions;
        if (dims && (typeof dims === 'object')) {
          const l = Number(dims.length ?? dims.l ?? dims.L ?? 0) || null;
          const w = Number(dims.width ?? dims.w ?? dims.W ?? 0) || null;
          const h = Number(dims.height ?? dims.h ?? dims.H ?? 0) || null;
          const parts = [l, w, h].filter(v => v !== null) as number[];
          dimensionsStr = parts.length > 0 ? parts.join(' × ') : null;
        } else if (typeof dims === 'string' && dims.trim()) {
          dimensionsStr = dims.trim();
        }
      }
    } catch {}
    if (!locationCode) {
      try {
        const { data } = await supabase.from('inventory').select('quantity, available_quantity, products!inner(sku), locations(code)').eq('products.sku', sku).limit(10);
        const rows = Array.isArray(data) ? data : [];
        if (rows.length > 0) {
          const withAvail = rows.find((r: any) => Number(r.available_quantity || r.quantity || 0) > 0);
          locationCode = String(((withAvail || rows[0]) as any)?.locations?.code || '—');
        }
      } catch {}
    }
    return { unit, weight, dimensionsStr, locationCode };
  };

  const addItem = async () => {
    const sku = skuInput.trim();
    const qty = Math.max(1, qtyInput || 1);
    if (!sku) return;
    const found = skuSuggestions.find(s => s.sku === sku);
    const displayName = found ? found.name : `SKU ${sku}`;
    const meta = await resolveProductInfo(sku);
    const locCode = meta.locationCode || location || '-';
    setLocation(prev => prev || (locCode !== '-' ? locCode : prev));
    setModalItems(prev => [{ sku, name: displayName, quantity: qty, picked: 0, location: locCode, unit: meta.unit ?? null, weight: meta.weight ?? null, dimensions: meta.dimensionsStr ?? null }, ...prev]);
    setSkuInput('');
    setQtyInput(1);
  };

  const removeItem = (sku: string) => {
    setModalItems(prev => prev.filter(it => it.sku !== sku));
  };

  function computeNextTaskCode(tasks: any[]): string {
    let max = 0;
    for (const t of tasks || []) {
      const code = String(t?.orderNumber || '').match(/TSK(\d{5})/);
      if (code) {
        const num = parseInt(code[1], 10);
        if (!isNaN(num)) max = Math.max(max, num);
      }
    }
    const next = String(max + 1).padStart(5, '0');
    return `TSK${next}`;
  }

  const handleCreate = async () => {
    try {
      const raw = localStorage.getItem('picking_tasks');
      const tasks = raw ? JSON.parse(raw) : [];
      const orderNumber = computeNextTaskCode(tasks);
      const dueDate = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString();
      const newTask = {
        id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
        orderNumber,
        customer: customer || 'Cliente',
        priority,
        status,
        assignedTo: assignedTo || 'Sin asignar',
        zone: 'Zona A - Picking',
        location: location || '-',
        items: modalItems,
        estimatedTime,
        createdAt: new Date().toISOString(),
        dueDate,
        notes,
        creator: creator || (user?.name || user?.email || 'Sistema'),
        originZone,
        destinationZone
      };
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('app_token') : null;
        if (AUTH_BACKEND_URL && token) {
          const resp = await fetch(`${AUTH_BACKEND_URL}/picking/tasks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify(newTask),
          });
          if (resp.ok) {
            const { task: saved } = await resp.json();
            if (saved?.id) newTask.id = saved.id;
          }
        }
      } catch {}
      const updated = [newTask, ...tasks];
      localStorage.setItem('picking_tasks', JSON.stringify(updated));
      window.dispatchEvent(new Event('picking_tasks_updated'));
      setLabelTask({ id: newTask.id, orderNumber: newTask.orderNumber, customer: newTask.customer, assignedTo: newTask.assignedTo, location: newTask.location, notes: newTask.notes });
      setShowLabelModal(true);
    } catch {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-3xl shadow-lg rounded-md bg-white">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Nueva Tarea de Picking</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ID Tarea</label>
            <input value={computeNextTaskCode(JSON.parse(localStorage.getItem('picking_tasks') || '[]'))} readOnly className="w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-50" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
            <input value={customer} onChange={e => setCustomer(e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2" placeholder="Cliente" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Asignado a</label>
            <div className="relative">
              <input
                value={assignedTo}
                onChange={e => setAssignedTo(e.target.value)}
                onFocus={() => setShowUserSuggestions(true)}
                onBlur={() => setTimeout(() => setShowUserSuggestions(false), 150)}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                placeholder="Buscar operario por nombre o email"
              />
              {showUserSuggestions && userSuggestions.length > 0 && (
                <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-40 overflow-auto">
                  {userSuggestions.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onMouseDown={() => { setAssignedTo(u.name || u.email); setShowUserSuggestions(false); }}
                      className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                    >
                      <span className="font-medium">{u.name}</span>
                      <span className="text-gray-500 ml-2">{u.email}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Creador</label>
            <input value={creator} onChange={e => setCreator(e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2" placeholder="Usuario creador" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
            <select value={status} onChange={e => setStatus(e.target.value as any)} className="w-full border border-gray-300 rounded-md px-3 py-2">
              <option value="pending">Pendiente</option>
              <option value="in_progress">En proceso</option>
              <option value="completed">Completada</option>
              <option value="cancelled">Cancelada</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ubicación</label>
            <input value={location} onChange={e => setLocation(e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2" placeholder="A-01-01" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Prioridad</label>
            <select value={priority} onChange={e => setPriority(e.target.value as any)} className="w-full border border-gray-300 rounded-md px-3 py-2">
              <option value="high">Alta</option>
              <option value="medium">Media</option>
              <option value="low">Baja</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tiempo Estimado (min)</label>
            <input type="number" value={estimatedTime} onChange={e => setEstimatedTime(parseInt(e.target.value || '0'))} className="w-full border border-gray-300 rounded-md px-3 py-2" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Datos de Origen</h4>
            <label className="block text-sm font-medium text-gray-700 mb-1">Zona de origen</label>
            <select value={originZone} onChange={e => setOriginZone(e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2">
              <option>Recepción</option>
              <option>Staging</option>
            </select>
          </div>
          <div>
            <h4 className="text sm font-semibold text-gray-700 mb-2">Datos de Destino</h4>
            <label className="block text-sm font-medium text-gray-700 mb-1">Zona destino sugerida</label>
            <select value={destinationZone} onChange={e => setDestinationZone(e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2">
              {zones.length === 0 && (
                <option value="">Cargando zonas...</option>
              )}
              {zones.map(z => (
                <option key={z.code} value={z.code}>{z.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Productos (SKU)</h4>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-end">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">SKU</label>
              <input
                value={skuInput}
                onChange={e => setSkuInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addItem(); }}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                placeholder="Escanear o escribir SKU y Enter"
              />
              {skuSuggestions.length > 0 && skuInput.trim().length >= 2 && (
                <div className="mt-1 border border-gray-200 rounded-md bg-white shadow-sm max-h-40 overflow-auto">
                  {skuSuggestions.map(s => (
                    <button
                      key={s.sku}
                      type="button"
                      onMouseDown={() => { setSkuInput(s.sku); }}
                      className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                    >
                      <span className="font-medium">{s.sku}</span>
                      <span className="text-gray-500 ml-2">{s.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad</label>
              <input type="number" value={qtyInput} onChange={e => setQtyInput(parseInt(e.target.value || '1'))} className="w-full border border-gray-300 rounded-md px-3 py-2" />
            </div>
            <div>
              <button onClick={addItem} className="w-full px-3 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700">Agregar</button>
            </div>
          </div>
          {modalItems.length > 0 && (
            <div className="mt-3 border border-gray-200 rounded-md">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-3 py-2 text-left">SKU</th>
                    <th className="px-3 py-2 text-left">Cantidad</th>
                    <th className="px-3 py-2 text-left">Unidad</th>
                    <th className="px-3 py-2 text-left">Peso</th>
                    <th className="px-3 py-2 text-left">Dimensiones</th>
                    <th className="px-3 py-2 text-left">Ubicación</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {modalItems.map(it => (
                    <tr key={it.sku} className="border-t">
                      <td className="px-3 py-2">{it.sku}</td>
                      <td className="px-3 py-2">{it.quantity}</td>
                      <td className="px-3 py-2">{it.unit || '—'}</td>
                      <td className="px-3 py-2">{(it.weight ?? null) !== null ? `${it.weight}` : '—'}</td>
                      <td className="px-3 py-2">{it.dimensions || '—'}</td>
                      <td className="px-3 py-2">{it.location}</td>
                      <td className="px-3 py-2 text-right">
                        <button onClick={() => removeItem(it.sku)} className="text-red-600 hover:text-red-800 text-xs">Eliminar</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Motivo de tarea</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2" rows={3} placeholder="Ej. Acomodo inicial, reubicación, consolidación" />
        </div>
        <div className="flex justify-end space-x-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">Cancelar</button>
          <button onClick={handleCreate} className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700">Crear Tarea</button>
        </div>
      </div>
      {showLabelModal && (
        <TaskLabelModal
          isOpen={showLabelModal}
          onClose={() => { setShowLabelModal(false); onClose(); }}
          task={labelTask}
        />
      )}
    </div>
  );
}
