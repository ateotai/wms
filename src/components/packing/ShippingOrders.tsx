import React, { useState } from 'react';
import { 
  FileText, 
  Package, 
  Truck, 
  Calendar, 
  MapPin, 
  User, 
  Phone, 
  Mail,
  Eye,
  Edit,
  CheckCircle,
  Clock,
  AlertTriangle,
  Plus,
  Filter,
  Search,
  Download,
  X
} from 'lucide-react';

interface ShippingOrderItem {
  id: string;
  product: string;
  sku: string;
  quantity: number;
  weight: number;
  dimensions: string;
  packed: boolean;
}

interface ShippingOrder {
  id: string;
  orderNumber: string;
  customer: {
    name: string;
    email: string;
    phone: string;
  };
  shippingAddress: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  items: ShippingOrderItem[];
  status: 'pending' | 'processing' | 'packing' | 'ready' | 'shipped' | 'delivered';
  priority: 'low' | 'medium' | 'high';
  carrier: string;
  trackingNumber?: string;
  shippingMethod: string;
  estimatedDelivery: string;
  totalWeight: number;
  totalValue: number;
  createdAt: string;
  shippedAt?: string;
  deliveredAt?: string;
  notes?: string;
}

export function ShippingOrders() {
  const [selectedOrder, setSelectedOrder] = useState<ShippingOrder | null>(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showNewOrderModal, setShowNewOrderModal] = useState(false);
  const [newOrderForm, setNewOrderForm] = useState({
    name: '',
    email: '',
    phone: '',
    street: '',
    city: '',
    state: '',
    zipCode: '',
    country: '',
    carrier: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
    shippingMethod: '',
    estimatedDelivery: '',
    totalValue: 0,
    notes: ''
  });
  const [newItems, setNewItems] = useState<ShippingOrderItem[]>([
    { id: 'tmp-1', product: '', sku: '', quantity: 1, weight: 0, dimensions: '', packed: false }
  ]);

  // Órdenes reales: se cargan desde localStorage; si no hay, lista vacía
  const [orders, setOrders] = useState<ShippingOrder[]>(() => {
    try {
      const str = localStorage.getItem('packing_orders');
      const arr = str ? JSON.parse(str) : [];
      return Array.isArray(arr) ? (arr as ShippingOrder[]) : [];
    } catch (e) {
      console.warn('No se pudieron leer órdenes desde localStorage:', e);
      return [] as ShippingOrder[];
    }
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-gray-600 bg-gray-100';
      case 'processing': return 'text-blue-600 bg-blue-100';
      case 'packing': return 'text-orange-600 bg-orange-100';
      case 'ready': return 'text-green-600 bg-green-100';
      case 'shipped': return 'text-purple-600 bg-purple-100';
      case 'delivered': return 'text-emerald-600 bg-emerald-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Pendiente';
      case 'processing': return 'Procesando';
      case 'packing': return 'Empaquetando';
      case 'ready': return 'Listo';
      case 'shipped': return 'Enviado';
      case 'delivered': return 'Entregado';
      default: return status;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getPriorityText = (priority: string) => {
    switch (priority) {
      case 'high': return 'Alta';
      case 'medium': return 'Media';
      case 'low': return 'Baja';
      default: return priority;
    }
  };

  const handleViewOrder = (order: ShippingOrder) => {
    setSelectedOrder(order);
    setShowOrderModal(true);
  };

  const handleStartPacking = (orderId: string) => {
    console.log('Iniciando empaquetado para orden:', orderId);
    // Aquí iría la lógica para iniciar el empaquetado
  };

  const handleMarkReady = (orderId: string) => {
    console.log('Marcando orden como lista:', orderId);
    // Aquí iría la lógica para marcar como lista
  };

  // --- Nueva Orden: helpers y manejadores ---
  const addItem = () => {
    setNewItems((prev) => ([
      ...prev,
      { id: `tmp-${Date.now()}`, product: '', sku: '', quantity: 1, weight: 0, dimensions: '', packed: false }
    ]));
  };

  const removeItem = (index: number) => {
    setNewItems((prev) => prev.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof ShippingOrderItem, value: any) => {
    setNewItems((prev) => {
      const list = [...prev];
      list[index] = { ...list[index], [field]: field === 'quantity' || field === 'weight' ? Number(value) : value } as ShippingOrderItem;
      return list;
    });
  };

  const getNextOrderNumber = () => {
    const year = new Date().getFullYear();
    const nums = orders.map((o) => {
      const m = o.orderNumber.match(/ORD-(\d{4})-(\d+)/);
      return m ? parseInt(m[2], 10) : 0;
    });
    const next = (nums.length ? Math.max(...nums) + 1 : 1);
    return `ORD-${year}-${String(next).padStart(3, '0')}`;
  };

  const handleCreateNewOrder = () => {
    // Validaciones mínimas
    if (!newOrderForm.name.trim()) { alert('Ingresa el nombre del cliente'); return; }
    if (!newOrderForm.street.trim() || !newOrderForm.city.trim() || !newOrderForm.country.trim()) {
      alert('Completa la dirección: calle, ciudad y país');
      return;
    }
    const validItems = newItems.filter((it) => it.product.trim() && it.quantity > 0);
    if (validItems.length === 0) { alert('Agrega al menos un producto con cantidad'); return; }

    const totalWeight = validItems.reduce((sum, it) => sum + (Number(it.weight) || 0) * (Number(it.quantity) || 0), 0);
    const newOrder: ShippingOrder = {
      id: String(Date.now()),
      orderNumber: getNextOrderNumber(),
      customer: { name: newOrderForm.name, email: newOrderForm.email, phone: newOrderForm.phone },
      shippingAddress: {
        street: newOrderForm.street,
        city: newOrderForm.city,
        state: newOrderForm.state,
        zipCode: newOrderForm.zipCode,
        country: newOrderForm.country
      },
      items: validItems.map((it, idx) => ({ ...it, id: it.id || `new-${idx}` })),
      status: 'pending',
      priority: newOrderForm.priority,
      carrier: newOrderForm.carrier || 'Sin asignar',
      shippingMethod: newOrderForm.shippingMethod || 'Estándar',
      estimatedDelivery: newOrderForm.estimatedDelivery,
      totalWeight,
      totalValue: Number(newOrderForm.totalValue) || 0,
      createdAt: new Date().toISOString(),
      notes: newOrderForm.notes || undefined
    };

    setOrders((prev) => [...prev, newOrder]);
    // Persistir en localStorage para métricas reales del dashboard
    try {
      const existingStr = localStorage.getItem('packing_orders');
      const existing: ShippingOrder[] = existingStr ? JSON.parse(existingStr) : [];
      localStorage.setItem('packing_orders', JSON.stringify([...existing, newOrder]));
    } catch (e) {
      console.warn('No se pudo guardar packing_orders en localStorage:', e);
    }
    setShowNewOrderModal(false);
    // Reset
    setNewOrderForm({
      name: '', email: '', phone: '', street: '', city: '', state: '', zipCode: '', country: '',
      carrier: '', priority: 'medium', shippingMethod: '', estimatedDelivery: '', totalValue: 0, notes: ''
    });
    setNewItems([{ id: 'tmp-1', product: '', sku: '', quantity: 1, weight: 0, dimensions: '', packed: false }]);
  };

  return (
    <div className="space-y-6">
      {/* Action Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h2 className="text-lg font-semibold text-gray-900">Órdenes de Envío</h2>
          <span className="px-2 py-1 text-xs font-medium text-blue-600 bg-blue-100 rounded-full">
            {orders.length} órdenes
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowNewOrderModal(true)}
            className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nueva Orden
          </button>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Orden
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cliente
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Prioridad
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Transportista
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Entrega Estimada
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Valor Total
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <FileText className="w-5 h-5 text-gray-400 mr-3" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {order.orderNumber}
                        </div>
                        <div className="text-sm text-gray-500">
                          {order.items.length} productos
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {order.customer.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {order.shippingAddress.city}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(order.status)}`}>
                      {getStatusText(order.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(order.priority)}`}>
                      {getPriorityText(order.priority)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {order.carrier}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(order.estimatedDelivery).toLocaleDateString('es-ES')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    €{order.totalValue.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => handleViewOrder(order)}
                        className="text-blue-600 hover:text-blue-900"
                        title="Ver detalles"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {order.status === 'pending' && (
                        <button
                          onClick={() => handleStartPacking(order.id)}
                          className="text-green-600 hover:text-green-900"
                          title="Iniciar empaquetado"
                        >
                          <Package className="w-4 h-4" />
                        </button>
                      )}
                      {order.status === 'packing' && (
                        <button
                          onClick={() => handleMarkReady(order.id)}
                          className="text-purple-600 hover:text-purple-900"
                          title="Marcar como listo"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Details Modal */}
      {showOrderModal && selectedOrder && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Detalles de Orden - {selectedOrder.orderNumber}
              </h3>
              <button
                onClick={() => setShowOrderModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Customer Information */}
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Información del Cliente</h4>
                  <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                    <div className="flex items-center">
                      <User className="w-4 h-4 text-gray-400 mr-2" />
                      <span className="text-sm text-gray-900">{selectedOrder.customer.name}</span>
                    </div>
                    <div className="flex items-center">
                      <Mail className="w-4 h-4 text-gray-400 mr-2" />
                      <span className="text-sm text-gray-900">{selectedOrder.customer.email}</span>
                    </div>
                    <div className="flex items-center">
                      <Phone className="w-4 h-4 text-gray-400 mr-2" />
                      <span className="text-sm text-gray-900">{selectedOrder.customer.phone}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Dirección de Envío</h4>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-start">
                      <MapPin className="w-4 h-4 text-gray-400 mr-2 mt-0.5" />
                      <div className="text-sm text-gray-900">
                        <div>{selectedOrder.shippingAddress.street}</div>
                        <div>{selectedOrder.shippingAddress.city}, {selectedOrder.shippingAddress.state}</div>
                        <div>{selectedOrder.shippingAddress.zipCode}</div>
                        <div>{selectedOrder.shippingAddress.country}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Order Information */}
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Información de Envío</h4>
                  <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Estado:</span>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedOrder.status)}`}>
                        {getStatusText(selectedOrder.status)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Prioridad:</span>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(selectedOrder.priority)}`}>
                        {getPriorityText(selectedOrder.priority)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Transportista:</span>
                      <span className="text-sm text-gray-900">{selectedOrder.carrier}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Método:</span>
                      <span className="text-sm text-gray-900">{selectedOrder.shippingMethod}</span>
                    </div>
                    {selectedOrder.trackingNumber && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Tracking:</span>
                        <span className="text-sm text-gray-900 font-mono">{selectedOrder.trackingNumber}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Entrega estimada:</span>
                      <span className="text-sm text-gray-900">
                        {new Date(selectedOrder.estimatedDelivery).toLocaleDateString('es-ES')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Items */}
            <div className="mt-6">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Productos</h4>
              <div className="bg-gray-50 rounded-lg overflow-hidden">
                <table className="min-w-full">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Producto</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Cantidad</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Peso</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Dimensiones</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {selectedOrder.items.map((item) => (
                      <tr key={item.id}>
                        <td className="px-4 py-2 text-sm text-gray-900">{item.product}</td>
                        <td className="px-4 py-2 text-sm text-gray-500 font-mono">{item.sku}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{item.quantity}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{item.weight} kg</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{item.dimensions}</td>
                        <td className="px-4 py-2">
                          {item.packed ? (
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full text-green-600 bg-green-100">
                              Empaquetado
                            </span>
                          ) : (
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full text-orange-600 bg-orange-100">
                              Pendiente
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {selectedOrder.notes && (
              <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Notas</h4>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-sm text-yellow-800">{selectedOrder.notes}</p>
                </div>
              </div>
            )}

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setShowOrderModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cerrar
              </button>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700">
                Editar Orden
              </button>
            </div>
          </div>
        </div>
      )}
      {/* New Order Modal */}
      {showNewOrderModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-3xl shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Nueva Orden de Envío</h3>
              <button onClick={() => setShowNewOrderModal(false)} className="text-gray-400 hover:text-gray-600" title="Cerrar">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Cliente</label>
                <input type="text" value={newOrderForm.name} onChange={(e) => setNewOrderForm({ ...newOrderForm, name: e.target.value })}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input type="email" value={newOrderForm.email} onChange={(e) => setNewOrderForm({ ...newOrderForm, email: e.target.value })}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Teléfono</label>
                <input type="tel" value={newOrderForm.phone} onChange={(e) => setNewOrderForm({ ...newOrderForm, phone: e.target.value })}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Calle</label>
                <input type="text" value={newOrderForm.street} onChange={(e) => setNewOrderForm({ ...newOrderForm, street: e.target.value })}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Ciudad</label>
                <input type="text" value={newOrderForm.city} onChange={(e) => setNewOrderForm({ ...newOrderForm, city: e.target.value })}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Estado/Provincia</label>
                <input type="text" value={newOrderForm.state} onChange={(e) => setNewOrderForm({ ...newOrderForm, state: e.target.value })}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Código Postal</label>
                  <input type="text" value={newOrderForm.zipCode} onChange={(e) => setNewOrderForm({ ...newOrderForm, zipCode: e.target.value })}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">País</label>
                  <input type="text" value={newOrderForm.country} onChange={(e) => setNewOrderForm({ ...newOrderForm, country: e.target.value })}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Transportista</label>
                <input type="text" value={newOrderForm.carrier} onChange={(e) => setNewOrderForm({ ...newOrderForm, carrier: e.target.value })}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Prioridad</label>
                <select value={newOrderForm.priority} onChange={(e) => setNewOrderForm({ ...newOrderForm, priority: e.target.value as 'low' | 'medium' | 'high' })}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500">
                  <option value="high">Alta</option>
                  <option value="medium">Media</option>
                  <option value="low">Baja</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Método de envío</label>
                <input type="text" value={newOrderForm.shippingMethod} onChange={(e) => setNewOrderForm({ ...newOrderForm, shippingMethod: e.target.value })}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Entrega Estimada</label>
                <input type="date" value={newOrderForm.estimatedDelivery} onChange={(e) => setNewOrderForm({ ...newOrderForm, estimatedDelivery: e.target.value })}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Valor Total (€)</label>
                <input type="number" step="0.01" value={newOrderForm.totalValue}
                  onChange={(e) => setNewOrderForm({ ...newOrderForm, totalValue: Number(e.target.value) })}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Notas</label>
                <input type="text" value={newOrderForm.notes} onChange={(e) => setNewOrderForm({ ...newOrderForm, notes: e.target.value })}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>

            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-gray-900">Productos</h4>
                <button onClick={addItem} className="px-2 py-1 bg-blue-600 text-white rounded-md text-xs hover:bg-blue-700">Agregar producto</button>
              </div>
              <div className="space-y-3">
                {newItems.map((item, idx) => (
                  <div key={item.id} className="grid grid-cols-1 md:grid-cols-6 gap-2 items-end">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700">Producto</label>
                      <input type="text" value={item.product} onChange={(e) => updateItem(idx, 'product', e.target.value)}
                        className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">SKU</label>
                      <input type="text" value={item.sku} onChange={(e) => updateItem(idx, 'sku', e.target.value)}
                        className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Cantidad</label>
                      <input type="number" min={1} value={item.quantity} onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                        className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Peso (kg)</label>
                      <input type="number" step="0.01" value={item.weight} onChange={(e) => updateItem(idx, 'weight', e.target.value)}
                        className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Dimensiones</label>
                      <input type="text" value={item.dimensions} onChange={(e) => updateItem(idx, 'dimensions', e.target.value)}
                        className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => removeItem(idx)} className="px-2 py-1 border border-gray-300 rounded-md text-xs hover:bg-gray-50">Eliminar</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setShowNewOrderModal(false)} className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">Cancelar</button>
              <button onClick={handleCreateNewOrder} className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700">Crear Orden</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}