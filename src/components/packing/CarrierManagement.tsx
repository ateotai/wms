import React, { useState } from 'react';
import { 
  Truck, 
  MapPin, 
  Clock, 
  DollarSign, 
  Star, 
  Phone, 
  Mail, 
  Globe,
  Package,
  Calendar,
  BarChart3,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Plus,
  Edit,
  Trash2,
  Eye,
  Settings
} from 'lucide-react';

interface CarrierService {
  id: string;
  name: string;
  type: 'standard' | 'express' | 'overnight' | 'economy';
  deliveryTime: string;
  maxWeight: number;
  maxDimensions: string;
  trackingIncluded: boolean;
  insuranceIncluded: boolean;
  baseRate: number;
  ratePerKg: number;
  active: boolean;
}

interface Carrier {
  id: string;
  name: string;
  code: string;
  logo?: string;
  contact: {
    phone: string;
    email: string;
    website: string;
    representative: string;
  };
  services: CarrierService[];
  coverage: string[];
  rating: number;
  totalShipments: number;
  onTimeDelivery: number;
  averageCost: number;
  contractStart: string;
  contractEnd: string;
  status: 'active' | 'inactive' | 'suspended';
  apiIntegration: boolean;
  trackingUrl: string;
  notes?: string;
}

export function CarrierManagement() {
  const [selectedCarrier, setSelectedCarrier] = useState<Carrier | null>(null);
  const [showCarrierModal, setShowCarrierModal] = useState(false);
  const [showNewCarrierModal, setShowNewCarrierModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'services' | 'performance'>('overview');

  // Mock data
  const carriers: Carrier[] = [
    {
      id: '1',
      name: 'DHL Express',
      code: 'DHL',
      contact: {
        phone: '+34 902 122 424',
        email: 'comercial@dhl.es',
        website: 'www.dhl.es',
        representative: 'Carlos Mendoza'
      },
      services: [
        {
          id: '1',
          name: 'DHL Express 12:00',
          type: 'express',
          deliveryTime: '12:00 siguiente día hábil',
          maxWeight: 70,
          maxDimensions: '120x80x80 cm',
          trackingIncluded: true,
          insuranceIncluded: true,
          baseRate: 25.50,
          ratePerKg: 3.20,
          active: true
        },
        {
          id: '2',
          name: 'DHL Express 18:00',
          type: 'express',
          deliveryTime: '18:00 siguiente día hábil',
          maxWeight: 70,
          maxDimensions: '120x80x80 cm',
          trackingIncluded: true,
          insuranceIncluded: true,
          baseRate: 22.00,
          ratePerKg: 2.80,
          active: true
        }
      ],
      coverage: ['España', 'Europa', 'Mundial'],
      rating: 4.8,
      totalShipments: 1250,
      onTimeDelivery: 96.5,
      averageCost: 28.75,
      contractStart: '2024-01-01',
      contractEnd: '2024-12-31',
      status: 'active',
      apiIntegration: true,
      trackingUrl: 'https://www.dhl.com/es-es/home/tracking.html?tracking-id={trackingNumber}',
      notes: 'Servicio premium con excelente cobertura internacional'
    },
    {
      id: '2',
      name: 'FedEx',
      code: 'FEDEX',
      contact: {
        phone: '+34 902 100 871',
        email: 'info@fedex.com',
        website: 'www.fedex.com/es',
        representative: 'Ana López'
      },
      services: [
        {
          id: '3',
          name: 'FedEx Priority',
          type: 'express',
          deliveryTime: '1-2 días hábiles',
          maxWeight: 68,
          maxDimensions: '119x79x79 cm',
          trackingIncluded: true,
          insuranceIncluded: true,
          baseRate: 24.00,
          ratePerKg: 2.95,
          active: true
        },
        {
          id: '4',
          name: 'FedEx Economy',
          type: 'standard',
          deliveryTime: '2-5 días hábiles',
          maxWeight: 68,
          maxDimensions: '119x79x79 cm',
          trackingIncluded: true,
          insuranceIncluded: false,
          baseRate: 18.50,
          ratePerKg: 2.20,
          active: true
        }
      ],
      coverage: ['España', 'Europa', 'América', 'Asia'],
      rating: 4.6,
      totalShipments: 980,
      onTimeDelivery: 94.2,
      averageCost: 26.30,
      contractStart: '2024-01-01',
      contractEnd: '2024-12-31',
      status: 'active',
      apiIntegration: true,
      trackingUrl: 'https://www.fedex.com/fedextrack/?trknbr={trackingNumber}',
      notes: 'Buena relación calidad-precio para envíos internacionales'
    },
    {
      id: '3',
      name: 'UPS',
      code: 'UPS',
      contact: {
        phone: '+34 902 888 820',
        email: 'customerservice@ups.com',
        website: 'www.ups.com/es',
        representative: 'Miguel García'
      },
      services: [
        {
          id: '5',
          name: 'UPS Express Saver',
          type: 'express',
          deliveryTime: 'Final del siguiente día hábil',
          maxWeight: 70,
          maxDimensions: '120x80x80 cm',
          trackingIncluded: true,
          insuranceIncluded: true,
          baseRate: 23.75,
          ratePerKg: 2.85,
          active: true
        },
        {
          id: '6',
          name: 'UPS Standard',
          type: 'standard',
          deliveryTime: '1-5 días hábiles',
          maxWeight: 70,
          maxDimensions: '120x80x80 cm',
          trackingIncluded: true,
          insuranceIncluded: false,
          baseRate: 16.90,
          ratePerKg: 1.95,
          active: true
        }
      ],
      coverage: ['España', 'Europa', 'Mundial'],
      rating: 4.4,
      totalShipments: 750,
      onTimeDelivery: 92.8,
      averageCost: 24.15,
      contractStart: '2024-01-01',
      contractEnd: '2024-12-31',
      status: 'active',
      apiIntegration: true,
      trackingUrl: 'https://www.ups.com/track?tracknum={trackingNumber}',
      notes: 'Servicio confiable con buena cobertura europea'
    },
    {
      id: '4',
      name: 'Correos Express',
      code: 'CORREOS',
      contact: {
        phone: '+34 902 197 197',
        email: 'info@correos.es',
        website: 'www.correos.es',
        representative: 'Laura Martín'
      },
      services: [
        {
          id: '7',
          name: 'Paq Premium',
          type: 'express',
          deliveryTime: '24-48 horas',
          maxWeight: 30,
          maxDimensions: '60x60x60 cm',
          trackingIncluded: true,
          insuranceIncluded: true,
          baseRate: 15.50,
          ratePerKg: 1.80,
          active: true
        },
        {
          id: '8',
          name: 'Paq Estándar',
          type: 'economy',
          deliveryTime: '2-4 días hábiles',
          maxWeight: 30,
          maxDimensions: '60x60x60 cm',
          trackingIncluded: true,
          insuranceIncluded: false,
          baseRate: 8.95,
          ratePerKg: 1.20,
          active: true
        }
      ],
      coverage: ['España', 'Portugal'],
      rating: 4.1,
      totalShipments: 1850,
      onTimeDelivery: 89.5,
      averageCost: 12.75,
      contractStart: '2024-01-01',
      contractEnd: '2024-12-31',
      status: 'active',
      apiIntegration: false,
      trackingUrl: 'https://www.correos.es/ss/Satellite/site/pagina-localizador_envios/busqueda-sidioma=es_ES?numero={trackingNumber}',
      notes: 'Opción económica para envíos nacionales'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100';
      case 'inactive': return 'text-gray-600 bg-gray-100';
      case 'suspended': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Activo';
      case 'inactive': return 'Inactivo';
      case 'suspended': return 'Suspendido';
      default: return status;
    }
  };

  const getServiceTypeColor = (type: string) => {
    switch (type) {
      case 'express': return 'text-red-600 bg-red-100';
      case 'standard': return 'text-blue-600 bg-blue-100';
      case 'overnight': return 'text-purple-600 bg-purple-100';
      case 'economy': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getServiceTypeText = (type: string) => {
    switch (type) {
      case 'express': return 'Express';
      case 'standard': return 'Estándar';
      case 'overnight': return 'Nocturno';
      case 'economy': return 'Económico';
      default: return type;
    }
  };

  const handleViewCarrier = (carrier: Carrier) => {
    setSelectedCarrier(carrier);
    setShowCarrierModal(true);
    setActiveTab('overview');
  };

  const handleEditCarrier = (carrierId: string) => {
    console.log('Editando transportista:', carrierId);
  };

  const handleToggleCarrier = (carrierId: string) => {
    console.log('Cambiando estado del transportista:', carrierId);
  };

  const calculateEstimatedCost = (service: CarrierService, weight: number = 2.5) => {
    return service.baseRate + (service.ratePerKg * weight);
  };

  return (
    <div className="space-y-6">
      {/* Action Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h2 className="text-lg font-semibold text-gray-900">Gestión de Transportistas</h2>
          <span className="px-2 py-1 text-xs font-medium text-blue-600 bg-blue-100 rounded-full">
            {carriers.filter(c => c.status === 'active').length} activos
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowNewCarrierModal(true)}
            className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Transportista
          </button>
        </div>
      </div>

      {/* Carriers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {carriers.map((carrier) => (
          <div key={carrier.id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
            {/* Carrier Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Truck className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">{carrier.name}</h3>
                  <p className="text-xs text-gray-500">{carrier.code}</p>
                </div>
              </div>
              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(carrier.status)}`}>
                {getStatusText(carrier.status)}
              </span>
            </div>

            {/* Rating and Stats */}
            <div className="mb-4">
              <div className="flex items-center mb-2">
                <div className="flex items-center">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${i < Math.floor(carrier.rating) ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                    />
                  ))}
                  <span className="ml-2 text-sm text-gray-600">{carrier.rating}</span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-gray-600">Envíos</div>
                  <div className="font-semibold text-gray-900">{carrier.totalShipments.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-gray-600">Puntualidad</div>
                  <div className="font-semibold text-gray-900">{carrier.onTimeDelivery}%</div>
                </div>
                <div>
                  <div className="text-gray-600">Costo Promedio</div>
                  <div className="font-semibold text-gray-900">€{carrier.averageCost}</div>
                </div>
                <div>
                  <div className="text-gray-600">Servicios</div>
                  <div className="font-semibold text-gray-900">{carrier.services.length}</div>
                </div>
              </div>
            </div>

            {/* Coverage */}
            <div className="mb-4">
              <div className="text-xs text-gray-600 mb-1">Cobertura</div>
              <div className="flex flex-wrap gap-1">
                {carrier.coverage.slice(0, 3).map((area, index) => (
                  <span key={index} className="inline-flex px-2 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded">
                    {area}
                  </span>
                ))}
                {carrier.coverage.length > 3 && (
                  <span className="inline-flex px-2 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded">
                    +{carrier.coverage.length - 3}
                  </span>
                )}
              </div>
            </div>

            {/* Integration Status */}
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center">
                <Globe className="w-4 h-4 text-gray-400 mr-2" />
                <span className="text-sm text-gray-600">API</span>
              </div>
              <div className={`flex items-center ${carrier.apiIntegration ? 'text-green-600' : 'text-red-600'}`}>
                {carrier.apiIntegration ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                <span className="ml-1 text-xs">
                  {carrier.apiIntegration ? 'Integrado' : 'Manual'}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => handleViewCarrier(carrier)}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                Ver Detalles
              </button>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleEditCarrier(carrier.id)}
                  className="text-gray-600 hover:text-gray-800"
                  title="Editar"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleToggleCarrier(carrier.id)}
                  className={`${carrier.status === 'active' ? 'text-red-600 hover:text-red-800' : 'text-green-600 hover:text-green-800'}`}
                  title={carrier.status === 'active' ? 'Desactivar' : 'Activar'}
                >
                  <Settings className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Carrier Details Modal */}
      {showCarrierModal && selectedCarrier && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-6xl shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {selectedCarrier.name} - Detalles
              </h3>
              <button
                onClick={() => setShowCarrierModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200 mb-6">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'overview'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Información General
                </button>
                <button
                  onClick={() => setActiveTab('services')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'services'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Servicios
                </button>
                <button
                  onClick={() => setActiveTab('performance')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'performance'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Rendimiento
                </button>
              </nav>
            </div>

            {/* Tab Content */}
            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Contact Information */}
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Información de Contacto</h4>
                  <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                    <div className="flex items-center">
                      <Phone className="w-4 h-4 text-gray-400 mr-3" />
                      <span className="text-sm text-gray-900">{selectedCarrier.contact.phone}</span>
                    </div>
                    <div className="flex items-center">
                      <Mail className="w-4 h-4 text-gray-400 mr-3" />
                      <span className="text-sm text-gray-900">{selectedCarrier.contact.email}</span>
                    </div>
                    <div className="flex items-center">
                      <Globe className="w-4 h-4 text-gray-400 mr-3" />
                      <span className="text-sm text-gray-900">{selectedCarrier.contact.website}</span>
                    </div>
                    <div className="flex items-center">
                      <User className="w-4 h-4 text-gray-400 mr-3" />
                      <span className="text-sm text-gray-900">{selectedCarrier.contact.representative}</span>
                    </div>
                  </div>
                </div>

                {/* Contract Information */}
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Información del Contrato</h4>
                  <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Estado:</span>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedCarrier.status)}`}>
                        {getStatusText(selectedCarrier.status)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Inicio:</span>
                      <span className="text-sm text-gray-900">
                        {new Date(selectedCarrier.contractStart).toLocaleDateString('es-ES')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Fin:</span>
                      <span className="text-sm text-gray-900">
                        {new Date(selectedCarrier.contractEnd).toLocaleDateString('es-ES')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Integración API:</span>
                      <span className={`text-sm ${selectedCarrier.apiIntegration ? 'text-green-600' : 'text-red-600'}`}>
                        {selectedCarrier.apiIntegration ? 'Sí' : 'No'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Coverage Areas */}
                <div className="lg:col-span-2">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Áreas de Cobertura</h4>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex flex-wrap gap-2">
                      {selectedCarrier.coverage.map((area, index) => (
                        <span key={index} className="inline-flex px-3 py-1 text-sm font-medium text-blue-700 bg-blue-100 rounded-full">
                          {area}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {selectedCarrier.notes && (
                  <div className="lg:col-span-2">
                    <h4 className="text-sm font-medium text-gray-900 mb-3">Notas</h4>
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                      <p className="text-sm text-yellow-800">{selectedCarrier.notes}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'services' && (
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-4">Servicios Disponibles</h4>
                <div className="space-y-4">
                  {selectedCarrier.services.map((service) => (
                    <div key={service.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <h5 className="text-sm font-semibold text-gray-900">{service.name}</h5>
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getServiceTypeColor(service.type)}`}>
                            {getServiceTypeText(service.type)}
                          </span>
                        </div>
                        <div className={`flex items-center ${service.active ? 'text-green-600' : 'text-red-600'}`}>
                          {service.active ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                          <span className="ml-1 text-xs">
                            {service.active ? 'Activo' : 'Inactivo'}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <div className="text-gray-600">Tiempo de entrega</div>
                          <div className="font-medium text-gray-900">{service.deliveryTime}</div>
                        </div>
                        <div>
                          <div className="text-gray-600">Peso máximo</div>
                          <div className="font-medium text-gray-900">{service.maxWeight} kg</div>
                        </div>
                        <div>
                          <div className="text-gray-600">Tarifa base</div>
                          <div className="font-medium text-gray-900">€{service.baseRate}</div>
                        </div>
                        <div>
                          <div className="text-gray-600">Por kg</div>
                          <div className="font-medium text-gray-900">€{service.ratePerKg}</div>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center space-x-4 text-xs text-gray-600">
                        <div className="flex items-center">
                          <Package className="w-3 h-3 mr-1" />
                          <span>Max: {service.maxDimensions}</span>
                        </div>
                        {service.trackingIncluded && (
                          <div className="flex items-center">
                            <MapPin className="w-3 h-3 mr-1" />
                            <span>Seguimiento incluido</span>
                          </div>
                        )}
                        {service.insuranceIncluded && (
                          <div className="flex items-center">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            <span>Seguro incluido</span>
                          </div>
                        )}
                      </div>

                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <div className="text-xs text-gray-600">Costo estimado (2.5 kg):</div>
                        <div className="text-sm font-semibold text-gray-900">
                          €{calculateEstimatedCost(service).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'performance' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-center">
                    <BarChart3 className="w-8 h-8 text-blue-600" />
                    <div className="ml-3">
                      <p className="text-sm font-medium text-blue-900">Total Envíos</p>
                      <p className="text-2xl font-bold text-blue-600">{selectedCarrier.totalShipments.toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="flex items-center">
                    <Clock className="w-8 h-8 text-green-600" />
                    <div className="ml-3">
                      <p className="text-sm font-medium text-green-900">Puntualidad</p>
                      <p className="text-2xl font-bold text-green-600">{selectedCarrier.onTimeDelivery}%</p>
                    </div>
                  </div>
                </div>

                <div className="bg-yellow-50 p-4 rounded-lg">
                  <div className="flex items-center">
                    <DollarSign className="w-8 h-8 text-yellow-600" />
                    <div className="ml-3">
                      <p className="text-sm font-medium text-yellow-900">Costo Promedio</p>
                      <p className="text-2xl font-bold text-yellow-600">€{selectedCarrier.averageCost}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="flex items-center">
                    <Star className="w-8 h-8 text-purple-600" />
                    <div className="ml-3">
                      <p className="text-sm font-medium text-purple-900">Calificación</p>
                      <p className="text-2xl font-bold text-purple-600">{selectedCarrier.rating}/5</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setShowCarrierModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cerrar
              </button>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700">
                Editar Transportista
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}