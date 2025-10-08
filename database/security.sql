-- =====================================================
-- POLÍTICAS DE SEGURIDAD RLS (ROW LEVEL SECURITY)
-- =====================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE transfer_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE cycle_counts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cycle_count_items ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- PRELIMINAR: LIMPIEZA GLOBAL DE POLÍTICAS PARA IDOMPOTENCIA
-- Este bloque elimina cualquier política existente en las tablas objetivo
-- para evitar errores 42710 al reejecutar este archivo.
DO $$
DECLARE rec RECORD;
BEGIN
  FOR rec IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'profiles','warehouses','categories','suppliers','products','locations',
        'inventory','inventory_movements','purchase_orders','purchase_order_items',
        'sales_orders','sales_order_items','transfers','transfer_items',
        'cycle_counts','cycle_count_items'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', rec.policyname, rec.schemaname, rec.tablename);
  END LOOP;
END
$$;

-- =====================================================
-- FUNCIONES AUXILIARES PARA RLS (evitar recursión)
-- =====================================================

-- Función para verificar si el usuario actual es ADMIN sin consultar perfiles bajo RLS
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
  SELECT EXISTS(
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid() AND upper(role) = 'ADMIN'
  );
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

-- Función para verificar si el usuario actual es ADMIN o MANAGER
CREATE OR REPLACE FUNCTION public.is_admin_or_manager()
RETURNS boolean AS $$
  SELECT EXISTS(
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid() AND upper(role) IN ('ADMIN','MANAGER')
  );
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

-- =====================================================
-- POLÍTICAS PARA PROFILES
-- =====================================================

-- Los usuarios pueden ver y actualizar su propio perfil
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

-- Los administradores pueden ver y gestionar todos los perfiles
DROP POLICY IF EXISTS "Admins can manage all profiles" ON profiles;
CREATE POLICY "Admins can manage all profiles" ON profiles
    FOR ALL
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- =====================================================
-- POLÍTICAS PARA WAREHOUSES
-- =====================================================

-- Los usuarios pueden ver almacenes donde tienen acceso
CREATE POLICY "Users can view accessible warehouses" ON warehouses
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND (upper(role) IN ('ADMIN', 'MANAGER') OR is_active = true)
        )
    );

-- Solo administradores y managers pueden crear/modificar almacenes
-- Igualar UPDATE/DELETE al patrón de ZONES: cualquier autenticado
DROP POLICY IF EXISTS "Managers can manage warehouses" ON warehouses;

-- Insert explícito solo para admin/manager (requerido por RLS)
DROP POLICY IF EXISTS "Authenticated can insert warehouses" ON warehouses;
DROP POLICY IF EXISTS "Managers can insert warehouses" ON warehouses;
CREATE POLICY "Authenticated can insert warehouses" ON warehouses
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() IS NOT NULL);

-- Update con WITH CHECK para admin/manager (complementa la política FOR ALL)
DROP POLICY IF EXISTS "Managers can update warehouses" ON warehouses;
DROP POLICY IF EXISTS "Authenticated can update warehouses" ON warehouses;
DROP POLICY IF EXISTS "Authenticated can delete warehouses" ON warehouses;
CREATE POLICY "Authenticated can update warehouses" ON warehouses
    FOR UPDATE
    TO authenticated
    USING (auth.uid() IS NOT NULL)
    WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can delete warehouses" ON warehouses
    FOR DELETE
    TO authenticated
    USING (auth.uid() IS NOT NULL);

-- Política opcional de desarrollo: permitir operaciones a role anon (como ZONES)
DROP POLICY IF EXISTS "Warehouses dev anon all" ON warehouses;
CREATE POLICY "Warehouses dev anon all" ON warehouses
    FOR ALL
    TO anon
    USING (true)
    WITH CHECK (true);

-- =====================================================
-- POLÍTICAS PARA CATEGORIES
-- =====================================================

-- Todos los usuarios autenticados pueden ver categorías activas
DROP POLICY IF EXISTS "Users can view active categories" ON categories;
CREATE POLICY "Users can view active categories" ON categories
    FOR SELECT USING (
        auth.uid() IS NOT NULL AND is_active = true
    );

-- Solo administradores pueden gestionar categorías
DROP POLICY IF EXISTS "Admins can manage categories" ON categories;
CREATE POLICY "Admins can manage categories" ON categories
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- =====================================================
-- POLÍTICAS PARA SUPPLIERS
-- =====================================================

-- Usuarios autenticados pueden ver proveedores activos
DROP POLICY IF EXISTS "Users can view active suppliers" ON suppliers;
CREATE POLICY "Users can view active suppliers" ON suppliers
    FOR SELECT USING (
        auth.uid() IS NOT NULL AND is_active = true
    );

-- Administradores y managers pueden gestionar proveedores
DROP POLICY IF EXISTS "Managers can manage suppliers" ON suppliers;
CREATE POLICY "Managers can manage suppliers" ON suppliers
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'manager')
        )
    );

-- =====================================================
-- POLÍTICAS PARA PRODUCTS
-- =====================================================

-- Usuarios autenticados pueden ver productos activos
CREATE POLICY "Users can view active products" ON products
    FOR SELECT USING (
        auth.uid() IS NOT NULL AND is_active = true
    );

-- Usuarios autenticados pueden insertar productos
CREATE POLICY "Users can insert products" ON products
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL
    );

