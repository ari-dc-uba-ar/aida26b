// Main application file
// Code and comments in English

const API_BASE = '/api';

type TypeMap = {
  string: string;
  number: number;
  boolean: boolean;
  date: Date;
  status: Status;
};

type MyTypeNames = keyof TypeMap;

type ColumnDef = {
  type: MyTypeNames;
  label?: string;
  required?: boolean;
  deduced?: boolean
}

type TableStructure = {
  columns: Record<string, ColumnDef>
  pk: string
  uiName: string
  endpoint? : string
}

type InferType<FieldDefs extends Record<string, ColumnDef>> = {
  [K in keyof FieldDefs]: TypeMap[FieldDefs[K]['type']]
}

function InferTypeFromMyTypes(element: any){
  let value: string|number|boolean|Date = element.value;
  switch(element.type){
    case "number":
      return parseFloat(element.value) || 0;
    case "boolean":
      return (element.value === "true");
    case "date":
      return new Date(element.value);
    case "status":
      return {type: "status", label: "Estado / Status:"} as ColumnDef;
    default:
      return element.value;
  }
}

function defineTable<C extends Record<string, ColumnDef>>(def: {
  columns: C;
  pk: string;
  uiName: string;
  endpoint?: string;
}) { return def; }

const structure = {
  tables: {
    students: {
      columns:{
        numero_libreta   :{type: 'string', label: "Número de Libreta / Student ID:", required: true},
        dni              :{type: 'number', label: "DNI:", required: true},
        first_name       :{type: 'string', label: "Nombre / Name:", required: true},
        last_name        :{type: 'string', label: "Apellido / Last name:", required: true},
        email            :{type: 'string', label: "Email:"},
        enrollment_date  :{type: 'date'  , label: "Fecha de inscripción / Enrollment Date:"},
        status           :{type: 'status', label: "Estado / Status:"},
      },
      pk: 'numero_libreta',
      uiName: 'Student'
    } satisfies TableStructure,
    subjects: {
      columns:{
        cod_mat     :{type: 'string', label: "Código de Materia / Subject Code:", required: true},
        name        :{type: 'string', label: "Nombre de Materia / Subject Name:", required: true},
        description :{type: 'string', label: "Descripción de Materia / Subject Description:"},
        credits     :{type: 'number', label: "Créditos / Credits:"},
        department  :{type: 'string', label: "Departamento / Department:"},
      },
      pk: 'cod_mat',
      uiName: 'Subject'
    } satisfies TableStructure,
    enrollments: {
        pk: 'numero_libreta cod_mat', 
        uiName: 'Enrollment',
        columns: {
          numero_libreta:  { type: 'string', label: "Número de Libreta / Student ID:", required: true},
          student_name:    { type: 'string', label: "Nombre de estudiante / Student Name:", deduced: true},
          cod_mat:         { type: 'string', label: "Código de Materia / Subject Code:", required: true},
          subject_name:    { type: 'string', label: "Nombre de Materia / Subject Name", deduced: true},
          enrollment_date: { type: 'date'  , label: "Fecha de Inscripción / Enrollment Date:", required: true},
          grade:           { type: 'number', label: "Nota / Grade:" },
          status:          { type: 'status', label: "Estado / Status:" }
        }
    } satisfies TableStructure
  }
}

const statusOptions: Record<string, Status[]> = {
  Enrollment:[
    {value: "enrolled" , label: "Inscripto / Enrolled"},
    {value: "completed", label: "Completado / Completed"},
    {value: "failed"   , label: "Fallido / Failed"}],
  Student   :[
    {value:"active"     , label: "Activo / Active"},
    {value:"graduated"  , label: "Graduado / Graduated"},
    {value:"interrupted", label: "Interrumpido / Interrupted"}
  ]
}

// Type definitions
type Student     = InferType<typeof structure.tables.students.columns>;
type Subject     = InferType<typeof structure.tables.subjects.columns>;
type Enrollment  = InferType<typeof structure.tables.enrollments.columns>;
type TableTuple  = Student | Subject | Enrollment;
type Status      = {value: string, label: string};


