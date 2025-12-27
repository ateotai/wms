BEGIN;

ALTER TABLE IF EXISTS public.products
  ADD COLUMN IF NOT EXISTS default_location_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'products_default_location_fk'
  ) THEN
    ALTER TABLE public.products
      ADD CONSTRAINT products_default_location_fk
      FOREIGN KEY (default_location_id)
      REFERENCES public.locations(id)
      ON UPDATE CASCADE
      ON DELETE SET NULL;
  END IF;
END $$;

COMMIT;
