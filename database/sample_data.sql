-- =====================================================
-- DATOS DE EJEMPLO PARA EL SISTEMA WMS
-- =====================================================

-- =====================================================
-- CATEGORÍAS DE PRODUCTOS
-- =====================================================
INSERT INTO categories (id, name, description) VALUES
    ('550e8400-e29b-41d4-a716-446655440001', 'Electrónicos', 'Productos electrónicos y tecnológicos'),
    ('550e8400-e29b-41d4-a716-446655440002', 'Ropa', 'Prendas de vestir y accesorios'),
    ('550e8400-e29b-41d4-a716-446655440003', 'Hogar', 'Artículos para el hogar y decoración'),
    ('550e8400-e29b-41d4-a716-446655440004', 'Deportes', 'Equipamiento deportivo y fitness'),
    ('550e8400-e29b-41d4-a716-446655440005', 'Libros', 'Libros y material educativo');

-- Subcategorías
INSERT INTO categories (id, name, description, parent_id) VALUES
    ('550e8400-e29b-41d4-a716-446655440011', 'Smartphones', 'Teléfonos inteligentes', '550e8400-e29b-41d4-a716-446655440001'),
    ('550e8400-e29b-41d4-a716-446655440012', 'Laptops', 'Computadoras portátiles', '550e8400-e29b-41d4-a716-446655440001'),
    ('550e8400-e29b-41d4-a716-446655440013', 'Camisetas', 'Camisetas y playeras', '550e8400-e29b-41d4-a716-446655440002'),
    ('550e8400-e29b-41d4-a716-446655440014', 'Pantalones', 'Pantalones y jeans', '550e8400-e29b-41d4-a716-446655440002');

-- =====================================================
-- PROVEEDORES
-- =====================================================
INSERT INTO suppliers (id, name, code, contact_person, email, phone, address, city, state, tax_id) VALUES
    ('660e8400-e29b-41d4-a716-446655440001', 'TechSupply México', 'TECH001', 'Juan Pérez', 'juan@techsupply.mx', '+52 55 1234 5678', 'Av. Tecnología 123', 'Ciudad de México', 'CDMX', 'TSM123456789'),
    ('660e8400-e29b-41d4-a716-446655440002', 'Textiles del Norte', 'TEXT001', 'María González', 'maria@textilesnorte.mx', '+52 81 9876 5432', 'Calle Industria 456', 'Monterrey', 'Nuevo León', 'TDN987654321'),
    ('660e8400-e29b-41d4-a716-446655440003', 'Hogar y Más', 'HOGAR001', 'Carlos López', 'carlos@hogarymas.mx', '+52 33 5555 1234', 'Blvd. Hogar 789', 'Guadalajara', 'Jalisco', 'HYM555123456'),
    ('660e8400-e29b-41d4-a716-446655440004', 'Deportes Pro', 'DEP001', 'Ana Martínez', 'ana@deportespro.mx', '+52 55 7777 8888', 'Av. Deportiva 321', 'Ciudad de México', 'CDMX', 'DPR777888999');

-- =====================================================
-- ALMACENES
-- =====================================================
INSERT INTO warehouses (id, name, code, address, city, state, postal_code) VALUES
    ('770e8400-e29b-41d4-a716-446655440001', 'Almacén Central CDMX', 'WH001', 'Av. Logística 100', 'Ciudad de México', 'CDMX', '01000'),
    ('770e8400-e29b-41d4-a716-446655440002', 'Almacén Norte', 'WH002', 'Calle Industrial 200', 'Monterrey', 'Nuevo León', '64000'),
    ('770e8400-e29b-41d4-a716-446655440003', 'Almacén Occidente', 'WH003', 'Blvd. Comercial 300', 'Guadalajara', 'Jalisco', '44100');

