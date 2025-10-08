-- =====================================================
-- SCRIPT PARA CORREGIR POLÍTICAS RLS DE PRODUCTS
-- =====================================================

-- Eliminar TODAS las políticas existentes de la tabla products
DROP POLICY IF EXISTS "Users can view active products" ON products;
DROP POLICY IF EXISTS "Users can view products" ON products;
DROP POLICY IF EXISTS "Users can insert products" ON products;
DROP POLICY IF EXISTS "Users can update products" ON products;
DROP POLICY IF EXISTS "Users can delete products" ON products;
DROP POLICY IF EXISTS "Managers can manage products" ON products;
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON products;
DROP POLICY IF EXISTS "authenticated_users_full_access" ON products;

-- Crear política única que permita todas las operaciones para usuarios autenticados
CREATE POLICY "authenticated_users_full_access" ON products
    FOR ALL USING (
        auth.uid() IS NOT NULL
    ) WITH CHECK (
        auth.uid() IS NOT NULL
    );