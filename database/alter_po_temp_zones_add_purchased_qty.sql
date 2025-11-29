-- Añade el total de unidades compradas en la orden de compra
-- a la asignación de zona temporal por orden.
-- Ejecutar esta migración en entornos existentes.

ALTER TABLE public.po_temp_zones
ADD COLUMN IF NOT EXISTS purchased_quantity_total INTEGER NOT NULL DEFAULT 0;