-- One-time bootstrap: creates roles, the database, and base grants.
-- Run as a Postgres superuser, once per environment:
--   psql -U postgres -f database/bootstrap.sql
--
-- After this, run migrations from the backend:
--   cd backend && npm run migrate

CREATE ROLE aida26_owner WITH LOGIN;
CREATE ROLE aida26_user  WITH LOGIN PASSWORD 'CambiaEsta!';

CREATE DATABASE faculty_management OWNER aida26_owner;

\c faculty_management
SET ROLE aida26_owner;

GRANT CONNECT ON DATABASE faculty_management TO aida26_user;
GRANT USAGE   ON SCHEMA public                TO aida26_user;

-- Default privileges so future tables (created by migrations as aida26_owner)
-- are automatically readable/writable by aida26_user without re-granting each time.
ALTER DEFAULT PRIVILEGES FOR ROLE aida26_owner IN SCHEMA public
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO aida26_user;

ALTER DEFAULT PRIVILEGES FOR ROLE aida26_owner IN SCHEMA public
    GRANT USAGE, SELECT ON SEQUENCES TO aida26_user;
