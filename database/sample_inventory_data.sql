-- Script para poblar las tablas de inventario con datos de ejemplo
-- Ejecutar después de crear las tablas con create_inventory_tables.sql

-- Insertar perfiles (asumiendo que los usuarios ya existen en auth.users)
INSERT INTO profiles (id, email, full_name, role, is_active) VALUES
('11111111-1111-1111-1111-111111111111', 'admin@wms.com', 'Administrador Sistema', 'ADMIN', true),
('22222222-2222-2222-2222-222222222222', 'gerente@wms.com', 'María González - Gerente', 'MANAGER', true),
('33333333-3333-3333-3333-333333333333', 'operador@wms.com', 'Carlos López - Operador', 'OPERATOR', true)
ON CONFLICT (email) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  is_active = EXCLUDED.is_active;

-- Insertar almacenes
INSERT INTO warehouses (id, name, code, address, city, country, is_active) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Almacén Central Madrid', 'MAD-01', 'Calle Industrial 123', 'Madrid', 'España', true),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Almacén Barcelona', 'BCN-01', 'Polígono Industrial Norte 45', 'Barcelona', 'España', true)
ON CONFLICT (id) DO NOTHING;

-- Insertar categorías
INSERT INTO categories (id, name, description, is_active) VALUES
('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Electrónicos', 'Dispositivos electrónicos y accesorios', true),
('dddddddd-dddd-dddd-dddd-dddddddddddd', 'Ropa', 'Prendas de vestir y accesorios textiles', true),
('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Alimentación', 'Productos alimentarios y bebidas', true),
('ffffffff-ffff-ffff-ffff-ffffffffffff', 'Hogar', 'Artículos para el hogar y decoración', true),
('gggggggg-gggg-gggg-gggg-gggggggggggg', 'Deportes', 'Equipamiento deportivo y fitness', true)
ON CONFLICT (id) DO NOTHING;

-- Insertar proveedores
INSERT INTO suppliers (id, name, contact_person, email, phone, address, city, country, is_active) VALUES
('hhhhhhhh-hhhh-hhhh-hhhh-hhhhhhhhhhhh', 'TechSupply S.L.', 'Carlos Martínez', 'carlos@techsupply.es', '+34 91 123 4567', 'Av. Tecnología 89', 'Madrid', 'España', true),
('iiiiiiii-iiii-iiii-iiii-iiiiiiiiiiii', 'Textiles Europa', 'Ana García', 'ana@textileseuropa.com', '+34 93 987 6543', 'Calle Industria 45', 'Barcelona', 'España', true),
('jjjjjjjj-jjjj-jjjj-jjjj-jjjjjjjjjjjj', 'Alimentos Frescos', 'Miguel López', 'miguel@alimentosfrescos.es', '+34 95 456 7890', 'Mercado Central 12', 'Sevilla', 'España', true),
('kkkkkkkk-kkkk-kkkk-kkkk-kkkkkkkkkkkk', 'Hogar y Más', 'Laura Fernández', 'laura@hogarymas.es', '+34 96 321 0987', 'Polígono Sur 67', 'Valencia', 'España', true)
ON CONFLICT (id) DO NOTHING;

-- Insertar productos
INSERT INTO products (id, sku, name, description, category_id, supplier_id, cost_price, selling_price, min_stock_level, reorder_point, is_active) VALUES
-- Electrónicos
('prod-001', 'ELEC-001', 'Smartphone Samsung Galaxy S24', 'Teléfono inteligente de última generación', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'hhhhhhhh-hhhh-hhhh-hhhh-hhhhhhhhhhhh', 299.99, 599.99, 50, 75, true),
('prod-002', 'ELEC-002', 'iPhone 15 Pro', 'Smartphone Apple con chip A17 Pro', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'hhhhhhhh-hhhh-hhhh-hhhh-hhhhhhhhhhhh', 799.99, 1199.99, 30, 45, true),
('prod-003', 'ELEC-003', 'Auriculares Bluetooth Sony', 'Auriculares inalámbricos con cancelación de ruido', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'hhhhhhhh-hhhh-hhhh-hhhh-hhhhhhhhhhhh', 89.99, 149.99, 100, 150, true),
('prod-004', 'ELEC-004', 'Tablet iPad Air', 'Tablet Apple de 10.9 pulgadas', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'hhhhhhhh-hhhh-hhhh-hhhh-hhhhhhhhhhhh', 449.99, 699.99, 25, 40, true),
('prod-005', 'ELEC-005', 'Smartwatch Apple Watch Series 9', 'Reloj inteligente con GPS', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'hhhhhhhh-hhhh-hhhh-hhhh-hhhhhhhhhhhh', 299.99, 449.99, 40, 60, true),

