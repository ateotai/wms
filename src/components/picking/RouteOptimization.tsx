import React, { useState } from 'react';
import { 
  MapPin, 
  Clock, 
  TrendingUp, 
  BarChart3,
  Navigation,
  Zap,
  Target,
  RefreshCw,
  Play,
  Eye,
  Settings,
  Download,
  Filter
} from 'lucide-react';

interface RouteStep {
  id: string;
  location: string;
  zone: string;
  product: string;
  quantity: number;
  estimatedTime: number;
  actualTime?: number;
  status: 'pending' | 'completed' | 'current';
  coordinates: { x: number; y: number };
}

interface OptimizedRoute {
  id: string;
  name: string;
  picker: string;
  status: 'planned' | 'in_progress' | 'completed';
  steps: RouteStep[];
  totalDistance: number;
  estimatedTime: number;
  actualTime?: number;
  efficiency: number;
  optimizationMethod: 'shortest_path' | 'time_based' | 'zone_based' | 'priority_based';
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

export function RouteOptimization() {
  const [routes, setRoutes] = useState<OptimizedRoute[]>([
    {
      id: '1',
      name: 'Ruta Optimizada A-001',
      picker: 'Juan Pérez',
      status: 'in_progress',
      steps: [
        { id: '1', location: 'A-01-15', zone: 'Zona A', product: 'Producto ABC', quantity: 5, estimatedTime: 3, actualTime: 2, status: 'completed', coordinates: { x: 10, y: 15 } },
        { id: '2', location: 'A-02-08', zone: 'Zona A', product: 'Producto DEF', quantity: 3, estimatedTime: 2, status: 'current', coordinates: { x: 20, y: 8 } },
        { id: '3', location: 'A-03-22', zone: 'Zona A', product: 'Producto GHI', quantity: 7, estimatedTime: 4, status: 'pending', coordinates: { x: 30, y: 22 } },
        { id: '4', location: 'B-01-05', zone: 'Zona B', product: 'Producto JKL', quantity: 2, estimatedTime: 3, status: 'pending', coordinates: { x: 45, y: 5 } },
        { id: '5', location: 'B-02-18', zone: 'Zona B', product: 'Producto MNO', quantity: 4, estimatedTime: 3, status: 'pending', coordinates: { x: 55, y: 18 } }
      ],
      totalDistance: 125.5,
      estimatedTime: 15,
      actualTime: 8,
      efficiency: 92,
      optimizationMethod: 'shortest_path',
      createdAt: '2024-01-20T08:00:00',
      startedAt: '2024-01-20T08:15:00'
    },
    {
      id: '2',
      name: 'Ruta Optimizada B-002',
      picker: 'María García',
      status: 'planned',
      steps: [
        { id: '6', location: 'C-01-12', zone: 'Zona C', product: 'Producto PQR', quantity: 6, estimatedTime: 4, status: 'pending', coordinates: { x: 70, y: 12 } },
        { id: '7', location: 'C-02-25', zone: 'Zona C', product: 'Producto STU', quantity: 8, estimatedTime: 5, status: 'pending', coordinates: { x: 80, y: 25 } },
        { id: '8', location: 'D-01-09', zone: 'Zona D', product: 'Producto VWX', quantity: 3, estimatedTime: 2, status: 'pending', coordinates: { x: 95, y: 9 } },
        { id: '9', location: 'D-02-16', zone: 'Zona D', product: 'Producto YZ1', quantity: 5, estimatedTime: 3, status: 'pending', coordinates: { x: 105, y: 16 } }
      ],
      totalDistance: 98.2,
      estimatedTime: 14,
      efficiency: 0,
      optimizationMethod: 'zone_based',
      createdAt: '2024-01-20T09:00:00'
    },
    {
      id: '3',
      name: 'Ruta Optimizada C-003',
      picker: 'Carlos López',
      status: 'completed',
      steps: [
        { id: '10', location: 'E-01-07', zone: 'Zona E', product: 'Producto 234', quantity: 4, estimatedTime: 3, actualTime: 3, status: 'completed', coordinates: { x: 120, y: 7 } },
        { id: '11', location: 'E-02-20', zone: 'Zona E', product: 'Producto 567', quantity: 6, estimatedTime: 4, actualTime: 3, status: 'completed', coordinates: { x: 130, y: 20 } },
        { id: '12', location: 'E-03-14', zone: 'Zona E', product: 'Producto 890', quantity: 2, estimatedTime: 2, actualTime: 2, status: 'completed', coordinates: { x: 140, y: 14 } }
      ],
      totalDistance: 67.8,
      estimatedTime: 9,
      actualTime: 8,
      efficiency: 95,
      optimizationMethod: 'time_based',
      createdAt: '2024-01-20T07:00:00',
      startedAt: '2024-01-20T07:15:00',
      completedAt: '2024-01-20T07:23:00'
    }
  ]);

  const [selectedRoute, setSelectedRoute] = useState<OptimizedRoute | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showOptimizationSettings, setShowOptimizationSettings] = useState(false);
  const [optimizationMethod, setOptimizationMethod] = useState<string>('shortest_path');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planned': return 'gray';
      case 'in_progress': return 'blue';
      case 'completed': return 'green';
      default: return 'gray';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'planned': return 'Planificada';
      case 'in_progress': return 'En Progreso';
      case 'completed': return 'Completada';
      default: return 'Desconocido';
    }
  };

  const getStepStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'gray';
      case 'current': return 'blue';
      case 'completed': return 'green';
      default: return 'gray';
    }
  };

  const getOptimizationMethodText = (method: string) => {
    switch (method) {
      case 'shortest_path': return 'Ruta Más Corta';
      case 'time_based': return 'Basado en Tiempo';
      case 'zone_based': return 'Por Zonas';
      case 'priority_based': return 'Por Prioridad';
      default: return 'Desconocido';
    }
  };

  const handleStartRoute = (routeId: string) => {
    setRoutes(routes.map(route => 
      route.id === routeId 
        ? { 
            ...route, 
            status: 'in_progress' as const,
            startedAt: new Date().toISOString()
          }
        : route
    ));
  };

  const handleCompleteRoute = (routeId: string) => {
    setRoutes(routes.map(route => 
      route.id === routeId 
        ? { 
            ...route, 
            status: 'completed' as const,
            completedAt: new Date().toISOString(),
            actualTime: route.estimatedTime - 2,
            efficiency: 94
          }
        : route
    ));
  };

  const handleViewDetails = (route: OptimizedRoute) => {
    setSelectedRoute(route);
    setShowDetails(true);
  };

  const handleOptimizeRoute = (routeId: string) => {
    // Simulate route optimization
    setRoutes(routes.map(route => 
      route.id === routeId 
        ? { 
            ...route, 
            totalDistance: route.totalDistance * 0.85,
            estimatedTime: Math.round(route.estimatedTime * 0.9),
            optimizationMethod: optimizationMethod as any
          }
        : route
    ));
  };

  const calculateProgress = (route: OptimizedRoute) => {
    const completedSteps = route.steps.filter(step => step.status === 'completed').length;
    return route.steps.length > 0 ? (completedSteps / route.steps.length) * 100 : 0;
  };

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Optimización de Rutas</h2>
          <p className="text-gray-600">Optimiza las rutas de picking para maximizar la eficiencia</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowOptimizationSettings(true)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <Settings className="w-4 h-4 mr-2" />
            Configuración
          </button>
          <button className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">
            <RefreshCw className="w-4 h-4 mr-2" />
            Optimizar Todas
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Navigation className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Rutas Activas</p>
              <p className="text-2xl font-bold text-gray-900">
                {routes.filter(r => r.status === 'in_progress').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Eficiencia Promedio</p>
              <p className="text-2xl font-bold text-gray-900">
                {Math.round(routes.reduce((sum, r) => sum + r.efficiency, 0) / routes.length)}%
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Navigation className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Distancia Ahorrada</p>
              <p className="text-2xl font-bold text-gray-900">
                {Math.round(routes.reduce((sum, r) => sum + (r.totalDistance * 0.15), 0))}m
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center">
            <div className="p-3 bg-orange-100 rounded-lg">
              <Clock className="w-6 h-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Tiempo Ahorrado</p>
              <p className="text-2xl font-bold text-gray-900">
                {Math.round(routes.reduce((sum, r) => sum + (r.estimatedTime * 0.1), 0))} min
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Route List */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">Rutas Optimizadas</h3>
            <div className="flex items-center space-x-2">
              <button className="p-2 text-gray-400 hover:text-gray-600">
                <Filter className="w-4 h-4" />
              </button>
              <button className="p-2 text-gray-400 hover:text-gray-600">
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
        
        <div className="divide-y divide-gray-200">
          {routes.map((route) => {
            const statusColor = getStatusColor(route.status);
            const progress = calculateProgress(route);

            return (
              <div key={route.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-3">
                      <h4 className="text-lg font-medium text-gray-900">{route.name}</h4>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-${statusColor}-100 text-${statusColor}-800`}>
                        {getStatusText(route.status)}
                      </span>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                        {getOptimizationMethodText(route.optimizationMethod)}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
                      <div className="flex items-center text-sm text-gray-600">
                        <MapPin className="w-4 h-4 mr-2" />
                        <span className="font-medium">Picker:</span>
                        <span className="ml-1">{route.picker}</span>
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <Target className="w-4 h-4 mr-2" />
                        <span className="font-medium">Paradas:</span>
                        <span className="ml-1">{route.steps.length}</span>
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <Navigation className="w-4 h-4 mr-2" />
                        <span className="font-medium">Distancia:</span>
                        <span className="ml-1">{route.totalDistance}m</span>
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <Clock className="w-4 h-4 mr-2" />
                        <span className="font-medium">Tiempo:</span>
                        <span className="ml-1">
                          {route.actualTime ? `${route.actualTime}/${route.estimatedTime} min` : `${route.estimatedTime} min`}
                        </span>
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <TrendingUp className="w-4 h-4 mr-2" />
                        <span className="font-medium">Eficiencia:</span>
                        <span className="ml-1">{route.efficiency}%</span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    {route.status === 'in_progress' && (
                      <div className="mb-4">
                        <div className="flex justify-between text-sm text-gray-600 mb-1">
                          <span>Progreso de la Ruta</span>
                          <span>{progress.toFixed(0)}% ({route.steps.filter(s => s.status === 'completed').length}/{route.steps.length})</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Route Steps Preview */}
                    <div className="mb-3">
                      <div className="flex flex-wrap gap-2">
                        {route.steps.slice(0, 5).map((step) => (
                          <div
                            key={step.id}
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs bg-${getStepStatusColor(step.status)}-100 text-${getStepStatusColor(step.status)}-800`}
                          >
                            <MapPin className="w-3 h-3 mr-1" />
                            <span>{step.location}</span>
                          </div>
                        ))}
                        {route.steps.length > 5 && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800">
                            +{route.steps.length - 5} más
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <div className="flex items-center">
                        <Zap className="w-4 h-4 mr-1" />
                        <span>Optimizada: {new Date(route.createdAt).toLocaleTimeString()}</span>
                      </div>
                      {route.startedAt && (
                        <div className="flex items-center">
                          <Play className="w-4 h-4 mr-1" />
                          <span>Iniciada: {new Date(route.startedAt).toLocaleTimeString()}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => handleViewDetails(route)}
                      className="p-2 text-gray-400 hover:text-blue-600"
                      title="Ver detalles"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    
                    {route.status === 'planned' && (
                      <>
                        <button
                          onClick={() => handleOptimizeRoute(route.id)}
                          className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700"
                        >
                          <RefreshCw className="w-4 h-4 mr-1" />
                          Re-optimizar
                        </button>
                        <button
                          onClick={() => handleStartRoute(route.id)}
                          className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                        >
                          <Play className="w-4 h-4 mr-1" />
                          Iniciar
                        </button>
                      </>
                    )}
                    
                    {route.status === 'in_progress' && (
                      <button
                        onClick={() => handleCompleteRoute(route.id)}
                        className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                      >
                        <Target className="w-4 h-4 mr-1" />
                        Completar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Route Details Modal */}
      {showDetails && selectedRoute && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-6xl shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">
                Detalles de la Ruta - {selectedRoute.name}
              </h3>
              <button
                onClick={() => setShowDetails(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Route Info */}
              <div className="space-y-4">
                <div>
                  <h4 className="text-lg font-medium text-gray-900 mb-3">Información de la Ruta</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-500">Estado:</span>
                      <span className={`text-sm font-medium text-${getStatusColor(selectedRoute.status)}-600`}>
                        {getStatusText(selectedRoute.status)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-500">Picker:</span>
                      <span className="text-sm text-gray-900">{selectedRoute.picker}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-500">Método:</span>
                      <span className="text-sm text-gray-900">{getOptimizationMethodText(selectedRoute.optimizationMethod)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-500">Distancia Total:</span>
                      <span className="text-sm text-gray-900">{selectedRoute.totalDistance}m</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-500">Tiempo Estimado:</span>
                      <span className="text-sm text-gray-900">{selectedRoute.estimatedTime} min</span>
                    </div>
                    {selectedRoute.actualTime && (
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-gray-500">Tiempo Real:</span>
                        <span className="text-sm text-gray-900">{selectedRoute.actualTime} min</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-500">Eficiencia:</span>
                      <span className="text-sm text-gray-900">{selectedRoute.efficiency}%</span>
                    </div>
                  </div>
                </div>

                {/* Route Visualization */}
                <div>
                  <h4 className="text-lg font-medium text-gray-900 mb-3">Visualización de la Ruta</h4>
                  <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <div className="relative h-64 bg-white rounded border">
                      <svg className="w-full h-full">
                        {/* Draw route path */}
                        {selectedRoute.steps.map((step, index) => {
                          const nextStep = selectedRoute.steps[index + 1];
                          if (!nextStep) return null;
                          
                          return (
                            <line
                              key={`line-${index}`}
                              x1={step.coordinates.x * 2}
                              y1={step.coordinates.y * 2}
                              x2={nextStep.coordinates.x * 2}
                              y2={nextStep.coordinates.y * 2}
                              stroke="#3B82F6"
                              strokeWidth="2"
                              strokeDasharray={step.status === 'completed' ? '0' : '5,5'}
                            />
                          );
                        })}
                        
                        {/* Draw location points */}
                        {selectedRoute.steps.map((step, index) => (
                          <g key={step.id}>
                            <circle
                              cx={step.coordinates.x * 2}
                              cy={step.coordinates.y * 2}
                              r="6"
                              fill={
                                step.status === 'completed' ? '#10B981' :
                                step.status === 'current' ? '#3B82F6' : '#6B7280'
                              }
                            />
                            <text
                              x={step.coordinates.x * 2}
                              y={step.coordinates.y * 2 - 10}
                              textAnchor="middle"
                              className="text-xs font-medium"
                              fill="#374151"
                            >
                              {index + 1}
                            </text>
                          </g>
                        ))}
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              {/* Steps List */}
              <div>
                <h4 className="text-lg font-medium text-gray-900 mb-3">Pasos de la Ruta</h4>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {selectedRoute.steps.map((step, index) => (
                    <div key={step.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center space-x-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium text-white bg-${getStepStatusColor(step.status)}-500`}>
                            {index + 1}
                          </div>
                          <div>
                            <h5 className="font-medium text-gray-900">{step.location}</h5>
                            <p className="text-sm text-gray-500">{step.zone}</p>
                          </div>
                        </div>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-${getStepStatusColor(step.status)}-100 text-${getStepStatusColor(step.status)}-800`}>
                          {step.status === 'pending' ? 'Pendiente' : step.status === 'current' ? 'Actual' : 'Completado'}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                        <div>
                          <span className="font-medium">Producto:</span> {step.product}
                        </div>
                        <div>
                          <span className="font-medium">Cantidad:</span> {step.quantity}
                        </div>
                        <div>
                          <span className="font-medium">Tiempo Est.:</span> {step.estimatedTime} min
                        </div>
                        {step.actualTime && (
                          <div>
                            <span className="font-medium">Tiempo Real:</span> {step.actualTime} min
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowDetails(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Optimization Settings Modal */}
      {showOptimizationSettings && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">Configuración de Optimización</h3>
              <button
                onClick={() => setShowOptimizationSettings(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Método de Optimización
                </label>
                <div className="space-y-3">
                  {[
                    { value: 'shortest_path', label: 'Ruta Más Corta', description: 'Minimiza la distancia total recorrida' },
                    { value: 'time_based', label: 'Basado en Tiempo', description: 'Optimiza el tiempo total de picking' },
                    { value: 'zone_based', label: 'Por Zonas', description: 'Agrupa por zonas para reducir desplazamientos' },
                    { value: 'priority_based', label: 'Por Prioridad', description: 'Prioriza órdenes urgentes primero' }
                  ].map((method) => (
                    <label key={method.value} className="flex items-start space-x-3">
                      <input
                        type="radio"
                        name="optimization_method"
                        value={method.value}
                        checked={optimizationMethod === method.value}
                        onChange={(e) => setOptimizationMethod(e.target.value)}
                        className="mt-1 text-blue-600 focus:ring-blue-500"
                      />
                      <div>
                        <div className="text-sm font-medium text-gray-900">{method.label}</div>
                        <div className="text-sm text-gray-500">{method.description}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Parámetros Adicionales
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">
                      Peso de la Distancia (%)
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      defaultValue="60"
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">
                      Peso del Tiempo (%)
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      defaultValue="40"
                      className="w-full"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="flex items-center space-x-2">
                  <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                  <span className="text-sm text-gray-700">Considerar capacidad del picker</span>
                </label>
              </div>

              <div>
                <label className="flex items-center space-x-2">
                  <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                  <span className="text-sm text-gray-700">Evitar congestión en pasillos</span>
                </label>
              </div>

              <div>
                <label className="flex items-center space-x-2">
                  <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                  <span className="text-sm text-gray-700">Optimización en tiempo real</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowOptimizationSettings(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => setShowOptimizationSettings(false)}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                Guardar Configuración
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}