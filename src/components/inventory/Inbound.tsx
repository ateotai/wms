import React from 'react';
import { ArrowDownLeft } from 'lucide-react';
import { StockMovements } from './StockMovements';

export function Inbound() {
  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center space-x-3">
          <ArrowDownLeft className="w-5 h-5 text-green-600" />
          <h2 className="text-xl font-bold text-gray-900">Entradas de Mercancía</h2>
        </div>
        <p className="mt-2 text-sm text-gray-600">
          Registra y consulta entradas por recepciones, transferencias o ajustes.
        </p>
      </div>

      {/* Lista y creación de movimientos tipo IN */}
      <StockMovements initialType="IN" initialCreateType="IN" filterScope="inbound" />
    </div>
  );
}

export default Inbound;