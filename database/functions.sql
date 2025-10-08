-- =====================================================
-- FUNCIONES Y TRIGGERS PARA EL SISTEMA WMS
-- =====================================================

-- =====================================================
-- FUNCIÓN: Actualizar timestamp de updated_at
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger a todas las tablas que tienen updated_at
CREATE OR REPLACE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_warehouses_updated_at
    BEFORE UPDATE ON warehouses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_categories_updated_at
    BEFORE UPDATE ON categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_suppliers_updated_at
    BEFORE UPDATE ON suppliers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_locations_updated_at
    BEFORE UPDATE ON locations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_inventory_updated_at
    BEFORE UPDATE ON inventory
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_purchase_orders_updated_at
    BEFORE UPDATE ON purchase_orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_sales_orders_updated_at
    BEFORE UPDATE ON sales_orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_transfers_updated_at
    BEFORE UPDATE ON transfers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_cycle_counts_updated_at
    BEFORE UPDATE ON cycle_counts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- FUNCIÓN: Actualizar inventario basado en movimientos
-- =====================================================
CREATE OR REPLACE FUNCTION update_inventory_from_movement()
RETURNS TRIGGER AS $$
DECLARE
    current_inventory RECORD;
BEGIN
    -- Buscar el registro de inventario existente
    SELECT * INTO current_inventory
    FROM inventory
    WHERE product_id = NEW.product_id
    AND warehouse_id = NEW.warehouse_id
    AND location_id = NEW.location_id
    AND (lot_number = NEW.lot_number OR (lot_number IS NULL AND NEW.lot_number IS NULL));

    -- Si no existe el registro de inventario, crearlo
    IF NOT FOUND THEN
        INSERT INTO inventory (
            product_id, 
            warehouse_id, 
            location_id, 
            quantity, 
            lot_number, 
            expiry_date,
            last_movement_at
        ) VALUES (
            NEW.product_id,
            NEW.warehouse_id,
            NEW.location_id,
            CASE 
                WHEN NEW.movement_type = 'IN' THEN NEW.quantity
                WHEN NEW.movement_type = 'OUT' THEN -NEW.quantity
                ELSE 0
            END,
            NEW.lot_number,
            NEW.expiry_date,
            NEW.created_at
        );
    ELSE
        -- Actualizar el inventario existente
        UPDATE inventory
        SET 
            quantity = quantity + CASE 
                WHEN NEW.movement_type = 'IN' THEN NEW.quantity
                WHEN NEW.movement_type = 'OUT' THEN -NEW.quantity
                ELSE 0
            END,
            last_movement_at = NEW.created_at
        WHERE id = current_inventory.id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar inventario automáticamente
CREATE OR REPLACE TRIGGER update_inventory_on_movement
    AFTER INSERT ON inventory_movements
    FOR EACH ROW EXECUTE FUNCTION update_inventory_from_movement();

