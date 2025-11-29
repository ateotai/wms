import React, { useState } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { 
  Search, 
  Filter, 
  Download, 
  Plus, 
  RefreshCw,
  Package,
  TrendingUp,
  AlertTriangle,
  Upload,
  BarChart3
} from 'lucide-react';
import { InventoryStats } from './InventoryStats';
import { InventoryList } from './InventoryList';
import { StockMovements } from './StockMovements';
import { LowStockAlerts } from './LowStockAlerts';
import { Traceability } from './Traceability';
import { ProductImport } from './ProductImport';
import { Outbound } from './Outbound';
import { Inbound } from './Inbound';
import CycleCounts from './CycleCounts';
import { supabase } from '../../lib/supabase';
import { ProductsTable } from './ProductsTable';

export function InventoryDashboard() {
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [filterCategory, setFilterCategory] = useState('all');
  const location = useLocation();
  const [cyclePendingCount, setCyclePendingCount] = useState<number>(0);

  const tabs = [
    { name: 'Resumen', href: '/inventory', icon: Package },
    { name: 'Productos', href: '/inventory/products', icon: Package },
    { name: 'Movimientos', href: '/inventory/movements', icon: TrendingUp },
    { name: 'Alertas', href: '/inventory/alerts', icon: AlertTriangle },
    { name: 'Trazabilidad', href: '/inventory/traceability', icon: TrendingUp },
    { name: 'Recuentos', href: '/inventory/cycle-counts', icon: BarChart3 }
  ];

  const isActiveTab = (href: string) => {
    if (href === '/inventory') {
      return location.pathname === '/inventory';
    }
    return location.pathname.startsWith(href);
  };

  // Badge: recuentos pendientes/planificados
  const fetchCyclePendingCount = async () => {
    try {
      const { count, error } = await supabase
        .from('cycle_counts')
        .select('id', { count: 'exact', head: true })
        .in('status', ['planned', 'in_progress']);
      if (error) throw error;
      setCyclePendingCount(count || 0);
    } catch (e) {
      console.error('Error obteniendo conteo de recuentos pendientes:', e);
    }
  };

  React.useEffect(() => {
    if (!location.pathname.startsWith('/inventory')) return;
    // Primera carga inmediata
    fetchCyclePendingCount();
    // Refresco automático cada 60 segundos
    const intervalId = window.setInterval(() => {
      fetchCyclePendingCount();
    }, 60000);
    return () => {
      window.clearInterval(intervalId);
    };
  }, [location.pathname]);

  // Suscripción en tiempo real a cambios en cycle_counts
  React.useEffect(() => {
    if (!location.pathname.startsWith('/inventory')) return;
    const channel = supabase
      .channel('realtime:cycle_counts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cycle_counts' }, (payload) => {
        type StatusRow = { status?: string };
        type CycleCountChange = { new?: StatusRow; old?: StatusRow };
        const p = payload as CycleCountChange;
        const nextStatus = p?.new?.status as string | undefined;
        const prevStatus = p?.old?.status as string | undefined;
        const relevant = (s?: string) => s === 'planned' || s === 'in_progress' || s === 'completed' || s === 'cancelled';
        // Actualiza cuando un recuento entra/sale de estados relevantes
        if (relevant(nextStatus) || relevant(prevStatus)) {
          fetchCyclePendingCount();
        }
      });
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        // Sincroniza al suscribirse
        fetchCyclePendingCount();
      }
    });
    return () => {
      try { channel.unsubscribe(); } catch (e) { console.debug('Error al desuscribir canal', e); }
    };
  }, [location.pathname]);

  interface ProductImportRow {
    sku: string;
    name: string;
    description?: string;
    unit_of_measure?: string;
    cost_price?: number;
    selling_price?: number;
    min_stock_level?: number;
    max_stock_level?: number;
    reorder_point?: number;
    barcode?: string | null;
    weight?: number | null;
  }

  const handleImportProducts = async (products: ProductImportRow[]) => {
    try {
      // Preparar los productos para inserción
      const productsToInsert = products.map(product => ({
        sku: product.sku,
        name: product.name,
        description: product.description || '',
        unit_of_measure: product.unit_of_measure || 'PCS',
        cost_price: product.cost_price || 0,
        selling_price: product.selling_price || 0,
        min_stock_level: product.min_stock_level || 0,
        max_stock_level: product.max_stock_level || 1000,
        reorder_point: product.reorder_point || 10,
        barcode: product.barcode || null,
        weight: product.weight || null,
        is_active: true
      }));

      // Usar backend con service role para evitar RLS en cliente
      const backendUrl = import.meta.env.VITE_AUTH_BACKEND_URL || '';
      const token = localStorage.getItem('app_token');

      if (!backendUrl) {
        alert('Backend no configurado: faltante VITE_AUTH_BACKEND_URL');
        return;
      }
      if (!token) {
        alert('Sesión no disponible. Inicia sesión para importar productos.');
        return;
      }

      const resp = await fetch(`${backendUrl}/products/import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ products: productsToInsert })
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: 'Error desconocido en backend' }));
        console.error('Error al importar productos (backend):', err);
        alert(`Error al importar productos: ${err.error || resp.statusText}`);
        return;
      }

      const result = await resp.json();
      console.log('Importación completada (backend):', result);
      alert(`Importación completada. Nuevos: ${result.newCount}. Actualizados: ${result.updateCount}. Total procesados: ${result.processed}`);

      // Cerrar modal y refrescar la lista si es necesario
      setShowImportModal(false);
      window.location.reload();
      
    } catch (error) {
      console.error('Error en handleImportProducts:', error);
      alert('Error al procesar la importación de productos');
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Inventario</h1>
          <p className="text-gray-600">Controla y gestiona todo tu inventario en tiempo real</p>
        </div>
        <div className="flex items-center space-x-3">
          <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </button>
          <button 
            onClick={() => setShowImportModal(true)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <Upload className="w-4 h-4 mr-2" />
            Importar Catálogo
          </button>
          <button className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Producto
          </button>
        </div>
      </div>

      {/* Stats */}
      <InventoryStats />

      {/* Tabs Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <Link
                key={tab.name}
                to={tab.href}
                className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                  isActiveTab(tab.href)
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4 mr-2" />
                {tab.name}
                {tab.href === '/inventory/cycle-counts' && cyclePendingCount > 0 && (
                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                    {cyclePendingCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Buscar productos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 w-80"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`inline-flex items-center px-3 py-2 border rounded-md text-sm font-medium ${
              showFilters
                ? 'border-blue-300 text-blue-700 bg-blue-50'
                : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
            }`}
          >
            <Filter className="w-4 h-4 mr-2" />
            Filtros
          </button>
        </div>
        <button className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
          <RefreshCw className="w-4 h-4 mr-2" />
          Actualizar
        </button>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Categoría
              </label>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="all">Todas las categorías</option>
                <option value="electronics">Electrónicos</option>
                <option value="clothing">Ropa</option>
                <option value="food">Alimentos</option>
                <option value="books">Libros</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Estado Stock
              </label>
              <select className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm">
                <option value="">Todos los estados</option>
                <option value="in-stock">En Stock</option>
                <option value="low-stock">Stock Bajo</option>
                <option value="out-of-stock">Sin Stock</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Almacén
              </label>
              <select className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm">
                <option value="">Todos los almacenes</option>
                <option value="main">Almacén Principal</option>
                <option value="secondary">Almacén Secundario</option>
                <option value="returns">Devoluciones</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Proveedor
              </label>
              <select className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm">
                <option value="">Todos los proveedores</option>
                <option value="supplier1">Proveedor A</option>
                <option value="supplier2">Proveedor B</option>
                <option value="supplier3">Proveedor C</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <Routes>
        <Route path="/" element={<InventoryList searchTerm={searchTerm} filterCategory={filterCategory} />} />
        <Route path="/products" element={<ProductsTable searchTerm={searchTerm} />} />
        <Route path="/movements" element={<StockMovements />} />
        <Route path="/alerts" element={<LowStockAlerts />} />
        <Route path="/traceability" element={<Traceability />} />
        <Route path="/inbound" element={<Inbound />} />
        <Route path="/outbound" element={<Outbound />} />
        <Route path="/cycle-counts" element={<CycleCounts />} />
      </Routes>

      {/* Product Import Modal */}
      <ProductImport
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImport={handleImportProducts}
      />
    </div>
  );
}