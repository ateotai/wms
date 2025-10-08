import React, { useState } from 'react';
import { Upload, Download, FileText, X, AlertCircle, CheckCircle } from 'lucide-react';

interface ProductImportProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (products: any[]) => void;
}

export function ProductImport({ isOpen, onClose, onImport }: ProductImportProps) {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: boolean;
    message: string;
    imported: number;
    errors: string[];
  } | null>(null);

  // Campos obligatorios y opcionales de la tabla productos
  const requiredFields = [
    { key: 'sku', label: 'SKU', description: 'Código único del producto (obligatorio)' },
    { key: 'name', label: 'Nombre', description: 'Nombre del producto (obligatorio)' }
  ];

  const optionalFields = [
    { key: 'description', label: 'Descripcion', description: 'Descripción detallada del producto' },
    { key: 'supplier_id', label: 'ID Proveedor', description: 'UUID del proveedor (opcional)' },
    { key: 'unit_of_measure', label: 'Unidad de Medida', description: 'PCS, KG, LT, M, M2, M3' },
    { key: 'cost_price', label: 'Precio Costo', description: 'Precio de costo (decimal)' },
    { key: 'selling_price', label: 'Precio Venta', description: 'Precio de venta (decimal)' },
    { key: 'min_stock_level', label: 'Stock Minimo', description: 'Nivel mínimo de inventario' },
    { key: 'max_stock_level', label: 'Stock Maximo', description: 'Nivel máximo de inventario' },
    { key: 'reorder_point', label: 'Punto de Reorden', description: 'Punto de reorden de inventario' },
    { key: 'barcode', label: 'Codigo de Barras', description: 'Código de barras del producto' },
    { key: 'weight', label: 'Peso', description: 'Peso del producto (decimal)' }
  ];

  const downloadTemplate = () => {
    // Crear CSV con headers y una fila de ejemplo
    const headers = [...requiredFields, ...optionalFields].map(field => field.label);
    const exampleRow = [
      'PROD-001', // SKU (obligatorio)
      'Producto Ejemplo', // Nombre (obligatorio)
      'Descripción del producto ejemplo', // Descripción
      '', // ID Proveedor (opcional)
      'PCS', // Unidad de Medida
      '100.00', // Precio Costo
      '150.00', // Precio Venta
      '10', // Stock Mínimo
      '1000', // Stock Máximo
      '20', // Punto de Reorden
      '1234567890123', // Código de Barras
      '0.500' // Peso
    ];

    const csvContent = [
      headers.join(','),
      exampleRow.join(','),
      '# INSTRUCCIONES:',
      '# - Los campos SKU y Nombre son OBLIGATORIOS',
      '# - SKU debe ser unico en el sistema',
      '# - Unidad de Medida: PCS, KG, LT, M, M2, M3',
      '# - Precios y peso deben ser numeros decimales',
      '# - Stock y puntos de reorden deben ser numeros enteros',
      '# - Elimine estas lineas de instrucciones antes de importar'
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'plantilla_productos.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (selectedFile: File) => {
    const validTypes = ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
    
    if (!validTypes.includes(selectedFile.type) && !selectedFile.name.endsWith('.csv')) {
      alert('Por favor selecciona un archivo CSV o Excel válido');
      return;
    }

    setFile(selectedFile);
    setImportResult(null);
  };

  const processImport = async () => {
    if (!file) return;

    setImporting(true);
    setImportResult(null);

    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim() && !line.startsWith('#'));
      
      if (lines.length < 2) {
        throw new Error('El archivo debe contener al menos una fila de datos además del encabezado');
      }

      const headers = lines[0].split(',').map(h => h.trim());
      const products = [];
      const errors = [];

      // Validar que existan los campos obligatorios
      const skuIndex = headers.findIndex(h => h.toLowerCase().includes('sku'));
      const nameIndex = headers.findIndex(h => h.toLowerCase().includes('nombre') || h.toLowerCase().includes('name'));

      if (skuIndex === -1) {
        throw new Error('El archivo debe contener una columna SKU');
      }
      if (nameIndex === -1) {
        throw new Error('El archivo debe contener una columna Nombre');
      }

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        
        if (values.length < headers.length) continue;

        const sku = values[skuIndex];
        const name = values[nameIndex];

        if (!sku || !name) {
          errors.push(`Fila ${i + 1}: SKU y Nombre son obligatorios`);
          continue;
        }

        const product: any = {
          sku,
          name,
          description: values[headers.findIndex(h => h.toLowerCase().includes('descripcion') || h.toLowerCase().includes('description'))] || '',
          unit_of_measure: values[headers.findIndex(h => h.toLowerCase().includes('unidad'))] || 'PCS',
          cost_price: parseFloat(values[headers.findIndex(h => h.toLowerCase().includes('costo'))] || '0') || 0,
          selling_price: parseFloat(values[headers.findIndex(h => h.toLowerCase().includes('venta'))] || '0') || 0,
          min_stock_level: parseInt(values[headers.findIndex(h => h.toLowerCase().includes('minimo'))] || '0') || 0,
          max_stock_level: parseInt(values[headers.findIndex(h => h.toLowerCase().includes('maximo'))] || '1000') || 1000,
          reorder_point: parseInt(values[headers.findIndex(h => h.toLowerCase().includes('reorden'))] || '10') || 10,
          barcode: values[headers.findIndex(h => h.toLowerCase().includes('codigo') || h.toLowerCase().includes('barras') || h.toLowerCase().includes('barcode'))] || '',
          weight: parseFloat(values[headers.findIndex(h => h.toLowerCase().includes('peso'))] || '0') || 0
        };

        products.push(product);
      }

      if (products.length === 0) {
        throw new Error('No se encontraron productos válidos para importar');
      }

      setImportResult({
        success: true,
        message: `Se importaron ${products.length} productos exitosamente`,
        imported: products.length,
        errors
      });

      onImport(products);

    } catch (error) {
      setImportResult({
        success: false,
        message: error instanceof Error ? error.message : 'Error al procesar el archivo',
        imported: 0,
        errors: []
      });
    } finally {
      setImporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <Upload className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">Importar Catálogo de Productos</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Template Download */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <FileText className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-medium text-blue-900">Descargar Plantilla</h3>
                <p className="text-sm text-blue-700 mt-1">
                  Descarga la plantilla CSV con los campos requeridos y un ejemplo de formato.
                </p>
                <button
                  onClick={downloadTemplate}
                  className="mt-3 inline-flex items-center px-3 py-2 border border-blue-300 rounded-md text-sm font-medium text-blue-700 bg-white hover:bg-blue-50"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Descargar Plantilla CSV
                </button>
              </div>
            </div>
          </div>

          {/* Field Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Campos Obligatorios</h4>
              <div className="space-y-2">
                {requiredFields.map((field) => (
                  <div key={field.key} className="text-sm">
                    <span className="font-medium text-red-600">{field.label}</span>
                    <p className="text-gray-600">{field.description}</p>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Campos Opcionales</h4>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {optionalFields.slice(0, 5).map((field) => (
                  <div key={field.key} className="text-sm">
                    <span className="font-medium text-gray-700">{field.label}</span>
                  </div>
                ))}
                <p className="text-xs text-gray-500">...y más campos opcionales</p>
              </div>
            </div>
          </div>

          {/* File Upload Area */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive
                ? 'border-blue-400 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-lg font-medium text-gray-900 mb-2">
              Arrastra tu archivo aquí o haz clic para seleccionar
            </p>
            <p className="text-sm text-gray-600 mb-4">
              Formatos soportados: CSV, Excel (.xlsx, .xls)
            </p>
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileInput}
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer"
            >
              Seleccionar Archivo
            </label>
          </div>

          {/* Selected File */}
          {file && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <FileText className="w-5 h-5 text-gray-600" />
                  <div>
                    <p className="font-medium text-gray-900">{file.name}</p>
                    <p className="text-sm text-gray-600">
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setFile(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* Import Result */}
          {importResult && (
            <div className={`border rounded-lg p-4 ${
              importResult.success 
                ? 'border-green-200 bg-green-50' 
                : 'border-red-200 bg-red-50'
            }`}>
              <div className="flex items-start space-x-3">
                {importResult.success ? (
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                )}
                <div className="flex-1">
                  <p className={`font-medium ${
                    importResult.success ? 'text-green-900' : 'text-red-900'
                  }`}>
                    {importResult.message}
                  </p>
                  {importResult.errors.length > 0 && (
                    <div className="mt-2">
                      <p className="text-sm font-medium text-red-900">Errores encontrados:</p>
                      <ul className="text-sm text-red-700 mt-1 space-y-1">
                        {importResult.errors.slice(0, 5).map((error, index) => (
                          <li key={index}>• {error}</li>
                        ))}
                        {importResult.errors.length > 5 && (
                          <li>• ...y {importResult.errors.length - 5} errores más</li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            onClick={processImport}
            disabled={!file || importing}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {importing ? 'Importando...' : 'Importar Productos'}
          </button>
        </div>
      </div>
    </div>
  );
}