-- This will be tracked by the migration system and should run once.

SET client_encoding = 'UTF8';

-- Clean up existing data to avoid conflicts
DELETE FROM orders;
DELETE FROM items;
DELETE FROM stocks;
DELETE FROM transports;
DELETE FROM clients;
DELETE FROM warehouses;

-- ==========================
-- WAREHOUSES
-- ==========================

INSERT INTO warehouses VALUES
('Av. Corrientes 1000', -58, -34, 'Centro'),
('Ruta 8 Km 45', -59, -34, 'Pilar'),
('Parque Industrial Sur', -58, -35, 'La Plata');

-- ==========================
-- TRANSPORT
-- ==========================

INSERT INTO transports VALUES
('AA123BB', 'Av. Corrientes 1000', 'ready'),
('AB456CD', 'Av. Corrientes 1000', 'travelling'),
('AC789EF', 'Ruta 8 Km 45', 'ready'),
('AD111GH', 'Ruta 8 Km 45', 'broken'),
('AE222IJ', 'Parque Industrial Sur', 'ready');

-- ==========================
-- STOCK TYPES
-- ==========================

INSERT INTO stocks VALUES
('NOTEBOOK', 'Notebook Lenovo ThinkPad'),
('MONITOR', 'Monitor Samsung 24 pulgadas'),
('KEYBOARD', 'Teclado Mecánico'),
('MOUSE', 'Mouse Inalámbrico'),
('PRINTER', 'Impresora Láser'),
('TABLET', 'Tablet Android'),
('PHONE', 'Teléfono IP');

-- ==========================
-- CLIENTS
-- ==========================

INSERT INTO clients VALUES
('20-11111111-1', 'pepe@gmail.com', 'San Martín 500', -58, -34, 'Banco Río'),
('20-22222222-2', 'pepe2@gmail.com','Belgrano 1200', -58, -34, 'Tech Solutions'),
('20-33333333-3', 'pepe3@gmail.com', 'Lavalle 300', -58, -35, 'Universidad Nacional'),
('20-44444444-4', 'pepe4@gmail.com', 'Mitre 890', -59, -34, 'Hospital Central'),
('20-55555555-5', 'pepe5@gmail.com', 'Rivadavia 2100', -58, -34, 'Estudio Jurídico Pérez');

-- ==========================
-- ORDERS
-- ==========================

INSERT INTO orders VALUES
('ORD001', '2026-06-10', '20-11111111-1', 'AB456CD', 'delivered'),
('ORD002', '2026-06-12', '20-22222222-2', 'AC789EF', 'travelling'),
('ORD003', '2026-06-15', '20-33333333-3', 'AE222IJ', 'preparing'),
('ORD004', '2026-06-18', '20-44444444-4', 'AA123BB', 'delivered'),
('ORD005', '2026-06-20', '20-55555555-5', 'AC789EF', 'travelling');

-- ==========================
-- ITEMS
-- Algunos asociados a pedidos
-- Otros simplemente almacenados
-- ==========================

INSERT INTO items VALUES
('ITM0001', 'NOTEBOOK', 'Av. Corrientes 1000', 'ORD001'),
('ITM0002', 'NOTEBOOK', 'Av. Corrientes 1000', 'ORD001'),
('ITM0003', 'MOUSE', 'Av. Corrientes 1000', 'ORD001'),

('ITM0004', 'MONITOR', 'Ruta 8 Km 45', 'ORD002'),
('ITM0005', 'KEYBOARD', 'Ruta 8 Km 45', 'ORD002'),

('ITM0006', 'PHONE', 'Parque Industrial Sur', 'ORD003'),
('ITM0007', 'PHONE', 'Parque Industrial Sur', 'ORD003'),
('ITM0008', 'TABLET', 'Parque Industrial Sur', 'ORD003'),

('ITM0009', 'PRINTER', 'Av. Corrientes 1000', 'ORD004'),

('ITM0010', 'MONITOR', 'Ruta 8 Km 45', 'ORD005'),
('ITM0011', 'MONITOR', 'Ruta 8 Km 45', 'ORD005'),
('ITM0012', 'KEYBOARD', 'Ruta 8 Km 45', 'ORD005'),

-- Stock libre en depósitos
('ITM0013', 'NOTEBOOK', 'Av. Corrientes 1000', NULL),
('ITM0014', 'NOTEBOOK', 'Av. Corrientes 1000', NULL),
('ITM0015', 'MONITOR', 'Av. Corrientes 1000', NULL),
('ITM0016', 'MOUSE', 'Av. Corrientes 1000', NULL),

('ITM0017', 'PHONE', 'Ruta 8 Km 45', NULL),
('ITM0018', 'PHONE', 'Ruta 8 Km 45', NULL),
('ITM0019', 'TABLET', 'Ruta 8 Km 45', NULL),

('ITM0020', 'PRINTER', 'Parque Industrial Sur', NULL),
('ITM0021', 'PRINTER', 'Parque Industrial Sur', NULL),
('ITM0022', 'KEYBOARD', 'Parque Industrial Sur', NULL),
('ITM0023', 'MOUSE', 'Parque Industrial Sur', NULL);