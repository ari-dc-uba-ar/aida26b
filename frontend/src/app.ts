// Main application file
// Code and comments in English
import { structure } from '@shared/ssot/structure';
import {
  Language,
  LocalizedText,
  ForeignKeyDef,
  ColumnDef,
  TableStructure,
  TableKey,
  TableRecordMap,
  RendererProps,
  RendererFunc,
  Response as ApiResponse,
} from '@shared/types/types';
import { getPkFields } from '@shared/utils/utils';
import { validateField } from '@shared/validation/validate';
import '../styles/style.css';

const API_BASE = '/api';
const PAGE_SIZE = 20;

type Role = 'admin' | 'editor' | 'reader';

type AuthUser = {
  id: number;
  username: string;
  email: string | null;
  role: Role;
  is_active: boolean;
  must_change_password: boolean;
};

// -----------------------------------------------------------------------------
// Localization
// -----------------------------------------------------------------------------

const storedLanguage = localStorage.getItem('language');

function isLanguage(value: string | null): value is Language {
  return value === 'es' || value === 'en';
}

let currentLanguage: Language = isLanguage(storedLanguage) ? storedLanguage : 'es';

export function getLanguage(): Language {
  return currentLanguage;
}

export function setLanguage(language: Language): void {
  currentLanguage = language;
  localStorage.setItem('language', language);
}

export function getLocalizedText(text?: LocalizedText | string): string {
  if (!text) return '';
  if (typeof text === 'string') return text;
  return text[currentLanguage] ?? text.es ?? text.en ?? '';
}

// -----------------------------------------------------------------------------
// DOM elements
// -----------------------------------------------------------------------------

const authSection = document.getElementById('auth-section') as HTMLElement;
const passwordSection = document.getElementById('password-section') as HTMLElement;
const appShell = document.getElementById('app-shell') as HTMLElement;

const loginForm = document.getElementById('login-form') as HTMLFormElement;
const loginError = document.getElementById('login-error') as HTMLElement;

const passwordForm = document.getElementById('password-form') as HTMLFormElement;
const passwordError = document.getElementById('password-error') as HTMLElement;

const currentUserEl = document.getElementById('current-user') as HTMLElement;
const logoutBtn = document.getElementById('logout-btn') as HTMLButtonElement;
const statusMessage = document.getElementById('status-message') as HTMLElement;

const viewTitle = document.getElementById('view-title') as HTMLElement;
const addRecordBtn = document.getElementById('add-record-btn') as HTMLButtonElement;
const adminActions = document.getElementById('admin-actions') as HTMLElement;
const addTeacherBtn = document.getElementById('add-teacher-btn') as HTMLButtonElement;
const addAdminBtn = document.getElementById('add-admin-btn') as HTMLButtonElement;

const formContainer = document.getElementById('record-form') as HTMLElement;
const sharedTable = document.getElementById('records-table') as HTMLTableElement;
const navContainer = document.getElementById('table-nav') as HTMLElement;
const menuContainer = document.getElementById('menu-nav') as HTMLElement;

const tableKeys = Object.keys(structure.tables) as TableKey[];
const menuKeys = Object.keys(structure.menu) as Array<keyof typeof structure.menu>;
const tableNavButtons = {} as Record<TableKey, HTMLButtonElement>;

// -----------------------------------------------------------------------------
// Auth/session state
// -----------------------------------------------------------------------------

let currentUser: AuthUser | null = null;

function canWriteAcademic(): boolean {
  return currentUser?.role === 'admin' || currentUser?.role === 'editor';
}

function setMessage(message = ''): void {
  statusMessage.textContent = message;
  statusMessage.hidden = !message;
}

function showLogin(message = ''): void {
  currentUser = null;

  authSection.style.display = 'block';
  passwordSection.style.display = 'none';
  appShell.style.display = 'none';

  loginError.textContent = message;
  loginError.hidden = !message;
}

function showPasswordChange(user: AuthUser): void {
  currentUser = user;

  authSection.style.display = 'none';
  passwordSection.style.display = 'block';
  appShell.style.display = 'none';

  passwordError.hidden = true;
}

function showApp(user: AuthUser): void {
  if (user.must_change_password) {
    showPasswordChange(user);
    return;
  }

  currentUser = user;

  authSection.style.display = 'none';
  passwordSection.style.display = 'none';
  appShell.style.display = 'block';

  currentUserEl.textContent = `${user.username} (${user.role})`;

  showSection(activeTableKey, false);
}

async function apiFetch(path: string, options: RequestInit = {}): Promise<globalThis.Response> {
  const headers = options.body
    ? {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string> | undefined),
      }
    : options.headers;

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    credentials: 'same-origin',
  });

  if (response.status === 401) {
    showLogin(getLocalizedText(structure.commonText.sessionExpired));
    throw new Error('Authentication required');
  }

  if (response.status === 403) {
    const data = await response
      .clone()
      .json()
      .catch(() => ({} as { error?: string }));

    const message =
      data.error === 'Password change required'
        ? getLocalizedText(structure.commonText.passwordChangeRequired)
        : getLocalizedText(structure.commonText.noPermission);

    setMessage(message);
    throw new Error(data.error || 'Forbidden');
  }

  return response;
}

// -----------------------------------------------------------------------------
// UI feedback
// -----------------------------------------------------------------------------

function showSuccessMessage(message: string): void {
  if (!message) return;

  const outputContainer = document.querySelector('.successOutputInfoContainer');
  const outputText = document.querySelector('.successOutputInfo') as HTMLDivElement | null;

  if (!outputContainer || !outputText) return;

  if (outputContainer.classList.contains('invisible')) {
    outputText.textContent = message;
    outputContainer.classList.remove('invisible');

    setTimeout(() => {
      outputText.textContent = '';
      outputContainer.classList.add('invisible');
    }, 1500);
  }
}

function showErrorMessage(message: string): void {
  const dialog = document.createElement('dialog');
  dialog.classList.add('dialogErrorMessage');

  const dialogTitle = document.createElement('h1');
  dialogTitle.textContent = 'Error';

  const dialogMessage = document.createElement('p');
  dialogMessage.textContent = message;

  const closeButton = document.createElement('button');
  closeButton.textContent = 'Aceptar';
  closeButton.addEventListener('click', () => {
    dialog.close();
    dialog.remove();
  });

  dialog.addEventListener('click', (event) => {
    const dialogRect = dialog.getBoundingClientRect();

    if (
      event.clientX < dialogRect.left ||
      event.clientX > dialogRect.right ||
      event.clientY < dialogRect.top ||
      event.clientY > dialogRect.bottom
    ) {
      dialog.close();
      dialog.remove();
    }
  });

  appendChildren(dialog, [dialogTitle, dialogMessage, closeButton]);
  document.querySelector('.container')?.appendChild(dialog);
  dialog.setAttribute('closedby', 'any');
  dialog.showModal();
}

