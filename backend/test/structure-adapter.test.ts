import { describe, test, expect } from 'vitest';
import { desiredSchemaFromStructure } from '../src/structure-adapter';

describe('desiredSchemaFromStructure', () => {
  const result = desiredSchemaFromStructure();

  test('emits the three tables defined in the SSOT', () => {
    expect(Object.keys(result).sort()).toEqual(['enrollments', 'students', 'subjects']);
  });

  test('skips derivable columns (student_name, subject_name)', () => {
    const enrollmentCols = Object.keys(result.enrollments.columns);
    expect(enrollmentCols).not.toContain('student_name');
    expect(enrollmentCols).not.toContain('subject_name');
  });

  test('validator.required becomes nullable: false', () => {
    expect(result.students.columns.numero_libreta.nullable).toBe(false);
    expect(result.students.columns.first_name.nullable).toBe(false);
  });

  test('absence of validator.required becomes nullable: true', () => {
    expect(result.students.columns.email.nullable).toBe(true);
    expect(result.subjects.columns.description.nullable).toBe(true);
  });

  test('validator.maxLength yields VARCHAR(N)', () => {
    expect(result.students.columns.numero_libreta.type).toBe('VARCHAR(20)');
    expect(result.students.columns.first_name.type).toBe('VARCHAR(100)');
    expect(result.students.columns.email.type).toBe('VARCHAR(255)');
  });

  test('string without maxLength falls back to TEXT', () => {
    expect(result.subjects.columns.description.type).toBe('TEXT');
  });

  test('input: date yields DATE', () => {
    expect(result.students.columns.enrollment_date.type).toBe('DATE');
  });

  test('number with validator.integer yields INTEGER', () => {
    expect(result.subjects.columns.credits.type).toBe('INTEGER');
  });

  test('number without validator.integer yields NUMERIC', () => {
    expect(result.enrollments.columns.grade.type).toBe('NUMERIC(5,2)');
  });

  test('scalar pk is normalized to array', () => {
    expect(result.students.pk).toEqual(['numero_libreta']);
  });

  test('composite pk is preserved as array', () => {
    expect(result.enrollments.pk).toEqual(['numero_libreta', 'cod_mat']);
  });
});
