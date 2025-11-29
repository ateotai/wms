-- Añade columna de ubicación por defecto al catálogo de productos
-- Ejecutar en Supabase (SQL Editor) o vía psql contra la base de datos

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS default_location_id UUID REFERENCES public.locations(id);

-- Índice para consultas por ubicación por defecto
CREATE INDEX IF NOT EXISTS idx_products_default_location ON public.products(default_location_id);