function appendChildren(element: HTMLElement, children: HTMLElement[]): void {
  children.forEach((child) => element.appendChild(child));
}

async function errorMessage(response: globalThis.Response): Promise<string> {
  try {
    const body = await response.json();

    if (body && typeof body.message === 'string') return body.message;
    if (body && typeof body.error === 'string') return body.error;

    if (body && Array.isArray(body.errors)) {
      return body.errors.join('\n');
    }
  } catch {
    // Response body was not JSON.
  }

  return `Error ${response.status}`;
}

// -----------------------------------------------------------------------------
// API helpers
// -----------------------------------------------------------------------------

function getRowsFromApiResult(result: unknown): unknown[] {
  if (Array.isArray(result)) return result;

  if (
    result &&
    typeof result === 'object' &&
    Array.isArray((result as { data?: unknown }).data)
  ) {
    return (result as { data: unknown[] }).data;
  }

  return [];
}

async function fetchRows(path: string): Promise<unknown[]> {
  const response = await apiFetch(path);

  if (!response.ok) {
    throw new Error(await errorMessage(response));
  }

  const result = await response.json();
  return getRowsFromApiResult(result);
}

// -----------------------------------------------------------------------------
// Renderers
// -----------------------------------------------------------------------------

function toInputValue(column: ColumnDef, raw: unknown): string {
  if (raw == null) return '';
  if (column.input === 'date') return String(raw).slice(0, 10);
  return String(raw);
}

const renderers: Record<'input' | 'textarea' | 'select', RendererFunc> = {
  input<K extends TableKey>({
    id,
    fieldName,
    column,
    record,
    isEdit,
  }: RendererProps<K>) {
    const input = document.createElement('input');

    input.id = id;
    input.type = column.input ?? (column.type === 'number' ? 'number' : 'text');

    if (column.validator?.required) input.required = true;
    if (isEdit && column.readonlyOnEdit) input.readOnly = true;

    input.value = toInputValue(column, record?.[fieldName]);

    return input;
  },

  textarea<K extends TableKey>({
    id,
    fieldName,
    column,
    record,
  }: RendererProps<K>) {
    const textarea = document.createElement('textarea');

    textarea.id = id;

    if (column.validator?.required) textarea.required = true;

    textarea.value = String(record?.[fieldName] ?? '');

    return textarea;
  },

  select<K extends TableKey>({
    id,
    fieldName,
    column,
    record,
    isEdit,
  }: RendererProps<K>) {
    const select = document.createElement('select');

    select.id = id;

    if (isEdit && column.readonlyOnEdit) select.disabled = true;
    if (column.validator?.required) select.required = true;

    const blankOption = document.createElement('option');
    blankOption.value = '';
    blankOption.textContent = '--';
    select.appendChild(blankOption);

    (column.options || []).forEach((option) => {
      const optionEl = document.createElement('option');

      optionEl.value = option.value;
      optionEl.textContent = getLocalizedText(option.label as LocalizedText | string);

      if (String(record?.[fieldName] ?? '') === option.value) {
        optionEl.selected = true;
      }

      select.appendChild(optionEl);
    });

    return select;
  },
};

type RendererKey = keyof typeof renderers;

function getRenderer<K extends TableKey>(key: RendererKey) {
  return renderers[key] as (props: RendererProps<K>) => HTMLElement;
}

function mapInputToRenderer(input?: ColumnDef['input']): RendererKey {
  if (input === 'textarea') return 'textarea';
  if (input === 'select') return 'select';
  return 'input';
}

// -----------------------------------------------------------------------------
// Navigation and state
// -----------------------------------------------------------------------------

let activeTableKey: TableKey = tableKeys[0];

type FilterEntry = {
  negated: boolean;
  value?: string;
  min?: string;
  max?: string;
};

type TableState = {
  page: number;
  sort?: string;
  dir?: 'asc' | 'desc';
  filters: Record<string, FilterEntry[]>;
};

let currentState: TableState = {
  page: 1,
  filters: {},
};

function serializeFilterValue(fieldName: string, entry: FilterEntry): string | null {
  const column = (structure.tables[activeTableKey] as TableStructure).columns[fieldName];

  let value: string;

  if (column?.type === 'number') {
    value = `${entry.min ?? ''},${entry.max ?? ''}`;
    if (value === ',') return null;
  } else {
    value = entry.value ?? '';
    if (!value) return null;
  }

  return entry.negated ? `!${value}` : value;
}

function syncStateToUrl(): void {
  const params = new URLSearchParams();

  params.set('table', activeTableKey);
  params.set('page', String(currentState.page));

  if (currentState.sort) {
    params.set('sort', currentState.sort);
    params.set('dir', currentState.dir || 'asc');
  }

  for (const [fieldName, entries] of Object.entries(currentState.filters)) {
    for (const entry of entries) {
      const value = serializeFilterValue(fieldName, entry);

      if (value !== null) {
        params.append(`filter_${fieldName}`, value);
      }
    }
  }

  window.history.pushState({}, '', `?${params.toString()}`);
}

function syncUrlToState(): void {
  const params = new URLSearchParams(window.location.search);
  const table = params.get('table') as TableKey | null;

  if (table && structure.tables[table]) {
    activeTableKey = table;
  }

  currentState.page = Math.max(1, parseInt(params.get('page') || '1', 10) || 1);
  currentState.sort = params.get('sort') || undefined;
  currentState.dir = (params.get('dir') as 'asc' | 'desc' | null) || undefined;
  currentState.filters = {};

  params.forEach((value, key) => {
    if (!key.startsWith('filter_')) return;

    const fieldName = key.slice(7);
    const column = (structure.tables[activeTableKey] as TableStructure).columns[fieldName];

    if (!column || !value) return;

    const negated = value.startsWith('!');
    const actualValue = negated ? value.slice(1) : value;
    const entry: FilterEntry = { negated };

    if (column.type === 'number') {
      const commaIdx = actualValue.indexOf(',');

      if (commaIdx >= 0) {
        entry.min = actualValue.slice(0, commaIdx);
        entry.max = actualValue.slice(commaIdx + 1);
      } else {
        entry.min = actualValue;
      }
    } else {
      entry.value = actualValue;
    }

    currentState.filters[fieldName] ??= [];
    currentState.filters[fieldName].push(entry);
  });
}

function setLocalizedElementText(id: string, text: LocalizedText | string): void {
  const element = document.getElementById(id);

  if (element) {
    element.textContent = getLocalizedText(text);
  }
}

