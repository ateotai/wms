-- Script para añadir columnas faltantes a la tabla zones
-- Ejecutar en Supabase SQL Editor si se desea funcionalidad completa de temperaturas

ALTER TABLE public.zones ADD COLUMN IF NOT EXISTS temperature_controlled BOOLEAN DEFAULT FALSE;
ALTER TABLE public.zones ADD COLUMN IF NOT EXISTS temperature_min NUMERIC;
ALTER TABLE public.zones ADD COLUMN IF NOT EXISTS temperature_max NUMERIC;
ALTER TABLE public.zones ADD COLUMN IF NOT EXISTS dimensions JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.zones ADD COLUMN IF NOT EXISTS coordinates JSONB DEFAULT '{}'::jsonb;