// DOM elements
const studentsBtn = document.getElementById('students-btn') as HTMLButtonElement;
const subjectsBtn = document.getElementById('subjects-btn') as HTMLButtonElement;
const enrollmentsBtn = document.getElementById('enrollments-btn') as HTMLButtonElement;

const studentsSection = document.getElementById('students-section') as HTMLElement;
const subjectsSection = document.getElementById('subjects-section') as HTMLElement;
const enrollmentsSection = document.getElementById('enrollments-section') as HTMLElement;

const addStudentBtn = document.getElementById('add-student-btn') as HTMLButtonElement;
const addSubjectBtn = document.getElementById('add-subject-btn') as HTMLButtonElement;
const addEnrollmentBtn = document.getElementById('add-enrollment-btn') as HTMLButtonElement;

const studentsForm = document.getElementById('students-form-container') as HTMLElement;
const subjectsForm = document.getElementById('subjects-form-container') as HTMLElement;
const enrollmentsForm = document.getElementById('enrollments-form-container') as HTMLElement;

const studentsTable = document.getElementById('students-table') as HTMLTableElement;
const subjectsTable = document.getElementById('subjects-table') as HTMLTableElement;
const enrollmentsTable = document.getElementById('enrollments-table') as HTMLTableElement;

// Navigation
studentsBtn.addEventListener('click', () => showSection('students'));
subjectsBtn.addEventListener('click', () => showSection('subjects'));
enrollmentsBtn.addEventListener('click', () => showSection('enrollments'));

function showSection(section: string) {
  // Hide all sections
  studentsSection.classList.remove('active');
  subjectsSection.classList.remove('active');
  enrollmentsSection.classList.remove('active');

  // Remove active class from buttons
  studentsBtn.classList.remove('active');
  subjectsBtn.classList.remove('active');
  enrollmentsBtn.classList.remove('active');

  // Show selected section
  switch (section) {
    case 'students':
      studentsSection.classList.add('active');
      studentsBtn.classList.add('active');
      loadStudents();
      break;
    case 'subjects':
      subjectsSection.classList.add('active');
      subjectsBtn.classList.add('active');
      loadSubjects();
      break;
    case 'enrollments':
      enrollmentsSection.classList.add('active');
      enrollmentsBtn.classList.add('active');
      loadEnrollments();
      break;
  }
}

//Load 
async function loadTableData(table: TableStructure) {
  const endpoint = getEndpointFromTable(table);
  try {
    const response = await fetch(`${API_BASE}/${endpoint}`);
    let data = await response.json();
    renderAnyTable(document.getElementById(endpoint+"-table") as HTMLTableElement, table, data);
  } catch (error) {
    console.error(`Error loading ${endpoint}:`, error);
  }
}

//load tables
const loadStudents    = () => loadTableData(structure.tables.students);
const loadSubjects    = () => loadTableData(structure.tables.subjects);
const loadEnrollments = () => loadTableData(structure.tables.enrollments);

//Render
function renderAnyTable(tableElement: HTMLTableElement, tableStructure: TableStructure, records: Record<string, any>[]){
  const tbody = tableElement.querySelector('tbody')!;
  tbody.innerHTML = '';

  records.forEach(record => {
    const {pk, uiName} = tableStructure;
    const pkValue: string[] = pk.split(' ').map(elem => String(encodeURIComponent(record[elem]) ?? ''));
    const row = document.createElement('tr');
    
    Object.entries(tableStructure.columns).forEach(([name]) => {
        const tdElement       = document.createElement("td"); 
        tdElement.textContent = `${record[name] || ''}`;
        row.appendChild(tdElement);
    });
    
    const tdButtons     = document.createElement("td");
    tdButtons.className = "actions";
    
    const editBtn = document.createElement("button");
    editBtn.className = "edit-btn";
    editBtn.textContent = "Editar / Edit";
    editBtn.addEventListener("click", () => editTable(tableStructure)(...pkValue));
    
    const deleteBtn = document.createElement("button");
    deleteBtn.className = "delete-btn";
    deleteBtn.textContent = "Eliminar / Delete";
    deleteBtn.addEventListener("click", () => deleteTupleFromTable(tableStructure, pkValue.join(' ')));

    tdButtons.appendChild(editBtn);
    tdButtons.appendChild(deleteBtn);
    row.appendChild(tdButtons);

    tbody.appendChild(row);
  });
}

