import { useEffect, useRef, useState } from 'react';
import { Package, Tag, Printer, User, ChevronLeft, ChevronRight } from 'lucide-react';
import QRCode from 'qrcode';
import JsBarcode from 'jsbarcode';

type Task = {
  id: string;
  taskNumber: string;
  orderNumber: string;
  assignedTo?: string;
  status: 'pending' | 'in_progress' | 'paused' | 'completed' | 'embarked' | 'cancelled' | 'shipped';
  items: Array<{ id: string; sku: string; product: string; quantity: number }>;
  totalWeight?: number;
  createdAt: string;
};

type LabelRecord = {
  labelId: string;
  taskNumber: string;
  orderNumber: string;
  operator: string;
  seq: number;
  batchIndex: number;
  batchTotal: number;
  itemsCount: number;
  totalWeight: number;
  createdAt: string;
};

function LabelCard({ label }: { label: LabelRecord }) {
  const qrRef = useRef<HTMLCanvasElement | null>(null);
  const barcodeRef = useRef<SVGSVGElement | null>(null);
  useEffect(() => {
    try {
      if (qrRef.current) {
        const payload = {
          id: label.labelId,
          package: label.taskNumber,
          order: label.orderNumber,
          seq: label.seq,
          batchIndex: label.batchIndex,
          batchTotal: label.batchTotal,
          operator: label.operator,
          items: label.itemsCount,
          weight: label.totalWeight,
          createdAt: label.createdAt,
        };
        QRCode.toCanvas(qrRef.current, JSON.stringify(payload), { width: 160 }).catch(() => {});
      }
      if (barcodeRef.current) {
        JsBarcode(barcodeRef.current, label.labelId, { format: 'CODE128', width: 2, height: 48, displayValue: true });
      }
    } catch {}
  }, [label]);
  return (
    <div className="border border-gray-300 rounded-lg p-3 w-[320px] h-[220px] bg-white">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package className="w-4 h-4 text-blue-600" />
          <span className="text-sm font-semibold text-gray-900">{label.taskNumber}</span>
        </div>
        <span className="text-xs font-medium text-gray-600">Etiqueta {label.batchIndex} de {label.batchTotal}</span>
      </div>
      <div className="grid grid-cols-2 gap-3 mt-2">
        <div>
          <canvas ref={qrRef} className="border border-gray-200 rounded" width={160} height={160}></canvas>
        </div>
        <div className="space-y-2">
          <div className="text-xs text-gray-600">Orden</div>
          <div className="text-sm font-medium text-gray-900">{label.orderNumber}</div>
          <div className="flex items-center gap-1 text-sm text-gray-700 mt-1">
            <User className="w-3 h-3 text-gray-400" />
            <span>{label.operator || 'Sin asignar'}</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs mt-2">
            <div>
              <div className="text-gray-600">Ítems</div>
              <div className="font-medium text-gray-900">{label.itemsCount}</div>
            </div>
            <div>
              <div className="text-gray-600">Peso</div>
              <div className="font-medium text-gray-900">{label.totalWeight} kg</div>
            </div>
          </div>
          <div className="mt-2">
            <svg ref={barcodeRef} className="w-full h-12"></svg>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Labeling() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [labelsPerPackage, setLabelsPerPackage] = useState<number>(1);
  const [preview, setPreview] = useState<LabelRecord[]>([]);
  const [showPrint, setShowPrint] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'embarked' | 'shipped'>('all');
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  useEffect(() => {
    try {
      const str = localStorage.getItem('packing_tasks');
      const arr: Task[] = str ? JSON.parse(str) : [];
      const eligible = (Array.isArray(arr) ? arr : []).filter(t => ['completed','embarked','shipped'].includes(t.status));
      setTasks(eligible);
    } catch { setTasks([] as Task[]); }
  }, []);

  const toggleSelect = (id: string) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const normalized = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
  const visibleTasks = tasks.filter(t => {
    const byStatus = statusFilter === 'all' ? true : t.status === statusFilter;
    const q = normalized(search.trim());
    if (!q) return byStatus;
    const fields = [t.taskNumber, t.orderNumber, t.assignedTo || ''].map(v => normalized(String(v)));
    const inFields = fields.some(f => f.includes(q));
    const inItems = (t.items || []).some(it => normalized(it.sku).includes(q) || normalized(it.product).includes(q));
    return byStatus && (inFields || inItems);
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, pageSize]);

  const total = visibleTasks.length;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const start = (currentPage - 1) * pageSize;
  const end = Math.min(total, start + pageSize);
  const pageTasks = visibleTasks.slice(start, end);

  const statusText = (s: Task['status']) => s === 'completed' ? 'Completado' : s === 'embarked' ? 'Embarcado' : s === 'shipped' ? 'Enviado' : s;

  const generateLabels = () => {
    if (selected.length === 0 || labelsPerPackage < 1) return;
    let sequences: Record<string, number> = {};
    try {
      const seqStr = localStorage.getItem('packing_label_sequences');
      sequences = seqStr ? JSON.parse(seqStr) : {};
    } catch { sequences = {}; }
    const created: LabelRecord[] = [];
    const now = new Date().toISOString();
    for (const id of selected) {
      const t = tasks.find(x => x.id === id);
      if (!t) continue;
      const base = Number(sequences[t.taskNumber] || 0);
      for (let i = 1; i <= labelsPerPackage; i++) {
        const seq = base + i;
        const labelId = `${t.taskNumber}-${String(seq).padStart(3,'0')}`;
        created.push({
          labelId,
          taskNumber: t.taskNumber,
          orderNumber: t.orderNumber,
          operator: String(t.assignedTo || ''),
          seq,
          batchIndex: i,
          batchTotal: labelsPerPackage,
          itemsCount: t.items.reduce((s, it) => s + Number(it.quantity || 0), 0),
          totalWeight: Number(t.totalWeight || 0),
          createdAt: now,
        });
      }
      sequences[t.taskNumber] = base + labelsPerPackage;
    }
    try {
      const listStr = localStorage.getItem('packing_labels');
      const list: LabelRecord[] = listStr ? JSON.parse(listStr) : [];
      localStorage.setItem('packing_labels', JSON.stringify([...created, ...list]));
      localStorage.setItem('packing_label_sequences', JSON.stringify(sequences));
    } catch {}
    setPreview(created);
    setShowPrint(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Tag className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900">Etiquetar</h2>
        </div>
        <div className="flex items-center gap-3">
          <input type="text" placeholder="Buscar paquete, orden o SKU" value={search} onChange={(e) => setSearch(e.target.value)} className="w-64 px-3 py-2 border border-gray-300 rounded-md text-sm" />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)} className="px-3 py-2 border border-gray-300 rounded-md text-sm">
            <option value="all">Todos</option>
            <option value="completed">Completado</option>
            <option value="embarked">Embarcado</option>
            <option value="shipped">Enviado</option>
          </select>
          <label className="text-sm text-gray-700">Etiquetas por paquete</label>
          <input type="number" min={1} value={labelsPerPackage} onChange={(e) => setLabelsPerPackage(Math.max(1, Number(e.target.value)))} className="w-20 px-3 py-2 border border-gray-300 rounded-md text-sm" />
          <button onClick={generateLabels} className="inline-flex items-center px-3 py-2 bg-blue-600 text-white rounded-md text-sm font-medium">
            <Printer className="w-4 h-4 mr-2" />
            Generar etiquetas
          </button>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <div className="text-sm font-medium text-gray-900">Paquetes Completados / Embarcados / Enviados</div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-600">Mostrar</span>
            <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))} className="px-2 py-1 border border-gray-300 rounded-md text-xs">
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
            <span className="text-xs text-gray-600">por página</span>
          </div>
        </div>
        <div className="p-0 overflow-hidden rounded-b-lg">
          {visibleTasks.length === 0 ? (
            <div className="p-4 text-sm text-gray-600">Sin paquetes</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm table-auto">
                <thead className="bg-gray-50">
                  <tr className="text-left text-gray-600">
                    <th className="py-2 px-3">Sel</th>
                    <th className="py-2 px-3">Paquete</th>
                    <th className="py-2 px-3">Orden</th>
                    <th className="py-2 px-3">Operario</th>
                    <th className="py-2 px-3">Ítems</th>
                    <th className="py-2 px-3">Peso</th>
                    <th className="py-2 px-3">Estado</th>
                    <th className="py-2 px-3">Fecha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {pageTasks.map(t => (
                    <tr key={t.id} className="hover:bg-gray-50">
                      <td className="py-2 px-3"><input type="checkbox" className="form-checkbox" checked={selected.includes(t.id)} onChange={() => toggleSelect(t.id)} /></td>
                      <td className="py-2 px-3 font-mono text-gray-900">{t.taskNumber}</td>
                      <td className="py-2 px-3 font-mono">{t.orderNumber}</td>
                      <td className="py-2 px-3">{t.assignedTo || '-'}</td>
                      <td className="py-2 px-3">{t.items.reduce((s, it) => s + Number(it.quantity || 0), 0)}</td>
                      <td className="py-2 px-3">{Number(t.totalWeight || 0)} kg</td>
                      <td className="py-2 px-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${t.status==='completed'?'bg-green-100 text-green-700':t.status==='embarked'?'bg-indigo-100 text-indigo-700':'bg-blue-100 text-blue-700'}`}>{statusText(t.status)}</span>
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap">{new Date(t.createdAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {visibleTasks.length > 0 && (
          <div className="p-4 flex items-center justify-between">
            <div className="text-xs text-gray-600">Mostrando {start + 1}–{end} de {total}</div>
            <div className="flex items-center gap-2">
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className={`inline-flex items-center px-2 py-1 border rounded-md text-xs ${currentPage===1?'text-gray-400 border-gray-200':'text-gray-700 hover:bg-gray-50 border-gray-300'}`}>
                <ChevronLeft className="w-3 h-3" />
              </button>
              <span className="text-xs text-gray-700">{currentPage} / {pages}</span>
              <button onClick={() => setCurrentPage(p => Math.min(pages, p + 1))} disabled={currentPage === pages} className={`inline-flex items-center px-2 py-1 border rounded-md text-xs ${currentPage===pages?'text-gray-400 border-gray-200':'text-gray-700 hover:bg-gray-50 border-gray-300'}`}>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}
      </div>

      {showPrint && preview.length > 0 && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-11/12 max-w-5xl shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Etiquetas generadas</h3>
              <button onClick={() => setShowPrint(false)} className="text-gray-400 hover:text-gray-600">×</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {preview.map(pl => (<LabelCard key={pl.labelId} label={pl} />))}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => window.print()} className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">Imprimir</button>
              <button onClick={() => setShowPrint(false)} className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700">Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
