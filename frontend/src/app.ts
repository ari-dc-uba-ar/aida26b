// Main application file
// Code and comments in English
import type {TableKey, TableRecordMap, TableStructure, InferType, ColumnDef, Response} from './types/types.ts';
import {getPkFields} from './utils/utils.js';
import { structure } from "./ssot/structure.js";


const API_BASE = '/api';

type RendererProps<K extends TableKey> = {
  id: string;
  fieldName: keyof TableRecordMap[K] & string;
  column: ColumnDef;
  record?: Partial<TableRecordMap[K]>;
  isEdit?: boolean;
};
type RendererFunc = <K extends TableKey>(props: RendererProps<K>) => HTMLElement;

const renderers: Record<'input'|'textarea'|'select', RendererFunc> = {
  input<K extends TableKey>({ id, fieldName, column, record, isEdit }: RendererProps<K>) {
    const inp = document.createElement('input');
    inp.id = id;
    inp.type = column.input ?? (column.type === 'number' ? 'number' : 'text');
    if (column.required) inp.required = true;
    if (isEdit && column.readonlyOnEdit) inp.readOnly = true;
    (inp as HTMLInputElement).value = String(record?.[fieldName] ?? '');
    return inp;
  },
  textarea<K extends TableKey>({ id, fieldName, column, record }: RendererProps<K>) {
    const ta = document.createElement('textarea');
    ta.id = id;
    if (column.required) ta.required = true;
    (ta as HTMLTextAreaElement).value = String(record?.[fieldName] ?? '');
    return ta;
  },
  select<K extends TableKey>({ id, fieldName, column, record }: RendererProps<K>) {
    const sel = document.createElement('select');
    sel.id = id;
    if (column.required) sel.required = true;
    (column.options || []).forEach((opt: { value: string; label: string }) => {
      const o = document.createElement('option');
      o.value = opt.value;
      o.textContent = opt.label;
      if (String(record?.[fieldName] ?? '') === opt.value) o.selected = true;
      sel.appendChild(o);
    });
    return sel;
  }
};

type RendererKey = keyof typeof renderers;

function getRenderer<K extends TableKey>(key: RendererKey) {
  return renderers[key] as (props: RendererProps<K>) => HTMLElement;
}

function mapInputToRenderer(input?: ColumnDef['input']): RendererKey {
  if (!input) return 'input';
  if (input === 'textarea') return 'textarea';
  if (input === 'select') return 'select';
  return 'input';
}

// DOM elements (derive nav buttons from `structure.tables` keys to avoid duplication)
const viewTitle = document.getElementById('view-title') as HTMLElement;
const addRecordBtn = document.getElementById('add-record-btn') as HTMLButtonElement;
const formContainer = document.getElementById('record-form') as HTMLElement;
const sharedTable = document.getElementById('records-table') as HTMLTableElement;

const tableKeys = Object.keys(structure.tables) as TableKey[];
const navContainer = document.getElementById('table-nav') as HTMLElement | null;
if (!navContainer) throw new Error('Missing #table-nav element in DOM');

const tableNavButtons = {} as Record<TableKey, HTMLButtonElement>;
for (const key of tableKeys) {
  const cfg = structure.tables[key];
  const btn = document.createElement('button');
  btn.id = `${key}-btn`;
  btn.textContent = cfg.title ?? cfg.uiName;
  navContainer.appendChild(btn);
  tableNavButtons[key] = btn;
  btn.addEventListener('click', () => showSection(key));
}

let activeTableKey: TableKey = tableKeys[0] as TableKey;

function showSection(section: TableKey) {
  activeTableKey = section;

  Object.entries(tableNavButtons).forEach(([key, button]) => {
    button.classList.toggle('active', key === section);
  });

  const tableConfig = structure.tables[section];
  viewTitle.textContent = tableConfig.title;
  addRecordBtn.textContent = tableConfig.addButtonLabel || `Agregar ${tableConfig.uiName} / Add ${tableConfig.uiName}`;
  hideAnyForm();
  loadTableData(section);
}