-- =====================================================
-- UBICACIONES EN ALMACENES
-- =====================================================
INSERT INTO locations (id, warehouse_id, code, name, zone, aisle, rack, shelf) VALUES
    -- Almacén Central CDMX
    ('880e8400-e29b-41d4-a716-446655440001', '770e8400-e29b-41d4-a716-446655440001', 'A-01-R01-S01', 'Zona A - Electrónicos', 'A', '01', 'R01', 'S01'),
    ('880e8400-e29b-41d4-a716-446655440002', '770e8400-e29b-41d4-a716-446655440001', 'A-01-R01-S02', 'Zona A - Electrónicos', 'A', '01', 'R01', 'S02'),
    ('880e8400-e29b-41d4-a716-446655440003', '770e8400-e29b-41d4-a716-446655440001', 'B-01-R01-S01', 'Zona B - Ropa', 'B', '01', 'R01', 'S01'),
    ('880e8400-e29b-41d4-a716-446655440004', '770e8400-e29b-41d4-a716-446655440001', 'C-01-R01-S01', 'Zona C - Hogar', 'C', '01', 'R01', 'S01'),
    
    -- Almacén Norte
    ('880e8400-e29b-41d4-a716-446655440005', '770e8400-e29b-41d4-a716-446655440002', 'A-01-R01-S01', 'Zona A - General', 'A', '01', 'R01', 'S01'),
    ('880e8400-e29b-41d4-a716-446655440006', '770e8400-e29b-41d4-a716-446655440002', 'A-01-R01-S02', 'Zona A - General', 'A', '01', 'R01', 'S02'),
    
    -- Almacén Occidente
    ('880e8400-e29b-41d4-a716-446655440007', '770e8400-e29b-41d4-a716-446655440003', 'A-01-R01-S01', 'Zona A - Deportes', 'A', '01', 'R01', 'S01'),
    ('880e8400-e29b-41d4-a716-446655440008', '770e8400-e29b-41d4-a716-446655440003', 'B-01-R01-S01', 'Zona B - Varios', 'B', '01', 'R01', 'S01');

-- =====================================================
-- PRODUCTOS
-- =====================================================
INSERT INTO products (id, sku, name, description, category_id, supplier_id, unit_of_measure, cost_price, selling_price, min_stock_level, reorder_point, barcode) VALUES
    -- Electrónicos
    ('990e8400-e29b-41d4-a716-446655440001', 'IPHONE15-128', 'iPhone 15 128GB', 'Smartphone Apple iPhone 15 de 128GB', '550e8400-e29b-41d4-a716-446655440011', '660e8400-e29b-41d4-a716-446655440001', 'PCS', 18000.00, 25000.00, 5, 10, '1234567890123'),
    ('990e8400-e29b-41d4-a716-446655440002', 'SAMSUNG-A54', 'Samsung Galaxy A54', 'Smartphone Samsung Galaxy A54 5G', '550e8400-e29b-41d4-a716-446655440011', '660e8400-e29b-41d4-a716-446655440001', 'PCS', 8000.00, 12000.00, 10, 15, '2345678901234'),
    ('990e8400-e29b-41d4-a716-446655440003', 'LAPTOP-HP-15', 'Laptop HP Pavilion 15', 'Laptop HP Pavilion 15 Intel i5 8GB RAM', '550e8400-e29b-41d4-a716-446655440012', '660e8400-e29b-41d4-a716-446655440001', 'PCS', 12000.00, 18000.00, 3, 5, '3456789012345'),
    
    -- Ropa
    ('990e8400-e29b-41d4-a716-446655440004', 'CAMISETA-NIKE-M', 'Camiseta Nike Dri-FIT M', 'Camiseta deportiva Nike talla M', '550e8400-e29b-41d4-a716-446655440013', '660e8400-e29b-41d4-a716-446655440002', 'PCS', 300.00, 599.00, 20, 30, '4567890123456'),
    ('990e8400-e29b-41d4-a716-446655440005', 'JEANS-LEVIS-32', 'Jeans Levi\'s 501 Talla 32', 'Jeans clásicos Levi\'s 501 talla 32', '550e8400-e29b-41d4-a716-446655440014', '660e8400-e29b-41d4-a716-446655440002', 'PCS', 800.00, 1500.00, 15, 25, '5678901234567'),
    
    -- Hogar
    ('990e8400-e29b-41d4-a716-446655440006', 'SILLA-OFICINA', 'Silla de Oficina Ergonómica', 'Silla ergonómica para oficina con soporte lumbar', '550e8400-e29b-41d4-a716-446655440003', '660e8400-e29b-41d4-a716-446655440003', 'PCS', 2000.00, 3500.00, 5, 8, '6789012345678'),
    
    -- Deportes
    ('990e8400-e29b-41d4-a716-446655440007', 'BALON-FUTBOL', 'Balón de Fútbol Profesional', 'Balón de fútbol profesional FIFA approved', '550e8400-e29b-41d4-a716-446655440004', '660e8400-e29b-41d4-a716-446655440004', 'PCS', 400.00, 800.00, 25, 40, '7890123456789'),
    ('990e8400-e29b-41d4-a716-446655440008', 'TENIS-NIKE-42', 'Tenis Nike Air Max Talla 42', 'Tenis deportivos Nike Air Max talla 42', '550e8400-e29b-41d4-a716-446655440004', '660e8400-e29b-41d4-a716-446655440004', 'PCS', 1500.00, 2800.00, 8, 12, '8901234567890');

