// Configuración central de ordenamiento de ítems por tipo de tarea

export type TaskType = 'picking' | 'receiving' | 'packing' | 'replenishment' | 'pending';

export type SortMode =
  | 'alpha_desc'
  | 'alpha_asc'
  | 'natural_desc'
  | 'natural_asc'
  | 'zone_then_location_desc'
  | 'zone_then_location_asc';

export interface TaskSortingRule {
  sortMode: SortMode;
  locationKey?: string; // clave del campo a ordenar (default: 'location')
}

// Reglas por defecto: alfabético descendente por 'location'
export const sortingRules: Record<TaskType, TaskSortingRule> = {
  picking: { sortMode: 'alpha_desc', locationKey: 'location' },
  receiving: { sortMode: 'alpha_desc', locationKey: 'location' },
  packing: { sortMode: 'alpha_desc', locationKey: 'location' },
  replenishment: { sortMode: 'alpha_desc', locationKey: 'fromLocation' },
  pending: { sortMode: 'alpha_desc', locationKey: 'location' },
};

// Utilidades de comparación
const alphaCompare = (aStr: string, bStr: string, desc = false) => {
  const a = (aStr || '').toUpperCase();
  const b = (bStr || '').toUpperCase();
  if (a === b) return 0;
  const res = a < b ? -1 : 1;
  return desc ? -res : res;
};

// Comparador "natural" (A1 < A10 < A100) con fallback alfabético
const naturalTokens = (s: string) => (s || '').match(/(\d+|\D+)/g) || [''];
const naturalCompare = (aStr: string, bStr: string, desc = false) => {
  const aTokens = naturalTokens(aStr.toUpperCase());
  const bTokens = naturalTokens(bStr.toUpperCase());
  const len = Math.max(aTokens.length, bTokens.length);
  for (let i = 0; i < len; i++) {
    const a = aTokens[i] ?? '';
    const b = bTokens[i] ?? '';
    const aNum = a.match(/^\d+$/) ? Number(a) : NaN;
    const bNum = b.match(/^\d+$/) ? Number(b) : NaN;
    let cmp = 0;
    if (!Number.isNaN(aNum) && !Number.isNaN(bNum)) {
      cmp = aNum === bNum ? 0 : aNum < bNum ? -1 : 1;
    } else {
      cmp = a === b ? 0 : a < b ? -1 : 1;
    }
    if (cmp !== 0) return desc ? -cmp : cmp;
  }
  return 0;
};

// Comparador por zona-antes-que-código (heurística simple: split por '-', espacio o '/')
const zoneThenLocationCompare = (aStr: string, bStr: string, desc = false) => {
  const split = (s: string) => (s || '').toUpperCase().split(/[-\s/]+/);
  const aParts = split(aStr);
  const bParts = split(bStr);
  // zona (primer segmento)
  const zoneCmp = alphaCompare(aParts[0] || '', bParts[0] || '');
  if (zoneCmp !== 0) return desc ? -zoneCmp : zoneCmp;
  // resto (natural)
  const restA = aParts.slice(1).join('-');
  const restB = bParts.slice(1).join('-');
  return naturalCompare(restA, restB, desc);
};

export const getSortComparator = <T>(taskType: TaskType) => {
  const rule = sortingRules[taskType] || { sortMode: 'alpha_desc', locationKey: 'location' };
  const key = rule.locationKey || 'location';
  const pick = (obj: T) => {
    const v = (obj as unknown as Record<string, unknown>)[key];
    return typeof v === 'string' ? v : v == null ? '' : String(v);
  };

  switch (rule.sortMode) {
    case 'alpha_asc':
      return (a: T, b: T) => alphaCompare(pick(a), pick(b), false);
    case 'alpha_desc':
      return (a: T, b: T) => alphaCompare(pick(a), pick(b), true);
    case 'natural_asc':
      return (a: T, b: T) => naturalCompare(pick(a), pick(b), false);
    case 'natural_desc':
      return (a: T, b: T) => naturalCompare(pick(a), pick(b), true);
    case 'zone_then_location_asc':
      return (a: T, b: T) => zoneThenLocationCompare(pick(a), pick(b), false);
    case 'zone_then_location_desc':
      return (a: T, b: T) => zoneThenLocationCompare(pick(a), pick(b), true);
    default:
      return (a: T, b: T) => alphaCompare(pick(a), pick(b), true);
  }
};

// Permite ajustar reglas en runtime si se requiere más adelante
export const setSortingRule = (taskType: TaskType, rule: Partial<TaskSortingRule>) => {
  sortingRules[taskType] = { ...sortingRules[taskType], ...rule } as TaskSortingRule;
};
