ALTER TABLE transports ENABLE ROW LEVEL SECURITY;

CREATE POLICY transports_admin_all
ON transports
FOR ALL
USING (
    current_setting('app.role', true) = 'admin'
);

CREATE POLICY transports_driver_select
ON transports
FOR SELECT
USING (
    current_setting('app.role', true) = 'driver'
    AND
    license_plate = current_setting('app.transport_license', true)
);

CREATE POLICY transports_driver_update
ON transports
FOR UPDATE
USING (
    current_setting('app.role', true) = 'driver'
    AND
    license_plate = current_setting('app.transport_license', true)
);