-- =====================================================
-- INVENTARIO INICIAL
-- =====================================================
INSERT INTO inventory (product_id, warehouse_id, location_id, quantity, lot_number) VALUES
    -- Almacén Central CDMX
    ('990e8400-e29b-41d4-a716-446655440001', '770e8400-e29b-41d4-a716-446655440001', '880e8400-e29b-41d4-a716-446655440001', 25, 'LOT001'),
    ('990e8400-e29b-41d4-a716-446655440002', '770e8400-e29b-41d4-a716-446655440001', '880e8400-e29b-41d4-a716-446655440001', 40, 'LOT002'),
    ('990e8400-e29b-41d4-a716-446655440003', '770e8400-e29b-41d4-a716-446655440001', '880e8400-e29b-41d4-a716-446655440002', 15, 'LOT003'),
    ('990e8400-e29b-41d4-a716-446655440004', '770e8400-e29b-41d4-a716-446655440001', '880e8400-e29b-41d4-a716-446655440003', 100, 'LOT004'),
    ('990e8400-e29b-41d4-a716-446655440005', '770e8400-e29b-41d4-a716-446655440001', '880e8400-e29b-41d4-a716-446655440003', 60, 'LOT005'),
    ('990e8400-e29b-41d4-a716-446655440006', '770e8400-e29b-41d4-a716-446655440001', '880e8400-e29b-41d4-a716-446655440004', 12, 'LOT006'),
    
    -- Almacén Norte
    ('990e8400-e29b-41d4-a716-446655440001', '770e8400-e29b-41d4-a716-446655440002', '880e8400-e29b-41d4-a716-446655440005', 15, 'LOT007'),
    ('990e8400-e29b-41d4-a716-446655440004', '770e8400-e29b-41d4-a716-446655440002', '880e8400-e29b-41d4-a716-446655440005', 80, 'LOT008'),
    ('990e8400-e29b-41d4-a716-446655440005', '770e8400-e29b-41d4-a716-446655440002', '880e8400-e29b-41d4-a716-446655440006', 45, 'LOT009'),
    
    -- Almacén Occidente
    ('990e8400-e29b-41d4-a716-446655440007', '770e8400-e29b-41d4-a716-446655440003', '880e8400-e29b-41d4-a716-446655440007', 150, 'LOT010'),
    ('990e8400-e29b-41d4-a716-446655440008', '770e8400-e29b-41d4-a716-446655440003', '880e8400-e29b-41d4-a716-446655440007', 30, 'LOT011');

-- =====================================================
-- ÓRDENES DE COMPRA DE EJEMPLO
-- =====================================================
INSERT INTO purchase_orders (id, po_number, supplier_id, warehouse_id, status, order_date, expected_date, total_amount) VALUES
    ('aa0e8400-e29b-41d4-a716-446655440001', 'PO-2024-000001', '660e8400-e29b-41d4-a716-446655440001', '770e8400-e29b-41d4-a716-446655440001', 'confirmed', '2024-01-15', '2024-01-25', 540000.00),
    ('aa0e8400-e29b-41d4-a716-446655440002', 'PO-2024-000002', '660e8400-e29b-41d4-a716-446655440002', '770e8400-e29b-41d4-a716-446655440001', 'received', '2024-01-10', '2024-01-20', 95000.00);

-- Items de órdenes de compra
INSERT INTO purchase_order_items (purchase_order_id, product_id, quantity, unit_price) VALUES
    ('aa0e8400-e29b-41d4-a716-446655440001', '990e8400-e29b-41d4-a716-446655440001', 20, 18000.00),
    ('aa0e8400-e29b-41d4-a716-446655440001', '990e8400-e29b-41d4-a716-446655440003', 10, 12000.00),
    ('aa0e8400-e29b-41d4-a716-446655440002', '990e8400-e29b-41d4-a716-446655440004', 100, 300.00),
    ('aa0e8400-e29b-41d4-a716-446655440002', '990e8400-e29b-41d4-a716-446655440005', 80, 800.00);

-- =====================================================
-- ÓRDENES DE VENTA DE EJEMPLO
-- =====================================================
INSERT INTO sales_orders (id, so_number, customer_name, customer_email, warehouse_id, status, order_date, required_date, total_amount) VALUES
    ('bb0e8400-e29b-41d4-a716-446655440001', 'SO-2024-000001', 'Empresa ABC S.A.', 'compras@empresaabc.com', '770e8400-e29b-41d4-a716-446655440001', 'confirmed', '2024-01-20', '2024-01-25', 75000.00),
    ('bb0e8400-e29b-41d4-a716-446655440002', 'SO-2024-000002', 'Tienda XYZ', 'pedidos@tiendaxyz.com', '770e8400-e29b-41d4-a716-446655440002', 'picking', '2024-01-22', '2024-01-28', 36000.00);

