import { useState, useEffect } from 'react';
import { Edit, Eye, MoreVertical, Package, MapPin, Calendar, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatCurrency } from '../../utils/currency';

const AUTH_BACKEND_URL = import.meta.env.VITE_AUTH_BACKEND_URL || '';

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

// Tipos locales para filas devueltas por la consulta de supabase
type ProductRow = {
  id: string;
  sku: string;
  name: string;
  cost_price?: number | null;
  selling_price?: number | null;
  min_stock_level?: number | null;
  reorder_point?: number | null;
  is_active?: boolean | null;
  categories?: { name?: string | null } | null;
};

type LocationRow = {
  code: string;
  name?: string | null;
};

type InventoryRow = {
  id: string;
  quantity?: number | null;
  reserved_quantity?: number | null;
  last_counted_at?: string | null;
  products: ProductRow;
  locations: LocationRow;
};

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

      let transformedInventory: InventoryItem[] = [];

      // 1) Preferir backend con service-role: /inventory/list
      if (AUTH_BACKEND_URL) {
        try {
          const token = localStorage.getItem('app_token');
          const url = `${AUTH_BACKEND_URL}/inventory/list?q=${encodeURIComponent(searchTerm)}`;
          const resp = await fetch(url, {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
          });
          if (resp.ok) {
            const json = await resp.json();
            const rows = Array.isArray(json.inventory) ? json.inventory : [];
            transformedInventory = rows.map((r: any) => {
              const quantity = Number(r.quantity ?? 0);
              const reserved = Number(r.reserved_quantity ?? r.reservedQuantity ?? 0);
              const available = Number(
                r.available_quantity ?? r.availableQuantity ?? quantity - reserved
              );
              const unitCost = Number(r.unit_cost ?? r.products?.cost_price ?? 0);
              const totalValue = quantity * unitCost;
              return {
                id: String(r.id),
                productId: String(r.product_id ?? r.productId ?? ''),
                sku: String(r.sku ?? r.products?.sku ?? ''),
                name: String(r.name ?? r.products?.name ?? 'Producto'),
                category: r.category ?? r.products?.categories?.name ?? 'Sin categoría',
                quantity,
                reservedQuantity: reserved,
                availableQuantity: available,
                unitCost,
                totalValue,
                location: String(r.location_code ?? r.locations?.code ?? '—'),
                minStock: Number(r.min_stock_level ?? r.products?.min_stock_level ?? 0),
                maxStock: (r.min_stock_level ?? r.products?.min_stock_level)
                  ? Number(r.min_stock_level ?? r.products?.min_stock_level) * 5
                  : 100,
                reorderPoint: Number(r.reorder_point ?? r.products?.reorder_point ?? 0),
                lastMovement: r.last_movement_at ? new Date(r.last_movement_at) : new Date(),
                expiryDate: undefined,
                batchNumber: undefined,
                serialNumbers: []
              } as InventoryItem;
            });
          }
        } catch (e) {
          console.warn('Backend inventario no disponible, usando supabase:', e);
        }
      }

      // 2) Fallback: Supabase directo si backend no dio datos
      if (transformedInventory.length === 0) {
        const { data: inventoryData, error: inventoryError } = await supabase
          .from('inventory')
          .select(`
            id,
            quantity,
            reserved_quantity,
            available_quantity,
            last_movement_at,
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
            locations(
              code,
              name
            )
          `)
          .eq('products.is_active', true);

        if (!inventoryError) {
          const rows: InventoryRow[] = Array.isArray(inventoryData)
            ? (inventoryData as unknown as InventoryRow[])
            : [];
          transformedInventory = rows.map((item) => {
            const product = (item as any).products;
            const location = (item as any).locations;
            const quantity = Number((item as any).quantity ?? 0);
            const reservedQuantity = Number((item as any).reserved_quantity ?? 0);
            const availableQuantity = Number(
              (item as any).available_quantity ?? quantity - reservedQuantity
            );
            const unitCost = Number(product?.cost_price ?? 0);
            const totalValue = quantity * unitCost;
            return {
              id: (item as any).id,
              productId: product?.id,
              sku: product?.sku,
              name: product?.name,
              category: product?.categories?.name ?? 'Sin categoría',
              quantity,
              reservedQuantity,
              availableQuantity,
              unitCost,
              totalValue,
              location: location?.code ?? '—',
              minStock: Number(product?.min_stock_level ?? 0),
              maxStock: product?.min_stock_level ? Number(product?.min_stock_level) * 5 : 100,
              reorderPoint: Number(product?.reorder_point ?? product?.min_stock_level ?? 0),
              lastMovement: new Date((item as any).last_movement_at ?? new Date()),
              expiryDate: undefined,
              batchNumber: undefined,
              serialNumbers: []
            };
          });
        }
      }

      // 3) Último fallback: catálogo si sigue vacío (para desarrollo sin sesión)
      if (transformedInventory.length === 0 && AUTH_BACKEND_URL) {
        try {
          const token = localStorage.getItem('app_token');
          const resp = await fetch(`${AUTH_BACKEND_URL}/products/list?q=${encodeURIComponent(searchTerm)}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
          });
          if (resp.ok) {
            const json = await resp.json();
            const prods = Array.isArray(json.products) ? json.products : [];
            transformedInventory = prods.map((p: any) => ({
              id: String(p.id),
              productId: String(p.id),
              sku: String(p.sku || ''),
              name: String(p.name || 'Producto'),
              category: p.categories?.name ?? 'Sin categoría',
              quantity: 0,
              reservedQuantity: 0,
              availableQuantity: 0,
              unitCost: Number(p.cost_price ?? 0),
              totalValue: 0,
              location: '—',
              minStock: Number(p.min_stock_level ?? 0),
              maxStock: p.min_stock_level ? Number(p.min_stock_level) * 5 : 100,
              reorderPoint: Number(p.reorder_point ?? p.min_stock_level ?? 0),
              lastMovement: new Date(),
              expiryDate: undefined,
              batchNumber: undefined,
              serialNumbers: []
            }));
          }
        } catch (e) {
          console.warn('Fallback productos no disponible:', e);
        }
      }

      // Agregar: agrupar por SKU (o productId) para sumar cantidades
      const aggregateBySku = (items: InventoryItem[]): InventoryItem[] => {
        const map = new Map<string, InventoryItem>();
        for (const it of items) {
          const key = it.sku || it.productId || it.id;
          const existing = map.get(key);
          if (!existing) {
            // Usar clave estable como id para evitar duplicados en la tabla
            map.set(key, { ...it, id: key });
          } else {
            const lastMovement = new Date(
              Math.max(existing.lastMovement.getTime(), it.lastMovement.getTime())
            );
            map.set(key, {
              ...existing,
              quantity: existing.quantity + it.quantity,
              reservedQuantity: existing.reservedQuantity + it.reservedQuantity,
              availableQuantity: existing.availableQuantity + it.availableQuantity,
              totalValue: existing.totalValue + it.totalValue,
              // Si hay ubicaciones distintas, mostrar '—' para indicar múltiple/no específica
              location:
                existing.location === it.location ? existing.location : '—',
              // Mantener mínimos/puntos de pedido del producto (asumidos iguales por SKU)
              minStock: Math.max(existing.minStock, it.minStock),
              reorderPoint: Math.max(existing.reorderPoint, it.reorderPoint),
              lastMovement,
            });
          }
        }
        return Array.from(map.values());
      };

      const aggregatedInventory = aggregateBySku(transformedInventory);
      setInventory(aggregatedInventory);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  const filteredInventory = inventory.filter(item => {
    const matchesSearch = item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || item.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const sortedInventory = [...filteredInventory].sort((a, b) => {
    let aValue: string | number;
    let bValue: string | number;

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

    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortOrder === 'asc'
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
    }
    return 0;
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

  // La UI usa el select para ordenar; no se necesita manejador adicional

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
                      {formatCurrency(item.totalValue)}
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