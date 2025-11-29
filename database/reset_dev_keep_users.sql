-- =====================================================
-- RESET DE DATOS (DEV) MANTENIENDO USUARIOS
-- =====================================================
-- Este script limpia TODAS las tablas de negocio y deja intactos:
--   - auth.users (usuarios de Supabase Auth)
--   - profiles (perfiles vinculados a usuarios)
--   - public.app_users (si existe, usuarios dev locales)
-- Úsalo en desarrollo para partir de base limpia.
-- IMPORTANTE: Ejecuta con rol privilegiado (SQL Editor de Supabase o CLI).

BEGIN;

-- Orden seguro con CASCADE para respetar FKs y reiniciar IDs
TRUNCATE TABLE
  reception_appointment_orders,
  reception_appointments,
  purchase_order_items,
  purchase_orders,
  inventory_movements,
  inventory,
  locations,
  products,
  suppliers,
  categories,
  warehouses
RESTART IDENTITY CASCADE;

COMMIT;

-- =====================================================
-- COMPROBACIONES RÁPIDAS (opcionales)
-- Ejecuta estas consultas para verificar que quedó vacío.
-- =====================================================
-- SELECT 'warehouses' AS tbl, COUNT(*) FROM warehouses;
-- SELECT 'categories' AS tbl, COUNT(*) FROM categories;
-- SELECT 'suppliers' AS tbl, COUNT(*) FROM suppliers;
-- SELECT 'products' AS tbl, COUNT(*) FROM products;
-- SELECT 'locations' AS tbl, COUNT(*) FROM locations;
-- SELECT 'inventory' AS tbl, COUNT(*) FROM inventory;
-- SELECT 'inventory_movements' AS tbl, COUNT(*) FROM inventory_movements;
-- SELECT 'purchase_orders' AS tbl, COUNT(*) FROM purchase_orders;
-- SELECT 'purchase_order_items' AS tbl, COUNT(*) FROM purchase_order_items;
-- SELECT 'reception_appointments' AS tbl, COUNT(*) FROM reception_appointments;
-- SELECT 'reception_appointment_orders' AS tbl, COUNT(*) FROM reception_appointment_orders;

-- Usuarios y perfiles se mantienen
-- SELECT 'auth.users' AS tbl, COUNT(*) FROM auth.users;
-- SELECT 'profiles' AS tbl, COUNT(*) FROM profiles;