-- Items de órdenes de venta
INSERT INTO sales_order_items (sales_order_id, product_id, quantity, unit_price) VALUES
    ('bb0e8400-e29b-41d4-a716-446655440001', '990e8400-e29b-41d4-a716-446655440001', 3, 25000.00),
    ('bb0e8400-e29b-41d4-a716-446655440002', '990e8400-e29b-41d4-a716-446655440002', 3, 12000.00);

-- =====================================================
-- MOVIMIENTOS DE INVENTARIO INICIALES
-- =====================================================
INSERT INTO inventory_movements (product_id, warehouse_id, location_id, movement_type, transaction_type, quantity, unit_cost, reference_number, reference_type, lot_number, reason) VALUES
    -- Recepción inicial de inventario
    ('990e8400-e29b-41d4-a716-446655440001', '770e8400-e29b-41d4-a716-446655440001', '880e8400-e29b-41d4-a716-446655440001', 'IN', 'RECEIPT', 25, 18000.00, 'PO-2024-000001', 'purchase_order', 'LOT001', 'Recepción inicial de inventario'),
    ('990e8400-e29b-41d4-a716-446655440002', '770e8400-e29b-41d4-a716-446655440001', '880e8400-e29b-41d4-a716-446655440001', 'IN', 'RECEIPT', 40, 8000.00, 'INV-INICIAL', 'initial_stock', 'LOT002', 'Inventario inicial'),
    ('990e8400-e29b-41d4-a716-446655440003', '770e8400-e29b-41d4-a716-446655440001', '880e8400-e29b-41d4-a716-446655440002', 'IN', 'RECEIPT', 15, 12000.00, 'PO-2024-000001', 'purchase_order', 'LOT003', 'Recepción inicial de inventario'),
    ('990e8400-e29b-41d4-a716-446655440004', '770e8400-e29b-41d4-a716-446655440001', '880e8400-e29b-41d4-a716-446655440003', 'IN', 'RECEIPT', 100, 300.00, 'PO-2024-000002', 'purchase_order', 'LOT004', 'Recepción de camisetas'),
    ('990e8400-e29b-41d4-a716-446655440005', '770e8400-e29b-41d4-a716-446655440001', '880e8400-e29b-41d4-a716-446655440003', 'IN', 'RECEIPT', 60, 800.00, 'PO-2024-000002', 'purchase_order', 'LOT005', 'Recepción de jeans');

-- =====================================================
-- TRANSFERENCIAS DE EJEMPLO
-- =====================================================
INSERT INTO transfers (id, transfer_number, from_warehouse_id, to_warehouse_id, status, transfer_date, expected_date) VALUES
    ('cc0e8400-e29b-41d4-a716-446655440001', 'TR-2024-000001', '770e8400-e29b-41d4-a716-446655440001', '770e8400-e29b-41d4-a716-446655440002', 'received', '2024-01-18', '2024-01-22');

-- Items de transferencias
INSERT INTO transfer_items (transfer_id, product_id, quantity, received_quantity, lot_number) VALUES
    ('cc0e8400-e29b-41d4-a716-446655440001', '990e8400-e29b-41d4-a716-446655440001', 10, 10, 'LOT001'),
    ('cc0e8400-e29b-41d4-a716-446655440001', '990e8400-e29b-41d4-a716-446655440004', 50, 50, 'LOT004');

-- =====================================================
-- CONTEOS CÍCLICOS DE EJEMPLO
-- =====================================================
INSERT INTO cycle_counts (id, count_number, warehouse_id, location_id, status, count_date, count_type) VALUES
    ('dd0e8400-e29b-41d4-a716-446655440001', 'CC-2024-000001', '770e8400-e29b-41d4-a716-446655440001', '880e8400-e29b-41d4-a716-446655440001', 'completed', '2024-01-25', 'cycle');

-- Items de conteos cíclicos
INSERT INTO cycle_count_items (cycle_count_id, product_id, location_id, system_quantity, counted_quantity, lot_number) VALUES
    ('dd0e8400-e29b-41d4-a716-446655440001', '990e8400-e29b-41d4-a716-446655440001', '880e8400-e29b-41d4-a716-446655440001', 25, 24, 'LOT001'),
    ('dd0e8400-e29b-41d4-a716-446655440001', '990e8400-e29b-41d4-a716-446655440002', '880e8400-e29b-41d4-a716-446655440001', 40, 40, 'LOT002');