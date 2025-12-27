BEGIN;

TRUNCATE TABLE
  public.reception_appointment_orders,
  public.reception_appointments,
  public.purchase_order_items,
  public.purchase_orders,
  public.inventory_movements,
  public.inventory,
  public.picking_tasks,
  public.products
RESTART IDENTITY CASCADE;

COMMIT;
