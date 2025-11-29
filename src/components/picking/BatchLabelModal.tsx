import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import JsBarcode from 'jsbarcode';

type BatchLabelModalProps = {
  isOpen: boolean;
  onClose: () => void;
  autoPrint?: boolean;
  batch: {
    id: string;
    name: string;
    assignedTo?: string;
    zone?: string;
    totalItems?: number;
    orders?: Array<{ id: string }>; // solo para contar
  } | null;
};

export function BatchLabelModal({ isOpen, onClose, batch, autoPrint = false }: BatchLabelModalProps) {
  const qrCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const barcodeCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const printedForCodeRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isOpen || !batch) return;
    const code = batch.name || batch.id;
    // Generar QR pequeño
    if (qrCanvasRef.current) {
      QRCode.toCanvas(qrCanvasRef.current, String(code), {
        width: 120,
        margin: 0,
        color: { dark: '#000000', light: '#ffffff' }
      }).catch(() => {});
    }
    // Generar código de barras pequeño Code128
    if (barcodeCanvasRef.current) {
      try {
        JsBarcode(barcodeCanvasRef.current, String(code), {
          format: 'CODE128',
          width: 1.6,
          height: 36,
          margin: 0,
          displayValue: true,
          fontSize: 10,
        });
      } catch {}
    }
  }, [isOpen, batch]);

  if (!isOpen || !batch) return null;

  const printLabel = () => {
    try {
      const w = window.open('', 'PRINT', 'height=400,width=320');
      if (!w) return;
      const code = batch.name || batch.id;
      const qrDataUrl = qrCanvasRef.current?.toDataURL('image/png') || '';
      const barcodeDataUrl = barcodeCanvasRef.current?.toDataURL('image/png') || '';
      const html = `<!doctype html>
        <html>
          <head>
            <meta charset="utf-8" />
            <title>Etiqueta ${code}</title>
            <style>
              @page { size: 60mm 30mm; margin: 4mm; }
              body { font-family: Arial, sans-serif; }
              .label { width: 52mm; border: 1px dashed #ccc; padding: 3mm; }
              .row { display: flex; align-items: center; justify-content: space-between; }
              .qr { width: 24mm; height: 24mm; }
              .info { font-size: 10px; line-height: 1.2; margin-left: 4mm; }
              .barcode { width: 48mm; margin-top: 2mm; }
              .code { font-size: 12px; font-weight: bold; }
            </style>
          </head>
          <body>
            <div class="label">
              <div class="row">
                <img class="qr" src="${qrDataUrl}" alt="QR" />
                <div class="info">
                  <div class="code">${code}</div>
                  ${batch.assignedTo ? `<div>Asignado: ${batch.assignedTo}</div>` : ''}
                  ${batch.zone ? `<div>Zona: ${batch.zone}</div>` : ''}
                  ${typeof batch.totalItems === 'number' ? `<div>Items: ${batch.totalItems}</div>` : ''}
                  ${Array.isArray(batch.orders) ? `<div>Órdenes: ${batch.orders.length}</div>` : ''}
                </div>
              </div>
              <img class="barcode" src="${barcodeDataUrl}" alt="Barcode" />
            </div>
            <script>window.onload = () => { window.print(); setTimeout(() => window.close(), 300); };</script>
          </body>
        </html>`;
      w.document.write(html);
      w.document.close();
    } catch {}
  };

  // Auto imprimir una vez por código, después de generar QR/Barcode
  useEffect(() => {
    if (!isOpen || !batch) return;
    const code = batch.name || batch.id;
    if (!autoPrint) return;
    if (printedForCodeRef.current === code) return;
    const t = setTimeout(() => {
      try {
        printLabel();
        printedForCodeRef.current = code;
      } catch {}
    }, 200);
    return () => clearTimeout(t);
  }, [isOpen, batch, autoPrint]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-gray-800">Etiqueta de Ola</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-sm">Cerrar</button>
        </div>
        <div className="border border-gray-200 rounded-md p-3">
          <div className="flex items-center">
            <canvas ref={qrCanvasRef} className="w-24 h-24" />
            <div className="ml-3">
              <div className="text-xs text-gray-500">Código</div>
              <div className="text-sm font-mono">{batch.name || batch.id}</div>
              {batch.assignedTo && <div className="text-xs text-gray-600">Asignado: {batch.assignedTo}</div>}
              {batch.zone && <div className="text-xs text-gray-600">Zona: {batch.zone}</div>}
            </div>
          </div>
          <div className="mt-2">
            <canvas ref={barcodeCanvasRef} className="w-full" />
          </div>
        </div>
        <div className="flex justify-end mt-3">
          <button onClick={printLabel} className="px-3 py-1.5 bg-blue-600 text-white rounded-md text-xs font-medium hover:bg-blue-700">Imprimir</button>
        </div>
      </div>
    </div>
  );
}