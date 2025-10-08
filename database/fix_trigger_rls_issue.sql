-- =====================================================
-- SCRIPT PARA RESOLVER PROBLEMA DE TRIGGER Y RLS
-- =====================================================

-- El problema puede ser que el trigger se ejecuta BEFORE UPDATE
-- pero las políticas RLS se evalúan durante INSERT/UPDATE
-- Vamos a modificar el trigger para que sea más compatible con RLS

-- 1. Primero, eliminar el trigger existente
DROP TRIGGER IF EXISTS update_products_updated_at ON products;

-- 2. Recrear el trigger con una función mejorada que sea compatible con RLS
CREATE OR REPLACE FUNCTION update_products_updated_at_safe()
RETURNS TRIGGER AS $$
BEGIN
    -- Solo actualizar updated_at si realmente es una operación UPDATE
    IF TG_OP = 'UPDATE' THEN
        NEW.updated_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Crear el nuevo trigger solo para UPDATE (no para INSERT)
CREATE TRIGGER update_products_updated_at 
    BEFORE UPDATE ON products 
    FOR EACH ROW 
    EXECUTE FUNCTION update_products_updated_at_safe();

-- 4. Verificar que las políticas RLS estén correctas
-- Eliminar todas las políticas existentes
DROP POLICY IF EXISTS "Users can view active products" ON products;
DROP POLICY IF EXISTS "Users can view products" ON products;
DROP POLICY IF EXISTS "Users can insert products" ON products;
DROP POLICY IF EXISTS "Users can update products" ON products;
DROP POLICY IF EXISTS "Users can delete products" ON products;
DROP POLICY IF EXISTS "Managers can manage products" ON products;
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON products;
DROP POLICY IF EXISTS "authenticated_users_full_access" ON products;

-- 5. Crear política simplificada que permita todas las operaciones
CREATE POLICY "products_all_operations" ON products
    FOR ALL 
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- 6. Verificar el estado final
SELECT 
    'Trigger recreado' as status,
    trigger_name, 
    event_manipulation, 
    action_timing
FROM information_schema.triggers 
WHERE event_object_table = 'products';

SELECT 
    'Políticas RLS' as status,
    policyname, 
    cmd, 
    permissive
FROM pg_policies 
WHERE tablename = 'products';