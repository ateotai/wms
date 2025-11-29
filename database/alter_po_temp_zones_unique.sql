-- Añade restricción única para garantizar una sola asignación vigente por orden
alter table public.po_temp_zones
  add constraint po_temp_zones_po_unique unique (purchase_order_id);