function applyStaticLanguageToUI(): void {
  document.documentElement.lang = currentLanguage;

  setLocalizedElementText('app-title', structure.commonText.appTitle);
  setLocalizedElementText('login-title', structure.commonText.login);
  setLocalizedElementText('login-username-label', structure.commonText.usernameLabel);
  setLocalizedElementText('login-password-label', structure.commonText.password);
  setLocalizedElementText('login-submit-btn', structure.commonText.login);
  setLocalizedElementText('password-title', structure.commonText.changePassword);
  setLocalizedElementText('current-password-label', structure.commonText.currentPassword);
  setLocalizedElementText('new-password-label', structure.commonText.newPassword);
  setLocalizedElementText('password-submit-btn', structure.commonText.update);
  setLocalizedElementText('logout-btn', structure.commonText.logout);
  setLocalizedElementText('add-teacher-btn', structure.commonText.addProfessor);
  setLocalizedElementText('add-admin-btn', structure.commonText.addAdmin);
}

function updateNavButtonsText(): void {
  tableKeys.forEach((key) => {
    const config = structure.tables[key];
    const button = tableNavButtons[key];

    if (!button) return;

    button.textContent =
      getLocalizedText(config.title) || getLocalizedText(config.uiName) || key;
  });
}

function createTableNavButtons(): void {
  navContainer.innerHTML = '';

  for (const key of tableKeys) {
    const config = structure.tables[key];
    const button = document.createElement('button');

    button.id = `${key}-btn`;
    button.textContent =
      getLocalizedText(config.title) || getLocalizedText(config.uiName) || key;

    button.addEventListener('click', () => showSection(key));

    navContainer.appendChild(button);
    tableNavButtons[key] = button;
  }
}

function resetStateForTable(tableKey: TableKey): void {
  currentState = {
    page: 1,
    filters: {},
  };

  const config = structure.tables[tableKey];
  const pkField = Array.isArray(config.pk) ? config.pk[0] : config.pk;
  const pkColumn = (config.columns as Record<string, ColumnDef>)[pkField];

  if (!pkColumn) return;

  currentState.filters[pkField] = [
    pkColumn.type === 'number'
      ? { negated: false, min: '', max: '' }
      : { negated: false, value: '' },
  ];
}

function showSection(section: TableKey, pushState = true): void {
  if (activeTableKey !== section && pushState) {
    resetStateForTable(section);
  }

  activeTableKey = section;
  setMessage();

  if (pushState) {
    syncStateToUrl();
  }

  Object.entries(tableNavButtons).forEach(([key, button]) => {
    button.classList.toggle('active', key === section);
  });

  const tableConfig = structure.tables[section];

  viewTitle.textContent = getLocalizedText(tableConfig.title);

  addRecordBtn.textContent =
    getLocalizedText(tableConfig.addButtonLabel) ||
    `${getLocalizedText(structure.commonText.add)} ${getLocalizedText(tableConfig.uiName)}`;

  addRecordBtn.style.display = canWriteAcademic() ? 'inline-block' : 'none';

  if (adminActions) {
    adminActions.hidden = currentUser?.role !== 'admin' || section !== 'students';
  }

  hideAnyForm();
  renderFilters(section);
  loadTableData(section);
}

window.addEventListener('popstate', () => {
  syncUrlToState();

  if (currentUser && !currentUser.must_change_password) {
    showSection(activeTableKey, false);
  }
});

// -----------------------------------------------------------------------------
// Menu
// -----------------------------------------------------------------------------

function renderAnyMenuOption(key: keyof typeof structure.menu): void {
  const config = structure.menu[key];

  if (!config.options) return;

  const wrapper = document.createElement('div');
  wrapper.className = 'picker-wrapper';

  const label = document.createElement('label');
  label.htmlFor = config.id;
  label.textContent = getLocalizedText(config.title);

  const select = document.createElement('select');
  select.id = config.id;
  select.classList.add('picker');

  const initialValue =
    typeof config.initial === 'function' ? config.initial() : config.initial;

  config.options.forEach((option) => {
    const optionEl = document.createElement('option');

    optionEl.value = option.value;
    optionEl.textContent = getLocalizedText(option.label);

    if (option.value === initialValue) {
      optionEl.selected = true;
    }

    select.appendChild(optionEl);
  });

  select.addEventListener('change', (event) => {
    const value = (event.target as HTMLSelectElement).value;

    (config.handler as (value: string) => void)(value);

    if (key === 'language' && isLanguage(value)) {
      setLanguage(value);
      applyLanguageToUI();
    }
  });

  wrapper.appendChild(label);
  wrapper.appendChild(select);
  menuContainer.appendChild(wrapper);
}

function showMenu(): void {
  menuContainer.innerHTML = '';
  menuKeys.forEach((key) => renderAnyMenuOption(key));
}

function applyLanguageToUI(): void {
  applyStaticLanguageToUI();
  updateNavButtonsText();
  showMenu();

  if (currentUser && !currentUser.must_change_password) {
    showSection(activeTableKey, false);
  }
}

window.addEventListener('languagechange', (event) => {
  const language = (event as CustomEvent<{ language?: string }>).detail?.language;

  if (isLanguage(language ?? null)) {
    setLanguage(language as Language);
    applyLanguageToUI();
  }
});

// -----------------------------------------------------------------------------
// Table rendering
// -----------------------------------------------------------------------------

const filterContainer = document.createElement('div');
filterContainer.className = 'filter-container';
filterContainer.style.display = 'flex';
filterContainer.style.gap = '10px';
filterContainer.style.flexWrap = 'wrap';
filterContainer.style.marginBottom = '15px';
sharedTable.parentNode?.insertBefore(filterContainer, sharedTable);

const paginationContainer = document.createElement('div');
paginationContainer.className = 'pagination-container';
paginationContainer.style.marginTop = '15px';
paginationContainer.style.display = 'flex';
paginationContainer.style.gap = '10px';
paginationContainer.style.alignItems = 'center';
sharedTable.parentNode?.insertBefore(paginationContainer, sharedTable.nextSibling);

