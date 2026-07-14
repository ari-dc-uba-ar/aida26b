CREATE POLICY orders_client_update
ON orders
FOR UPDATE
USING (
    current_setting('app.role', true) = 'client'
    AND
    cuit_client = current_setting('app.client_cuit', true)
);
