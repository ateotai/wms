import React, { useState } from 'react';
import { 
  Truck, 
  Calendar, 
  Package, 
  MapPin, 
  Eye, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  X,
  Plus,
  Search,
  Filter,
  FileText,
  User
} from 'lucide-react';

interface ASNItem {
  id: string;
  sku: string;
  description: string;
  quantityShipped: number;
  quantityReceived: number;
  lotNumber?: string;
  expiryDate?: string;
}

interface ASN {
  id: string;
  asnNumber: string;
  poNumber: string;
  supplier: string;
  carrier: string;
  trackingNumber: string;
  status: 'in_transit' | 'arrived' | 'receiving' | 'completed' | 'discrepancy';
  shipDate: string;
  expectedDate: string;
  actualDate?: string;
  items: ASNItem[];
  notes?: string;
  dockDoor?: string;
}

export const ASNManagement: React.FC = () => {
  const [selectedASN, setSelectedASN] = useState<ASN | null>(null);
  const [showASNModal, setShowASNModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Mock data
  const asns: ASN[] = [
    {
      id: '1',
      asnNumber: 'ASN-2024-001',
      poNumber: 'PO-2024-001',
      supplier: 'Proveedor ABC S.A.',
      carrier: 'Transportes Rápidos',
      trackingNumber: 'TR123456789',
      status: 'in_transit',
      shipDate: '2024-01-20',
      expectedDate: '2024-01-22',
      dockDoor: 'Puerta 3',
      items: [
        {
          id: '1',
          sku: 'PROD-001',
          description: 'Producto A',
          quantityShipped: 100,
          quantityReceived: 0,
          lotNumber: 'LOT-001-2024',
          expiryDate: '2024-12-31'
        },
        {
          id: '2',
          sku: 'PROD-002',
          description: 'Producto B',
          quantityShipped: 200,
          quantityReceived: 0,
          lotNumber: 'LOT-002-2024'
        }
      ],
      notes: 'Mercancía frágil - manejar con cuidado'
    },
    {
      id: '2',
      asnNumber: 'ASN-2024-002',
      poNumber: 'PO-2024-002',
      supplier: 'Distribuidora XYZ',
      carrier: 'Logística Express',
      trackingNumber: 'LE987654321',
      status: 'arrived',
      shipDate: '2024-01-19',
      expectedDate: '2024-01-21',
      actualDate: '2024-01-21',
      dockDoor: 'Puerta 1',
      items: [
        {
          id: '3',
          sku: 'PROD-003',
          description: 'Producto C',
          quantityShipped: 150,
          quantityReceived: 0
        }
      ]
    },
    {
      id: '3',
      asnNumber: 'ASN-2024-003',
      poNumber: 'PO-2024-003',
      supplier: 'Comercial 123',
      carrier: 'Transporte Nacional',
      trackingNumber: 'TN456789123',
      status: 'receiving',
      shipDate: '2024-01-18',
      expectedDate: '2024-01-20',
      actualDate: '2024-01-20',
      dockDoor: 'Puerta 2',
      items: [
        {
          id: '4',
          sku: 'PROD-004',
          description: 'Producto D',
          quantityShipped: 300,
          quantityReceived: 150
        }
      ]
    },
    {
      id: '4',
      asnNumber: 'ASN-2024-004',
      poNumber: 'PO-2024-004',
      supplier: 'Proveedor DEF',
      carrier: 'Cargo Solutions',
      trackingNumber: 'CS789123456',
      status: 'completed',
      shipDate: '2024-01-15',
      expectedDate: '2024-01-17',
      actualDate: '2024-01-17',
      dockDoor: 'Puerta 4',
      items: [
        {
          id: '5',
          sku: 'PROD-005',
          description: 'Producto E',
          quantityShipped: 250,
          quantityReceived: 250
        }
      ]
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in_transit': return 'bg-blue-100 text-blue-800';
      case 'arrived': return 'bg-yellow-100 text-yellow-800';
      case 'receiving': return 'bg-purple-100 text-purple-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'discrepancy': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'in_transit': return Truck;
      case 'arrived': return MapPin;
      case 'receiving': return Package;
      case 'completed': return CheckCircle;
      case 'discrepancy': return AlertTriangle;
      default: return Clock;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'in_transit': return 'En Tránsito';
      case 'arrived': return 'Llegó';
      case 'receiving': return 'Recibiendo';
      case 'completed': return 'Completado';
      case 'discrepancy': return 'Discrepancia';
      default: return 'Desconocido';
    }
  };

  const handleViewASN = (asn: ASN) => {
    setSelectedASN(asn);
    setShowASNModal(true);
  };

  const handleStartReceiving = (asnId: string) => {
    console.log('Starting receiving for ASN:', asnId);
    // Implement start receiving logic
  };

  const handleCompleteReceiving = (asnId: string) => {
    console.log('Completing receiving for ASN:', asnId);
    // Implement complete receiving logic
  };

  return (
    <div className="space-y-6">
      {/* Action Bar */}
      <div className="flex justify-between items-center">
        <div className="flex space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Buscar ASN..."
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
            <Filter className="w-4 h-4 mr-2" />
            Filtros
          </button>
        </div>
        <button 
          onClick={() => setShowCreateModal(true)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nuevo ASN
        </button>
      </div>

      {/* ASN Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ASN
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Orden de Compra
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Proveedor
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Transportista
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Estado
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Fecha Esperada
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Puerta
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {asns.map((asn) => {
              const StatusIcon = getStatusIcon(asn.status);
              return (
                <tr key={asn.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Truck className="w-5 h-5 text-gray-400 mr-3" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {asn.asnNumber}
                        </div>
                        <div className="text-sm text-gray-500">
                          {asn.trackingNumber}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{asn.poNumber}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{asn.supplier}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{asn.carrier}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(asn.status)}`}>
                      <StatusIcon className="w-3 h-3 mr-1" />
                      {getStatusText(asn.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div>{new Date(asn.expectedDate).toLocaleDateString()}</div>
                    {asn.actualDate && (
                      <div className="text-xs text-gray-500">
                        Llegó: {new Date(asn.actualDate).toLocaleDateString()}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {asn.dockDoor || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleViewASN(asn)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {asn.status === 'arrived' && (
                        <button
                          onClick={() => handleStartReceiving(asn.id)}
                          className="text-green-600 hover:text-green-900"
                        >
                          <Package className="w-4 h-4" />
                        </button>
                      )}
                      {asn.status === 'receiving' && (
                        <button
                          onClick={() => handleCompleteReceiving(asn.id)}
                          className="text-purple-600 hover:text-purple-900"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ASN Details Modal */}
      {showASNModal && selectedASN && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Detalles de ASN - {selectedASN.asnNumber}
              </h3>
              <button
                onClick={() => setShowASNModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">Información de Envío</h4>
                <div className="space-y-2 text-sm">
                  <div><span className="font-medium">Orden de Compra:</span> {selectedASN.poNumber}</div>
                  <div><span className="font-medium">Proveedor:</span> {selectedASN.supplier}</div>
                  <div><span className="font-medium">Transportista:</span> {selectedASN.carrier}</div>
                  <div><span className="font-medium">Tracking:</span> {selectedASN.trackingNumber}</div>
                  <div><span className="font-medium">Puerta Asignada:</span> {selectedASN.dockDoor || 'No asignada'}</div>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">Fechas y Estado</h4>
                <div className="space-y-2 text-sm">
                  <div><span className="font-medium">Fecha de Envío:</span> {new Date(selectedASN.shipDate).toLocaleDateString()}</div>
                  <div><span className="font-medium">Fecha Esperada:</span> {new Date(selectedASN.expectedDate).toLocaleDateString()}</div>
                  {selectedASN.actualDate && (
                    <div><span className="font-medium">Fecha de Llegada:</span> {new Date(selectedASN.actualDate).toLocaleDateString()}</div>
                  )}
                  <div>
                    <span className="font-medium">Estado:</span>
                    <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedASN.status)}`}>
                      {React.createElement(getStatusIcon(selectedASN.status), { className: "w-3 h-3 mr-1" })}
                      {getStatusText(selectedASN.status)}
                    </span>
                  </div>
                </div>
                {selectedASN.notes && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Notas</h4>
                    <p className="text-sm text-gray-600">{selectedASN.notes}</p>
                  </div>
                )}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-4">Productos</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Descripción</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Enviado</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Recibido</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Lote</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Vencimiento</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {selectedASN.items.map((item) => (
                      <tr key={item.id}>
                        <td className="px-4 py-2 text-sm text-gray-900">{item.sku}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{item.description}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{item.quantityShipped}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{item.quantityReceived}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{item.lotNumber || '-'}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          {item.expiryDate ? new Date(item.expiryDate).toLocaleDateString() : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowASNModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cerrar
              </button>
              {selectedASN.status === 'arrived' && (
                <button
                  onClick={() => handleStartReceiving(selectedASN.id)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
                >
                  Iniciar Recepción
                </button>
              )}
              {selectedASN.status === 'receiving' && (
                <button
                  onClick={() => handleCompleteReceiving(selectedASN.id)}
                  className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700"
                >
                  Completar Recepción
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};