function renderAnyTable<K extends TableKey>(
  tableKey: K,
  records: TableRecordMap[K][]
): void {
  const thead = sharedTable.querySelector('thead')!;
  const tbody = sharedTable.querySelector('tbody')!;
  const tableStructure = structure.tables[tableKey];
  const showActions = canWriteAcademic();

  thead.innerHTML = '';
  tbody.innerHTML = '';

  const headerRow = document.createElement('tr');

  Object.entries(tableStructure.columns)
    .filter(([, column]) => column.persist !== false)
    .forEach(([fieldName, column]) => {
      const th = document.createElement('th');

    th.textContent = getLocalizedText(column.label as LocalizedText | string) || fieldName;
    th.className = 'sortable';
    th.title = 'Click to sort';

    if (currentState.sort === fieldName) {
      th.classList.add(currentState.dir === 'desc' ? 'sorted-desc' : 'sorted-asc');
    }

    th.addEventListener('click', () => {
      if (currentState.sort === fieldName) {
        currentState.dir = currentState.dir === 'asc' ? 'desc' : 'asc';
      } else {
        currentState.sort = fieldName;
        currentState.dir = 'asc';
      }

      currentState.page = 1;
      syncStateToUrl();
      loadTableData(tableKey);
    });

    headerRow.appendChild(th);
  });

  if (showActions) {
    const actionsHeader = document.createElement('th');
    actionsHeader.textContent = getLocalizedText(structure.commonText.actions);
    headerRow.appendChild(actionsHeader);
  }

  thead.appendChild(headerRow);

  records.forEach((record) => {
    const pkFields = Array.isArray(tableStructure.pk)
      ? tableStructure.pk
      : [tableStructure.pk];

    const row = document.createElement('tr');
    const columnNames = (Object.entries(tableStructure.columns) as Array<
      [keyof TableRecordMap[K] & string, ColumnDef]
    >)
      .filter(([, column]) => column.persist !== false)
      .map(([fieldName]) => fieldName);

    columnNames.forEach((name) => {
      const td = document.createElement('td');
      td.textContent = String(record[name] ?? '');
      row.appendChild(td);
    });

    if (showActions) {
      const actionsTd = document.createElement('td');
      actionsTd.className = 'actions';

      const pkValues = pkFields.map((field) =>
        String(record[field as keyof TableRecordMap[K]] ?? '')
      );

      const editBtn = document.createElement('button');
      editBtn.className = 'edit-btn';
      editBtn.textContent = getLocalizedText(structure.commonText.edit);
      editBtn.dataset.pk = JSON.stringify(pkValues);
      editBtn.addEventListener('click', (event) => {
        const values = JSON.parse(
          (event.currentTarget as HTMLElement).dataset.pk || '[]'
        );
        window.editRecord(tableKey, ...values);
      });

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'delete-btn';
      deleteBtn.textContent = getLocalizedText(structure.commonText.delete);
      deleteBtn.dataset.pk = JSON.stringify(pkValues);
      deleteBtn.addEventListener('click', (event) => {
        const values = JSON.parse(
          (event.currentTarget as HTMLElement).dataset.pk || '[]'
        );
        window.deleteRecord(tableKey, ...values);
      });

      actionsTd.appendChild(editBtn);
      actionsTd.appendChild(deleteBtn);
      row.appendChild(actionsTd);
    }

    tbody.appendChild(row);
  });
}

async function loadTableData<K extends TableKey>(tableKey: K): Promise<void> {
  try {
    const params = new URLSearchParams();

    params.set('page', String(currentState.page));

    if (currentState.sort) {
      params.set('sort', currentState.sort);
      params.set('dir', currentState.dir || 'asc');
    }

    for (const [fieldName, entries] of Object.entries(currentState.filters)) {
      for (const entry of entries) {
        const value = serializeFilterValue(fieldName, entry);

        if (value !== null) {
          params.append(`filter_${fieldName}`, value);
        }
      }
    }

    const response = await apiFetch(`/${tableKey}?${params.toString()}`);

    if (!response.ok) {
      return showErrorMessage(await errorMessage(response));
    }

    const result = await response.json();
    const data = (result.data ?? getRowsFromApiResult(result)) as TableRecordMap[K][];
    const total = Number(result.total ?? data.length);

    renderAnyTable(tableKey, data);
    renderPagination(total);

    if (result.message) {
      showSuccessMessage(result.message);
    }
  } catch (error) {
    const message = (error as Error).message;

    if (message !== 'Authentication required' && message !== 'Forbidden') {
      setMessage(getLocalizedText(structure.commonText.errorLoadingData));
      console.error(`Error loading ${tableKey}:`, error);
    }
  }
}

function renderPagination(total: number): void {
  paginationContainer.innerHTML = '';

  const totalPages = Math.ceil(total / PAGE_SIZE) || 1;

  const info = document.createElement('span');
  info.textContent = `${getLocalizedText(structure.commonText.pageInfo)} ${currentState.page} ${getLocalizedText(structure.commonText.pageOf)} ${totalPages} (${getLocalizedText(structure.commonText.total)}: ${total})`;
  paginationContainer.appendChild(info);

  const prevBtn = document.createElement('button');
  prevBtn.textContent = getLocalizedText(structure.commonText.previous);
  prevBtn.disabled = currentState.page <= 1;
  prevBtn.addEventListener('click', () => {
    if (currentState.page > 1) {
      currentState.page--;
      syncStateToUrl();
      loadTableData(activeTableKey);
    }
  });
  paginationContainer.appendChild(prevBtn);

  const nextBtn = document.createElement('button');
  nextBtn.textContent = getLocalizedText(structure.commonText.next);
  nextBtn.disabled = currentState.page >= totalPages;
  nextBtn.addEventListener('click', () => {
    if (currentState.page < totalPages) {
      currentState.page++;
      syncStateToUrl();
      loadTableData(activeTableKey);
    }
  });
  paginationContainer.appendChild(nextBtn);
}

// -----------------------------------------------------------------------------
// Filters
// -----------------------------------------------------------------------------

function getFilterType(column: ColumnDef): 'string' | 'number' | 'enum' {
  if (column.type === 'number') return 'number';
  if (column.input === 'select' && column.options) return 'enum';
  return 'string';
}

function createFilterControl(
  entry: FilterEntry,
  column: ColumnDef,
  onChange: () => void
): HTMLElement {
  if (column.type === 'number') {
    const container = document.createElement('div');
    container.style.display = 'flex';
    container.style.alignItems = 'center';
    container.style.gap = '4px';

    const minInput = document.createElement('input');
    minInput.type = 'number';
    minInput.placeholder = 'Min';
    minInput.value = entry.min ?? '';
    minInput.style.width = '80px';
    minInput.addEventListener('change', () => {
      entry.min = minInput.value;
      onChange();
    });

    const separator = document.createElement('span');
    separator.textContent = '—';

    const maxInput = document.createElement('input');
    maxInput.type = 'number';
    maxInput.placeholder = 'Max';
    maxInput.value = entry.max ?? '';
    maxInput.style.width = '80px';
    maxInput.addEventListener('change', () => {
      entry.max = maxInput.value;
      onChange();
    });

    container.appendChild(minInput);
    container.appendChild(separator);
    container.appendChild(maxInput);

    return container;
  }

  if (column.input === 'select' && column.options) {
    const select = document.createElement('select');

    const blank = document.createElement('option');
    blank.value = '';
    blank.textContent = '--';
    select.appendChild(blank);

    for (const option of column.options) {
      const optionEl = document.createElement('option');

      optionEl.value = option.value;
      optionEl.textContent = getLocalizedText(option.label as LocalizedText | string);

      if (entry.value === option.value) {
        optionEl.selected = true;
      }

      select.appendChild(optionEl);
    }

    select.addEventListener('change', () => {
      entry.value = select.value || undefined;
      onChange();
    });

    return select;
  }

  const input = document.createElement('input');

  input.type = 'text';
  input.placeholder = getLocalizedText(structure.commonText.filterPlaceholder);
  input.value = entry.value ?? '';
  input.style.width = '150px';

  input.addEventListener('change', () => {
    entry.value = input.value || undefined;
    onChange();
  });

  input.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') return;

    event.preventDefault();
    entry.value = input.value || undefined;
    onChange();
  });

  return input;
}

