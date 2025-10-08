import React, { useState, useEffect } from 'react';
import { Edit, Eye, MoreVertical, Package, MapPin, Calendar, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface InventoryListProps {
  searchTerm: string;
  filterCategory: string;
}

interface InventoryItem {
  id: string;
  productId: string;
  sku: string;
  name: string;
  category: string;
  quantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  unitCost: number;
  totalValue: number;
  location: string;
  minStock: number;
  maxStock: number;
  reorderPoint: number;
  lastMovement: Date;
  expiryDate?: Date;
  batchNumber?: string;
  serialNumbers: string[];
}

export function InventoryList({ searchTerm, filterCategory }: InventoryListProps) {
  const [sortBy, setSortBy] = useState<'sku' | 'name' | 'quantity' | 'value'>('sku');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInventoryData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Obtener inventario con información de productos y ubicaciones
      const { data: inventoryData, error: inventoryError } = await supabase
        .from('inventory')
        .select(`
          id,
          quantity,
          reserved_quantity,
          last_counted_at,
          products!inner(
            id,
            sku,
            name,
            cost_price,
            selling_price,
            min_stock_level,
            reorder_point,
            is_active,
            categories(name)
          ),
          locations!inner(
            code,
            name
          )
        `)
        .eq('products.is_active', true);

      if (inventoryError) throw inventoryError;

      // Transformar datos al formato esperado
      const transformedInventory: InventoryItem[] = inventoryData?.map(item => {
        const product = item.products;
        const location = item.locations;
        const quantity = item.quantity || 0;
        const reservedQuantity = item.reserved_quantity || 0;
        const availableQuantity = quantity - reservedQuantity;
        const unitCost = product.cost_price || 0;
        const totalValue = quantity * unitCost;

        return {
          id: item.id,
          productId: product.id,
          sku: product.sku,
          name: product.name,
          category: product.categories?.name || 'Sin categoría',
          quantity,
          reservedQuantity,
          availableQuantity,
          unitCost,
          totalValue,
          location: location.code,
          minStock: product.min_stock_level || 0,
          maxStock: product.min_stock_level ? product.min_stock_level * 5 : 100, // Estimación
          reorderPoint: product.reorder_point || product.min_stock_level || 0,
          lastMovement: new Date(item.last_counted_at || new Date()),
          expiryDate: undefined,
          batchNumber: undefined,
          serialNumbers: []
        };
      }) || [];

      setInventory(transformedInventory);

    } catch (err) {
      console.error('Error fetching inventory data:', err);
      setError('Error al cargar los datos de inventario');
      
      // Usar datos de ejemplo en caso de error
      const mockInventory: InventoryItem[] = [
        {
          id: '1',
          productId: 'prod-1',
          sku: 'SKU-001',
          name: 'Smartphone Samsung Galaxy',
          category: 'electronics',
          quantity: 150,
          reservedQuantity: 25,
          availableQuantity: 125,
          unitCost: 299.99,
          totalValue: 44998.50,
          location: 'A-01-01',
          minStock: 50,
          maxStock: 300,
          reorderPoint: 75,
          lastMovement: new Date('2024-01-15'),
          expiryDate: undefined,
          batchNumber: 'BATCH-2024-001',
          serialNumbers: []
        },
        {
          id: '2',
          productId: 'prod-2',
          sku: 'SKU-002',
          name: 'Camiseta Algodón Básica',
          category: 'clothing',
          quantity: 45,
          reservedQuantity: 10,
          availableQuantity: 35,
          unitCost: 12.99,
          totalValue: 584.55,
          location: 'B-02-15',
          minStock: 100,
          maxStock: 500,
          reorderPoint: 150,
          lastMovement: new Date('2024-01-14'),
          expiryDate: undefined,
          batchNumber: 'BATCH-2024-002',
          serialNumbers: []
        },
        {
          id: '3',
          productId: 'prod-3',
          sku: 'SKU-003',
          name: 'Yogur Natural Ecológico',
          category: 'food',
          quantity: 89,
          reservedQuantity: 15,
          availableQuantity: 74,
          unitCost: 2.45,
          totalValue: 218.05,
          location: 'C-01-08',
          minStock: 200,
          maxStock: 800,
          reorderPoint: 300,
          lastMovement: new Date('2024-01-16'),
          expiryDate: new Date('2024-02-15'),
          batchNumber: 'BATCH-2024-003',
          serialNumbers: []
        }
      ];
      setInventory(mockInventory);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventoryData();
  }, []);

  const filteredInventory = inventory.filter(item => {
    const matchesSearch = item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || item.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const sortedInventory = [...filteredInventory].sort((a, b) => {
    let aValue: any, bValue: any;
    
    switch (sortBy) {
      case 'sku':
        aValue = a.sku;
        bValue = b.sku;
        break;
      case 'name':
        aValue = a.name;
        bValue = b.name;
        break;
      case 'quantity':
        aValue = a.quantity;
        bValue = b.quantity;
        break;
      case 'value':
        aValue = a.totalValue;
        bValue = b.totalValue;
        break;
      default:
        return 0;
    }

    if (typeof aValue === 'string') {
      return sortOrder === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
    } else {
      return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
    }
  });

  const getStockStatus = (item: InventoryItem) => {
    if (item.quantity <= item.reorderPoint) {
      return { status: 'critical', color: 'text-red-600 bg-red-50', label: 'Crítico' };
    } else if (item.quantity <= item.minStock) {
      return { status: 'low', color: 'text-orange-600 bg-orange-50', label: 'Bajo' };
    } else {
      return { status: 'normal', color: 'text-green-600 bg-green-50', label: 'Normal' };
    }
  };

  const handleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Cargando inventario...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
          <p className="text-red-800">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Table Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          Productos ({sortedInventory.length})
        </h3>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500">Ordenar por:</span>
          <select
            value={`${sortBy}-${sortOrder}`}
            onChange={(e) => {
              const [field, order] = e.target.value.split('-');
              setSortBy(field as typeof sortBy);
              setSortOrder(order as 'asc' | 'desc');
            }}
            className="text-sm border border-gray-300 rounded-md px-2 py-1"
          >
            <option value="sku-asc">SKU (A-Z)</option>
            <option value="sku-desc">SKU (Z-A)</option>
            <option value="name-asc">Nombre (A-Z)</option>
            <option value="name-desc">Nombre (Z-A)</option>
            <option value="quantity-desc">Cantidad (Mayor)</option>
            <option value="quantity-asc">Cantidad (Menor)</option>
            <option value="value-desc">Valor (Mayor)</option>
            <option value="value-asc">Valor (Menor)</option>
          </select>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Producto
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ubicación
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stock
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Valor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Último Mov.
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedInventory.map((item) => {
                const stockStatus = getStockStatus(item);
                return (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center">
                            <Package className="h-5 w-5 text-gray-400" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{item.name}</div>
                          <div className="text-sm text-gray-500">{item.sku}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-900">
                        <MapPin className="h-4 w-4 text-gray-400 mr-1" />
                        {item.location}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        <div className="font-medium">{item.quantity} uds</div>
                        <div className="text-gray-500">
                          Disponible: {item.availableQuantity}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${stockStatus.color}`}>
                        {stockStatus.status === 'critical' && <AlertCircle className="w-3 h-3 mr-1" />}
                        {stockStatus.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      €{item.totalValue.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-500">
                        <Calendar className="h-4 w-4 mr-1" />
                        {item.lastMovement.toLocaleDateString('es-ES')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button className="text-blue-600 hover:text-blue-900">
                          <Eye className="h-4 w-4" />
                        </button>
                        <button className="text-gray-600 hover:text-gray-900">
                          <Edit className="h-4 w-4" />
                        </button>
                        <button className="text-gray-600 hover:text-gray-900">
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {sortedInventory.length === 0 && (
        <div className="text-center py-12">
          <Package className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No se encontraron productos</h3>
          <p className="mt-1 text-sm text-gray-500">
            Intenta ajustar los filtros de búsqueda.
          </p>
        </div>
      )}
    </div>
  );
}