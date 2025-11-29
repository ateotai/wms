-- =====================================================
-- CLEANUP: Citas de recepción y Órdenes de compra
-- =====================================================
-- Limpia exclusivamente las tablas de negocio:
--   reception_appointment_orders, reception_appointments,
--   purchase_order_items, purchase_orders
-- Mantiene intactos usuarios, perfiles, productos, inventario, etc.
-- Ejecuta con rol privilegiado en Supabase SQL Editor o CLI.

BEGIN;

TRUNCATE TABLE
  public.reception_appointment_orders,
  public.reception_appointments,
  public.purchase_order_items,
  public.purchase_orders
RESTART IDENTITY CASCADE;

COMMIT;

-- =====================================================
-- Comprobaciones rápidas (opcionales)
-- =====================================================
-- SELECT 'purchase_orders' AS tbl, COUNT(*) FROM public.purchase_orders;
-- SELECT 'purchase_order_items' AS tbl, COUNT(*) FROM public.purchase_order_items;
-- SELECT 'reception_appointments' AS tbl, COUNT(*) FROM public.reception_appointments;
-- SELECT 'reception_appointment_orders' AS tbl, COUNT(*) FROM public.reception_appointment_orders;