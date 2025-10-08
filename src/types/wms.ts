// =====================================================
// TIPOS TYPESCRIPT PARA SISTEMA WMS COMPLETO
// =====================================================

import { UserRole } from './roles';

// =====================================================
// ENUMS GENERALES
// =====================================================

export enum MovementType {
  INBOUND = 'inbound',
  OUTBOUND = 'outbound',
  INTERNAL = 'internal',
  ADJUSTMENT = 'adjustment',
  TRANSFER = 'transfer'
}

export enum OrderStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  ON_HOLD = 'on_hold'
}

export enum PickingMethod {
  SINGLE_ORDER = 'single_order',
  BATCH = 'batch',
  CLUSTER = 'cluster',
  WAVE = 'wave',
  ZONE = 'zone'
}

export enum LocationType {
  RECEIVING = 'receiving',
  STORAGE = 'storage',
  PICKING = 'picking',
  PACKING = 'packing',
  SHIPPING = 'shipping',
  CROSS_DOCK = 'cross_dock'
}

// =====================================================
// INTERFACES DE INVENTARIO
// =====================================================

export interface Product {
  id: string;
  sku: string;
  name: string;
  description?: string;
  category_id: string;
  supplier_id: string;
  unit_of_measure: string;
  weight?: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };
  is_perishable: boolean;
  shelf_life_days?: number;
  abc_classification?: 'A' | 'B' | 'C';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface InventoryItem {
  id: string;
  product_id: string;
  location_id: string;
  quantity: number;
  reserved_quantity: number;
  available_quantity: number;
  lot_number?: string;
  serial_number?: string;
  expiry_date?: string;
  received_date: string;
  last_movement_date: string;
  cost_per_unit: number;
  total_value: number;
}

export interface StockMovement {
  id: string;
  product_id: string;
  from_location_id?: string;
  to_location_id?: string;
  movement_type: MovementType;
  quantity: number;
  lot_number?: string;
  serial_number?: string;
  reference_document?: string;
  reason: string;
  user_id: string;
  created_at: string;
}

// =====================================================
// INTERFACES DE ALMACÉN
// =====================================================

export interface Warehouse {
  id: string;
  code: string;
  name: string;
  address: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Zone {
  id: string;
  warehouse_id: string;
  code: string;
  name: string;
  zone_type: LocationType;
  temperature_controlled: boolean;
  temperature_min?: number;
  temperature_max?: number;
  is_active: boolean;
}

export interface Location {
  id: string;
  zone_id: string;
  code: string;
  aisle?: string;
  bay?: string;
  level?: string;
  position?: string;
  location_type: LocationType;
  capacity_weight?: number;
  capacity_volume?: number;
  is_pickable: boolean;
  is_active: boolean;
  current_stock?: InventoryItem[];
}

// =====================================================
// INTERFACES DE RECEPCIÓN
// =====================================================

export interface PurchaseOrder {
  id: string;
  po_number: string;
  supplier_id: string;
  status: OrderStatus;
  expected_date: string;
  received_date?: string;
  total_items: number;
  total_value: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  items: PurchaseOrderItem[];
}

export interface PurchaseOrderItem {
  id: string;
  po_id: string;
  product_id: string;
  quantity_ordered: number;
  quantity_received: number;
  unit_cost: number;
  total_cost: number;
  lot_number?: string;
  expiry_date?: string;
}

export interface ASN {
  id: string;
  asn_number: string;
  supplier_id: string;
  po_id?: string;
  expected_date: string;
  status: OrderStatus;
  total_items: number;
  created_at: string;
  items: ASNItem[];
}

export interface ASNItem {
  id: string;
  asn_id: string;
  product_id: string;
  quantity: number;
  lot_number?: string;
  serial_number?: string;
  expiry_date?: string;
}

// =====================================================
// INTERFACES DE PICKING
// =====================================================

export interface SalesOrder {
  id: string;
  order_number: string;
  customer_id: string;
  status: OrderStatus;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  order_date: string;
  required_date: string;
  shipped_date?: string;
  total_items: number;
  total_value: number;
  picking_method?: PickingMethod;
  wave_id?: string;
  items: SalesOrderItem[];
}

export interface SalesOrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity_ordered: number;
  quantity_picked: number;
  quantity_shipped: number;
  unit_price: number;
  total_price: number;
  location_id?: string;
  lot_number?: string;
  serial_number?: string;
}

