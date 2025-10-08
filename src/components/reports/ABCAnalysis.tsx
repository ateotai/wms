import React, { useState } from 'react';
import { 
  PieChart, 
  BarChart3, 
  Package, 
  DollarSign, 
  TrendingUp, 
  Filter,
  Download,
  RefreshCw,
  Search,
  Eye,
  ArrowRight,
  AlertTriangle,
  CheckCircle,
  Info
} from 'lucide-react';

export function ABCAnalysis() {
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('revenue');

  // Mock ABC Analysis data
  const abcSummary = {
    A: {
      percentage: 20,
      items: 156,
      revenue: 1250000,
      description: 'Productos de alta rotación y valor'
    },
    B: {
      percentage: 30,
      items: 234,
      revenue: 750000,
      description: 'Productos de rotación y valor medio'
    },
    C: {
      percentage: 50,
      items: 390,
      revenue: 250000,
      description: 'Productos de baja rotación y valor'
    }
  };

  const productCategories = [
    { id: 'all', name: 'Todas las Categorías' },
    { id: 'electronics', name: 'Electrónicos' },
    { id: 'clothing', name: 'Ropa' },
    { id: 'home', name: 'Hogar' },
    { id: 'sports', name: 'Deportes' }
  ];

  // Mock detailed product data
  const productData = [
    {
      id: 'PROD001',
      name: 'Smartphone Premium X1',
      category: 'electronics',
      classification: 'A',
      revenue: 125000,
      quantity: 45,
      unitValue: 2777.78,
      rotationRate: 12.5,
      stockDays: 15,
      margin: 25.5
    },
    {
      id: 'PROD002',
      name: 'Laptop Gaming Pro',
      category: 'electronics',
      classification: 'A',
      revenue: 98000,
      quantity: 28,
      unitValue: 3500,
      rotationRate: 8.2,
      stockDays: 22,
      margin: 18.3
    },
    {
      id: 'PROD003',
      name: 'Auriculares Bluetooth',
      category: 'electronics',
      classification: 'B',
      revenue: 45000,
      quantity: 180,
      unitValue: 250,
      rotationRate: 15.3,
      stockDays: 12,
      margin: 35.2
    },
    {
      id: 'PROD004',
      name: 'Camiseta Deportiva',
      category: 'clothing',
      classification: 'B',
      revenue: 32000,
      quantity: 320,
      unitValue: 100,
      rotationRate: 24.1,
      stockDays: 8,
      margin: 45.8
    },
    {
      id: 'PROD005',
      name: 'Lámpara de Mesa',
      category: 'home',
      classification: 'C',
      revenue: 8500,
      quantity: 85,
      unitValue: 100,
      rotationRate: 3.2,
      stockDays: 45,
      margin: 28.5
    },
    {
      id: 'PROD006',
      name: 'Pelota de Fútbol',
      category: 'sports',
      classification: 'C',
      revenue: 5200,
      quantity: 130,
      unitValue: 40,
      rotationRate: 6.8,
      stockDays: 35,
      margin: 42.1
    }
  ];

  const filteredProducts = productData.filter(product => {
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.id.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    switch (sortBy) {
      case 'revenue': return b.revenue - a.revenue;
      case 'quantity': return b.quantity - a.quantity;
      case 'rotation': return b.rotationRate - a.rotationRate;
      case 'margin': return b.margin - a.margin;
      default: return 0;
    }
  });

  const getClassificationColor = (classification: string) => {
    switch (classification) {
      case 'A': return 'bg-red-100 text-red-800';
      case 'B': return 'bg-yellow-100 text-yellow-800';
      case 'C': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getClassificationIcon = (classification: string) => {
    switch (classification) {
      case 'A': return AlertTriangle;
      case 'B': return Info;
      case 'C': return CheckCircle;
      default: return Package;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const recommendations = [
    {
      type: 'A',
      title: 'Productos Clase A - Alta Prioridad',
      items: [
        'Mantener niveles de stock óptimos para evitar roturas',
        'Implementar reposición automática',
        'Negociar mejores términos with proveedores',
        'Monitorear demanda diariamente'
      ],
      color: 'red'
    },
    {
      type: 'B',
      title: 'Productos Clase B - Prioridad Media',
      items: [
        'Revisar niveles de stock semanalmente',
        'Optimizar frecuencia de pedidos',
        'Evaluar oportunidades de mejora de margen',
        'Considerar promociones estratégicas'
      ],
      color: 'yellow'
    },
    {
      type: 'C',
      title: 'Productos Clase C - Baja Prioridad',
      items: [
        'Reducir niveles de inventario',
        'Evaluar descontinuación de productos lentos',
        'Implementar estrategias de liquidación',
        'Revisar mensualmente'
      ],
      color: 'green'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Análisis ABC</h2>
          <p className="text-gray-600">Clasificación de productos por valor e importancia</p>
        </div>
        <div className="flex space-x-3">
          <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </button>
          <button className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
            <RefreshCw className="w-4 h-4 mr-2" />
            Recalcular
          </button>
        </div>
      </div>

      {/* ABC Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {Object.entries(abcSummary).map(([classification, data]) => {
          const Icon = getClassificationIcon(classification);
          return (
            <div key={classification} className="bg-white p-6 rounded-lg shadow border">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center">
                    <span className={`px-3 py-1 text-sm font-medium rounded-full ${getClassificationColor(classification)}`}>
                      Clase {classification}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-2">{data.description}</p>
                </div>
                <Icon className="w-8 h-8 text-gray-400" />
              </div>
              
              <div className="mt-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Productos:</span>
                  <span className="font-medium">{data.items} ({data.percentage}%)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Ingresos:</span>
                  <span className="font-medium">{formatCurrency(data.revenue)}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
                  <div 
                    className={`h-2 rounded-full ${
                      classification === 'A' ? 'bg-red-500' : 
                      classification === 'B' ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${data.percentage * 2}%` }}
                  ></div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white p-4 rounded-lg shadow border">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar productos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {productCategories.map(category => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="revenue">Ingresos</option>
            <option value="quantity">Cantidad</option>
            <option value="rotation">Rotación</option>
            <option value="margin">Margen</option>
          </select>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-lg shadow border overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Detalle de Productos</h3>
          <p className="text-sm text-gray-600">Clasificación detallada por producto</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Producto
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Clasificación
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ingresos
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cantidad
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rotación
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Margen
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedProducts.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{product.name}</div>
                      <div className="text-sm text-gray-500">{product.id}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getClassificationColor(product.classification)}`}>
                      Clase {product.classification}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(product.revenue)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {product.quantity} unidades
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {product.rotationRate}x/año
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {product.margin}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button className="text-blue-600 hover:text-blue-900">
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recommendations */}
      <div className="bg-white rounded-lg shadow border">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Recomendaciones por Clasificación</h3>
          <p className="text-sm text-gray-600">Estrategias sugeridas para cada clase de producto</p>
        </div>
        <div className="p-6">
          <div className="space-y-6">
            {recommendations.map((rec, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center mb-3">
                  <div className={`w-3 h-3 rounded-full bg-${rec.color}-500 mr-3`}></div>
                  <h4 className="text-sm font-medium text-gray-900">{rec.title}</h4>
                </div>
                <ul className="space-y-2">
                  {rec.items.map((item, itemIndex) => (
                    <li key={itemIndex} className="flex items-start">
                      <ArrowRight className="w-4 h-4 text-gray-400 mr-2 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-600">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}