function renderFilters<K extends TableKey>(tableKey: K): void {
  filterContainer.innerHTML = '';

  const tableStructure = structure.tables[tableKey];
  const allColumns = Object.entries(tableStructure.columns);

  const addBar = document.createElement('div');
  addBar.style.marginBottom = '10px';
  addBar.style.display = 'flex';
  addBar.style.gap = '8px';
  addBar.style.alignItems = 'center';

  const addBtn = document.createElement('button');
  addBtn.textContent = `+ ${getLocalizedText(structure.commonText.addFilter)}`;
  addBtn.className = 'add-btn';
  addBtn.style.marginBottom = '0';

  const addDropdown = document.createElement('select');
  addDropdown.style.display = 'none';

  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = `-- ${getLocalizedText(structure.commonText.selectColumn)} --`;
  addDropdown.appendChild(placeholder);

  allColumns.forEach(([fieldName, column]) => {
    const option = document.createElement('option');

    option.value = fieldName;
    option.textContent =
      getLocalizedText(column.label as LocalizedText | string) || fieldName;

    addDropdown.appendChild(option);
  });

  addBtn.addEventListener('click', () => {
    addDropdown.style.display =
      addDropdown.style.display === 'none' ? 'inline-block' : 'none';
  });

  addDropdown.addEventListener('change', () => {
    const fieldName = addDropdown.value;

    addDropdown.value = '';
    addDropdown.style.display = 'none';

    if (!fieldName) return;

    const column = (tableStructure.columns as Record<string, ColumnDef>)[fieldName];

    if (!column) return;

    const entry: FilterEntry =
      column.type === 'number'
        ? { negated: false, min: '', max: '' }
        : { negated: false, value: '' };

    currentState.filters[fieldName] ??= [];
    currentState.filters[fieldName].push(entry);
    currentState.page = 1;

    syncStateToUrl();
    renderFilters(tableKey);
    loadTableData(tableKey);
  });

  addBar.appendChild(addBtn);
  addBar.appendChild(addDropdown);
  filterContainer.appendChild(addBar);

  for (const [fieldName, entries] of Object.entries(currentState.filters)) {
    entries.forEach((entry, idx) => {
      const column = (tableStructure.columns as Record<string, ColumnDef>)[fieldName];

      if (!column) return;

      const row = document.createElement('div');
      row.className = 'filter-row';

      if (entry.negated) {
        row.classList.add('negated');
      }

      const columnDropdown = document.createElement('select');
      columnDropdown.className = 'filter-col-select';

      allColumns.forEach(([candidateFieldName, candidateColumn]) => {
        const option = document.createElement('option');

        option.value = candidateFieldName;
        option.textContent =
          getLocalizedText(candidateColumn.label as LocalizedText | string) ||
          candidateFieldName;

        if (candidateFieldName === fieldName) {
          option.selected = true;
        }

        columnDropdown.appendChild(option);
      });

      columnDropdown.addEventListener('change', () => {
        const newField = columnDropdown.value;

        if (newField === fieldName) return;

        const newColumn = (tableStructure.columns as Record<string, ColumnDef>)[newField];

        if (!newColumn) return;

        const oldType = getFilterType(column);
        const newType = getFilterType(newColumn);

        if (oldType !== newType) {
          entry.value = undefined;
          entry.min = undefined;
          entry.max = undefined;
        }

        if (newColumn.type === 'number') {
          if (entry.value) {
            entry.min = entry.value;
            entry.value = undefined;
          }
        } else if (entry.min !== undefined) {
          entry.value = entry.min;
          entry.min = undefined;
          entry.max = undefined;
        }

        currentState.filters[newField] ??= [];
        currentState.filters[newField].push(entry);
        currentState.filters[fieldName].splice(idx, 1);

        if (currentState.filters[fieldName].length === 0) {
          delete currentState.filters[fieldName];
        }

        currentState.page = 1;

        syncStateToUrl();
        renderFilters(tableKey);
        loadTableData(tableKey);
      });

      const onChange = () => {
        currentState.page = 1;
        syncStateToUrl();
        loadTableData(tableKey);
      };

      const negBtn = document.createElement('button');
      negBtn.textContent = 'NOT';
      negBtn.className = 'negate-btn';
      negBtn.title = 'Toggle negation';

      if (entry.negated) {
        negBtn.classList.add('active');
      }

      negBtn.addEventListener('click', () => {
        entry.negated = !entry.negated;
        currentState.page = 1;

        syncStateToUrl();
        renderFilters(tableKey);
        loadTableData(tableKey);
      });

      const removeBtn = document.createElement('button');
      removeBtn.textContent = '✕';
      removeBtn.className = 'remove-filter-btn';
      removeBtn.title = 'Remove filter';
      removeBtn.addEventListener('click', () => {
        currentState.filters[fieldName].splice(idx, 1);

        if (currentState.filters[fieldName].length === 0) {
          delete currentState.filters[fieldName];
        }

        currentState.page = 1;

        syncStateToUrl();
        renderFilters(tableKey);
        loadTableData(tableKey);
      });

      row.appendChild(columnDropdown);
      row.appendChild(createFilterControl(entry, column, onChange));
      row.appendChild(negBtn);
      row.appendChild(removeBtn);
      filterContainer.appendChild(row);
    });
  }
}

// -----------------------------------------------------------------------------
// Form logic
// -----------------------------------------------------------------------------

addRecordBtn.addEventListener('click', () => showAnyForm(activeTableKey));

function getFieldElementId(tableKey: TableKey, fieldName: string): string {
  return `${tableKey}-${fieldName}`;
}

function coerceFieldValue(column: ColumnDef, rawValue: string): unknown {
  if (column.type === 'number') {
    return rawValue === '' ? null : Number(rawValue);
  }

  return rawValue;
}

