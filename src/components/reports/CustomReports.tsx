import React, { useState } from 'react';
import { 
  Plus, 
  Save, 
  Play, 
  Download, 
  Edit3, 
  Trash2, 
  Copy, 
  Share2,
  Settings,
  Filter,
  BarChart3,
  PieChart,
  LineChart,
  Table,
  Calendar,
  Database,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronRight,
  X,
  Check,
  AlertCircle,
  Info
} from 'lucide-react';

export function CustomReports() {
  const [selectedReport, setSelectedReport] = useState(null);
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [reportName, setReportName] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [selectedDataSource, setSelectedDataSource] = useState('');
  const [selectedFields, setSelectedFields] = useState([]);
  const [selectedFilters, setSelectedFilters] = useState([]);
  const [selectedChartType, setSelectedChartType] = useState('table');
  const [groupBy, setGroupBy] = useState('');
  const [sortBy, setSortBy] = useState('');
  const [sortOrder, setSortOrder] = useState('asc');

  // Mock data sources
  const dataSources = [
    { id: 'inventory', name: 'Inventario', description: 'Datos de stock y productos' },
    { id: 'orders', name: 'Órdenes', description: 'Órdenes de venta y compra' },
    { id: 'shipments', name: 'Envíos', description: 'Datos de envíos y entregas' },
    { id: 'operations', name: 'Operaciones', description: 'Picking, packing, recepción' },
    { id: 'financial', name: 'Financiero', description: 'Costos, ingresos, rentabilidad' },
    { id: 'customers', name: 'Clientes', description: 'Información de clientes' }
  ];

  // Mock available fields based on data source
  const availableFields = {
    inventory: [
      { id: 'product_name', name: 'Nombre del Producto', type: 'text' },
      { id: 'sku', name: 'SKU', type: 'text' },
      { id: 'category', name: 'Categoría', type: 'text' },
      { id: 'stock_quantity', name: 'Cantidad en Stock', type: 'number' },
      { id: 'unit_cost', name: 'Costo Unitario', type: 'currency' },
      { id: 'total_value', name: 'Valor Total', type: 'currency' },
      { id: 'last_movement', name: 'Último Movimiento', type: 'date' },
      { id: 'location', name: 'Ubicación', type: 'text' }
    ],
    orders: [
      { id: 'order_id', name: 'ID Orden', type: 'text' },
      { id: 'customer_name', name: 'Cliente', type: 'text' },
      { id: 'order_date', name: 'Fecha Orden', type: 'date' },
      { id: 'status', name: 'Estado', type: 'text' },
      { id: 'total_amount', name: 'Monto Total', type: 'currency' },
      { id: 'items_count', name: 'Cantidad Items', type: 'number' },
      { id: 'shipping_method', name: 'Método Envío', type: 'text' }
    ]
  };

  // Mock chart types
  const chartTypes = [
    { id: 'table', name: 'Tabla', icon: Table },
    { id: 'bar', name: 'Gráfico de Barras', icon: BarChart3 },
    { id: 'pie', name: 'Gráfico Circular', icon: PieChart },
    { id: 'line', name: 'Gráfico de Líneas', icon: LineChart }
  ];

  // Mock saved reports
  const savedReports = [
    {
      id: 1,
      name: 'Inventario por Categoría',
      description: 'Stock actual agrupado por categoría de producto',
      dataSource: 'inventory',
      chartType: 'bar',
      createdAt: '2024-01-15',
      lastRun: '2024-01-20',
      isPublic: true,
      createdBy: 'Admin'
    },
    {
      id: 2,
      name: 'Órdenes Mensuales',
      description: 'Análisis de órdenes por mes y estado',
      dataSource: 'orders',
      chartType: 'line',
      createdAt: '2024-01-10',
      lastRun: '2024-01-19',
      isPublic: false,
      createdBy: 'Usuario'
    },
    {
      id: 3,
      name: 'Top Productos',
      description: 'Productos más vendidos del mes',
      dataSource: 'orders',
      chartType: 'pie',
      createdAt: '2024-01-08',
      lastRun: '2024-01-18',
      isPublic: true,
      createdBy: 'Manager'
    }
  ];

  const handleFieldToggle = (field) => {
    setSelectedFields(prev => 
      prev.find(f => f.id === field.id)
        ? prev.filter(f => f.id !== field.id)
        : [...prev, field]
    );
  };

  const handleAddFilter = () => {
    setSelectedFilters(prev => [...prev, {
      id: Date.now(),
      field: '',
      operator: 'equals',
      value: ''
    }]);
  };

  const handleRemoveFilter = (filterId) => {
    setSelectedFilters(prev => prev.filter(f => f.id !== filterId));
  };

  const handleFilterChange = (filterId, property, value) => {
    setSelectedFilters(prev => prev.map(f => 
      f.id === filterId ? { ...f, [property]: value } : f
    ));
  };

  const handleSaveReport = () => {
    // Mock save functionality
    console.log('Saving report:', {
      name: reportName,
      description: reportDescription,
      dataSource: selectedDataSource,
      fields: selectedFields,
      filters: selectedFilters,
      chartType: selectedChartType,
      groupBy,
      sortBy,
      sortOrder
    });
    setIsBuilderOpen(false);
    // Reset form
    setReportName('');
    setReportDescription('');
    setSelectedDataSource('');
    setSelectedFields([]);
    setSelectedFilters([]);
    setSelectedChartType('table');
    setGroupBy('');
    setSortBy('');
    setSortOrder('asc');
  };

  const handleRunReport = (report) => {
    console.log('Running report:', report);
    // Mock report execution
  };

  const handleDeleteReport = (reportId) => {
    console.log('Deleting report:', reportId);
    // Mock delete functionality
  };

  const handleDuplicateReport = (report) => {
    console.log('Duplicating report:', report);
    // Mock duplicate functionality
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Reportes Personalizados</h2>
          <p className="text-gray-600">Crea y gestiona tus propios reportes</p>
        </div>
        <button
          onClick={() => setIsBuilderOpen(true)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Reporte
        </button>
      </div>

      {/* Saved Reports */}
      <div className="bg-white rounded-lg shadow border">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Reportes Guardados</h3>
          <p className="text-gray-600">Gestiona tus reportes personalizados</p>
        </div>
        <div className="p-6">
          {savedReports.length === 0 ? (
            <div className="text-center py-12">
              <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No tienes reportes guardados</p>
              <p className="text-gray-400 text-sm">Crea tu primer reporte personalizado</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {savedReports.map((report) => {
                const ChartIcon = chartTypes.find(ct => ct.id === report.chartType)?.icon || Table;
                return (
                  <div key={report.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <ChartIcon className="w-5 h-5 text-blue-600" />
                        <h4 className="font-medium text-gray-900">{report.name}</h4>
                      </div>
                      <div className="flex items-center space-x-1">
                        {report.isPublic ? (
                          <Eye className="w-4 h-4 text-green-600" />
                        ) : (
                          <EyeOff className="w-4 h-4 text-gray-400" />
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{report.description}</p>
                    <div className="text-xs text-gray-500 mb-4">
                      <p>Creado: {report.createdAt}</p>
                      <p>Última ejecución: {report.lastRun}</p>
                      <p>Por: {report.createdBy}</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => handleRunReport(report)}
                        className="flex items-center px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                      >
                        <Play className="w-3 h-3 mr-1" />
                        Ejecutar
                      </button>
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => handleDuplicateReport(report)}
                          className="p-1 text-gray-400 hover:text-gray-600"
                          title="Duplicar"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button
                          className="p-1 text-gray-400 hover:text-gray-600"
                          title="Editar"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteReport(report.id)}
                          className="p-1 text-gray-400 hover:text-red-600"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Report Builder Modal */}
      {isBuilderOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Constructor de Reportes</h3>
                <button
                  onClick={() => setIsBuilderOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">Información Básica</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nombre del Reporte
                    </label>
                    <input
                      type="text"
                      value={reportName}
                      onChange={(e) => setReportName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Ej: Inventario por Categoría"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Fuente de Datos
                    </label>
                    <select
                      value={selectedDataSource}
                      onChange={(e) => setSelectedDataSource(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Seleccionar fuente...</option>
                      {dataSources.map(source => (
                        <option key={source.id} value={source.id}>{source.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descripción
                  </label>
                  <textarea
                    value={reportDescription}
                    onChange={(e) => setReportDescription(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Describe qué información mostrará este reporte..."
                  />
                </div>
              </div>

              {/* Fields Selection */}
              {selectedDataSource && (
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">Campos a Mostrar</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {availableFields[selectedDataSource]?.map(field => (
                      <label key={field.id} className="flex items-center space-x-2 p-2 border border-gray-200 rounded hover:bg-gray-50">
                        <input
                          type="checkbox"
                          checked={selectedFields.find(f => f.id === field.id) !== undefined}
                          onChange={() => handleFieldToggle(field)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">{field.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Filters */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-gray-900">Filtros</h4>
                  <button
                    onClick={handleAddFilter}
                    className="flex items-center px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Agregar Filtro
                  </button>
                </div>
                {selectedFilters.map(filter => (
                  <div key={filter.id} className="flex items-center space-x-2 p-3 border border-gray-200 rounded">
                    <select
                      value={filter.field}
                      onChange={(e) => handleFilterChange(filter.id, 'field', e.target.value)}
                      className="px-2 py-1 border border-gray-300 rounded text-sm"
                    >
                      <option value="">Campo...</option>
                      {availableFields[selectedDataSource]?.map(field => (
                        <option key={field.id} value={field.id}>{field.name}</option>
                      ))}
                    </select>
                    <select
                      value={filter.operator}
                      onChange={(e) => handleFilterChange(filter.id, 'operator', e.target.value)}
                      className="px-2 py-1 border border-gray-300 rounded text-sm"
                    >
                      <option value="equals">Igual a</option>
                      <option value="not_equals">Diferente de</option>
                      <option value="contains">Contiene</option>
                      <option value="greater_than">Mayor que</option>
                      <option value="less_than">Menor que</option>
                    </select>
                    <input
                      type="text"
                      value={filter.value}
                      onChange={(e) => handleFilterChange(filter.id, 'value', e.target.value)}
                      placeholder="Valor..."
                      className="px-2 py-1 border border-gray-300 rounded text-sm flex-1"
                    />
                    <button
                      onClick={() => handleRemoveFilter(filter.id)}
                      className="p-1 text-red-600 hover:text-red-800"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Visualization */}
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">Visualización</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {chartTypes.map(type => {
                    const Icon = type.icon;
                    return (
                      <button
                        key={type.id}
                        onClick={() => setSelectedChartType(type.id)}
                        className={`flex flex-col items-center p-3 border rounded-lg hover:bg-gray-50 ${
                          selectedChartType === type.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                        }`}
                      >
                        <Icon className={`w-6 h-6 mb-2 ${
                          selectedChartType === type.id ? 'text-blue-600' : 'text-gray-400'
                        }`} />
                        <span className="text-xs text-gray-700">{type.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Grouping and Sorting */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Agrupar por
                  </label>
                  <select
                    value={groupBy}
                    onChange={(e) => setGroupBy(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Sin agrupar</option>
                    {availableFields[selectedDataSource]?.map(field => (
                      <option key={field.id} value={field.id}>{field.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ordenar por
                  </label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Sin ordenar</option>
                    {availableFields[selectedDataSource]?.map(field => (
                      <option key={field.id} value={field.id}>{field.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Orden
                  </label>
                  <select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="asc">Ascendente</option>
                    <option value="desc">Descendente</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => setIsBuilderOpen(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveReport}
                disabled={!reportName || !selectedDataSource || selectedFields.length === 0}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-4 h-4 mr-2" />
                Guardar Reporte
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}