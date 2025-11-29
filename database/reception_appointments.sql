-- =====================================================
-- TABLAS: Citas de Recepción
-- =====================================================

-- Requiere: uuid-ossp
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabla principal de citas
CREATE TABLE IF NOT EXISTS reception_appointments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  appointment_number TEXT UNIQUE NOT NULL,
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  dock TEXT,
  carrier TEXT,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled','arrived','in_progress','completed','cancelled','no_show','rescheduled')),
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Relación N:M entre citas y órdenes de compra
CREATE TABLE IF NOT EXISTS reception_appointment_orders (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  appointment_id UUID NOT NULL REFERENCES reception_appointments(id) ON DELETE CASCADE,
  purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(appointment_id, purchase_order_id)
);

-- Índices útiles
CREATE INDEX IF NOT EXISTS idx_reception_appointments_status ON reception_appointments(status);
CREATE INDEX IF NOT EXISTS idx_reception_appointments_scheduled ON reception_appointments(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_reception_appointment_orders_app ON reception_appointment_orders(appointment_id);
CREATE INDEX IF NOT EXISTS idx_reception_appointment_orders_po ON reception_appointment_orders(purchase_order_id);

-- =====================================================
-- RLS y Políticas
-- =====================================================
ALTER TABLE reception_appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE reception_appointment_orders ENABLE ROW LEVEL SECURITY;

-- Limpieza defensiva de políticas (idempotente)
DO $$
DECLARE rec RECORD;
BEGIN
  FOR rec IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('reception_appointments','reception_appointment_orders')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', rec.policyname, rec.schemaname, rec.tablename);
  END LOOP;
END
$$;

-- Todos los usuarios autenticados pueden consultar citas
CREATE POLICY "Users can view reception appointments" ON reception_appointments
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Operadores y superiores pueden crear/actualizar/eliminar citas
CREATE POLICY "Operators can manage reception appointments" ON reception_appointments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND upper(role) IN ('ADMIN','MANAGER','OPERATOR')
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND upper(role) IN ('ADMIN','MANAGER','OPERATOR')
    )
  );

-- Políticas para la tabla de relación
CREATE POLICY "Users can view appointment orders" ON reception_appointment_orders
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Operators can manage appointment orders" ON reception_appointment_orders
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND upper(role) IN ('ADMIN','MANAGER','OPERATOR')
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND upper(role) IN ('ADMIN','MANAGER','OPERATOR')
    )
  );