-- Ropa
('prod-006', 'ROPA-001', 'Camiseta Algodón Básica', 'Camiseta 100% algodón orgánico', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'iiiiiiii-iiii-iiii-iiii-iiiiiiiiiiii', 12.99, 24.99, 200, 300, true),
('prod-007', 'ROPA-002', 'Jeans Denim Premium', 'Pantalones vaqueros de corte clásico', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'iiiiiiii-iiii-iiii-iiii-iiiiiiiiiiii', 35.99, 69.99, 80, 120, true),
('prod-008', 'ROPA-003', 'Sudadera con Capucha', 'Sudadera unisex de algodón', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'iiiiiiii-iiii-iiii-iiii-iiiiiiiiiiii', 25.99, 49.99, 60, 90, true),
('prod-009', 'ROPA-004', 'Zapatillas Deportivas', 'Calzado deportivo para running', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'iiiiiiii-iiii-iiii-iiii-iiiiiiiiiiii', 45.99, 89.99, 50, 75, true),
('prod-010', 'ROPA-005', 'Chaqueta Impermeable', 'Chaqueta técnica resistente al agua', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'iiiiiiii-iiii-iiii-iiii-iiiiiiiiiiii', 79.99, 149.99, 30, 45, true),

-- Alimentación
('prod-011', 'ALIM-001', 'Yogur Natural Ecológico', 'Yogur natural sin azúcares añadidos', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'jjjjjjjj-jjjj-jjjj-jjjj-jjjjjjjjjjjj', 2.45, 3.99, 500, 750, true),
('prod-012', 'ALIM-002', 'Aceite de Oliva Virgen Extra', 'Aceite de oliva de primera presión en frío', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'jjjjjjjj-jjjj-jjjj-jjjj-jjjjjjjjjjjj', 8.99, 15.99, 200, 300, true),
('prod-013', 'ALIM-003', 'Pasta Integral', 'Espaguetis integrales de trigo duro', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'jjjjjjjj-jjjj-jjjj-jjjj-jjjjjjjjjjjj', 1.89, 3.49, 300, 450, true),
('prod-014', 'ALIM-004', 'Miel de Azahar', 'Miel natural de flores de azahar', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'jjjjjjjj-jjjj-jjjj-jjjj-jjjjjjjjjjjj', 6.99, 12.99, 150, 225, true),
('prod-015', 'ALIM-005', 'Café Arábica Premium', 'Granos de café tostado natural', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'jjjjjjjj-jjjj-jjjj-jjjj-jjjjjjjjjjjj', 12.99, 22.99, 100, 150, true),

-- Hogar
('prod-016', 'HOGAR-001', 'Juego de Sábanas 100% Algodón', 'Sábanas de algodón percal para cama de 150cm', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'kkkkkkkk-kkkk-kkkk-kkkk-kkkkkkkkkkkk', 29.99, 59.99, 40, 60, true),
('prod-017', 'HOGAR-002', 'Lámpara LED de Mesa', 'Lámpara de escritorio con regulador de intensidad', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'kkkkkkkk-kkkk-kkkk-kkkk-kkkkkkkkkkkk', 35.99, 69.99, 25, 40, true),
('prod-018', 'HOGAR-003', 'Cojines Decorativos', 'Set de 2 cojines de terciopelo', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'kkkkkkkk-kkkk-kkkk-kkkk-kkkkkkkkkkkk', 19.99, 39.99, 60, 90, true),
('prod-019', 'HOGAR-004', 'Espejo de Pared Redondo', 'Espejo decorativo con marco dorado', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'kkkkkkkk-kkkk-kkkk-kkkk-kkkkkkkkkkkk', 45.99, 89.99, 20, 30, true),
('prod-020', 'HOGAR-005', 'Difusor de Aromas', 'Difusor ultrasónico con aceites esenciales', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'kkkkkkkk-kkkk-kkkk-kkkk-kkkkkkkkkkkk', 25.99, 49.99, 35, 50, true);

