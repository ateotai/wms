import { useState, useEffect } from 'react';
import { 
  FileText, 
  Download, 
  Printer, 
  Mail, 
  Eye, 
  Plus, 
  Filter,
  Clock,
  RefreshCw,
  Archive
} from 'lucide-react';

interface ShippingDocument {
  id: string;
  type: 'label' | 'invoice' | 'manifest' | 'customs' | 'receipt' | 'certificate';
  documentNumber: string;
  orderId: string;
  orderNumber: string;
  carrier: string;
  trackingNumber?: string;
  customer: {
    name: string;
    email: string;
  };
  status: 'draft' | 'generated' | 'printed' | 'sent' | 'archived';
  createdAt: string;
  generatedAt?: string;
  printedAt?: string;
  sentAt?: string;
  fileUrl?: string;
  fileSize?: number;
  pages?: number;
  notes?: string;
}

type FilterType = 'all' | ShippingDocument['type'];
type FilterStatus = 'all' | ShippingDocument['status'];
type NewDocForm = {
  type: ShippingDocument['type'];
  orderNumber: string;
  carrier: string;
  trackingNumber: string;
  customerName: string;
  customerEmail: string;
  notes: string;
};

export function ShippingDocuments() {
  const [selectedDocument, setSelectedDocument] = useState<ShippingDocument | null>(null);
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');

  // Mock data
  const defaultDocuments: ShippingDocument[] = [
    {
      id: '1',
      type: 'label',
      documentNumber: 'LBL-2024-001',
      orderId: '1',
      orderNumber: 'ORD-2024-001',
      carrier: 'DHL Express',
      trackingNumber: 'DHL123456789',
      customer: {
        name: 'María García',
        email: 'maria.garcia@email.com'
      },
      status: 'printed',
      createdAt: '2024-01-15T09:00:00Z',
      generatedAt: '2024-01-15T09:05:00Z',
      printedAt: '2024-01-15T09:10:00Z',
      fileUrl: '/documents/labels/LBL-2024-001.pdf',
      fileSize: 245760,
      pages: 1,
      notes: 'Etiqueta impresa correctamente'
    },
    {
      id: '2',
      type: 'invoice',
      documentNumber: 'INV-2024-001',
      orderId: '1',
      orderNumber: 'ORD-2024-001',
      carrier: 'DHL Express',
      customer: {
        name: 'María García',
        email: 'maria.garcia@email.com'
      },
      status: 'sent',
      createdAt: '2024-01-15T09:00:00Z',
      generatedAt: '2024-01-15T09:15:00Z',
      sentAt: '2024-01-15T09:20:00Z',
      fileUrl: '/documents/invoices/INV-2024-001.pdf',
      fileSize: 512000,
      pages: 2,
      notes: 'Factura enviada por email al cliente'
    },
    {
      id: '3',
      type: 'manifest',
      documentNumber: 'MAN-2024-001',
      orderId: '2',
      orderNumber: 'ORD-2024-002',
      carrier: 'FedEx',
      customer: {
        name: 'Carlos López',
        email: 'carlos.lopez@email.com'
      },
      status: 'generated',
      createdAt: '2024-01-15T10:00:00Z',
      generatedAt: '2024-01-15T10:05:00Z',
      fileUrl: '/documents/manifests/MAN-2024-001.pdf',
      fileSize: 180000,
      pages: 1
    },
    {
      id: '4',
      type: 'customs',
      documentNumber: 'CUS-2024-001',
      orderId: '3',
      orderNumber: 'ORD-2024-003',
      carrier: 'UPS',
      customer: {
        name: 'Ana Martínez',
        email: 'ana.martinez@email.com'
      },
      status: 'draft',
      createdAt: '2024-01-15T11:00:00Z',
      fileSize: 0,
      pages: 0,
      notes: 'Pendiente de completar información aduanera'
    },
    {
      id: '5',
      type: 'receipt',
      documentNumber: 'REC-2024-001',
      orderId: '1',
      orderNumber: 'ORD-2024-001',
      carrier: 'DHL Express',
      customer: {
        name: 'María García',
        email: 'maria.garcia@email.com'
      },
      status: 'archived',
      createdAt: '2024-01-15T09:00:00Z',
      generatedAt: '2024-01-15T09:25:00Z',
      fileUrl: '/documents/receipts/REC-2024-001.pdf',
      fileSize: 128000,
      pages: 1
    }
  ];

  const [documents, setDocuments] = useState<ShippingDocument[]>(() => {
    try {
      const saved = localStorage.getItem('shippingDocuments');
      return saved ? JSON.parse(saved) : defaultDocuments;
    } catch {
      return defaultDocuments;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('shippingDocuments', JSON.stringify(documents));
    } catch {
      // ignore storage errors
    }
  }, [documents]);

  const [showNewDocModal, setShowNewDocModal] = useState(false);
  const [newDocForm, setNewDocForm] = useState<NewDocForm>({
    type: 'label',
    orderNumber: '',
    carrier: '',
    trackingNumber: '',
    customerName: '',
    customerEmail: '',
    notes: ''
  });

  const openNewDocumentModal = () => {
    setNewDocForm({
      type: 'label',
      orderNumber: '',
      carrier: '',
      trackingNumber: '',
      customerName: '',
      customerEmail: '',
      notes: ''
    });
    setShowNewDocModal(true);
  };

  const typePrefixes: Record<ShippingDocument['type'], string> = {
    label: 'LBL',
    invoice: 'INV',
    manifest: 'MAN',
    customs: 'CUS',
    receipt: 'REC',
    certificate: 'CERT'
  };

  const handleSaveNewDocument = () => {
    const id = Date.now().toString();
    const createdAt = new Date().toISOString();
    const type = newDocForm.type;
    const countOfType = documents.filter(d => d.type === type).length + 1;
    const documentNumber = `${typePrefixes[type]}-${new Date().getFullYear()}-${String(countOfType).padStart(3, '0')}`;
    const newDoc: ShippingDocument = {
      id,
      type,
      documentNumber,
      orderId: id,
      orderNumber: newDocForm.orderNumber || `ORD-${new Date().getFullYear()}-${id.slice(-3)}`,
      carrier: newDocForm.carrier || 'Sin transportista',
      trackingNumber: newDocForm.trackingNumber || undefined,
      customer: {
        name: newDocForm.customerName || 'Cliente',
        email: newDocForm.customerEmail || 'cliente@email.com'
      },
      status: 'draft',
      createdAt,
      notes: newDocForm.notes || undefined
    };
    setDocuments(prev => [...prev, newDoc]);
    setShowNewDocModal(false);
  };

  const getTypeColor = (type: ShippingDocument['type']) => {
    switch (type) {
      case 'label': return 'text-blue-600 bg-blue-100';
      case 'invoice': return 'text-green-600 bg-green-100';
      case 'manifest': return 'text-purple-600 bg-purple-100';
      case 'customs': return 'text-orange-600 bg-orange-100';
      case 'receipt': return 'text-gray-600 bg-gray-100';
      case 'certificate': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getTypeText = (type: ShippingDocument['type']) => {
    switch (type) {
      case 'label': return 'Etiqueta';
      case 'invoice': return 'Factura';
      case 'manifest': return 'Manifiesto';
      case 'customs': return 'Aduanas';
      case 'receipt': return 'Recibo';
      case 'certificate': return 'Certificado';
      default: return type;
    }
  };

  const getStatusColor = (status: ShippingDocument['status']) => {
    switch (status) {
      case 'draft': return 'text-gray-600 bg-gray-100';
      case 'generated': return 'text-blue-600 bg-blue-100';
      case 'printed': return 'text-green-600 bg-green-100';
      case 'sent': return 'text-purple-600 bg-purple-100';
      case 'archived': return 'text-orange-600 bg-orange-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusText = (status: ShippingDocument['status']) => {
    switch (status) {
      case 'draft': return 'Borrador';
      case 'generated': return 'Generado';
      case 'printed': return 'Impreso';
      case 'sent': return 'Enviado';
      case 'archived': return 'Archivado';
      default: return status;
    }
  };

  const getStatusIcon = (status: ShippingDocument['status']) => {
    switch (status) {
      case 'draft': return <Clock className="w-4 h-4" />;
      case 'generated': return <FileText className="w-4 h-4" />;
      case 'printed': return <Printer className="w-4 h-4" />;
      case 'sent': return <Mail className="w-4 h-4" />;
      case 'archived': return <Archive className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleViewDocument = (document: ShippingDocument) => {
    setSelectedDocument(document);
    setShowDocumentModal(true);
  };

  const handleDownloadDocument = (documentId: string) => {
    console.log('Descargando documento:', documentId);
    // Aquí iría la lógica para descargar el documento
  };

  const handlePrintDocument = (documentId: string) => {
    console.log('Imprimiendo documento:', documentId);
    // Aquí iría la lógica para imprimir el documento
  };

  const handleSendDocument = (documentId: string) => {
    console.log('Enviando documento:', documentId);
    // Aquí iría la lógica para enviar el documento por email
  };

  const handleGenerateDocument = (documentId: string) => {
    console.log('Generando documento:', documentId);
    // Aquí iría la lógica para generar el documento
  };

  const handleBulkAction = (action: 'download' | 'print') => {
    console.log(`Acción en lote: ${action} para documentos:`, selectedDocuments);
    // Aquí iría la lógica para acciones en lote
  };

  const filteredDocuments = documents.filter(doc => {
    const typeMatch = filterType === 'all' || doc.type === filterType;
    const statusMatch = filterStatus === 'all' || doc.status === filterStatus;
    return typeMatch && statusMatch;
  });

  // Cargar imagen de documento desde configuración (localStorage)
  const [documentImageDataUrl, setDocumentImageDataUrl] = useState<string | null>(null);
  useEffect(() => {
    try {
      const dataUrl = localStorage.getItem('document_image_data_url');
      setDocumentImageDataUrl(dataUrl);
    } catch (e) {
      // ignorar
    }
  }, []);

  return (
    <div className="space-y-6">
      {/* Action Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-3">
            {documentImageDataUrl && (
              <img
                src={documentImageDataUrl}
                alt="Logo documento"
                className="h-8 w-auto rounded"
              />
            )}
            <h2 className="text-lg font-semibold text-gray-900">Documentos de Envío</h2>
          </div>
          <span className="px-2 py-1 text-xs font-medium text-blue-600 bg-blue-100 rounded-full">
            {documents.length} documentos
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <button onClick={openNewDocumentModal} className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Documento
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <span className="text-sm text-gray-700">Filtros:</span>
        </div>
        
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as FilterType)}
          className="text-sm border border-gray-300 rounded-md px-3 py-1"
        >
          <option value="all">Todos los tipos</option>
          <option value="label">Etiquetas</option>
          <option value="invoice">Facturas</option>
          <option value="manifest">Manifiestos</option>
          <option value="customs">Aduanas</option>
          <option value="receipt">Recibos</option>
          <option value="certificate">Certificados</option>
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
          className="text-sm border border-gray-300 rounded-md px-3 py-1"
        >
          <option value="all">Todos los estados</option>
          <option value="draft">Borrador</option>
          <option value="generated">Generado</option>
          <option value="printed">Impreso</option>
          <option value="sent">Enviado</option>
          <option value="archived">Archivado</option>
        </select>

        {selectedDocuments.length > 0 && (
          <div className="flex items-center space-x-2 ml-auto">
            <span className="text-sm text-gray-600">
              {selectedDocuments.length} seleccionados
            </span>
            <button
              onClick={() => handleBulkAction('download')}
              className="inline-flex items-center px-2 py-1 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
            >
              <Download className="w-3 h-3 mr-1" />
              Descargar
            </button>
            <button
              onClick={() => handleBulkAction('print')}
              className="inline-flex items-center px-2 py-1 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
            >
              <Printer className="w-3 h-3 mr-1" />
              Imprimir
            </button>
          </div>
        )}
      </div>

      {/* Documents Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300"
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedDocuments(filteredDocuments.map(d => d.id));
                      } else {
                        setSelectedDocuments([]);
                      }
                    }}
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Documento
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tipo
                </th>
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
                  Tamaño
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredDocuments.map((document) => (
                <tr key={document.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300"
                      checked={selectedDocuments.includes(document.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedDocuments([...selectedDocuments, document.id]);
                        } else {
                          setSelectedDocuments(selectedDocuments.filter(id => id !== document.id));
                        }
                      }}
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <FileText className="w-5 h-5 text-gray-400 mr-3" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {document.documentNumber}
                        </div>
                        {document.trackingNumber && (
                          <div className="text-sm text-gray-500 font-mono">
                            {document.trackingNumber}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTypeColor(document.type)}`}>
                      {getTypeText(document.type)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {document.orderNumber}
                      </div>
                      <div className="text-sm text-gray-500">
                        {document.carrier}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {document.customer.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {document.customer.email}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(document.status)}`}>
                        {getStatusIcon(document.status)}
                        <span className="ml-1">{getStatusText(document.status)}</span>
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {document.fileSize ? (
                      <div>
                        <div>{formatFileSize(document.fileSize)}</div>
                        {document.pages && (
                          <div className="text-xs text-gray-500">{document.pages} página{document.pages !== 1 ? 's' : ''}</div>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(document.createdAt).toLocaleDateString('es-ES')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => handleViewDocument(document)}
                        className="text-blue-600 hover:text-blue-900"
                        title="Ver detalles"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      
                      {document.status === 'draft' && (
                        <button
                          onClick={() => handleGenerateDocument(document.id)}
                          className="text-green-600 hover:text-green-900"
                          title="Generar documento"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>
                      )}
                      
                      {document.fileUrl && (
                        <>
                          <button
                            onClick={() => handleDownloadDocument(document.id)}
                            className="text-gray-600 hover:text-gray-900"
                            title="Descargar"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handlePrintDocument(document.id)}
                            className="text-purple-600 hover:text-purple-900"
                            title="Imprimir"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      
                      {document.status === 'generated' && (
                        <button
                          onClick={() => handleSendDocument(document.id)}
                          className="text-orange-600 hover:text-orange-900"
                          title="Enviar por email"
                        >
                          <Mail className="w-4 h-4" />
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

      {/* Document Details Modal */}
      {showDocumentModal && selectedDocument && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                {documentImageDataUrl && (
                  <img
                    src={documentImageDataUrl}
                    alt="Logo documento"
                    className="h-8 w-auto rounded"
                  />
                )}
                <h3 className="text-lg font-semibold text-gray-900">
                  Detalles del Documento - {selectedDocument.documentNumber}
                </h3>
              </div>
              <button
                onClick={() => setShowDocumentModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Document Information */}
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Información del Documento</h4>
                  <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Tipo:</span>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getTypeColor(selectedDocument.type)}`}>
                        {getTypeText(selectedDocument.type)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Estado:</span>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedDocument.status)}`}>
                        {getStatusText(selectedDocument.status)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Orden:</span>
                      <span className="text-sm text-gray-900">{selectedDocument.orderNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Transportista:</span>
                      <span className="text-sm text-gray-900">{selectedDocument.carrier}</span>
                    </div>
                    {selectedDocument.trackingNumber && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Tracking:</span>
                        <span className="text-sm text-gray-900 font-mono">{selectedDocument.trackingNumber}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Cliente</h4>
                  <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                    <div className="flex items-center">
                      <User className="w-4 h-4 text-gray-400 mr-2" />
                      <span className="text-sm text-gray-900">{selectedDocument.customer.name}</span>
                    </div>
                    <div className="flex items-center">
                      <Mail className="w-4 h-4 text-gray-400 mr-2" />
                      <span className="text-sm text-gray-900">{selectedDocument.customer.email}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* File Information */}
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Información del Archivo</h4>
                  <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                    {selectedDocument.fileSize ? (
                      <>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Tamaño:</span>
                          <span className="text-sm text-gray-900">{formatFileSize(selectedDocument.fileSize)}</span>
                        </div>
                        {selectedDocument.pages && (
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Páginas:</span>
                            <span className="text-sm text-gray-900">{selectedDocument.pages}</span>
                          </div>
                        )}
                        {selectedDocument.fileUrl && (
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Archivo:</span>
                            <span className="text-sm text-blue-600 hover:text-blue-800 cursor-pointer">
                              Descargar PDF
                            </span>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-sm text-gray-500 text-center py-4">
                        Documento no generado
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Historial</h4>
                  <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                    <div className="flex items-center text-sm">
                      <Clock className="w-4 h-4 text-gray-400 mr-2" />
                      <span className="text-gray-600">Creado:</span>
                      <span className="ml-auto text-gray-900">
                        {new Date(selectedDocument.createdAt).toLocaleString('es-ES')}
                      </span>
                    </div>
                    
                    {selectedDocument.generatedAt && (
                      <div className="flex items-center text-sm">
                        <FileText className="w-4 h-4 text-blue-500 mr-2" />
                        <span className="text-gray-600">Generado:</span>
                        <span className="ml-auto text-gray-900">
                          {new Date(selectedDocument.generatedAt).toLocaleString('es-ES')}
                        </span>
                      </div>
                    )}
                    
                    {selectedDocument.printedAt && (
                      <div className="flex items-center text-sm">
                        <Printer className="w-4 h-4 text-green-500 mr-2" />
                        <span className="text-gray-600">Impreso:</span>
                        <span className="ml-auto text-gray-900">
                          {new Date(selectedDocument.printedAt).toLocaleString('es-ES')}
                        </span>
                      </div>
                    )}
                    
                    {selectedDocument.sentAt && (
                      <div className="flex items-center text-sm">
                        <Mail className="w-4 h-4 text-purple-500 mr-2" />
                        <span className="text-gray-600">Enviado:</span>
                        <span className="ml-auto text-gray-900">
                          {new Date(selectedDocument.sentAt).toLocaleString('es-ES')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {selectedDocument.notes && (
              <div className="mt-6">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Notas</h4>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-sm text-yellow-800">{selectedDocument.notes}</p>
                </div>
              </div>
            )}

            <div className="mt-6 flex justify-between">
              <div className="flex space-x-3">
                {selectedDocument.status === 'draft' && (
                  <button
                    onClick={() => handleGenerateDocument(selectedDocument.id)}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Generar
                  </button>
                )}
                
                {selectedDocument.fileUrl && (
                  <>
                    <button
                      onClick={() => handleDownloadDocument(selectedDocument.id)}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Descargar
                    </button>
                    <button
                      onClick={() => handlePrintDocument(selectedDocument.id)}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                    >
                      <Printer className="w-4 h-4 mr-2" />
                      Imprimir
                    </button>
                  </>
                )}
                
                {selectedDocument.status === 'generated' && (
                  <button
                    onClick={() => handleSendDocument(selectedDocument.id)}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    Enviar por Email
                  </button>
                )}
              </div>
              
              <button
                onClick={() => setShowDocumentModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Document Modal */}
      {showNewDocModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-2xl shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Nuevo Documento</h3>
              <button
                onClick={() => setShowNewDocModal(false)}
                className="text-gray-400 hover:text-gray-600"
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Tipo</label>
                <select
                  value={newDocForm.type}
                  onChange={(e) => setNewDocForm({ ...newDocForm, type: e.target.value as ShippingDocument['type'] })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                >
                  <option value="label">Etiqueta</option>
                  <option value="invoice">Factura</option>
                  <option value="manifest">Manifiesto</option>
                  <option value="customs">Aduanas</option>
                  <option value="receipt">Recibo</option>
                  <option value="certificate">Certificado</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Orden</label>
                <input
                  type="text"
                  value={newDocForm.orderNumber}
                  onChange={(e) => setNewDocForm({ ...newDocForm, orderNumber: e.target.value })}
                  placeholder="ORD-2024-001"
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Transportista</label>
                <input
                  type="text"
                  value={newDocForm.carrier}
                  onChange={(e) => setNewDocForm({ ...newDocForm, carrier: e.target.value })}
                  placeholder="DHL Express"
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Tracking (opcional)</label>
                <input
                  type="text"
                  value={newDocForm.trackingNumber}
                  onChange={(e) => setNewDocForm({ ...newDocForm, trackingNumber: e.target.value })}
                  placeholder="ABC123456789"
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Cliente</label>
                <input
                  type="text"
                  value={newDocForm.customerName}
                  onChange={(e) => setNewDocForm({ ...newDocForm, customerName: e.target.value })}
                  placeholder="Nombre del cliente"
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email del cliente</label>
                <input
                  type="email"
                  value={newDocForm.customerEmail}
                  onChange={(e) => setNewDocForm({ ...newDocForm, customerEmail: e.target.value })}
                  placeholder="email@cliente.com"
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Notas</label>
                <textarea
                  value={newDocForm.notes}
                  onChange={(e) => setNewDocForm({ ...newDocForm, notes: e.target.value })}
                  placeholder="Notas del documento"
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  rows={3}
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setShowNewDocModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveNewDocument}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Guardar Documento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}