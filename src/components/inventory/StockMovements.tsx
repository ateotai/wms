import React, { useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, ArrowDownLeft, RotateCcw, Calendar, User, MapPin, Package, Filter, Plus, X } from 'lucide-react';
import { StockMovement, MovementType } from '../../types/wms';

const AUTH_BACKEND_URL = import.meta.env.VITE_AUTH_BACKEND_URL || '';

export function StockMovements() {
  const [filterType, setFilterType] = useState<MovementType | 'all'>('all');
  const [dateRange, setDateRange] = useState('7days');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createMode, setCreateMode] = useState<'single' | 'multiple' | 'csv'>('single');
  const [createForm, setCreateForm] = useState({
    productId: '',
    warehouseId: '',
    locationId: '',
    movementType: 'IN' as MovementType,
    transactionType: 'RECEIPT',
    quantity: 0,
    unitCost: '',
    lotNumber: '',
    expiryDate: '',
    reason: '',
    notes: ''
  });
  const [multiRows, setMultiRows] = useState<Array<{ productId: string; quantity: number; lotNumber?: string }>>([
    { productId: '', quantity: 0 }
  ]);
  const [csvRows, setCsvRows] = useState<any[]>([]);
  const [csvError, setCsvError] = useState<string | null>(null);

  const fetchMovements = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('app_token');
      if (!AUTH_BACKEND_URL) throw new Error('Backend no configurado');
      const resp = await fetch(`${AUTH_BACKEND_URL}/inventory/movements?type=${filterType}&period=${dateRange}` , {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (!resp.ok) {
        const text = await resp.text().catch(() => '');
        throw new Error(text || 'Error al cargar movimientos');
      }
      const json = await resp.json();
      const list: StockMovement[] = (json.movements || []).map((m: any) => {
        const type: MovementType = m.movement_type;
        const qtySign = type === 'OUT' ? -1 : 1;
        const qty = (Number(m.quantity || 0) || 0) * qtySign;
        const unitCost = m.unit_cost !== undefined && m.unit_cost !== null ? Number(m.unit_cost) : undefined;
        const totalValue = unitCost ? qty * unitCost : 0;
        return {
          id: String(m.id),
          productId: String(m.product_id),
          sku: m.products?.sku || '',
          productName: m.products?.name || 'Producto',
          type,
          quantity: qty,
          fromLocation: undefined,
          toLocation: m.locations?.code || undefined,
          reason: m.reason || '',
          reference: m.reference_number || '',
          userId: m.performed_by || 'system',
          userName: 'Sistema',
          timestamp: new Date(m.created_at),
          unitCost,
          totalValue,
          batchNumber: m.lot_number || ''
        } as StockMovement;
      });
      setMovements(list);
    } catch (err: any) {
      console.error('Error fetching movements:', err);
      setError('Error al cargar movimientos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMovements();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterType, dateRange]);

  const filteredMovements = useMemo(() => movements.filter(movement => {
    if (filterType !== 'all' && movement.type !== filterType) {
      return false;
    }

    const now = new Date();
    const movementDate = new Date(movement.timestamp);
    
    switch (dateRange) {
      case '1day':
        return (now.getTime() - movementDate.getTime()) <= 24 * 60 * 60 * 1000;
      case '7days':
        return (now.getTime() - movementDate.getTime()) <= 7 * 24 * 60 * 60 * 1000;
      case '30days':
        return (now.getTime() - movementDate.getTime()) <= 30 * 24 * 60 * 60 * 1000;
      default:
        return true;
    }
  }), [movements, filterType, dateRange]);

  const getMovementIcon = (type: MovementType) => {
    switch (type) {
      case 'IN':
        return <ArrowDownLeft className="w-4 h-4 text-green-600" />;
      case 'OUT':
        return <ArrowUpRight className="w-4 h-4 text-red-600" />;
      case 'TRANSFER':
        return <RotateCcw className="w-4 h-4 text-blue-600" />;
      case 'ADJUSTMENT':
        return <Package className="w-4 h-4 text-orange-600" />;
      default:
        return <Package className="w-4 h-4 text-gray-600" />;
    }
  };

  const getMovementTypeLabel = (type: MovementType) => {
    switch (type) {
      case 'IN':
        return 'Entrada';
      case 'OUT':
        return 'Salida';
      case 'TRANSFER':
        return 'Transferencia';
      case 'ADJUSTMENT':
        return 'Ajuste';
      default:
        return type;
    }
  };

  const getMovementColor = (type: MovementType) => {
    switch (type) {
      case 'IN':
        return 'text-green-600 bg-green-50';
      case 'OUT':
        return 'text-red-600 bg-red-50';
      case 'TRANSFER':
        return 'text-blue-600 bg-blue-50';
      case 'ADJUSTMENT':
        return 'text-orange-600 bg-orange-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-700">Tipo:</span>
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as MovementType | 'all')}
            className="border border-gray-300 rounded-md px-3 py-1 text-sm"
          >
            <option value="all">Todos</option>
            <option value="IN">Entradas</option>
            <option value="OUT">Salidas</option>
            <option value="TRANSFER">Transferencias</option>
            <option value="ADJUSTMENT">Ajustes</option>
          </select>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-700">Período:</span>
          </div>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-1 text-sm"
          >
            <option value="1day">Último día</option>
            <option value="7days">Últimos 7 días</option>
            <option value="30days">Últimos 30 días</option>
            <option value="all">Todo el período</option>
          </select>
        </div>

        <div className="flex items-center">
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Movimiento
          </button>
        </div>
      </div>

      {/* Movements List */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Movimientos de Stock ({filteredMovements.length})
          </h3>
        </div>

        <div className="divide-y divide-gray-200">
          {loading && (
            <div className="p-6 text-sm text-gray-500">Cargando movimientos...</div>
          )}
          {error && !loading && (
            <div className="p-6 text-sm text-red-600">{error}</div>
          )}
          {!loading && !error && filteredMovements.map((movement) => (
            <div key={movement.id} className="p-6 hover:bg-gray-50">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                      {getMovementIcon(movement.type)}
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getMovementColor(movement.type)}`}>
                        {getMovementTypeLabel(movement.type)}
                      </span>
                      <span className="text-sm text-gray-500">#{movement.reference}</span>
                    </div>
                    
                    <h4 className="text-sm font-medium text-gray-900 mb-1">
                      {movement.productName} ({movement.sku})
                    </h4>
                    
                    <p className="text-sm text-gray-600 mb-2">{movement.reason}</p>
                    
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <div className="flex items-center">
                        <User className="w-3 h-3 mr-1" />
                        {movement.userName}
                      </div>
                      <div className="flex items-center">
                        <Calendar className="w-3 h-3 mr-1" />
                        {movement.timestamp.toLocaleString('es-ES')}
                      </div>
                      {movement.fromLocation && (
                        <div className="flex items-center">
                          <MapPin className="w-3 h-3 mr-1" />
                          De: {movement.fromLocation}
                        </div>
                      )}
                      {movement.toLocation && (
                        <div className="flex items-center">
                          <MapPin className="w-3 h-3 mr-1" />
                          A: {movement.toLocation}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className={`text-lg font-semibold ${
                    movement.quantity > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {movement.quantity > 0 ? '+' : ''}{movement.quantity}
                  </div>
                  {movement.totalValue !== 0 && (
                    <div className="text-sm text-gray-500">
                      €{Math.abs(movement.totalValue).toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                    </div>
                  )}
                  {movement.batchNumber && (
                    <div className="text-xs text-gray-400 mt-1">
                      Lote: {movement.batchNumber}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {!loading && !error && filteredMovements.length === 0 && (
          <div className="text-center py-12">
            <Package className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No hay movimientos</h3>
            <p className="mt-1 text-sm text-gray-500">
              No se encontraron movimientos para los filtros seleccionados.
            </p>
          </div>
        )}
      </div>

      {/* Create Movement Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen p-4">
            <div className="fixed inset-0 bg-black bg-opacity-30" onClick={() => setShowCreateModal(false)} />
            <div className="relative bg-white rounded-lg shadow-lg w-full max-w-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Nuevo Movimiento Manual</h3>
                <button onClick={() => setShowCreateModal(false)} className="text-gray-500 hover:text-gray-700">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Selector de modo */}
              <div className="mb-4">
                <div className="inline-flex rounded-md shadow-sm" role="group">
                  <button
                    type="button"
                    onClick={() => setCreateMode('single')}
                    className={`px-4 py-2 border border-gray-300 text-sm rounded-l-md ${createMode === 'single' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                  >
                    Único
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreateMode('multiple')}
                    className={`px-4 py-2 border-t border-b border-gray-300 text-sm ${createMode === 'multiple' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                  >
                    Múltiple
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreateMode('csv')}
                    className={`px-4 py-2 border border-gray-300 text-sm rounded-r-md ${createMode === 'csv' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                  >
                    CSV
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Producto (ID)</label>
                  <input
                    value={createForm.productId}
                    onChange={(e) => setCreateForm({ ...createForm, productId: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    placeholder="UUID del producto"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Almacén (ID)</label>
                  <input
                    value={createForm.warehouseId}
                    onChange={(e) => setCreateForm({ ...createForm, warehouseId: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    placeholder="UUID del almacén"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ubicación (ID)</label>
                  <input
                    value={createForm.locationId}
                    onChange={(e) => setCreateForm({ ...createForm, locationId: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    placeholder="UUID de la ubicación (opcional)"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad</label>
                  <input
                    type="number"
                    value={createForm.quantity}
                    onChange={(e) => setCreateForm({ ...createForm, quantity: Number(e.target.value || 0) })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    placeholder="> 0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                  <select
                    value={createForm.movementType}
                    onChange={(e) => {
                      const mt = e.target.value as MovementType;
                      setCreateForm({ ...createForm, movementType: mt, transactionType: mt === 'OUT' ? 'SHIPMENT' : 'RECEIPT' });
                    }}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  >
                    <option value="IN">Entrada</option>
                    <option value="OUT">Salida</option>
                    <option value="ADJUSTMENT">Ajuste</option>
                    <option value="TRANSFER">Transferencia</option>
                    <option value="COUNT">Conteo cíclico</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subclasificación</label>
                  <select
                    value={createForm.transactionType}
                    onChange={(e) => setCreateForm({ ...createForm, transactionType: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  >
                    {createForm.movementType === 'OUT' ? (
                      <>
                        <option value="SHIPMENT">Salida por venta</option>
                        <option value="TRANSFER_OUT">Transferencia salida</option>
                        <option value="ADJUSTMENT_OUT">Ajuste salida</option>
                      </>
                    ) : createForm.movementType === 'IN' ? (
                      <>
                        <option value="RECEIPT">Recepción manual</option>
                        <option value="TRANSFER_IN">Transferencia entrada</option>
                        <option value="ADJUSTMENT_IN">Ajuste entrada</option>
                        <option value="CYCLE_COUNT">Conteo cíclico</option>
                      </>
                    ) : createForm.movementType === 'ADJUSTMENT' ? (
                      <>
                        <option value="ADJUSTMENT_IN">Ajuste entrada</option>
                        <option value="ADJUSTMENT_OUT">Ajuste salida</option>
                      </>
                    ) : createForm.movementType === 'TRANSFER' ? (
                      <>
                        <option value="TRANSFER_IN">Transferencia entrada</option>
                        <option value="TRANSFER_OUT">Transferencia salida</option>
                      </>
                    ) : (
                      <>
                        <option value="CYCLE_COUNT">Conteo cíclico</option>
                      </>
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Costo unitario</label>
                  <input
                    type="number"
                    value={createForm.unitCost}
                    onChange={(e) => setCreateForm({ ...createForm, unitCost: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    placeholder="Opcional"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Lote</label>
                  <input
                    value={createForm.lotNumber}
                    onChange={(e) => setCreateForm({ ...createForm, lotNumber: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    placeholder="Opcional"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Caducidad</label>
                  <input
                    type="date"
                    value={createForm.expiryDate}
                    onChange={(e) => setCreateForm({ ...createForm, expiryDate: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Motivo</label>
                  <input
                    value={createForm.reason}
                    onChange={(e) => setCreateForm({ ...createForm, reason: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    placeholder="Descripción breve"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
                  <textarea
                    value={createForm.notes}
                    onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    rows={3}
                  />
                </div>
              </div>

              {/* Modo Múltiple: captura por renglones */}
              {createMode === 'multiple' && (
                <div className="mt-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Almacén (ID)</label>
                      <input
                        value={createForm.warehouseId}
                        onChange={(e) => setCreateForm({ ...createForm, warehouseId: e.target.value })}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                        placeholder="UUID del almacén"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Ubicación (ID)</label>
                      <input
                        value={createForm.locationId}
                        onChange={(e) => setCreateForm({ ...createForm, locationId: e.target.value })}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                        placeholder="UUID de la ubicación (opcional)"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                      <select
                        value={createForm.movementType}
                        onChange={(e) => {
                          const mt = e.target.value as MovementType;
                          setCreateForm({ ...createForm, movementType: mt, transactionType: mt === 'OUT' ? 'SHIPMENT' : 'RECEIPT' });
                        }}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                      >
                        <option value="IN">Entrada</option>
                        <option value="OUT">Salida</option>
                        <option value="ADJUSTMENT">Ajuste</option>
                      </select>
                    </div>
                  </div>

                  <div className="border border-gray-200 rounded-md overflow-hidden">
                    <div className="bg-gray-50 px-4 py-2 flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">Productos y cantidades</span>
                      <button
                        onClick={() => setMultiRows([...multiRows, { productId: '', quantity: 0 }])}
                        className="inline-flex items-center px-2 py-1 text-sm rounded-md text-white bg-blue-600 hover:bg-blue-700"
                      >
                        <Plus className="w-4 h-4 mr-1" /> Agregar renglón
                      </button>
                    </div>
                    <div className="divide-y divide-gray-200">
                      {multiRows.map((row, idx) => (
                        <div key={idx} className="px-4 py-3 grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
                          <div className="md:col-span-3">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Producto (ID)</label>
                            <input
                              value={row.productId}
                              onChange={(e) => {
                                const next = [...multiRows];
                                next[idx] = { ...row, productId: e.target.value };
                                setMultiRows(next);
                              }}
                              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                              placeholder="UUID del producto"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad</label>
                            <input
                              type="number"
                              value={row.quantity}
                              onChange={(e) => {
                                const next = [...multiRows];
                                next[idx] = { ...row, quantity: Number(e.target.value || 0) };
                                setMultiRows(next);
                              }}
                              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                              placeholder="> 0"
                            />
                          </div>
                          <div className="flex justify-end">
                            <button
                              onClick={() => setMultiRows(multiRows.filter((_, i) => i !== idx))}
                              className="px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 bg-white hover:bg-gray-50"
                            >
                              Quitar
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">Los campos superiores se aplican a todos los renglones.</p>
                </div>
              )}

              {/* Modo CSV: carga de archivo */}
              {createMode === 'csv' && (
                <div className="mt-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Almacén (ID)</label>
                      <input
                        value={createForm.warehouseId}
                        onChange={(e) => setCreateForm({ ...createForm, warehouseId: e.target.value })}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                        placeholder="UUID del almacén"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Ubicación (ID)</label>
                      <input
                        value={createForm.locationId}
                        onChange={(e) => setCreateForm({ ...createForm, locationId: e.target.value })}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                        placeholder="UUID de la ubicación (opcional)"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                      <select
                        value={createForm.movementType}
                        onChange={(e) => {
                          const mt = e.target.value as MovementType;
                          setCreateForm({ ...createForm, movementType: mt, transactionType: mt === 'OUT' ? 'SHIPMENT' : 'RECEIPT' });
                        }}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                      >
                        <option value="IN">Entrada</option>
                        <option value="OUT">Salida</option>
                        <option value="ADJUSTMENT">Ajuste</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Archivo CSV</label>
                    <input
                      type="file"
                      accept=".csv,text/csv"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = () => {
                          try {
                            const text = String(reader.result || '').trim();
                            const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
                            if (lines.length === 0) {
                              setCsvRows([]);
                              setCsvError('CSV vacío');
                              return;
                            }
                            const header = lines[0].split(',').map(h => h.trim().toLowerCase());
                            const idxProduct = header.indexOf('productid') >= 0 ? header.indexOf('productid') : header.indexOf('product_id');
                            const idxQty = header.indexOf('quantity');
                            if (idxProduct < 0 || idxQty < 0) {
                              setCsvError('El CSV debe incluir columnas productId y quantity');
                              setCsvRows([]);
                              return;
                            }
                            const parsed: Array<{ productId: string; quantity: number }> = [];
                            for (let i = 1; i < lines.length; i++) {
                              const cols = lines[i].split(',').map(c => c.trim());
                              const pid = cols[idxProduct];
                              const qty = Number(cols[idxQty] || 0);
                              if (!pid || !isFinite(qty) || qty <= 0) continue;
                              parsed.push({ productId: pid, quantity: qty });
                            }
                            setCsvRows(parsed);
                            setCsvError(null);
                          } catch (err: any) {
                            console.error('CSV parse error', err);
                            setCsvError('Error leyendo CSV');
                            setCsvRows([]);
                          }
                        };
                        reader.readAsText(file);
                      }}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    />
                    {csvError && (
                      <p className="text-xs text-red-600 mt-1">{csvError}</p>
                    )}
                    {!csvError && csvRows.length > 0 && (
                      <p className="text-xs text-gray-600 mt-1">{csvRows.length} renglones detectados</p>
                    )}
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 bg-white hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={async () => {
                    try {
                      const token = localStorage.getItem('app_token');
                      if (!AUTH_BACKEND_URL) throw new Error('Backend no configurado');
                      const common = {
                        warehouse_id: createForm.warehouseId,
                        location_id: createForm.locationId || null,
                        movement_type: createForm.movementType,
                        transaction_type: createForm.transactionType,
                        unit_cost: createForm.unitCost ? Number(createForm.unitCost) : null,
                        lot_number: createForm.lotNumber || null,
                        expiry_date: createForm.expiryDate || null,
                        reason: createForm.reason || null,
                        notes: createForm.notes || null
                      } as any;

                      const postMovement = async (payload: any) => {
                        const resp = await fetch(`${AUTH_BACKEND_URL}/inventory/movements`, {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                            ...(token ? { Authorization: `Bearer ${token}` } : {})
                          },
                          body: JSON.stringify(payload)
                        });
                        if (!resp.ok) {
                          const text = await resp.text().catch(() => '');
                          throw new Error(text || 'Error al crear movimiento');
                        }
                      };

                      if (createMode === 'single') {
                        const payload: any = { ...common, product_id: createForm.productId, quantity: createForm.quantity };
                        if (!payload.product_id || !payload.warehouse_id || !payload.movement_type || !payload.transaction_type || !payload.quantity) {
                          alert('Completa los campos obligatorios');
                          return;
                        }
                        await postMovement(payload);
                      } else if (createMode === 'multiple') {
                        if (!createForm.warehouseId) {
                          alert('El almacén es obligatorio');
                          return;
                        }
                        const toCreate = multiRows
                          .map(r => ({ ...common, product_id: r.productId, quantity: r.quantity }))
                          .filter(p => p.product_id && p.quantity && p.quantity > 0);
                        if (toCreate.length === 0) {
                          alert('Agrega al menos un renglón válido');
                          return;
                        }
                        for (const payload of toCreate) {
                          await postMovement(payload);
                        }
                      } else if (createMode === 'csv') {
                        if (!createForm.warehouseId) {
                          alert('El almacén es obligatorio');
                          return;
                        }
                        const toCreate = (csvRows as Array<{ productId: string; quantity: number }>)
                          .map(r => ({ ...common, product_id: r.productId, quantity: r.quantity }))
                          .filter(p => p.product_id && p.quantity && p.quantity > 0);
                        if (toCreate.length === 0) {
                          alert('El CSV no contiene renglones válidos');
                          return;
                        }
                        for (const payload of toCreate) {
                          await postMovement(payload);
                        }
                      }

                      await fetchMovements();
                      setShowCreateModal(false);
                      setCreateForm({
                        productId: '', warehouseId: '', locationId: '', movementType: 'IN', transactionType: 'RECEIPT', quantity: 0,
                        unitCost: '', lotNumber: '', expiryDate: '', reason: '', notes: ''
                      });
                      setMultiRows([{ productId: '', quantity: 0 }]);
                      setCsvRows([]);
                      alert('Movimiento(s) creado(s)');
                    } catch (err: any) {
                      console.error('Error creando movimiento:', err);
                      alert(err?.message || 'Error al crear movimiento');
                    }
                  }}
                  className="px-4 py-2 rounded-md text-sm text-white bg-blue-600 hover:bg-blue-700"
                >
                  Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}