function showSuccessMessage(message: string){
  const outputContainer = document.querySelector(".successOutputInfoContainer");
  const outputText = document.querySelector(".successOutputInfo") as HTMLDivElement;
  if (outputContainer?.classList.contains("invisible")){
    outputText.textContent = message;
    outputContainer?.classList.remove("invisible");
    setTimeout(() => {
      outputText.textContent = '';
      outputContainer?.classList.add("invisible");
    }, 1500);
  }
}

function showErrorMessage(message: string){
  const dialog = document.createElement("dialog");
  dialog.classList.add("dialogErrorMessage");
  const dialogMessage       = document.createElement("p");
  const dialogTitle         = document.createElement("h1"); 
  const closeButton         = document.createElement("button");
  dialogTitle.textContent   = "Error";
  dialogMessage.textContent = message;
  closeButton.textContent   = "Aceptar";
  closeButton.addEventListener("click", (event) => {
    dialog.close();
    dialog.remove();
  })
  dialog.addEventListener("click", (event) => {
    const dialogRect = dialog.getBoundingClientRect();
    if (event.clientX < dialogRect.left    ||
        event.clientX > dialogRect.right   ||
        event.clientY > dialogRect.bottom  || 
        event.clientY < dialogRect.top) {
          dialog.close();
          dialog.remove();
    }   
  });
  appendChildsToElement(dialog, [dialogTitle, dialogMessage, closeButton]);
  document.querySelector(".container")?.appendChild(dialog);
  dialog.setAttribute('closedby', 'any');
  dialog.showModal();
}

function appendChildsToElement(element: HTMLElement, childs: HTMLElement[]){
  childs.forEach(child => element.appendChild(child));
}




//Load 
async function loadTableData<K extends TableKey>(tableKey: K) {    
  try {
    const response = await fetch(`${API_BASE}/${tableKey}`);
    const responseAnswer: Response = await response.json(); 
    const responseData = responseAnswer.data as TableRecordMap[K][];
    if (!responseAnswer.success){
      return showErrorMessage(responseAnswer.message ?? '');
    }
    showSuccessMessage(responseAnswer.message ?? '');
    renderAnyTable(tableKey, responseData);
  } catch (error) {
    console.error(`Error loading ${tableKey}:`, error);
  }
}

function renderAnyTable<K extends TableKey>(tableKey: K, records: TableRecordMap[K][]) {
  const thead = sharedTable.querySelector('thead')!;
  const tbody = sharedTable.querySelector('tbody')!;
  const tableStructure = structure.tables[tableKey];
  thead.innerHTML = '';
  tbody.innerHTML = '';

  const headerRow = document.createElement('tr');
  Object.values(tableStructure.columns).forEach((column) => {
    const th = document.createElement('th');
    th.textContent = column.label;
    headerRow.appendChild(th);
  });

  const actionsHeader = document.createElement('th');
  actionsHeader.textContent = 'Acciones / Actions';
  headerRow.appendChild(actionsHeader);
  thead.appendChild(headerRow);
  
  records.forEach((record) => {
    const { pk } = tableStructure;
    const pkFields = Array.isArray(pk) ? pk : [pk];
    const row = document.createElement('tr');
    const columnNames = Object.keys(tableStructure.columns) as Array<keyof TableRecordMap[K] & string>;

    // create data cells
    columnNames.forEach((name) => {
      const td = document.createElement('td');
      td.textContent = String(record[name] ?? '');
      row.appendChild(td);
    });

    // actions cell with event listeners (avoid inline onclick/double-encoding)
    const actionsTd = document.createElement('td');
    actionsTd.className = 'actions';

    const editBtn = document.createElement('button');
    editBtn.className = 'edit-btn';
    editBtn.textContent = 'Editar / Edit';
    editBtn.dataset.table = String(tableKey);
    editBtn.dataset.pk = JSON.stringify(pkFields.map((field) => String(record[field as keyof TableRecordMap[K]] ?? '')));
    editBtn.addEventListener('click', (e) => {
      const pkValues = JSON.parse((e.currentTarget as HTMLElement).dataset.pk || '[]');
      window.editRecord(tableKey, ...pkValues);
    });

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-btn';
    deleteBtn.textContent = 'Eliminar / Delete';
    deleteBtn.dataset.table = String(tableKey);
    deleteBtn.dataset.pk = editBtn.dataset.pk;
    deleteBtn.addEventListener('click', (e) => {
      const pkValues = JSON.parse((e.currentTarget as HTMLElement).dataset.pk || '[]');
      window.deleteRecord(tableKey, ...pkValues);
    });

    actionsTd.appendChild(editBtn);
    actionsTd.appendChild(deleteBtn);
    row.appendChild(actionsTd);

    tbody.appendChild(row);
  });
}


