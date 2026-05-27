CREATE USER aida26_owner;
CREATE USER aida26_tester WITH PASSWORD 'testsPassword';

-- Create database
CREATE DATABASE tests_faculty_management;
alter database tests_faculty_management owner to aida26_owner;

-- Use the database
\c tests_faculty_management;
set role to aida26_owner;
GRANT connect on database tests_faculty_management to aida26_tester;

-- Students table
-- numero_libreta is the primary key, not auto-incrementing
CREATE TABLE students (
    numero_libreta VARCHAR(20) PRIMARY KEY,
    dni VARCHAR(20) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    enrollment_date DATE,
    status VARCHAR(50) -- e.g., active, graduated, interrupted
);

-- Subjects table
-- cod_mat is the primary key
CREATE TABLE subjects (
    cod_mat VARCHAR(20) PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    credits INTEGER,
    department VARCHAR(100)
);

-- Enrollments table
-- Composite primary key: numero_libreta and cod_mat
CREATE TABLE enrollments (
    numero_libreta VARCHAR(20) REFERENCES students(numero_libreta),
    cod_mat VARCHAR(20) REFERENCES subjects(cod_mat),
    enrollment_date DATE NOT NULL,
    grade DECIMAL(5,2), -- e.g., 8.5
    status VARCHAR(50), -- e.g., enrolled, completed, failed
    PRIMARY KEY (numero_libreta, cod_mat)
);

-- Indexes for performance
CREATE INDEX idx_students_status ON students(status);
CREATE INDEX idx_enrollments_status ON enrollments(status);

GRANT SELECT, UPDATE, INSERT, DELETE ON students    TO aida26_tester;
GRANT SELECT, UPDATE, INSERT, DELETE ON enrollments TO aida26_tester;
GRANT SELECT, UPDATE, INSERT, DELETE ON subjects    TO aida26_tester;
GRANT ALL PRIVILEGES
ON ALL TABLES IN SCHEMA public
TO aida26_tester;
GRANT ALL PRIVILEGES
ON ALL SEQUENCES IN SCHEMA public
TO aida26_tester;