function showFieldValidation(
  tableKey: TableKey,
  fieldName: string,
  column: ColumnDef
): string | undefined {
  const id = getFieldElementId(tableKey, fieldName);
  const element = document.getElementById(id) as
    | HTMLInputElement
    | HTMLTextAreaElement
    | HTMLSelectElement
    | null;

  const errorEl = document.getElementById(`${id}-error`);
  const message = validateField(
    tableKey,
    fieldName,
    coerceFieldValue(column, element?.value ?? '')
  );

  if (errorEl) {
    errorEl.textContent = message ?? '';
  }

  element?.classList.toggle('invalid', !!message);

  return message;
}

function validateForm<K extends TableKey>(tableKey: K): boolean {
  return Object.entries(structure.tables[tableKey].columns)
    .filter(([, column]) => column.editable !== false)
    .map(([fieldName, column]) => showFieldValidation(tableKey, fieldName, column))
    .every((message) => !message);
}

function appendPasswordField(form: HTMLFormElement, id: string, label: string): void {
  const wrapper = document.createElement('div');
  wrapper.className = 'form-group';

  const labelEl = document.createElement('label');
  labelEl.htmlFor = id;
  labelEl.textContent = label;
  wrapper.appendChild(labelEl);

  const input = document.createElement('input');
  input.id = id;
  input.type = 'password';
  input.minLength = 8;
  input.required = true;
  wrapper.appendChild(input);

  form.appendChild(wrapper);
}

async function renderFormField<K extends TableKey>(
  tableKey: K,
  fieldName: keyof TableRecordMap[K] & string,
  column: ColumnDef,
  record?: Partial<TableRecordMap[K]>,
  isEdit = false
): Promise<HTMLElement> {
  const id = getFieldElementId(tableKey, fieldName);
  const wrapper = document.createElement('div');

  wrapper.className = 'form-group';

  const labelEl = document.createElement('label');
  labelEl.htmlFor = id;
  labelEl.textContent =
    getLocalizedText(column.label as LocalizedText | string) || fieldName;

  wrapper.appendChild(labelEl);

  await loadDefaultOptions(column);

  const rendererKey = mapInputToRenderer(column.input);
  const renderer = getRenderer<K>(rendererKey);
  const inputEl = renderer({ id, fieldName, column, record, isEdit });

  wrapper.appendChild(inputEl);

  const errorEl = document.createElement('small');
  errorEl.className = 'field-error';
  errorEl.id = `${id}-error`;
  wrapper.appendChild(errorEl);

  inputEl.addEventListener('blur', () => {
    showFieldValidation(tableKey, fieldName, column);
  });

  inputEl.addEventListener('input', () => {
    if (errorEl.textContent) {
      showFieldValidation(tableKey, fieldName, column);
    }
  });

  return wrapper;
}