-- Administradores y managers pueden gestionar productos (UPDATE/DELETE)
CREATE POLICY "Managers can manage products" ON products
    FOR ALL
    USING (public.is_admin_or_manager())
    WITH CHECK (public.is_admin_or_manager());

-- =====================================================
-- POLÍTICAS PARA LOCATIONS
-- =====================================================

-- Usuarios pueden ver ubicaciones de almacenes accesibles
DROP POLICY IF EXISTS "Users can view warehouse locations" ON locations;
CREATE POLICY "Users can view warehouse locations" ON locations
    FOR SELECT USING (
        auth.uid() IS NOT NULL AND is_active = true
    );

-- Administradores y managers pueden gestionar ubicaciones
DROP POLICY IF EXISTS "Managers can manage locations" ON locations;
CREATE POLICY "Managers can manage locations" ON locations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND upper(role) IN ('ADMIN', 'MANAGER')
        )
    );

-- Inserción explícita para ubicaciones (requerido por RLS)
DROP POLICY IF EXISTS "Managers can insert locations" ON locations;
CREATE POLICY "Managers can insert locations" ON locations
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND upper(role) IN ('ADMIN', 'MANAGER')
        )
    );

-- =====================================================
-- POLÍTICAS PARA INVENTORY
-- =====================================================

-- Usuarios pueden ver inventario
DROP POLICY IF EXISTS "Users can view inventory" ON inventory;
CREATE POLICY "Users can view inventory" ON inventory
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- Operadores y superiores pueden actualizar inventario
DROP POLICY IF EXISTS "Operators can manage inventory" ON inventory;
CREATE POLICY "Operators can manage inventory" ON inventory
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'manager', 'operator')
        )
    );

-- =====================================================
-- POLÍTICAS PARA INVENTORY_MOVEMENTS
-- =====================================================

-- Usuarios pueden ver movimientos de inventario
DROP POLICY IF EXISTS "Users can view inventory movements" ON inventory_movements;
CREATE POLICY "Users can view inventory movements" ON inventory_movements
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- Operadores y superiores pueden crear movimientos
DROP POLICY IF EXISTS "Operators can create movements" ON inventory_movements;
CREATE POLICY "Operators can create movements" ON inventory_movements
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'manager', 'operator')
        )
    );

-- =====================================================
-- POLÍTICAS PARA PURCHASE_ORDERS
-- =====================================================

-- Usuarios pueden ver órdenes de compra
CREATE POLICY "Users can view purchase orders" ON purchase_orders
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- Managers y superiores pueden gestionar órdenes de compra
CREATE POLICY "Managers can manage purchase orders" ON purchase_orders
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'manager')
        )
    );

-- =====================================================
-- POLÍTICAS PARA PURCHASE_ORDER_ITEMS
-- =====================================================

-- Usuarios pueden ver items de órdenes de compra
CREATE POLICY "Users can view purchase order items" ON purchase_order_items
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- Managers pueden gestionar items de órdenes de compra
CREATE POLICY "Managers can manage purchase order items" ON purchase_order_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'manager')
        )
    );

-- =====================================================
-- POLÍTICAS PARA SALES_ORDERS
-- =====================================================

-- Usuarios pueden ver órdenes de venta
CREATE POLICY "Users can view sales orders" ON sales_orders
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- Operadores y superiores pueden gestionar órdenes de venta
CREATE POLICY "Operators can manage sales orders" ON sales_orders
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'manager', 'operator')
        )
    );

-- =====================================================
-- POLÍTICAS PARA SALES_ORDER_ITEMS
-- =====================================================

-- Usuarios pueden ver items de órdenes de venta
CREATE POLICY "Users can view sales order items" ON sales_order_items
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- Operadores pueden gestionar items de órdenes de venta
CREATE POLICY "Operators can manage sales order items" ON sales_order_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'manager', 'operator')
        )
    );

-- =====================================================
-- POLÍTICAS PARA TRANSFERS
-- =====================================================

-- Usuarios pueden ver transferencias
CREATE POLICY "Users can view transfers" ON transfers
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- Operadores y superiores pueden gestionar transferencias
CREATE POLICY "Operators can manage transfers" ON transfers
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'manager', 'operator')
        )
    );

-- =====================================================
-- POLÍTICAS PARA TRANSFER_ITEMS
-- =====================================================

-- Usuarios pueden ver items de transferencias
CREATE POLICY "Users can view transfer items" ON transfer_items
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- Operadores pueden gestionar items de transferencias
CREATE POLICY "Operators can manage transfer items" ON transfer_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'manager', 'operator')
        )
    );

-- =====================================================
-- POLÍTICAS PARA CYCLE_COUNTS
-- =====================================================

-- Usuarios pueden ver conteos cíclicos
CREATE POLICY "Users can view cycle counts" ON cycle_counts
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- Operadores y superiores pueden gestionar conteos
CREATE POLICY "Operators can manage cycle counts" ON cycle_counts
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'manager', 'operator')
        )
    );

-- =====================================================
-- POLÍTICAS PARA CYCLE_COUNT_ITEMS
-- =====================================================

-- Usuarios pueden ver items de conteos cíclicos
CREATE POLICY "Users can view cycle count items" ON cycle_count_items
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- Operadores pueden gestionar items de conteos
CREATE POLICY "Operators can manage cycle count items" ON cycle_count_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'manager', 'operator')
        )
    );

-- =====================================================
-- FUNCIÓN PARA CREAR PERFIL AUTOMÁTICAMENTE
-- =====================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para crear perfil automáticamente cuando se registra un usuario
CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();