addRecordBtn.addEventListener('click', () => showAnyForm(activeTableKey));


function getFieldElementId(tableKey: TableKey, fieldName: string): string {
  return `${tableKey}-${fieldName}`;
}


function renderFormField<K extends TableKey>(tableKey: K, fieldName: keyof TableRecordMap[K] & string, column: ColumnDef, record?: Partial<TableRecordMap[K]>, isEdit = false): HTMLElement {
  const id = getFieldElementId(tableKey, fieldName);
  const labelText = column.label ?? '';
  const wrapper = document.createElement('div');
  wrapper.className = 'form-group';

  const labelEl = document.createElement('label');
  labelEl.htmlFor = id;
  labelEl.textContent = labelText;
  wrapper.appendChild(labelEl);
  const rendererKey = mapInputToRenderer(column.input);
  const renderer = getRenderer<K>(rendererKey);
  const inputEl = renderer({ id, fieldName, column, record, isEdit });
  wrapper.appendChild(inputEl);
  return wrapper;
}

function collectFormData<K extends TableKey>(tableKey: K): Partial<TableRecordMap[K]> {
  const tableConfig = structure.tables[tableKey];
  const payload: Partial<TableRecordMap[K]> = {};

  Object.entries(tableConfig.columns)
    .filter(([, column]) => column.editable !== false)
    .forEach(([fieldName, column]) => {
      const id = getFieldElementId(tableKey, fieldName);
      const element = document.getElementById(id) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null;
      const rawValue = element?.value ?? '';

      if (column.type === 'number') {
        if (rawValue === '') {
          payload[fieldName as keyof TableRecordMap[K]] = (column.nullable ? null : 0) as TableRecordMap[K][keyof TableRecordMap[K]];
        } else {
          payload[fieldName as keyof TableRecordMap[K]] = Number(rawValue) as TableRecordMap[K][keyof TableRecordMap[K]];
        }
        return;
      }

      payload[fieldName as keyof TableRecordMap[K]] = rawValue as TableRecordMap[K][keyof TableRecordMap[K]];
    });

  return payload;
}

function getRecordPath(recordValues: string[]): string {
  return `/${recordValues.map((value) => encodeURIComponent(value)).join('/')}`;
}

function hideAnyForm(): void {
  formContainer.style.display = 'none';
  formContainer.innerHTML = '';
}