export interface PickingTask {
  id: string;
  order_id: string;
  product_id: string;
  location_id: string;
  quantity: number;
  sequence: number;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  assigned_to?: string;
  started_at?: string;
  completed_at?: string;
  picking_route?: string;
}

export interface Wave {
  id: string;
  wave_number: string;
  status: OrderStatus;
  picking_method: PickingMethod;
  total_orders: number;
  total_items: number;
  assigned_to?: string;
  created_at: string;
  released_at?: string;
  completed_at?: string;
  orders: string[];
}

// =====================================================
// INTERFACES DE PACKING Y ENVÍOS
// =====================================================

export interface PackingList {
  id: string;
  order_id: string;
  packing_number: string;
  status: 'pending' | 'in_progress' | 'completed';
  total_items: number;
  total_weight: number;
  total_volume: number;
  packed_by?: string;
  packed_at?: string;
  items: PackingItem[];
}

export interface PackingItem {
  id: string;
  packing_list_id: string;
  product_id: string;
  quantity: number;
  lot_number?: string;
  serial_number?: string;
  container_id?: string;
}

export interface Shipment {
  id: string;
  shipment_number: string;
  carrier_id: string;
  tracking_number?: string;
  status: 'pending' | 'in_transit' | 'delivered' | 'cancelled';
  ship_date: string;
  delivery_date?: string;
  total_weight: number;
  total_volume: number;
  orders: string[];
}

// =====================================================
// INTERFACES DE REPORTES Y KPIs
// =====================================================

export interface InventoryKPI {
  total_products: number;
  total_locations: number;
  inventory_value: number;
  inventory_accuracy: number;
  stock_turnover: number;
  aging_analysis: {
    '0-30_days': number;
    '31-60_days': number;
    '61-90_days': number;
    'over_90_days': number;
  };
}

export interface OperationalKPI {
  orders_processed: number;
  picking_accuracy: number;
  picking_productivity: number;
  otif_performance: number; // On Time In Full
  cycle_time: number;
  labor_utilization: number;
}

export interface ABCAnalysis {
  product_id: string;
  sku: string;
  name: string;
  classification: 'A' | 'B' | 'C';
  annual_volume: number;
  annual_value: number;
  percentage_volume: number;
  percentage_value: number;
}

// =====================================================
// INTERFACES DE CONFIGURACIÓN
// =====================================================

export interface Company {
  id: string;
  name: string;
  code: string;
  address: string;
  phone?: string;
  email?: string;
  is_active: boolean;
  warehouses: Warehouse[];
}

export interface SystemConfig {
  id: string;
  company_id: string;
  auto_receive: boolean;
  auto_putaway: boolean;
  fifo_enabled: boolean;
  fefo_enabled: boolean;
  cycle_count_frequency: number;
  default_picking_method: PickingMethod;
  barcode_format: string;
  label_printer: string;
}

// =====================================================
// INTERFACES DE INTEGRACIÓN
// =====================================================

export interface ERPIntegration {
  id: string;
  name: string;
  type: 'sap' | 'oracle' | 'dynamics' | 'custom';
  endpoint: string;
  api_key?: string;
  is_active: boolean;
  last_sync: string;
  sync_frequency: number;
}

export interface APILog {
  id: string;
  integration_id: string;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  request_data?: any;
  response_data?: any;
  status_code: number;
  execution_time: number;
  created_at: string;
}

// =====================================================
// INTERFACES DE DASHBOARD
// =====================================================

export interface DashboardWidget {
  id: string;
  title: string;
  type: 'chart' | 'metric' | 'table' | 'map';
  size: 'small' | 'medium' | 'large';
  position: { x: number; y: number };
  config: any;
  user_role: UserRole[];
}

export interface DashboardLayout {
  id: string;
  user_id: string;
  name: string;
  is_default: boolean;
  widgets: DashboardWidget[];
  created_at: string;
  updated_at: string;
}