-- =====================================================
-- FUNCIÓN: Generar números automáticos para órdenes
-- =====================================================
CREATE OR REPLACE FUNCTION generate_po_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.po_number IS NULL OR NEW.po_number = '' THEN
        NEW.po_number := 'PO-' || TO_CHAR(NOW(), 'YYYY') || '-' || 
                        LPAD(NEXTVAL('po_sequence')::TEXT, 6, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_so_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.so_number IS NULL OR NEW.so_number = '' THEN
        NEW.so_number := 'SO-' || TO_CHAR(NOW(), 'YYYY') || '-' || 
                        LPAD(NEXTVAL('so_sequence')::TEXT, 6, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_transfer_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.transfer_number IS NULL OR NEW.transfer_number = '' THEN
        NEW.transfer_number := 'TR-' || TO_CHAR(NOW(), 'YYYY') || '-' || 
                              LPAD(NEXTVAL('transfer_sequence')::TEXT, 6, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear secuencias para numeración automática
CREATE SEQUENCE IF NOT EXISTS po_sequence START 1;
CREATE SEQUENCE IF NOT EXISTS so_sequence START 1;
CREATE SEQUENCE IF NOT EXISTS transfer_sequence START 1;

-- Triggers para generar números automáticamente
CREATE OR REPLACE TRIGGER generate_po_number_trigger
    BEFORE INSERT ON purchase_orders
    FOR EACH ROW EXECUTE FUNCTION generate_po_number();

CREATE OR REPLACE TRIGGER generate_so_number_trigger
    BEFORE INSERT ON sales_orders
    FOR EACH ROW EXECUTE FUNCTION generate_so_number();

CREATE OR REPLACE TRIGGER generate_transfer_number_trigger
    BEFORE INSERT ON transfers
    FOR EACH ROW EXECUTE FUNCTION generate_transfer_number();

-- =====================================================
-- FUNCIÓN: Calcular totales de órdenes de compra
-- =====================================================
CREATE OR REPLACE FUNCTION update_purchase_order_total()
RETURNS TRIGGER AS $$
DECLARE
    order_total DECIMAL(12,2);
BEGIN
    -- Calcular el total de la orden
    SELECT COALESCE(SUM(total_price), 0) INTO order_total
    FROM purchase_order_items
    WHERE purchase_order_id = COALESCE(NEW.purchase_order_id, OLD.purchase_order_id);

    -- Actualizar el total en la orden de compra
    UPDATE purchase_orders
    SET total_amount = order_total
    WHERE id = COALESCE(NEW.purchase_order_id, OLD.purchase_order_id);

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar totales automáticamente
CREATE OR REPLACE TRIGGER update_po_total_on_item_change
    AFTER INSERT OR UPDATE OR DELETE ON purchase_order_items
    FOR EACH ROW EXECUTE FUNCTION update_purchase_order_total();

-- =====================================================
-- FUNCIÓN: Calcular totales de órdenes de venta
-- =====================================================
CREATE OR REPLACE FUNCTION update_sales_order_total()
RETURNS TRIGGER AS $$
DECLARE
    order_total DECIMAL(12,2);
BEGIN
    -- Calcular el total de la orden
    SELECT COALESCE(SUM(total_price), 0) INTO order_total
    FROM sales_order_items
    WHERE sales_order_id = COALESCE(NEW.sales_order_id, OLD.sales_order_id);

    -- Actualizar el total en la orden de venta
    UPDATE sales_orders
    SET total_amount = order_total
    WHERE id = COALESCE(NEW.sales_order_id, OLD.sales_order_id);

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar totales automáticamente
CREATE OR REPLACE TRIGGER update_so_total_on_item_change
    AFTER INSERT OR UPDATE OR DELETE ON sales_order_items
    FOR EACH ROW EXECUTE FUNCTION update_sales_order_total();

-- =====================================================
-- FUNCIÓN: Validar stock disponible
-- =====================================================
CREATE OR REPLACE FUNCTION check_stock_availability(
    p_product_id UUID,
    p_warehouse_id UUID,
    p_quantity INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
    available_qty INTEGER;
BEGIN
    SELECT COALESCE(SUM(available_quantity), 0) INTO available_qty
    FROM inventory
    WHERE product_id = p_product_id
    AND warehouse_id = p_warehouse_id;

    RETURN available_qty >= p_quantity;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FUNCIÓN: Reservar inventario
-- =====================================================
CREATE OR REPLACE FUNCTION reserve_inventory(
    p_product_id UUID,
    p_warehouse_id UUID,
    p_quantity INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
    remaining_qty INTEGER := p_quantity;
    inv_record RECORD;
BEGIN
    -- Verificar que hay suficiente stock disponible
    IF NOT check_stock_availability(p_product_id, p_warehouse_id, p_quantity) THEN
        RETURN FALSE;
    END IF;

    -- Reservar inventario usando FIFO (First In, First Out)
    FOR inv_record IN
        SELECT id, available_quantity
        FROM inventory
        WHERE product_id = p_product_id
        AND warehouse_id = p_warehouse_id
        AND available_quantity > 0
        ORDER BY created_at ASC
    LOOP
        IF remaining_qty <= 0 THEN
            EXIT;
        END IF;

        IF inv_record.available_quantity >= remaining_qty THEN
            -- Este registro tiene suficiente stock
            UPDATE inventory
            SET reserved_quantity = reserved_quantity + remaining_qty
            WHERE id = inv_record.id;
            remaining_qty := 0;
        ELSE
            -- Reservar todo lo disponible en este registro
            UPDATE inventory
            SET reserved_quantity = reserved_quantity + inv_record.available_quantity
            WHERE id = inv_record.id;
            remaining_qty := remaining_qty - inv_record.available_quantity;
        END IF;
    END LOOP;

    RETURN remaining_qty = 0;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FUNCIÓN: Liberar inventario reservado
-- =====================================================
CREATE OR REPLACE FUNCTION release_inventory(
    p_product_id UUID,
    p_warehouse_id UUID,
    p_quantity INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
    remaining_qty INTEGER := p_quantity;
    inv_record RECORD;
BEGIN
    -- Liberar inventario reservado usando FIFO
    FOR inv_record IN
        SELECT id, reserved_quantity
        FROM inventory
        WHERE product_id = p_product_id
        AND warehouse_id = p_warehouse_id
        AND reserved_quantity > 0
        ORDER BY created_at ASC
    LOOP
        IF remaining_qty <= 0 THEN
            EXIT;
        END IF;

        IF inv_record.reserved_quantity >= remaining_qty THEN
            -- Este registro tiene suficiente reservado
            UPDATE inventory
            SET reserved_quantity = reserved_quantity - remaining_qty
            WHERE id = inv_record.id;
            remaining_qty := 0;
        ELSE
            -- Liberar todo lo reservado en este registro
            UPDATE inventory
            SET reserved_quantity = 0
            WHERE id = inv_record.id;
            remaining_qty := remaining_qty - inv_record.reserved_quantity;
        END IF;
    END LOOP;

    RETURN remaining_qty = 0;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FUNCIÓN: Obtener stock disponible por producto
-- =====================================================
CREATE OR REPLACE FUNCTION get_available_stock(
    p_product_id UUID,
    p_warehouse_id UUID DEFAULT NULL
) RETURNS TABLE (
    warehouse_id UUID,
    warehouse_name TEXT,
    total_quantity INTEGER,
    reserved_quantity INTEGER,
    available_quantity INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        i.warehouse_id,
        w.name as warehouse_name,
        SUM(i.quantity)::INTEGER as total_quantity,
        SUM(i.reserved_quantity)::INTEGER as reserved_quantity,
        SUM(i.available_quantity)::INTEGER as available_quantity
    FROM inventory i
    JOIN warehouses w ON w.id = i.warehouse_id
    WHERE i.product_id = p_product_id
    AND (p_warehouse_id IS NULL OR i.warehouse_id = p_warehouse_id)
    GROUP BY i.warehouse_id, w.name
    ORDER BY w.name;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FUNCIÓN: Obtener productos con bajo stock
-- =====================================================
CREATE OR REPLACE FUNCTION get_low_stock_products(
    p_warehouse_id UUID DEFAULT NULL
) RETURNS TABLE (
    product_id UUID,
    product_sku TEXT,
    product_name TEXT,
    warehouse_id UUID,
    warehouse_name TEXT,
    current_stock INTEGER,
    min_stock_level INTEGER,
    reorder_point INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id as product_id,
        p.sku as product_sku,
        p.name as product_name,
        w.id as warehouse_id,
        w.name as warehouse_name,
        COALESCE(SUM(i.available_quantity), 0)::INTEGER as current_stock,
        p.min_stock_level,
        p.reorder_point
    FROM products p
    CROSS JOIN warehouses w
    LEFT JOIN inventory i ON i.product_id = p.id AND i.warehouse_id = w.id
    WHERE p.is_active = true
    AND w.is_active = true
    AND (p_warehouse_id IS NULL OR w.id = p_warehouse_id)
    GROUP BY p.id, p.sku, p.name, w.id, w.name, p.min_stock_level, p.reorder_point
    HAVING COALESCE(SUM(i.available_quantity), 0) <= p.reorder_point
    ORDER BY p.name, w.name;
END;
$$ LANGUAGE plpgsql;