async function showAnyForm<K extends TableKey>(tableKey: K, record?: Partial<TableRecordMap[K]>): Promise<void> {
  const tableConfig = structure.tables[tableKey];
  const isEdit = !!record;
  const formId = `${tableKey}-form`;

  const fields = Object.entries(tableConfig.columns)
    .filter(([, column]) => column.editable !== false)
    .map(([fieldName, column]) => renderFormField(tableKey, fieldName as keyof TableRecordMap[K] & string, column, record, isEdit));

  // build form DOM
  formContainer.innerHTML = '';
  const form = document.createElement('form');
  form.id = formId;
  const h3 = document.createElement('h3');
  h3.textContent = isEdit ? `Editar ${tableConfig.uiName} / Edit ${tableConfig.uiName}` : `Agregar ${tableConfig.uiName} / Add ${tableConfig.uiName}`;
  form.appendChild(h3);
  fields.forEach((f) => form.appendChild(f));

  const actionsDiv = document.createElement('div');
  actionsDiv.className = 'form-actions';
  const submitBtn = document.createElement('button');
  submitBtn.type = 'submit';
  submitBtn.textContent = isEdit ? 'Actualizar / Update' : 'Agregar / Add';
  const cancelBtn = document.createElement('button');
  cancelBtn.type = 'button';
  cancelBtn.className = 'cancel-btn';
  cancelBtn.textContent = 'Cancelar / Cancel';
  cancelBtn.addEventListener('click', hideAnyForm);
  actionsDiv.appendChild(submitBtn);
  actionsDiv.appendChild(cancelBtn);
  form.appendChild(actionsDiv);

  formContainer.appendChild(form);
  formContainer.style.display = 'block';

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = collectFormData(tableKey);
    const pkAndTheirValues = getPkFields(tableKey).map((pkFieldName) => [pkFieldName, String((payload as Record<string, unknown>)[pkFieldName])?? String((record as Record<string, unknown> | undefined)?.[pkFieldName]) ?? '']);
    const queryParams = new URLSearchParams(pkAndTheirValues).toString();
    let response;    
    try {
      response = (await fetch(`${API_BASE}/${tableKey}?` + queryParams, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }));
      const responseJson: Response = await response.json();
      if (!responseJson.success){
        showErrorMessage(responseJson.message ?? '');
      }
      showSuccessMessage(responseJson.message ?? '');
      hideAnyForm();
      loadTableData(tableKey);
    } catch (error) {
      console.error(`Error saving ${tableConfig.uiName.toLowerCase()}:`, error);
    }
  });
}

declare global {
  interface Window {
    hideAnyForm: () => void;
    editRecord: <K extends TableKey>(tableKey: K, ...pkValues: string[]) => Promise<void>;
    deleteRecord: <K extends TableKey>(tableKey: K, ...pkValues: string[]) => Promise<void>;
  }
}

// Global functions for onclick
window.hideAnyForm = hideAnyForm;

window.editRecord = async <K extends TableKey>(tableKey: K, ...pkValues: string[]) => {
  try {
    const queryParams = new URLSearchParams(getPkFields(tableKey).map((pkFieldName, index) => [pkFieldName, pkValues[index]])).toString();
    const response = await fetch(`${API_BASE}/${tableKey}?` + queryParams);
    const responseAnswer: Response = await response.json(); 
    const record = responseAnswer.data as TableRecordMap[K];
    if (!responseAnswer.success){
      return showErrorMessage(responseAnswer.message ?? '');
    }
    showSuccessMessage(responseAnswer.message ?? '');
    showAnyForm(tableKey, record);
  } catch (error) {
    console.error(`Error loading ${tableKey} for edit:`, error);
  }
};
window.deleteRecord = async <K extends TableKey>(tableKey: K, ...pkValues: string[]) => {
  const tableConfig = structure.tables[tableKey];
  if (confirm(`¿Está seguro de que desea eliminar este ${tableConfig.uiName.toLowerCase()}? / Are you sure you want to delete this ${tableConfig.uiName.toLowerCase()}?`)) {
    try {
      const queryParams = new URLSearchParams(getPkFields(tableKey).map((pkFieldName, index) => [pkFieldName, pkValues[index]])).toString();
      const response = await fetch(`${API_BASE}/${tableKey}?` + queryParams, {method: 'DELETE'});
      const responseAnswer: Response = await response.json(); 
      if (!responseAnswer.success){
        return showErrorMessage(responseAnswer.message ?? '');
      }
      showSuccessMessage(responseAnswer.message ?? '');
      loadTableData(tableKey);
    } catch (error) {
      console.error(`Error deleting ${tableKey}:`, error);
    }
  }
};

// Initialize
showSection(activeTableKey);

export {};