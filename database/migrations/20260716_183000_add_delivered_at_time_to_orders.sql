-- Add delivered_at_time column to orders table
ALTER TABLE orders ADD COLUMN delivered_at_time TIMESTAMPTZ DEFAULT NULL;

-- Make plate_transport column nullable so that orders can be unassigned when a transport breaks down
ALTER TABLE orders ALTER COLUMN plate_transport DROP NOT NULL;
