import React, { useEffect, useRef, useState } from 'react';
import { Settings, Image as ImageIcon, Save, RefreshCw, AlertTriangle } from 'lucide-react';

type Currency = 'MXN' | 'USD' | 'EUR';

interface GeneralConfigState {
  currency: Currency;
  disableInventoryMovements: boolean;
  warehouseClosed: boolean;
  documentImageDataUrl?: string | null;
}

const LS_KEYS = {
  currency: 'system_currency',
  disableInventoryMovements: 'disable_inventory_movements',
  warehouseClosed: 'warehouse_closed',
  documentImage: 'document_image_data_url',
};

export function GeneralSettings() {
  const AUTH_BACKEND_URL = import.meta.env.VITE_AUTH_BACKEND_URL || '';
  const [state, setState] = useState<GeneralConfigState>({
    currency: 'MXN',
    disableInventoryMovements: false,
    warehouseClosed: false,
    documentImageDataUrl: null,
  });
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Load initial values from localStorage
  useEffect(() => {
    try {
      const currency = (localStorage.getItem(LS_KEYS.currency) as Currency) || 'MXN';
      const disableInventoryMovements = localStorage.getItem(LS_KEYS.disableInventoryMovements) === 'true';
      const warehouseClosed = localStorage.getItem(LS_KEYS.warehouseClosed) === 'true';
      const documentImageDataUrl = localStorage.getItem(LS_KEYS.documentImage);
      setState({
        currency,
        disableInventoryMovements,
        warehouseClosed,
        documentImageDataUrl,
      });
    } catch (e) {
      // ignore
    }
  }, []);

  const handleImageUpload = async (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setState((prev) => ({ ...prev, documentImageDataUrl: dataUrl }));
    };
    reader.readAsDataURL(file);
  };

  const saveConfig = async () => {
    setSaving(true);
    try {
      localStorage.setItem(LS_KEYS.currency, state.currency);
      localStorage.setItem(LS_KEYS.disableInventoryMovements, String(state.disableInventoryMovements));
      localStorage.setItem(LS_KEYS.warehouseClosed, String(state.warehouseClosed));
      if (state.documentImageDataUrl) {
        localStorage.setItem(LS_KEYS.documentImage, state.documentImageDataUrl);
      } else {
        localStorage.removeItem(LS_KEYS.documentImage);
      }
      // Opcional: notificar cambios a otras vistas
      try {
        window.dispatchEvent(new CustomEvent('settings_changed'));
      } catch {}

      // Registrar cambio de configuración en backend si está disponible
      try {
        const token = localStorage.getItem('app_token');
        if (AUTH_BACKEND_URL && token) {
          const details = {
            currency: state.currency,
            disableInventoryMovements: state.disableInventoryMovements,
            warehouseClosed: state.warehouseClosed,
            documentImage: Boolean(state.documentImageDataUrl),
          };
          await fetch(`${AUTH_BACKEND_URL}/activity/logs`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              action_type: 'config',
              action: 'update',
              resource: 'general_settings',
              details: JSON.stringify(details),
              status: 'success',
            }),
          });
        }
      } catch (e) {
        console.warn('No se pudo registrar activity log de configuración:', e);
      }
      setSavedAt(new Date().toLocaleString('es-ES'));
    } finally {
      setSaving(false);
    }
  };

  const resetConfig = () => {
    setState({
      currency: 'MXN',
      disableInventoryMovements: false,
      warehouseClosed: false,
      documentImageDataUrl: null,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Settings className="w-6 h-6 text-blue-600" />
            Configuración General
          </h2>
          <p className="text-gray-600">Ajusta opciones generales del sistema</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={saveConfig}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <Save className={`w-4 h-4 ${saving ? 'animate-pulse' : ''}`} />
            Guardar
          </button>
          <button
            onClick={resetConfig}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Restablecer
          </button>
        </div>
      </div>

      {savedAt && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-green-700">
          Configuración guardada correctamente. Último guardado: {savedAt}
        </div>
      )}

      {/* Document Image */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <ImageIcon className="w-5 h-5 text-gray-600" />
          Imagen para documentos
        </h3>
        <p className="text-sm text-gray-600 mb-4">Sube una imagen (logo o sello) para usarla en documentos.</p>
        <div className="flex items-center gap-6">
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImageUpload(file);
              }}
            />
            <p className="text-xs text-gray-500 mt-2">Se guarda localmente en este navegador.</p>
          </div>
          {state.documentImageDataUrl && (
            <div className="border rounded-lg p-2 bg-gray-50">
              <img src={state.documentImageDataUrl} alt="Documento" className="max-h-24" />
            </div>
          )}
        </div>
        <div className="mt-3 flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
          <AlertTriangle className="w-4 h-4" />
          En producción, podemos guardar esta imagen en almacenamiento Supabase.
        </div>
      </div>

      {/* Currency Selection */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900">Moneda del sistema</h3>
        <p className="text-sm text-gray-600 mb-4">Elige la moneda para totales y documentos.</p>
        <select
          value={state.currency}
          onChange={(e) => setState((prev) => ({ ...prev, currency: e.target.value as Currency }))}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="MXN">Pesos Mexicanos (MXN)</option>
          <option value="USD">Dólar (USD)</option>
          <option value="EUR">Euro (EUR)</option>
        </select>
      </div>

      {/* Operational Toggles */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900">Operación</h3>
        <div className="mt-4 space-y-3">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={state.disableInventoryMovements}
              onChange={(e) => setState((prev) => ({ ...prev, disableInventoryMovements: e.target.checked }))}
              className="h-4 w-4"
            />
            <span>Desactivar movimientos de inventario</span>
          </label>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={state.warehouseClosed}
              onChange={(e) => setState((prev) => ({ ...prev, warehouseClosed: e.target.checked }))}
              className="h-4 w-4"
            />
            <span>Cerrar almacén</span>
          </label>
        </div>
        <p className="text-xs text-gray-500 mt-2">Estas opciones afectan la interfaz; para bloqueo completo añadiremos políticas en backend.</p>
      </div>
    </div>
  );
}

export default GeneralSettings;