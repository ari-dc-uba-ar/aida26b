import { structure } from '../ssot/structure';
import { getPkFields } from '../utils/utils';
import type { ColumnDef, ColumnValidator, TableKey, TableRecordMap } from '../types/types';

export type ParseResult<T extends TableKey> = { data: TableRecordMap[T] } | { errors: string[] };

const MS_PER_DAY = 24 * 60 * 60 * 1000;
// Argentina (America/Argentina/Buenos_Aires) is UTC-3 all year - no daylight saving.
const ARGENTINA_OFFSET_MS = -3 * 60 * 60 * 1000;

const regexCache = new Map<string, RegExp>();
function getRegex(source: string): RegExp {
  let re = regexCache.get(source);
  if (!re) { re = new RegExp(source); regexCache.set(source, re); }
  return re;
}

function offsetText(days: number): string {
  if (days === 0) return 'today';
  return days > 0 ? `${days} day(s) in the future` : `${-days} day(s) in the past`;
}

function literalDay(d: Date): number {
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

function argentinaDay(ms: number): number {
  const local = new Date(ms + ARGENTINA_OFFSET_MS);
  return Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate());
}

function checkDate(key: string, v: ColumnValidator, value: unknown): string | undefined {
  const parsed = new Date(value as string);
  if (isNaN(parsed.getTime())) return `${key} must be a valid date`;

  const day = literalDay(parsed);

  if (v.minDate && day < literalDay(new Date(v.minDate))) {
    return `${key} must be on or after ${v.minDate}`;
  }

  const diffDays = Math.round((day - argentinaDay(Date.now())) / MS_PER_DAY);
  if (typeof v.maxDayOffset === 'number' && diffDays > v.maxDayOffset) {
    return v.maxDayOffset === 0 ? `${key} must not be in the future` : `${key} must be on or before ${offsetText(v.maxDayOffset)}`;
  }
  if (typeof v.minDayOffset === 'number' && diffDays < v.minDayOffset) {
    return v.minDayOffset === 0 ? `${key} must not be in the past` : `${key} must be on or after ${offsetText(v.minDayOffset)}`;
  }

  return undefined;
}

function checkValue(key: string, col: ColumnDef, value: unknown): string | undefined {
  const v = col.validator ?? {};

  switch (col.type) {
    case 'string':
      if (typeof value !== 'string') return `${key} must be a string`;
      break;
    case 'number':
      if (typeof value !== 'number' || isNaN(value)) return `${key} must be a number`;
      if (v.integer && !Number.isInteger(value)) return `${key} must be an integer`;
      break;
    case 'boolean':
      if (typeof value !== 'boolean') return `${key} must be a boolean`;
      break;
  }

  if (col.type === 'date' || col.input === 'date') {
    const dateError = checkDate(key, v, value);
    if (dateError) return dateError;
  }

  if (col.options && !col.options.some((o) => o.value === value)) {
    return `${key} must be one of: ${col.options.map((o) => o.value).join(', ')}`;
  }

  if (v.pattern && (typeof value !== 'string' || !getRegex(v.pattern).test(value))) {
    return v.patternMessage ? `${key} ${v.patternMessage}` : `${key} has an invalid format`;
  }

  if (typeof value === 'string') {
    if (typeof v.minLength === 'number' && value.length < v.minLength) return `${key} must be at least ${v.minLength} characters`;
    if (typeof v.maxLength === 'number' && value.length > v.maxLength) return `${key} must be at most ${v.maxLength} characters`;
  }
  if (typeof value === 'number') {
    if (typeof v.minValue === 'number' && value < v.minValue) return `${key} must be >= ${v.minValue}`;
    if (typeof v.maxValue === 'number' && value > v.maxValue) return `${key} must be <= ${v.maxValue}`;
  }

  return undefined;
}

function normalizeValue(col: ColumnDef, value: unknown): unknown {
  const norm = col.validator?.normalize;
  return norm && typeof value === 'string'
    ? value.replace(getRegex(norm.pattern), norm.replacement)
    : value;
}

function editableColumns(table: TableKey): string[] {
  return Object.entries(structure.tables[table].columns as Record<string, ColumnDef>)
    .filter(([, col]) => col.editable !== false && col.persist !== false)
    .map(([key]) => key);
}

function isEmpty(col: ColumnDef, value: unknown): boolean {
  return value === null || value === undefined || (col.type === 'string' && value === '');
}

export function validateField(table: TableKey, column: string, value: unknown): string | undefined {
  const col = (structure.tables[table].columns as Record<string, ColumnDef>)[column];
  if (!col) return `${column} is not a valid field`;
  if (isEmpty(col, value)) return col.validator?.required ? `${column} is required` : undefined;
  return checkValue(column, col, value);
}

// `data` must hold exactly `fields` - nothing missing, nothing extra - with every value valid.
function validate<T extends TableKey>(table: T, data: unknown, fields: string[]): ParseResult<T> {
  const columns = structure.tables[table].columns as Record<string, ColumnDef>;
  const obj = (data != null && typeof data === 'object' ? data : {}) as Record<string, unknown>;
  const allowed = new Set(fields);
  const errors: string[] = [];
  const out: Record<string, unknown> = {};

  for (const key of Object.keys(obj)) {
    if (!allowed.has(key)) errors.push(`${key} is not an allowed field`);
  }

  for (const key of fields) {
    const col = columns[key];
    if (!col) { errors.push(`${key} is not a valid field`); continue; }
    if (!(key in obj)) { errors.push(`${key} is required`); continue; }

    const raw = obj[key];
    const error = validateField(table, key, raw);
    if (error) { errors.push(error); continue; }
    out[key] = isEmpty(col, raw) ? null : normalizeValue(col, raw);
  }

  return errors.length > 0 ? { errors } : { data: out as TableRecordMap[T] };
}

export const validateFullObject = <T extends TableKey>(table: T, data: unknown): ParseResult<T> =>
  validate(table, data, editableColumns(table));

export const validateOnlyPk = <T extends TableKey>(table: T, data: unknown): ParseResult<T> =>
  validate(table, data, getPkFields(table));
