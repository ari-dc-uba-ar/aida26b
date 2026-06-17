-- Create departments table
CREATE TABLE departments (
    dept_code VARCHAR(20) PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT
);

-- Add foreign key to subjects table
ALTER TABLE subjects
ADD COLUMN dept_code VARCHAR(20) REFERENCES departments(dept_code),
DROP COLUMN department;

-- Create indexes for foreign keys
CREATE INDEX idx_subjects_dept_code ON subjects(dept_code);