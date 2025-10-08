import React, { useState } from 'react';
import { 
  Waves, 
  Users, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Play,
  Plus,
  Eye,
  Edit,
  Pause,
  Package,
  MapPin,
  BarChart3,
  TrendingUp,
  Calendar
} from 'lucide-react';

interface WaveBatch {
  id: string;
  name: string;
  orders: number;
  items: number;
  assignedTo: string;
  status: 'pending' | 'in_progress' | 'completed';
  zone: string;
}

interface Wave {
  id: string;
  name: string;
  status: 'planning' | 'released' | 'in_progress' | 'completed' | 'paused';
  priority: 'high' | 'medium' | 'low';
  batches: WaveBatch[];
  totalOrders: number;
  totalItems: number;
  estimatedTime: number;
  actualTime?: number;
  createdAt: string;
  releasedAt?: string;
  completedAt?: string;
  efficiency: number;
  completedBatches: number;
  zones: string[];
  cutoffTime: string;
  shipmentDate: string;
}

export function WavePicking() {
  const [waves, setWaves] = useState<Wave[]>([
    {
      id: '1',
      name: 'Ola Matutina - 20/01',
      status: 'in_progress',
      priority: 'high',
      batches: [
        { id: '1', name: 'Lote A-001', orders: 15, items: 45, assignedTo: 'Juan Pérez', status: 'completed', zone: 'Zona A' },
        { id: '2', name: 'Lote A-002', orders: 12, items: 38, assignedTo: 'María García', status: 'in_progress', zone: 'Zona A' },
        { id: '3', name: 'Lote B-001', orders: 8, items: 22, assignedTo: 'Carlos López', status: 'pending', zone: 'Zona B' }
      ],
      totalOrders: 35,
      totalItems: 105,
      estimatedTime: 120,
      actualTime: 85,
      createdAt: '2024-01-20T06:00:00',
      releasedAt: '2024-01-20T08:00:00',
      efficiency: 88,
      completedBatches: 1,
      zones: ['Zona A', 'Zona B'],
      cutoffTime: '07:30',
      shipmentDate: '2024-01-20'
    },
    {
      id: '2',
      name: 'Ola Vespertina - 20/01',
      status: 'planning',
      priority: 'medium',
      batches: [
        { id: '4', name: 'Lote C-001', orders: 20, items: 65, assignedTo: 'Ana Rodríguez', status: 'pending', zone: 'Zona C' },
        { id: '5', name: 'Lote D-001', orders: 18, items: 52, assignedTo: 'Luis Martín', status: 'pending', zone: 'Zona D' }
      ],
      totalOrders: 38,
      totalItems: 117,
      estimatedTime: 140,
      createdAt: '2024-01-20T10:00:00',
      efficiency: 0,
      completedBatches: 0,
      zones: ['Zona C', 'Zona D'],
      cutoffTime: '13:30',
      shipmentDate: '2024-01-20'
    },
    {
      id: '3',
      name: 'Ola Express - 19/01',
      status: 'completed',
      priority: 'high',
      batches: [
        { id: '6', name: 'Lote E-001', orders: 10, items: 28, assignedTo: 'Pedro Sánchez', status: 'completed', zone: 'Zona E' },
        { id: '7', name: 'Lote E-002', orders: 8, items: 24, assignedTo: 'Laura Gómez', status: 'completed', zone: 'Zona E' }
      ],
      totalOrders: 18,
      totalItems: 52,
      estimatedTime: 60,
      actualTime: 55,
      createdAt: '2024-01-19T14:00:00',
      releasedAt: '2024-01-19T15:00:00',
      completedAt: '2024-01-19T15:55:00',
      efficiency: 95,
      completedBatches: 2,
      zones: ['Zona E'],
      cutoffTime: '14:30',
      shipmentDate: '2024-01-19'
    }
  ]);

  const [selectedWave, setSelectedWave] = useState<Wave | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planning': return 'gray';
      case 'released': return 'blue';
      case 'in_progress': return 'yellow';
      case 'completed': return 'green';
      case 'paused': return 'red';
      default: return 'gray';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'planning': return 'Planificando';
      case 'released': return 'Liberada';
      case 'in_progress': return 'En Progreso';
      case 'completed': return 'Completada';
      case 'paused': return 'Pausada';
      default: return 'Desconocido';
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

  const getBatchStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'gray';
      case 'in_progress': return 'blue';
      case 'completed': return 'green';
      default: return 'gray';
    }
  };

  const handleReleaseWave = (waveId: string) => {
    setWaves(waves.map(wave => 
      wave.id === waveId 
        ? { 
            ...wave, 
            status: 'released' as const,
            releasedAt: new Date().toISOString()
          }
        : wave
    ));
  };

  const handleStartWave = (waveId: string) => {
    setWaves(waves.map(wave => 
      wave.id === waveId 
        ? { ...wave, status: 'in_progress' as const }
        : wave
    ));
  };

  const handlePauseWave = (waveId: string) => {
    setWaves(waves.map(wave => 
      wave.id === waveId 
        ? { ...wave, status: 'paused' as const }
        : wave
    ));
  };

  const handleCompleteWave = (waveId: string) => {
    setWaves(waves.map(wave => 
      wave.id === waveId 
        ? { 
            ...wave, 
            status: 'completed' as const,
            completedAt: new Date().toISOString(),
            completedBatches: wave.batches.length,
            efficiency: 92
          }
        : wave
    ));
  };

  const handleViewDetails = (wave: Wave) => {
    setSelectedWave(wave);
    setShowDetails(true);
  };

  const calculateProgress = (wave: Wave) => {
    return wave.batches.length > 0 ? (wave.completedBatches / wave.batches.length) * 100 : 0;
  };

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Picking por Olas</h2>
          <p className="text-gray-600">Coordina múltiples lotes para optimizar el flujo de trabajo</p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Crear Ola
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Waves className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Olas Activas</p>
              <p className="text-2xl font-bold text-gray-900">
                {waves.filter(w => w.status === 'in_progress' || w.status === 'released').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Completadas Hoy</p>
              <p className="text-2xl font-bold text-gray-900">
                {waves.filter(w => w.status === 'completed').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Eficiencia Promedio</p>
              <p className="text-2xl font-bold text-gray-900">
                {Math.round(waves.reduce((sum, w) => sum + w.efficiency, 0) / waves.length)}%
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center">
            <div className="p-3 bg-orange-100 rounded-lg">
              <Package className="w-6 h-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Items Procesados</p>
              <p className="text-2xl font-bold text-gray-900">
                {waves.reduce((sum, w) => sum + (w.status === 'completed' ? w.totalItems : 0), 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Wave List */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Olas de Picking</h3>
        </div>
        
        <div className="divide-y divide-gray-200">
          {waves.map((wave) => {
            const statusColor = getStatusColor(wave.status);
            const priorityColor = getPriorityColor(wave.priority);
            const progress = calculateProgress(wave);

            return (
              <div key={wave.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-3">
                      <h4 className="text-lg font-medium text-gray-900">{wave.name}</h4>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-${statusColor}-100 text-${statusColor}-800`}>
                        {getStatusText(wave.status)}
                      </span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-${priorityColor}-100 text-${priorityColor}-800`}>
                        {wave.priority === 'high' ? 'Alta' : wave.priority === 'medium' ? 'Media' : 'Baja'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
                      <div className="flex items-center text-sm text-gray-600">
                        <Package className="w-4 h-4 mr-2" />
                        <span className="font-medium">Órdenes:</span>
                        <span className="ml-1">{wave.totalOrders}</span>
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <BarChart3 className="w-4 h-4 mr-2" />
                        <span className="font-medium">Items:</span>
                        <span className="ml-1">{wave.totalItems}</span>
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <Users className="w-4 h-4 mr-2" />
                        <span className="font-medium">Lotes:</span>
                        <span className="ml-1">{wave.batches.length}</span>
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <MapPin className="w-4 h-4 mr-2" />
                        <span className="font-medium">Zonas:</span>
                        <span className="ml-1">{wave.zones.join(', ')}</span>
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <Calendar className="w-4 h-4 mr-2" />
                        <span className="font-medium">Envío:</span>
                        <span className="ml-1">{new Date(wave.shipmentDate).toLocaleDateString()}</span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    {(wave.status === 'in_progress' || wave.status === 'released') && (
                      <div className="mb-4">
                        <div className="flex justify-between text-sm text-gray-600 mb-1">
                          <span>Progreso de Lotes</span>
                          <span>{progress.toFixed(0)}% ({wave.completedBatches}/{wave.batches.length})</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Batches Preview */}
                    <div className="mb-3">
                      <div className="flex flex-wrap gap-2">
                        {wave.batches.slice(0, 4).map((batch) => (
                          <div
                            key={batch.id}
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs bg-${getBatchStatusColor(batch.status)}-100 text-${getBatchStatusColor(batch.status)}-800`}
                          >
                            <span className="font-medium">{batch.name}</span>
                            <span className="ml-1">({batch.orders} órdenes)</span>
                          </div>
                        ))}
                        {wave.batches.length > 4 && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800">
                            +{wave.batches.length - 4} más
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <div className="flex items-center">
                        <Clock className="w-4 h-4 mr-1" />
                        <span>
                          {wave.actualTime ? `${wave.actualTime}/${wave.estimatedTime} min` : `${wave.estimatedTime} min est.`}
                        </span>
                      </div>
                      <div className="flex items-center">
                        <AlertCircle className="w-4 h-4 mr-1" />
                        <span>Corte: {wave.cutoffTime}</span>
                      </div>
                      {wave.efficiency > 0 && (
                        <div className="flex items-center">
                          <TrendingUp className="w-4 h-4 mr-1" />
                          <span>Eficiencia: {wave.efficiency}%</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => handleViewDetails(wave)}
                      className="p-2 text-gray-400 hover:text-blue-600"
                      title="Ver detalles"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    
                    {wave.status === 'planning' && (
                      <button
                        onClick={() => handleReleaseWave(wave.id)}
                        className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                      >
                        <Play className="w-4 h-4 mr-1" />
                        Liberar
                      </button>
                    )}
                    
                    {wave.status === 'released' && (
                      <button
                        onClick={() => handleStartWave(wave.id)}
                        className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                      >
                        <Play className="w-4 h-4 mr-1" />
                        Iniciar
                      </button>
                    )}
                    
                    {wave.status === 'in_progress' && (
                      <>
                        <button
                          onClick={() => handlePauseWave(wave.id)}
                          className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-yellow-600 hover:bg-yellow-700"
                        >
                          <Pause className="w-4 h-4 mr-1" />
                          Pausar
                        </button>
                        <button
                          onClick={() => handleCompleteWave(wave.id)}
                          className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Completar
                        </button>
                      </>
                    )}

                    <button className="p-2 text-gray-400 hover:text-gray-600">
                      <Edit className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Wave Details Modal */}
      {showDetails && selectedWave && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-6xl shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">
                Detalles de la Ola - {selectedWave.name}
              </h3>
              <button
                onClick={() => setShowDetails(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Wave Info */}
              <div className="space-y-4">
                <div>
                  <h4 className="text-lg font-medium text-gray-900 mb-3">Información de la Ola</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-500">Estado:</span>
                      <span className={`text-sm font-medium text-${getStatusColor(selectedWave.status)}-600`}>
                        {getStatusText(selectedWave.status)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-500">Prioridad:</span>
                      <span className={`text-sm font-medium text-${getPriorityColor(selectedWave.priority)}-600`}>
                        {selectedWave.priority === 'high' ? 'Alta' : selectedWave.priority === 'medium' ? 'Media' : 'Baja'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-500">Total Órdenes:</span>
                      <span className="text-sm text-gray-900">{selectedWave.totalOrders}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-500">Total Items:</span>
                      <span className="text-sm text-gray-900">{selectedWave.totalItems}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-500">Lotes Completados:</span>
                      <span className="text-sm text-gray-900">{selectedWave.completedBatches}/{selectedWave.batches.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-500">Eficiencia:</span>
                      <span className="text-sm text-gray-900">{selectedWave.efficiency}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-500">Hora de Corte:</span>
                      <span className="text-sm text-gray-900">{selectedWave.cutoffTime}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-500">Fecha de Envío:</span>
                      <span className="text-sm text-gray-900">{new Date(selectedWave.shipmentDate).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Batches List */}
              <div className="md:col-span-2">
                <h4 className="text-lg font-medium text-gray-900 mb-3">Lotes en la Ola</h4>
                <div className="space-y-3">
                  {selectedWave.batches.map((batch) => (
                    <div key={batch.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h5 className="font-medium text-gray-900">{batch.name}</h5>
                          <p className="text-sm text-gray-500">Asignado a: {batch.assignedTo}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-${getBatchStatusColor(batch.status)}-100 text-${getBatchStatusColor(batch.status)}-800`}>
                            {batch.status === 'pending' ? 'Pendiente' : batch.status === 'in_progress' ? 'En Progreso' : 'Completado'}
                          </span>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm text-gray-600">
                        <div>
                          <span className="font-medium">Órdenes:</span> {batch.orders}
                        </div>
                        <div>
                          <span className="font-medium">Items:</span> {batch.items}
                        </div>
                        <div>
                          <span className="font-medium">Zona:</span> {batch.zone}
                        </div>
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

      {/* Create Wave Form Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">Crear Nueva Ola</h3>
              <button
                onClick={() => setShowCreateForm(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre de la Ola
                </label>
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ej: Ola Matutina - 21/01"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Prioridad
                  </label>
                  <select className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500">
                    <option value="high">Alta</option>
                    <option value="medium">Media</option>
                    <option value="low">Baja</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha de Envío
                  </label>
                  <input
                    type="date"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Hora de Corte
                  </label>
                  <input
                    type="time"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tiempo Estimado (min)
                  </label>
                  <input
                    type="number"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="120"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Lotes Disponibles
                </label>
                <div className="border border-gray-300 rounded-md p-3 max-h-40 overflow-y-auto">
                  <div className="space-y-2">
                    {['Lote F-001', 'Lote F-002', 'Lote G-001', 'Lote G-002'].map((batch) => (
                      <label key={batch} className="flex items-center">
                        <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                        <span className="ml-2 text-sm text-gray-900">{batch}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                Crear Ola
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}