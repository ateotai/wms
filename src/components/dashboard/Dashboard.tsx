import React from 'react';
import { DashboardStats } from './DashboardStats';
import { RecentActivity } from './RecentActivity';
import { PendingTasks } from './PendingTasks';
import { QuickActions } from './QuickActions';
import { BarChart3, TrendingUp, Users, Package } from 'lucide-react';

export function Dashboard() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Panel de Control WMS</h1>
            <p className="text-gray-600 mt-1">
              Gestión integral de almacén - {new Date().toLocaleDateString('es-ES', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
              <BarChart3 className="w-4 h-4 mr-2" />
              Exportar Datos
            </button>
            <button className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">
              <TrendingUp className="w-4 h-4 mr-2" />
              Ver Reportes
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stats */}
      <DashboardStats />

      {/* Quick Actions */}
      <QuickActions />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <RecentActivity />
        
        {/* Pending Tasks */}
        <PendingTasks />
      </div>

      {/* Additional Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Warehouse Utilization */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Utilización Almacén</h3>
            <Package className="w-5 h-5 text-gray-400" />
          </div>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Zona A (Picking)</span>
                <span className="font-medium">87%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                <div className="bg-blue-500 h-2 rounded-full" style={{ width: '87%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Zona B (Reserva)</span>
                <span className="font-medium">64%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                <div className="bg-green-500 h-2 rounded-full" style={{ width: '64%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Zona C (Recepción)</span>
                <span className="font-medium">23%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                <div className="bg-yellow-500 h-2 rounded-full" style={{ width: '23%' }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Top Products */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Productos Top</h3>
            <TrendingUp className="w-5 h-5 text-gray-400" />
          </div>
          <div className="space-y-3">
            {[
              { sku: 'SKU-001', name: 'Producto A', moves: 156 },
              { sku: 'SKU-045', name: 'Producto B', moves: 142 },
              { sku: 'SKU-023', name: 'Producto C', moves: 128 },
              { sku: 'SKU-067', name: 'Producto D', moves: 98 },
              { sku: 'SKU-012', name: 'Producto E', moves: 87 }
            ].map((product, index) => (
              <div key={product.sku} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{product.name}</p>
                  <p className="text-xs text-gray-500">{product.sku}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{product.moves}</p>
                  <p className="text-xs text-gray-500">movimientos</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Team Performance */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Rendimiento Equipo</h3>
            <Users className="w-5 h-5 text-gray-400" />
          </div>
          <div className="space-y-3">
            {[
              { name: 'Carlos López', role: 'Picker', efficiency: 98 },
              { name: 'María García', role: 'Receiver', efficiency: 95 },
              { name: 'Ana Martín', role: 'Packer', efficiency: 92 },
              { name: 'Pedro Ruiz', role: 'Counter', efficiency: 89 }
            ].map((member) => (
              <div key={member.name} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{member.name}</p>
                  <p className="text-xs text-gray-500">{member.role}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{member.efficiency}%</p>
                  <p className="text-xs text-gray-500">eficiencia</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}