-- Insertar ubicaciones
INSERT INTO locations (id, warehouse_id, code, name, type, is_active) VALUES
-- Almacén Madrid
('loc-001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'A-01-01', 'Pasillo A - Estante 1 - Nivel 1', 'shelf', true),
('loc-002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'A-01-02', 'Pasillo A - Estante 1 - Nivel 2', 'shelf', true),
('loc-003', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'A-02-01', 'Pasillo A - Estante 2 - Nivel 1', 'shelf', true),
('loc-004', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'B-01-01', 'Pasillo B - Estante 1 - Nivel 1', 'shelf', true),
('loc-005', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'B-02-15', 'Pasillo B - Estante 2 - Nivel 15', 'shelf', true),
('loc-006', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'C-01-08', 'Pasillo C - Estante 1 - Nivel 8', 'shelf', true),
('loc-007', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'D-01-01', 'Pasillo D - Estante 1 - Nivel 1', 'shelf', true),
('loc-008', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'E-01-01', 'Pasillo E - Estante 1 - Nivel 1', 'shelf', true),
-- Almacén Barcelona
('loc-009', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'F-01-01', 'Pasillo F - Estante 1 - Nivel 1', 'shelf', true),
('loc-010', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'G-01-01', 'Pasillo G - Estante 1 - Nivel 1', 'shelf', true)
ON CONFLICT (id) DO NOTHING;

-- Insertar inventario
INSERT INTO inventory (id, product_id, location_id, quantity, reserved_quantity, last_counted_at) VALUES
-- Electrónicos
('inv-001', 'prod-001', 'loc-001', 150, 25, NOW() - INTERVAL '2 days'),
('inv-002', 'prod-002', 'loc-001', 85, 15, NOW() - INTERVAL '1 day'),
('inv-003', 'prod-003', 'loc-002', 245, 45, NOW() - INTERVAL '3 days'),
('inv-004', 'prod-004', 'loc-002', 65, 10, NOW() - INTERVAL '1 day'),
('inv-005', 'prod-005', 'loc-003', 120, 20, NOW() - INTERVAL '2 days'),

-- Ropa
('inv-006', 'prod-006', 'loc-004', 45, 10, NOW() - INTERVAL '1 day'),
('inv-007', 'prod-007', 'loc-004', 180, 30, NOW() - INTERVAL '2 days'),
('inv-008', 'prod-008', 'loc-005', 95, 15, NOW() - INTERVAL '3 days'),
('inv-009', 'prod-009', 'loc-005', 110, 20, NOW() - INTERVAL '1 day'),
('inv-010', 'prod-010', 'loc-005', 75, 12, NOW() - INTERVAL '2 days'),

-- Alimentación
('inv-011', 'prod-011', 'loc-006', 89, 15, NOW() - INTERVAL '1 day'),
('inv-012', 'prod-012', 'loc-006', 320, 50, NOW() - INTERVAL '2 days'),
('inv-013', 'prod-013', 'loc-007', 480, 80, NOW() - INTERVAL '1 day'),
('inv-014', 'prod-014', 'loc-007', 200, 25, NOW() - INTERVAL '3 days'),
('inv-015', 'prod-015', 'loc-007', 145, 20, NOW() - INTERVAL '2 days'),

-- Hogar
('inv-016', 'prod-016', 'loc-008', 85, 15, NOW() - INTERVAL '1 day'),
('inv-017', 'prod-017', 'loc-008', 55, 8, NOW() - INTERVAL '2 days'),
('inv-018', 'prod-018', 'loc-008', 120, 20, NOW() - INTERVAL '1 day'),
('inv-019', 'prod-019', 'loc-009', 35, 5, NOW() - INTERVAL '3 days'),
('inv-020', 'prod-020', 'loc-009', 70, 10, NOW() - INTERVAL '2 days')
ON CONFLICT (id) DO NOTHING;

-- Insertar movimientos de inventario (últimos 30 días)
INSERT INTO inventory_movements (id, product_id, location_id, movement_type, quantity, reference_type, reference_id, notes, created_by) VALUES
-- Entradas recientes
('mov-001', 'prod-001', 'loc-001', 'IN', 50, 'purchase_order', 'PO-2024-001', 'Recepción pedido Samsung', '11111111-1111-1111-1111-111111111111'),
('mov-002', 'prod-002', 'loc-001', 'IN', 30, 'purchase_order', 'PO-2024-002', 'Recepción pedido iPhone', '11111111-1111-1111-1111-111111111111'),
('mov-003', 'prod-006', 'loc-004', 'IN', 200, 'purchase_order', 'PO-2024-003', 'Recepción camisetas', '22222222-2222-2222-2222-222222222222'),
('mov-004', 'prod-011', 'loc-006', 'IN', 500, 'purchase_order', 'PO-2024-004', 'Recepción yogures', '22222222-2222-2222-2222-222222222222'),

-- Salidas recientes
('mov-005', 'prod-001', 'loc-001', 'OUT', -25, 'sales_order', 'SO-2024-001', 'Venta online', '33333333-3333-3333-3333-333333333333'),
('mov-006', 'prod-002', 'loc-001', 'OUT', -15, 'sales_order', 'SO-2024-002', 'Venta tienda física', '33333333-3333-3333-3333-333333333333'),
('mov-007', 'prod-006', 'loc-004', 'OUT', -155, 'sales_order', 'SO-2024-003', 'Pedido mayorista', '33333333-3333-3333-3333-333333333333'),
('mov-008', 'prod-011', 'loc-006', 'OUT', -411, 'sales_order', 'SO-2024-004', 'Distribución supermercados', '33333333-3333-3333-3333-333333333333'),

-- Ajustes de inventario
('mov-009', 'prod-003', 'loc-002', 'ADJUSTMENT', 5, 'cycle_count', 'CC-2024-001', 'Ajuste por conteo cíclico', '22222222-2222-2222-2222-222222222222'),
('mov-010', 'prod-007', 'loc-004', 'ADJUSTMENT', -2, 'cycle_count', 'CC-2024-002', 'Ajuste por daño', '22222222-2222-2222-2222-222222222222'),

-- Transferencias internas
('mov-011', 'prod-019', 'loc-008', 'TRANSFER_OUT', -10, 'transfer', 'TR-2024-001', 'Transferencia a Barcelona', '22222222-2222-2222-2222-222222222222'),
('mov-012', 'prod-019', 'loc-009', 'TRANSFER_IN', 10, 'transfer', 'TR-2024-001', 'Recepción desde Madrid', '22222222-2222-2222-2222-222222222222')
ON CONFLICT (id) DO NOTHING;

-- Actualizar timestamps para simular actividad reciente
UPDATE inventory_movements SET created_at = NOW() - INTERVAL '1 day' WHERE id IN ('mov-001', 'mov-005');
UPDATE inventory_movements SET created_at = NOW() - INTERVAL '2 days' WHERE id IN ('mov-002', 'mov-006');
UPDATE inventory_movements SET created_at = NOW() - INTERVAL '3 days' WHERE id IN ('mov-003', 'mov-007');
UPDATE inventory_movements SET created_at = NOW() - INTERVAL '5 days' WHERE id IN ('mov-004', 'mov-008');
UPDATE inventory_movements SET created_at = NOW() - INTERVAL '7 days' WHERE id IN ('mov-009', 'mov-010');
UPDATE inventory_movements SET created_at = NOW() - INTERVAL '10 days' WHERE id IN ('mov-011', 'mov-012');

-- Mensaje de confirmación
SELECT 'Datos de ejemplo insertados correctamente en las tablas de inventario' as mensaje;