//render tables
const renderStudentsTable    = (students: Student[]) => renderAnyTable(studentsTable, structure.tables.students, students);
const renderSubjectsTable    = (subjects: Subject[]) => renderAnyTable(subjectsTable, structure.tables.subjects, subjects);
const renderEnrollmentsTable = (enrollments: Enrollment[]) => renderAnyTable(enrollmentsTable, structure.tables.enrollments, enrollments); 

// Form functions
addStudentBtn.addEventListener('click',    () => showStudentForm());
addSubjectBtn.addEventListener('click',    () => showSubjectForm());
addEnrollmentBtn.addEventListener('click', () => showEnrollmentForm());

function showStudentForm(student?: Student) {
  showAnyForm(structure.tables.students, student);
}

function showSubjectForm(subject?: Subject) {
  showAnyForm(structure.tables.subjects, subject);
}

function showEnrollmentForm(enrollment?: Enrollment) {
  showAnyForm(structure.tables.enrollments, enrollment);
}

function hideStudentForm() {
  hideForm(studentsForm);
}

function hideSubjectForm() {
  hideForm(subjectsForm);
}

function hideEnrollmentForm() {
  hideForm(enrollmentsForm);
}

function hideForm(form: HTMLElement) {
  form.style.display = 'none';
}

// Global functions for onclick
(window as any).editStudent    = editTable(structure.tables.students);
(window as any).editSubject    = editTable(structure.tables.subjects);
(window as any).editEnrollment = editTable(structure.tables.enrollments);

function editTable(table: TableStructure) {
  return async (...args: string[]) => {
    try {
      const encodedPath = args.map(arg => encodeURIComponent(decodeURIComponent(arg))).join('/');
      const response = await fetch(`${API_BASE}/${getEndpointFromTable(table)}/${encodedPath}`);
      const data = await response.json();
      showAnyForm(table, data);
    } catch (error) {
      console.error(`Error loading ${table.uiName} for edit:`, error);
    }
  };
};

(window as any).deleteStudent = async (numero_libreta: string) => {
  deleteTupleFromTable(structure.tables.students, numero_libreta);
};

(window as any).deleteSubject = async (cod_mat: string) => {
  deleteTupleFromTable(structure.tables.subjects, cod_mat);
};

(window as any).deleteEnrollment = async (numero_libreta: string, cod_mat: string) => {
  deleteTupleFromTable(structure.tables.enrollments, `${numero_libreta} ${cod_mat}`);
};

async function deleteTupleFromTable(table: TableStructure, pk: string){
  if (confirm(`¿Está seguro de que desea eliminar este ${table.uiName.toLowerCase()}? / Are you sure you want to delete this ${table.uiName.toLowerCase()}?`)) {
    try {
      const tableElementsName: string = getEndpointFromTable(table);
      await fetch(`${API_BASE}/${tableElementsName}/${pk.split(' ').join('/')}`, { method: 'DELETE' });
      loadTableData(table);
    } catch (error) {
      console.error(`Error deleting ${table.uiName.toLowerCase()}:`, error);
    }
  }
}

function getEndpointFromTable(table: TableStructure){
  return table.uiName.toLowerCase()+'s';
}

function extractValuesFromForm(table: TableStructure) {
  let structureTableData: Record<string, any> = {};
  const formID = `${getEndpointFromTable(table)}-form`;
  const formInputs = document.forms.namedItem(formID)?.elements;
  if (formInputs) {    
    for (let i = 0; i < formInputs.length; i++) {
      const element = formInputs.item(i);
      if (element && element.id && isHTMLInputElement(element)) {
        let value: any = element.value;
        if (element instanceof HTMLInputElement){
          value = InferTypeFromMyTypes(element); //En el resto de casos nos sirve que quede como string
        }
        structureTableData[element.id] = value;
      }
    }
  }
  return structureTableData;
}

