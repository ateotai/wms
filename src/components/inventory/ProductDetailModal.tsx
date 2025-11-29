import React from 'react';
import { X, Package, Tag, Layers, Scale, Move, AlertTriangle, CheckCircle, BarChart2, Printer } from 'lucide-react';
import { formatCurrency } from '../../utils/currency';
import { ProductLabelModal } from './ProductLabelModal';

interface ProductDetailModalProps {
  product: any;
  onClose: () => void;
  locationCode?: string | null;
}

export function ProductDetailModal({ product, onClose, locationCode }: ProductDetailModalProps) {
  if (!product) return null;

  const [showLabel, setShowLabel] = React.useState<boolean>(false);

  const DetailItem = ({ icon, label, value, className = '' }: { icon: React.ReactNode, label: string, value: React.ReactNode, className?: string }) => (
    <div className={`flex items-start space-x-3 ${className}`}>
      <div className="text-gray-400 mt-1">{icon}</div>
      <div>
        <p className="text-sm font-medium text-gray-500">{label}</p>
        <p className="text-base text-gray-900">{value}</p>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
              <Package className="w-8 h-8 text-gray-500" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{product.name}</h2>
              <p className="text-base text-gray-500">{product.sku}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowLabel(true)}
              className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-sm bg-white hover:bg-gray-50"
              title="Imprimir etiqueta"
            >
              <Printer className="w-4 h-4 mr-1" />
              Imprimir
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600" title="Cerrar">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 140px)' }}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Columna Principal */}
            <div className="md:col-span-2 space-y-6">
              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Información General</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <DetailItem icon={<Layers className="w-5 h-5" />} label="Categoría" value={product.category || 'N/A'} />
                  <DetailItem icon={<Tag className="w-5 h-5" />} label="Unidad de Medida" value={product.unit_of_measure || 'N/A'} />
                  <DetailItem icon={<Move className="w-5 h-5" />} label="Dimensiones (L×W×H)" value={product.dimensions ? `${product.dimensions.length || 0}×${product.dimensions.width || 0}×${product.dimensions.height || 0} cm` : 'N/A'} />
                  <DetailItem icon={<Scale className="w-5 h-5" />} label="Peso" value={product.weight ? `${product.weight} kg` : 'N/A'} />
                </div>
                {product.description && (
                  <div className="mt-4">
                    <p className="text-sm font-medium text-gray-500">Descripción</p>
                    <p className="text-base text-gray-800 mt-1">{product.description}</p>
                  </div>
                )}
              </div>

              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Precios y Costos</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <DetailItem icon={<BarChart2 className="w-5 h-5" />} label="Costo" value={formatCurrency(product.cost_price || 0)} />
                  <DetailItem icon={<BarChart2 className="w-5 h-5" />} label="Precio de Venta" value={formatCurrency(product.selling_price || 0)} />
                </div>
              </div>
            </div>

            {/* Columna Lateral */}
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Control de Stock</h3>
                <div className="space-y-4">
                  <DetailItem icon={<CheckCircle className="w-5 h-5" />} label="Nivel Mínimo" value={product.min_stock_level || 0} />
                  <DetailItem icon={<AlertTriangle className="w-5 h-5" />} label="Punto de Reorden" value={product.reorder_point || 0} />
                  <DetailItem icon={<CheckCircle className="w-5 h-5" />} label="Nivel Máximo" value={product.max_stock_level || 'Ilimitado'} />
                </div>
              </div>
              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Identificadores</h3>
                <div className="space-y-4">
                  <DetailItem icon={<Package className="w-5 h-5" />} label="ID de Producto" value={<span className="text-xs font-mono">{product.id}</span>} />
                  {product.barcode && <DetailItem icon={<BarChart2 className="w-5 h-5" />} label="Código de Barras" value={product.barcode} />}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {showLabel && (
        <ProductLabelModal
          isOpen={showLabel}
          onClose={() => setShowLabel(false)}
          autoPrint={false}
          product={{
            id: String(product.id),
            sku: String(product.sku || ''),
            name: String(product.name || 'Producto'),
            barcode: (product as any)?.barcode || null,
            category: product.category || null,
            location: locationCode || null,
          }}
        />
      )}
    </div>
  );
}