function getForeignKeyLabel(row: Record<string, unknown>, foreignKey: ForeignKeyDef): string {
  const labelField = foreignKey.labelField;

  if (row[labelField] != null) {
    return String(row[labelField]);
  }

  // Supports simple SQL-like labels such as:
  // first_name || ' ' || last_name
  if (labelField.includes('||')) {
    return labelField
      .split('||')
      .map((part) => part.trim())
      .map((part) => {
        const quoted = part.match(/^['"](.*)['"]$/);
        if (quoted) return quoted[1];

        return String(row[part] ?? '');
      })
      .join('');
  }

  return String(row[foreignKey.valueField] ?? '');
}

async function loadDefaultOptions(column: ColumnDef): Promise<void> {
  const foreignKey = column.foreignKey;

  if (!foreignKey || foreignKey.dependsOn) return;

  const rows = await fetchRows(`/${foreignKey.table}?page=1`);

  column.options = rows.map((row) => {
    const record = row as Record<string, unknown>;
    const value = String(record[foreignKey.valueField] ?? '');

    return {
      value,
      label: `${value} - ${getForeignKeyLabel(record, foreignKey)}`,
    };
  }) as any;
}

function setupDependentSelects<K extends TableKey>(
  tableKey: K,
  record?: Partial<TableRecordMap[K]>
): void {
  const tableConfig = structure.tables[tableKey];

  for (const [fieldName, column] of Object.entries(tableConfig.columns)) {
    const foreignKey = column.foreignKey;

    if (!foreignKey?.dependsOn) continue;

    const childId = getFieldElementId(tableKey, fieldName);
    const parentId = getFieldElementId(tableKey, foreignKey.dependsOn.field);
    const childSelect = document.getElementById(childId) as HTMLSelectElement | null;
    const parentSelect = document.getElementById(parentId) as HTMLSelectElement | null;

    if (!childSelect || !parentSelect) continue;

    loadDependentOptions(
      parentSelect,
      childSelect,
      foreignKey,
      fieldName as keyof TableRecordMap[K],
      record
    );

    parentSelect.addEventListener('change', () => {
      loadDependentOptions(
        parentSelect,
        childSelect,
        foreignKey,
        fieldName as keyof TableRecordMap[K],
        record
      );
    });
  }
}

async function loadDependentOptions<K extends TableKey>(
  parentSelect: HTMLSelectElement,
  childSelect: HTMLSelectElement,
  foreignKey: ForeignKeyDef,
  fieldName: keyof TableRecordMap[K],
  record?: Partial<TableRecordMap[K]>
): Promise<void> {
  if (!foreignKey.dependsOn) return;

  const parentValue = parentSelect.value;

  childSelect.innerHTML = '';

  if (!parentValue) return;

  try {
    const rows = await fetchRows(
      `/${foreignKey.table}?filter_${foreignKey.dependsOn.foreignField}=${encodeURIComponent(parentValue)}`
    );

    rows.forEach((row) => {
      const recordRow = row as Record<string, unknown>;
      const value = String(recordRow[foreignKey.valueField] ?? '');

      const option = document.createElement('option');
      option.value = value;
      option.textContent = `${value} - ${getForeignKeyLabel(recordRow, foreignKey)}`;
      childSelect.appendChild(option);
    });

    const currentValue = record?.[fieldName];

    if (currentValue != null) {
      childSelect.value = String(currentValue);
    }
  } catch (error) {
    console.error('Error loading dependent options:', error);
  }
}

async function resolveDependingForeignKeys<K extends TableKey>(
  tableKey: K,
  record?: Partial<TableRecordMap[K]>
): Promise<void> {
  if (!record) return;

  const tableConfig = structure.tables[tableKey];

  for (const [fieldName, column] of Object.entries(tableConfig.columns)) {
    const foreignKey = column.foreignKey;

    if (!foreignKey?.dependsOn) continue;

    const childValue = (record as Record<string, unknown>)[fieldName];

    if (childValue == null) continue;

    try {
      const queryParams = new URLSearchParams([
        [foreignKey.valueField, String(childValue)],
      ]).toString();

      const response = await apiFetch(`/${foreignKey.table}?${queryParams}`);

      if (!response.ok) continue;

      const responseJson: ApiResponse = await response.json();
      const foreignRecord = responseJson.data as Record<string, unknown> | undefined;

      if (!foreignRecord) continue;

      (record as Record<string, unknown>)[foreignKey.dependsOn.field] =
        foreignRecord[foreignKey.dependsOn.foreignField];
    } catch (error) {
      console.error('Error resolving dependent foreign key:', error);
    }
  }
}

function collectFormData<K extends TableKey>(
  tableKey: K
): Partial<TableRecordMap[K]> {
  const tableConfig = structure.tables[tableKey];
  const payload: Partial<TableRecordMap[K]> = {};

  Object.entries(tableConfig.columns)
    .filter(([, column]) => column.editable !== false && column.persist !== false)
    .forEach(([fieldName, column]) => {
      const id = getFieldElementId(tableKey, fieldName);
      const element = document.getElementById(id) as
        | HTMLInputElement
        | HTMLTextAreaElement
        | HTMLSelectElement
        | null;

      payload[fieldName as keyof TableRecordMap[K]] = coerceFieldValue(
        column,
        element?.value ?? ''
      ) as TableRecordMap[K][keyof TableRecordMap[K]];
    });

  return payload;
}

export function getRecordPath(recordValues: string[]): string {
  return `/${recordValues.map((value) => encodeURIComponent(value)).join('/')}`;
}

export function hideAnyForm(): void {
  formContainer.style.display = 'none';
  formContainer.innerHTML = '';
}

function showUserForm(role: Exclude<Role, 'reader'>): void {
  if (currentUser?.role !== 'admin') {
    setMessage(getLocalizedText(structure.commonText.onlyAdminCanCreateUsers));
    return;
  }

  const label =
    role === 'editor'
      ? getLocalizedText(structure.commonText.professorRole)
      : getLocalizedText(structure.commonText.adminRole);

  formContainer.innerHTML = '';

  const form = document.createElement('form');

  const title = document.createElement('h3');
  title.textContent = `${getLocalizedText(structure.commonText.add)} ${label}`;
  form.appendChild(title);

  ['username', 'email'].forEach((field) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'form-group';

    const labelEl = document.createElement('label');
    labelEl.htmlFor = `user-${field}`;
    labelEl.textContent = field === 'username' ? getLocalizedText(structure.commonText.usernameLabel) : getLocalizedText(structure.commonText.emailLabel);
    wrapper.appendChild(labelEl);

    const input = document.createElement('input');
    input.id = `user-${field}`;
    input.type = field === 'email' ? 'email' : 'text';
    input.required = field === 'username';
    wrapper.appendChild(input);

    form.appendChild(wrapper);
  });

  appendPasswordField(form, 'user-password', getLocalizedText(structure.commonText.initialPassword));

  const actionsDiv = document.createElement('div');
  actionsDiv.className = 'form-actions';

  const submitBtn = document.createElement('button');
  submitBtn.type = 'submit';
  submitBtn.textContent = getLocalizedText(structure.commonText.add);

  const cancelBtn = document.createElement('button');
  cancelBtn.type = 'button';
  cancelBtn.className = 'cancel-btn';
  cancelBtn.textContent = getLocalizedText(structure.commonText.cancel);
  cancelBtn.addEventListener('click', hideAnyForm);

  actionsDiv.appendChild(submitBtn);
  actionsDiv.appendChild(cancelBtn);
  form.appendChild(actionsDiv);

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const username = (document.getElementById('user-username') as HTMLInputElement).value.trim();
    const email = (document.getElementById('user-email') as HTMLInputElement).value.trim();
    const password = (document.getElementById('user-password') as HTMLInputElement).value;

    try {
      const response = await apiFetch('/admin/users', {
        method: 'POST',
        body: JSON.stringify({ username, email, password, role }),
      });

      if (!response.ok) {
        return showErrorMessage(await errorMessage(response));
      }

      hideAnyForm();
      setMessage(`${label} ${getLocalizedText(structure.commonText.added)}`);
    } catch (error) {
      const message = (error as Error).message;

      if (message !== 'Authentication required' && message !== 'Forbidden') {
        setMessage(getLocalizedText(structure.commonText.errorCreatingUser));
        console.error('Error creating user:', error);
      }
    }
  });

  formContainer.appendChild(form);
  formContainer.style.display = 'block';
}

async function showAnyForm<K extends TableKey>(
  tableKey: K,
  record?: Partial<TableRecordMap[K]>
): Promise<void> {
  if (!canWriteAcademic()) {
    setMessage(getLocalizedText(structure.commonText.noEditPermission));
    return;
  }

  const tableConfig = structure.tables[tableKey];
  const isEdit = !!record;
  const formId = `${tableKey}-form`;

  await resolveDependingForeignKeys(tableKey, record);

  const fields = await Promise.all(
    Object.entries(tableConfig.columns)
      .filter(([, column]) => column.editable !== false)
      .map(([fieldName, column]) =>
        renderFormField(
          tableKey,
          fieldName as keyof TableRecordMap[K] & string,
          column,
          record,
          isEdit
        )
      )
  );

  formContainer.innerHTML = '';

  const form = document.createElement('form');
  form.id = formId;

  const title = document.createElement('h3');
  title.textContent = `${
    isEdit
      ? getLocalizedText(structure.commonText.edit)
      : getLocalizedText(structure.commonText.add)
  } ${getLocalizedText(tableConfig.uiName)}`;
  form.appendChild(title);

  fields.forEach((field) => form.appendChild(field));

  if (tableKey === 'students' && !isEdit) {
    appendPasswordField(
      form,
      'students-password',
      getLocalizedText(structure.commonText.initialPassword)
    );
  }

  const actionsDiv = document.createElement('div');
  actionsDiv.className = 'form-actions';

  const submitBtn = document.createElement('button');
  submitBtn.type = 'submit';
  submitBtn.textContent = isEdit
    ? getLocalizedText(structure.commonText.update)
    : getLocalizedText(structure.commonText.add);

  const cancelBtn = document.createElement('button');
  cancelBtn.type = 'button';
  cancelBtn.className = 'cancel-btn';
  cancelBtn.textContent = getLocalizedText(structure.commonText.cancel);
  cancelBtn.addEventListener('click', hideAnyForm);

  actionsDiv.appendChild(submitBtn);
  actionsDiv.appendChild(cancelBtn);
  form.appendChild(actionsDiv);

  formContainer.appendChild(form);
  formContainer.style.display = 'flex';

  setupDependentSelects(tableKey, record);

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (!validateForm(tableKey)) return;

    const payload = collectFormData(tableKey) as Record<string, unknown>;

    if (tableKey === 'students' && !isEdit) {
      payload.password = (document.getElementById('students-password') as HTMLInputElement).value;
    }

    const pkAndTheirValues = getPkFields(tableKey).map((pkFieldName) => {
      const value =
        payload[pkFieldName] ??
        (record as Record<string, unknown> | undefined)?.[pkFieldName] ??
        '';

      return [pkFieldName, String(value)];
    });

    const queryParams = new URLSearchParams(pkAndTheirValues).toString();

    try {
      const response = await apiFetch(`/${tableKey}?${queryParams}`, {
        method: isEdit ? 'PUT' : 'POST',
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        return showErrorMessage(await errorMessage(response));
      }

      const responseJson: ApiResponse = await response.json();

      if (!responseJson.success) {
        return showErrorMessage(responseJson.message ?? 'Error saving record');
      }

      hideAnyForm();

      if (tableKey === 'students' && !isEdit && payload.password) {
        setMessage(getLocalizedText(structure.commonText.studentAndUserCreated));
      } else {
        showSuccessMessage(responseJson.message ?? '');
      }

      loadTableData(tableKey);
    } catch (error) {
      const message = (error as Error).message;

      if (message !== 'Authentication required' && message !== 'Forbidden') {
        setMessage(getLocalizedText(structure.commonText.errorSaving));
        console.error(
          `Error saving ${getLocalizedText(tableConfig.uiName).toLowerCase()}:`,
          error
        );
      }
    }
  });
}

