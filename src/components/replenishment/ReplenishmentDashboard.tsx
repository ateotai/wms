import { useState } from 'react';
import { Routes, Route as RouterRoute, Link, useLocation } from 'react-router-dom';
import { RotateCcw, BarChart3, Filter, Search, RefreshCw, Plus, Download } from 'lucide-react';
import { ReplenishmentTasks } from './ReplenishmentTasks';
import { MinMaxConfig } from './MinMaxConfig';

export function ReplenishmentDashboard() {
  const location = useLocation();
  const [searchTerm, setSearchTerm] = useState('');
  

  const tabs = [
    { name: 'Tareas', href: '/replenishment/tasks', icon: RotateCcw },
    { name: 'Min/Max', href: '/replenishment/min-max', icon: BarChart3 },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Reposición Automática</h2>
          <p className="text-gray-600">Sugerencias y umbrales basados en WMS</p>
        </div>
        <div className="flex space-x-2">
          <button className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualizar
          </button>
          <button className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
            <Download className="w-4 h-4 mr-2" />
            Exportar CSV
          </button>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Buscar SKU/Nombre"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button className="flex items-center px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
            <Filter className="w-4 h-4 mr-2" />
            Filtros
          </button>
        </div>
        <div className="flex space-x-2">
          <Link to="/replenishment/min-max" className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Definir Min/Max
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="px-4 pt-4 mb-2">
          <nav className="flex space-x-2" aria-label="Tabs">
            {tabs.map((tab) => {
              const isActive = location.pathname.startsWith(tab.href);
              const Icon = tab.icon as any;
              return (
                <Link
                  key={tab.name}
                  to={tab.href}
                  className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-md border ${isActive ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {tab.name}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="p-4">
          <Routes>
            <RouterRoute path="tasks" element={<ReplenishmentTasks searchTerm={searchTerm} />} />
            <RouterRoute path="min-max" element={<MinMaxConfig searchTerm={searchTerm} />} />
            <RouterRoute index element={<ReplenishmentTasks searchTerm={searchTerm} />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}
