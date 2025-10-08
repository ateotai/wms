import React, { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package, 
  MapPin, 
  Truck, 
  ShoppingCart, 
  RotateCcw, 
  Zap, 
  BarChart3, 
  Settings, 
  ChevronDown, 
  ChevronRight,
  Users,
  FileText,
  Warehouse,
  PackageCheck,
  PackageX,
  TrendingUp,
  Globe,
  Shield
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface NavigationItem {
  name: string;
  href?: string;
  icon: React.ElementType;
  children?: NavigationItem[];
  permissionId?: string;
}

export function Sidebar() {
  const [expandedItems, setExpandedItems] = useState<string[]>(['inventory']);
  const location = useLocation();
  const { hasPermissionId } = useAuth();

  const navigation: NavigationItem[] = [
    // Panel siempre visible para usuarios autenticados
    { name: 'Panel Principal', href: '/dashboard', icon: LayoutDashboard },
    {
      name: 'Gestión de Inventario',
      icon: Package,
      children: [
        { name: 'Dashboard Inventario', href: '/inventory', icon: Package, permissionId: 'inventory.view' },
        { name: 'Entradas de Mercancía', href: '/inventory/inbound', icon: PackageCheck, permissionId: 'inventory.view' },
        { name: 'Salidas de Mercancía', href: '/inventory/outbound', icon: PackageX, permissionId: 'inventory.view' },
        { name: 'Movimientos Internos', href: '/inventory/movements', icon: RotateCcw, permissionId: 'inventory.view' },
        { name: 'Recuentos Cíclicos', href: '/inventory/cycle-counts', icon: BarChart3, permissionId: 'inventory.view' },
        { name: 'Trazabilidad', href: '/inventory/traceability', icon: TrendingUp, permissionId: 'inventory.view' }
      ]
    },
    {
      name: 'Layout de Almacén',
      icon: Warehouse,
      children: [
        { name: 'Mapa Digital', href: '/warehouse/map', icon: MapPin, permissionId: 'warehouse.view' },
        { name: 'Configurar Zonas', href: '/warehouse/zones', icon: Warehouse, permissionId: 'warehouse.view' },
        { name: 'Almacenes', href: '/warehouse/warehouses', icon: Warehouse, permissionId: 'warehouse.view' },
        { name: 'Ubicaciones', href: '/warehouse/locations', icon: MapPin, permissionId: 'warehouse.view' },
        { name: 'Reglas de Slotting', href: '/warehouse/slotting', icon: Settings, permissionId: 'warehouse.view' }
      ]
    },
    {
      name: 'Recepción',
      href: '/reception',
      icon: Truck,
      permissionId: 'reception.view'
    },
    {
      name: 'Picking',
      icon: ShoppingCart,
      children: [
        { name: 'Tareas de Picking', href: '/picking/tasks', icon: ShoppingCart, permissionId: 'picking.view' },
        { name: 'Picking por Lotes', href: '/picking/batch', icon: Package, permissionId: 'picking.view' },
        { name: 'Picking por Olas', href: '/picking/waves', icon: TrendingUp, permissionId: 'picking.view' },
        { name: 'Optimización Rutas', href: '/picking/routes', icon: MapPin, permissionId: 'picking.view' }
      ]
    },
    {
      name: 'Packing y Envíos',
      icon: PackageCheck,
      children: [
        { name: 'Preparación Pedidos', href: '/packing/orders', icon: Package, permissionId: 'packing.view' },
        { name: 'Etiquetado', href: '/packing/labeling', icon: FileText, permissionId: 'packing.view' },
        { name: 'Gestión Transporte', href: '/packing/transport', icon: Truck, permissionId: 'packing.view' },
        { name: 'Documentos Envío', href: '/packing/documents', icon: FileText, permissionId: 'packing.view' }
      ]
    },
    {
      name: 'Reposición Automática',
      icon: RotateCcw,
      children: [
        { name: 'Reglas Reposición', href: '/replenishment/rules', icon: Settings, permissionId: 'replenishment.view' },
        { name: 'Tareas Pendientes', href: '/replenishment/tasks', icon: RotateCcw, permissionId: 'replenishment.view' },
        { name: 'Mínimos/Máximos', href: '/replenishment/min-max', icon: BarChart3, permissionId: 'replenishment.view' }
      ]
    },
    { name: 'Conectores ERP', href: '/integrations', icon: Globe, permissionId: 'integrations.view' },
    {
      name: 'Reportes y Analítica',
      icon: BarChart3,
      children: [
        { name: 'KPIs Almacén', href: '/reports/kpis', icon: BarChart3, permissionId: 'reports.view' },
        { name: 'Análisis ABC', href: '/reports/abc', icon: TrendingUp, permissionId: 'reports.view' },
        { name: 'Rotación Productos', href: '/reports/rotation', icon: RotateCcw, permissionId: 'reports.view' },
        { name: 'Costos Almacenamiento', href: '/reports/costs', icon: BarChart3, permissionId: 'reports.view' }
      ]
    },
    { name: 'Usuarios', href: '/users', icon: Users, permissionId: 'users.view' },
    {
      name: 'Configuración',
      icon: Settings,
      children: [
        { name: 'Multi-empresa', href: '/config/companies', icon: Globe, permissionId: 'settings.view' },
        { name: 'Roles y Permisos', href: '/config/permissions', icon: Shield, permissionId: 'settings.view' },
        { name: 'Dispositivos Móviles', href: '/config/devices', icon: Settings, permissionId: 'settings.view' },
        { name: 'Etiquetas y Medidas', href: '/config/labels', icon: FileText, permissionId: 'settings.view' }
      ]
    }
  ];

  const toggleExpanded = (itemName: string) => {
    setExpandedItems(prev => 
      prev.includes(itemName) 
        ? prev.filter(name => name !== itemName)
        : [...prev, itemName]
    );
  };

  const isActive = (href: string) => {
    return location.pathname === href || location.pathname.startsWith(href + '/');
  };

  const canSee = (perm?: string) => {
    if (!perm) return true;
    return hasPermissionId(perm);
  };

  const filteredNavigation = useMemo(() => {
    return navigation
      .map((item) => {
        if (item.children && item.children.length > 0) {
          const filteredChildren = item.children.filter((child) => canSee(child.permissionId || item.permissionId));
          if (filteredChildren.length === 0) return null;
          return { ...item, children: filteredChildren } as NavigationItem;
        }
        return canSee(item.permissionId) ? item : null;
      })
      .filter(Boolean) as NavigationItem[];
  }, [navigation, hasPermissionId]);

  const renderNavigationItem = (item: NavigationItem, level = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.includes(item.name);
    const Icon = item.icon;

    if (hasChildren) {
      return (
        <div key={item.name}>
          <button
            onClick={() => toggleExpanded(item.name)}
            className={`w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              level === 0 
                ? 'text-gray-700 hover:bg-gray-100 hover:text-gray-900' 
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800 ml-4'
            }`}
          >
            <div className="flex items-center">
              <Icon className={`mr-3 h-5 w-5 ${level === 0 ? 'text-gray-500' : 'text-gray-400'}`} />
              {item.name}
            </div>
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-gray-400" />
            ) : (
              <ChevronRight className="h-4 w-4 text-gray-400" />
            )}
          </button>
          {isExpanded && (
            <div className="mt-1 space-y-1">
              {item.children?.map(child => renderNavigationItem(child, level + 1))}
            </div>
          )}
        </div>
      );
    }

    return (
      <Link
        key={item.name}
        to={item.href!}
        className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
          level === 0 
            ? isActive(item.href!)
              ? 'bg-blue-100 text-blue-700'
              : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
            : isActive(item.href!)
              ? 'bg-blue-50 text-blue-600 ml-4'
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800 ml-4'
        }`}
      >
        <Icon className={`mr-3 h-5 w-5 ${
          level === 0 
            ? isActive(item.href!) ? 'text-blue-500' : 'text-gray-500'
            : isActive(item.href!) ? 'text-blue-400' : 'text-gray-400'
        }`} />
        {item.name}
      </Link>
    );
  };

  return (
    <div className="w-64 bg-white shadow-sm border-r border-gray-200 h-screen overflow-y-auto fixed left-0 top-0 z-10">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Warehouse className="w-5 h-5 text-white" />
            </div>
          </div>
          <div className="ml-3">
            <h1 className="text-lg font-semibold text-gray-900">WMS Pro</h1>
            <p className="text-xs text-gray-500">v2.1.0</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="p-4 space-y-2">
        {filteredNavigation.map(item => renderNavigationItem(item))}
      </nav>
    </div>
  );
}