// -----------------------------------------------------------------------------
// Global actions
// -----------------------------------------------------------------------------

declare global {
  interface Window {
    hideAnyForm: () => void;
    editRecord: <K extends TableKey>(
      tableKey: K,
      ...pkValues: string[]
    ) => Promise<void>;
    deleteRecord: <K extends TableKey>(
      tableKey: K,
      ...pkValues: string[]
    ) => Promise<void>;
  }
}

window.hideAnyForm = hideAnyForm;

window.editRecord = async <K extends TableKey>(
  tableKey: K,
  ...pkValues: string[]
) => {
  try {
    const queryParams = new URLSearchParams(
      getPkFields(tableKey).map((pkFieldName, index) => [
        pkFieldName,
        pkValues[index] ?? '',
      ])
    ).toString();

    const response = await apiFetch(`/${tableKey}?${queryParams}`);

    if (!response.ok) {
      return showErrorMessage(await errorMessage(response));
    }

    const responseAnswer: ApiResponse = await response.json();

    if (!responseAnswer.success) {
      return showErrorMessage(responseAnswer.message ?? 'Error loading record');
    }

    const record = responseAnswer.data as TableRecordMap[K];

    showAnyForm(tableKey, record);
  } catch (error) {
    const message = (error as Error).message;

    if (message !== 'Authentication required' && message !== 'Forbidden') {
      setMessage(getLocalizedText(structure.commonText.errorLoadingRecord));
      console.error(`Error loading ${tableKey} for edit:`, error);
    }
  }
};

window.deleteRecord = async <K extends TableKey>(
  tableKey: K,
  ...pkValues: string[]
) => {
  const tableConfig = structure.tables[tableKey];
  const entityName = getLocalizedText(tableConfig.uiName).toLowerCase();

  const confirmed = confirm(
    `${getLocalizedText(structure.commonText.deleteConfirm)} ${entityName}?`
  );

  if (!confirmed) return;

  try {
    const queryParams = new URLSearchParams(
      getPkFields(tableKey).map((pkFieldName, index) => [
        pkFieldName,
        pkValues[index] ?? '',
      ])
    ).toString();

    const response = await apiFetch(`/${tableKey}?${queryParams}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      return showErrorMessage(await errorMessage(response));
    }

    const responseAnswer: ApiResponse = await response.json();

    if (!responseAnswer.success) {
      return showErrorMessage(responseAnswer.message ?? 'Error deleting record');
    }

    showSuccessMessage(responseAnswer.message ?? '');
    loadTableData(tableKey);
  } catch (error) {
    const message = (error as Error).message;

    if (message !== 'Authentication required' && message !== 'Forbidden') {
      setMessage(getLocalizedText(structure.commonText.errorDeleting));
      console.error(`Error deleting ${tableKey}:`, error);
    }
  }
};

// -----------------------------------------------------------------------------
// Initialization
// -----------------------------------------------------------------------------

const initialTheme = localStorage.getItem('theme') || 'light';
document.body.setAttribute('data-theme', initialTheme);

applyStaticLanguageToUI();

addTeacherBtn.addEventListener('click', () => showUserForm('editor'));
addAdminBtn.addEventListener('click', () => showUserForm('admin'));

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  loginError.hidden = true;

  const formData = new FormData(loginForm);

  const payload = {
    username: String(formData.get('username') ?? ''),
    password: String(formData.get('password') ?? ''),
  };

  try {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      showLogin(getLocalizedText(structure.commonText.invalidCredentials));
      return;
    }

    const data = (await response.json()) as { user: AuthUser };

    loginForm.reset();
    showApp(data.user);
  } catch (error) {
    showLogin(getLocalizedText(structure.commonText.loginError));
    console.error('Login error:', error);
  }
});

passwordForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  passwordError.hidden = true;

  const formData = new FormData(passwordForm);

  const payload = {
    current_password: String(formData.get('current_password') ?? ''),
    new_password: String(formData.get('new_password') ?? ''),
  };

  try {
    const response = await fetch(`${API_BASE}/auth/change-password`, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      passwordError.textContent =
        getLocalizedText(structure.commonText.passwordChangeFailed);
      passwordError.hidden = false;
      return;
    }

    const data = (await response.json()) as { user: AuthUser };

    passwordForm.reset();
    showApp(data.user);
  } catch (error) {
    passwordError.textContent =
      getLocalizedText(structure.commonText.passwordChangeError);
    passwordError.hidden = false;
    console.error('Password change error:', error);
  }
});

logoutBtn.addEventListener('click', async () => {
  await fetch(`${API_BASE}/auth/logout`, {
    method: 'POST',
    credentials: 'same-origin',
  });

  showLogin();
});

async function initialize(): Promise<void> {
  createTableNavButtons();
  syncUrlToState();
  applyLanguageToUI();

  try {
    const response = await fetch(`${API_BASE}/auth/me`, {
      credentials: 'same-origin',
    });

    if (!response.ok) {
      showLogin();
      return;
    }

    const data = (await response.json()) as { user: AuthUser };

    showApp(data.user);
  } catch (error) {
    showLogin();
    console.error('Session check failed:', error);
  }
}

initialize();

export {};