function isHTMLInputElement(element: any){
  return element instanceof HTMLInputElement || 
         element instanceof HTMLSelectElement||
         element instanceof HTMLTextAreaElement;
}

function inputFor(tableName:string, tableForm: HTMLFormElement, column: ColumnDef, field: string, isEdit: boolean, pk: string, entity?: TableTuple) {
  const entityRecord = entity as Record<string, any>;
  const value = entityRecord ? (entityRecord[field] || '') : '';
  if (!column.deduced){
    let htmlContent: HTMLDivElement = document.createElement("div");
    htmlContent.classList.add("forms-group");

    const label: HTMLLabelElement = document.createElement("label");
    label.htmlFor = field; 
    label.textContent = column.label || '';
    htmlContent.appendChild(label);
    
    let input;
    if (field === "status") {
      const select = document.createElement("select");
      statusOptions[tableName].forEach(statusOption => 
        select.add(new Option(statusOption.label, statusOption.value, false, statusOption.value === value)));
      input = select;
    } 
    else if (field === "description") {
      input       = document.createElement("textarea"); 
      input.value = value;   
    }
    else {    
      input          = document.createElement("input");
      input.type     = column.type;
      input.value    = value;
      input.required = column.required === true;
      input.readOnly = isEdit && input.required;
    }
    input.id   = field;
    input.name = field;
    htmlContent.appendChild(input);
    tableForm.appendChild(htmlContent);
  }
}

function addFormActions(tableForm: HTMLFormElement, isEdit?: boolean){
  let htmlContent: HTMLDivElement = document.createElement("div");
  htmlContent.classList.add("forms-actions");
  const submitBtn: HTMLButtonElement = document.createElement("button");
  submitBtn.type = "submit";
  submitBtn.textContent = `${isEdit ? 'Actualizar / Update' : 'Agregar / Add'}`;
  htmlContent.appendChild(submitBtn);

  const cancelBtn: HTMLButtonElement = document.createElement("button");
  cancelBtn.classList.add("cancel-btn");
  cancelBtn.textContent = "Cancelar / Cancel";
  htmlContent.appendChild(cancelBtn);
  
  tableForm.appendChild(htmlContent);
}

async function showAnyForm(table: TableStructure, entity?: TableTuple) {
  const isEdit = !!entity;
  const formName: string = `${getEndpointFromTable(table)}-form`;
  const formContainer: HTMLElement = document.getElementById(formName+"-container") as HTMLElement;
  const form: HTMLFormElement = document.createElement("form");
  form.id = formName;
  formContainer.innerHTML = '';
  formContainer.appendChild(form);
  const formHeader: HTMLHeadingElement = document.createElement("h3");
  formHeader.textContent = `${isEdit ? 'Edit ' + table.uiName : 'Add ' + table.uiName}`;
  form.appendChild(formHeader);
  //Add inputs
  for (const [field, columnDef] of Object.entries(table.columns)) {
      inputFor(table.uiName, form, columnDef, field, isEdit, table.pk, entity);
  }
  //Add buttons
  addFormActions(form, isEdit);

  formContainer.style.display = 'block';

  const formElement = form.querySelector('form') as HTMLFormElement;
  const cancelBtn = form.querySelector('.cancel-btn') as HTMLButtonElement;

  cancelBtn.addEventListener('click', () => hideForm(formContainer));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    submitData(table, form, isEdit);
  });
  
}

async function submitData(table: TableStructure, tablesFormContainer: HTMLElement, isEdit: boolean){
  const entityData = extractValuesFromForm(table);
    try {
      const endpoint = getEndpointFromTable(table);
      if (isEdit) {
        let url = `${API_BASE}/${endpoint}/${table.pk.split(' ').map(elem => encodeURIComponent(entityData[elem])).join('/')}`;
        await fetch(url, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(entityData),
        });
      } else {
        await fetch(`${API_BASE}/${endpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(entityData),
        });
      }
      hideForm(tablesFormContainer);
      loadTableData(table);
    } catch (error) {
      console.error(`Error saving ${table.uiName}:`, error);
    }
}

// Initialize
showSection('students');