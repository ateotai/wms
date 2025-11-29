-- =====================================================
-- RESET PARCIAL: Productos, Inventario, Órdenes de Compra y Citas
-- =====================================================
-- Limpia exclusivamente estas tablas de negocio si existen:
--   products, inventory, inventory_movements,
--   purchase_orders, purchase_order_items,
--   reception_appointments, reception_appointment_orders
-- Mantiene intactos auth.users, profiles y public.app_users.
-- Ejecuta con rol privilegiado (postgres) en Supabase.

DO $$
DECLARE
  target TEXT;
BEGIN
  FOREACH target IN ARRAY ARRAY[
    'public.reception_appointment_orders',
    'public.reception_appointments',
    'public.purchase_order_items',
    'public.purchase_orders',
    'public.inventory_movements',
    'public.inventory',
    'public.products'
  ]
  LOOP
    IF to_regclass(target) IS NOT NULL THEN
      EXECUTE format('TRUNCATE TABLE %s RESTART IDENTITY CASCADE', target);
      RAISE NOTICE 'TRUNCATED: %', target;
    ELSE
      RAISE NOTICE 'SKIPPED (missing): %', target;
    END IF;
  END LOOP;
END $$;

-- =====================================================
-- COMPROBACIONES RÁPIDAS (opcionales)
-- =====================================================
-- SELECT 'products' AS tbl, COUNT(*) FROM public.products;
-- SELECT 'inventory' AS tbl, COUNT(*) FROM public.inventory;
-- SELECT 'inventory_movements' AS tbl, COUNT(*) FROM public.inventory_movements;
-- SELECT 'purchase_orders' AS tbl, COUNT(*) FROM public.purchase_orders;
-- SELECT 'purchase_order_items' AS tbl, COUNT(*) FROM public.purchase_order_items;
-- SELECT 'reception_appointments' AS tbl, COUNT(*) FROM public.reception_appointments;
-- SELECT 'reception_appointment_orders' AS tbl, COUNT(*) FROM public.reception_appointment_orders;

-- Usuarios y perfiles se mantienen
-- SELECT 'auth.users' AS tbl, COUNT(*) FROM auth.users;
-- SELECT 'profiles' AS tbl, COUNT(*) FROM public.profiles;