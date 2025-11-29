import React from 'react';
import { ArrowUpRight } from 'lucide-react';
import { StockMovements } from './StockMovements';

export function Outbound() {
  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center space-x-3">
          <ArrowUpRight className="w-5 h-5 text-red-600" />
          <h2 className="text-xl font-bold text-gray-900">Salidas de Mercancía</h2>
        </div>
        <p className="mt-2 text-sm text-gray-600">
          Registra y consulta salidas por ventas, transferencias o ajustes.
        </p>
      </div>

      {/* Lista y creación de movimientos tipo OUT */}
      <StockMovements initialType="OUT" initialCreateType="OUT" filterScope="outbound" />
    </div>
  );
}

export default Outbound;