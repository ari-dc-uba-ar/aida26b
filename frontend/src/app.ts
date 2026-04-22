// Main application file
// Code and comments in English

const API_BASE = '/api';

type ColumnDef = {
  type: string;
  label?: string;
  inputType?: string;
  required?: boolean;
  options?: { value: string; label: string }[];
  step?: string;
  parseAs?: 'int' | 'float';
}

type TableStructure = {
  columns: Record<string, ColumnDef>
  pk: string | string[]
  uiName: string
  apiPath: string
  editTitle: string
  addTitle: string
}

const structure = {
  tables: {
    students: {
      columns:{
        numero_libreta: {type: 'string', label: 'Número de Libreta / Student ID:', inputType: 'text', required: true},
        dni:            {type: 'string', label: 'DNI / ID Number:', inputType: 'text', required: true},
        first_name:     {type: 'string', label: 'Nombre / First Name:', inputType: 'text', required: true},
        last_name:      {type: 'string', label: 'Apellido / Last Name:', inputType: 'text', required: true},
        email:          {type: 'string', label: 'Email:', inputType: 'email'},
        enrollment_date:{type: 'string', label: 'Fecha de Inscripción / Enrollment Date:', inputType: 'date'},
        status:         {type: 'string', label: 'Estado / Status:', inputType: 'select', options: [
          {value: 'active', label: 'Activo / Active'},
          {value: 'graduated', label: 'Graduado / Graduated'},
          {value: 'interrupted', label: 'Interrumpido / Interrupted'},
        ]},
      },
      pk: 'numero_libreta',
      uiName: 'Student',
      apiPath: 'students',
      editTitle: 'Editar Alumno / Edit Student',
      addTitle: 'Agregar Alumno / Add Student',
    },
    subject: {
      columns:{
        cod_mat:     {type: 'string', label: 'Código / Code:', inputType: 'text', required: true},
        name:        {type: 'string', label: 'Nombre / Name:', inputType: 'text', required: true},
        description: {type: 'string', label: 'Descripción / Description:', inputType: 'textarea'},
        credits:     {type: 'string', label: 'Créditos / Credits:', inputType: 'number', parseAs: 'int' as const},
        department:  {type: 'string', label: 'Departamento / Department:', inputType: 'text'},
      },
      pk: 'cod_mat',
      uiName: 'Subject',
      apiPath: 'subjects',
      editTitle: 'Editar Materia / Edit Subject',
      addTitle: 'Agregar Materia / Add Subject',
    },
    enrollments: {
      columns:{
        numero_libreta: {type: 'string', label: 'Número de Libreta / Student ID:', inputType: 'text', required: true},
        cod_mat:        {type: 'string', label: 'Código de Materia / Subject Code:', inputType: 'text', required: true},
        enrollment_date:{type: 'string', label: 'Fecha de Inscripción / Enrollment Date:', inputType: 'date', required: true},
        grade:          {type: 'string', label: 'Nota / Grade:', inputType: 'number', step: '0.01', parseAs: 'float' as const},
        status:         {type: 'string', label: 'Estado / Status:', inputType: 'select', options: [
          {value: 'enrolled', label: 'Inscrito / Enrolled'},
          {value: 'completed', label: 'Completado / Completed'},
          {value: 'failed', label: 'Fallido / Failed'},
        ]},
      },
      pk: ['numero_libreta', 'cod_mat'],
      uiName: 'Enrollment',
      apiPath: 'enrollments',
      editTitle: 'Editar Inscripción / Edit Enrollment',
      addTitle: 'Agregar Inscripción / Add Enrollment',
    }
  }
}

// Type definitions
interface Student {
  numero_libreta: string;
  dni: string;
  first_name: string;
  last_name: string;
  email: string;
  enrollment_date: string;
  status: string;
}

interface Subject {
  cod_mat: string;
  name: string;
  description: string;
  credits: number;
  department: string;
}

interface Enrollment {
  numero_libreta: string;
  cod_mat: string;
  enrollment_date: string;
  grade: number;
  status: string;
  first_name?: string;
  last_name?: string;
  subject_name?: string;
}

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

const studentsForm = document.getElementById('students-form') as HTMLElement;
const subjectsForm = document.getElementById('subjects-form') as HTMLElement;
const enrollmentsForm = document.getElementById('enrollments-form') as HTMLElement;

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
async function loadTableData(tableElement: HTMLTableElement, structureKey: keyof typeof structure.tables) {
  const tableConfig = structure.tables[structureKey] as any;
  try {
    const response = await fetch(`${API_BASE}/${tableConfig.apiPath}`);
    let data = await response.json();
    renderAnyTable(tableElement, tableConfig, data);
  } catch (error) {
    console.error(`Error loading ${tableConfig.apiPath}:`, error);
  }
}
const loadStudents = () => loadTableData(studentsTable, 'students');
const loadSubjects = () => loadTableData(subjectsTable, 'subject');

async function loadEnrollments() {
  try {
    const response = await fetch(`${API_BASE}/enrollments`);
    const enrollments: Enrollment[] = await response.json();
    renderEnrollmentsTable(enrollments);
  } catch (error) {
    console.error('Error loading enrollments:', error);
  }
}

function renderAnyTable(tableElement: HTMLTableElement, tableStructure: TableStructure, records: Record<string, any>[]){
  const tbody = tableElement.querySelector('tbody')!;
  tbody.innerHTML = '';

  records.forEach(record => {
    const {uiName} = tableStructure;
    const pks = Array.isArray(tableStructure.pk) ? tableStructure.pk : [tableStructure.pk];
    const pkArgs = pks.map(k => `'${encodeURIComponent(record[k])}'`).join(', ');
    const row = document.createElement('tr');
    row.innerHTML =
      Object.entries(tableStructure.columns).map(([name]) => `<td>${record[name] || ''}</td>`).join('')
      +
    `
      <td class="actions">
        <button class="edit-btn" onclick="edit${uiName}(${pkArgs})">Editar / Edit</button>
        <button class="delete-btn" onclick="delete${uiName}(${pkArgs})">Eliminar / Delete</button>
      </td>
    `;
    tbody.appendChild(row);
  });
}

// Render table functions
function renderStudentsTable(students: Student[]) {
  return renderAnyTable(studentsTable, structure.tables.students, students);
}

function renderSubjectsTable(subjects: Subject[]) {
  return renderAnyTable(subjectsTable, structure.tables.subject, subjects);
}

function renderEnrollmentsTable(enrollments: Enrollment[]) {
  const tbody = enrollmentsTable.querySelector('tbody')!;
  tbody.innerHTML = '';

  enrollments.forEach(enrollment => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${enrollment.numero_libreta}</td>
      <td>${enrollment.first_name} ${enrollment.last_name}</td>
      <td>${enrollment.cod_mat}</td>
      <td>${enrollment.subject_name}</td>
      <td>${enrollment.enrollment_date}</td>
      <td>${enrollment.grade || ''}</td>
      <td>${enrollment.status || ''}</td>
      <td class="actions">
        <button class="edit-btn" onclick="editEnrollment('${enrollment.numero_libreta}', '${enrollment.cod_mat}')">Editar / Edit</button>
        <button class="delete-btn" onclick="deleteEnrollment('${enrollment.numero_libreta}', '${enrollment.cod_mat}')">Eliminar / Delete</button>
      </td>
    `;
    tbody.appendChild(row);
  });
}

// Form functions
addStudentBtn.addEventListener('click', () => showStudentForm());
addSubjectBtn.addEventListener('click', () => showSubjectForm());
addEnrollmentBtn.addEventListener('click', () => showEnrollmentForm());

function showAnyForm(
  tableStruct: TableStructure,
  formContainer: HTMLElement,
  entity: Record<string, any> | undefined,
  loadData: () => void
) {
  const isEdit = !!entity;
  const pks = Array.isArray(tableStruct.pk) ? tableStruct.pk : [tableStruct.pk];

  const fieldsHtml = Object.entries(tableStruct.columns).map(([name, col]) => {
    const value = entity?.[name] ?? '';
    const isPk = pks.includes(name);
    const readonly = isEdit && isPk ? 'readonly' : '';
    const required = col.required ? 'required' : '';

    if (col.inputType === 'select' && col.options) {
      const optionsHtml = col.options.map(opt =>
        `<option value="${opt.value}" ${entity?.[name] === opt.value ? 'selected' : ''}>${opt.label}</option>`
      ).join('');
      return `
      <div class="form-group">
        <label for="${name}">${col.label}</label>
        <select id="${name}">${optionsHtml}</select>
      </div>`;
    }
    if (col.inputType === 'textarea') {
      return `
      <div class="form-group">
        <label for="${name}">${col.label}</label>
        <textarea id="${name}">${value}</textarea>
      </div>`;
    }
    const step = col.step ? ` step="${col.step}"` : '';
    const inputType = col.inputType || 'text';
    return `
      <div class="form-group">
        <label for="${name}">${col.label}</label>
        <input type="${inputType}" id="${name}" value="${value}" ${readonly} ${required}${step}>
      </div>`;
  }).join('');

  formContainer.innerHTML = `
    <form id="edit-form">
      <h3>${isEdit ? tableStruct.editTitle : tableStruct.addTitle}</h3>
      ${fieldsHtml}
      <div class="form-actions">
        <button type="submit">${isEdit ? 'Actualizar / Update' : 'Agregar / Add'}</button>
        <button type="button" class="cancel-btn" id="cancel-btn">Cancelar / Cancel</button>
      </div>
    </form>
  `;

  formContainer.style.display = 'block';

  document.getElementById('cancel-btn')!.addEventListener('click', () => {
    formContainer.style.display = 'none';
  });

  const form = document.getElementById('edit-form') as HTMLFormElement;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data: Record<string, any> = {};
    Object.entries(tableStruct.columns).forEach(([name, col]) => {
      const el = document.getElementById(name) as HTMLInputElement;
      if (col.parseAs === 'int') {
        data[name] = parseInt(el.value) || 0;
      } else if (col.parseAs === 'float') {
        data[name] = parseFloat(el.value) || null;
      } else {
        data[name] = el.value;
      }
    });

    const pkPath = pks.map(k => encodeURIComponent(data[k])).join('/');
    try {
      if (isEdit) {
        await fetch(`${API_BASE}/${tableStruct.apiPath}/${pkPath}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
      } else {
        await fetch(`${API_BASE}/${tableStruct.apiPath}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
      }
      formContainer.style.display = 'none';
      loadData();
    } catch (error) {
      console.error(`Error saving ${tableStruct.uiName.toLowerCase()}:`, error);
    }
  });
}

function showStudentForm(student?: Student) {
  showAnyForm(structure.tables.students, studentsForm, student, loadStudents);
}

function hideStudentForm() {
  studentsForm.style.display = 'none';
}

function showSubjectForm(subject?: Subject) {
  showAnyForm(structure.tables.subject, subjectsForm, subject, loadSubjects);
}

function hideSubjectForm() {
  subjectsForm.style.display = 'none';
}

function showEnrollmentForm(enrollment?: Enrollment) {
  showAnyForm(structure.tables.enrollments, enrollmentsForm, enrollment, loadEnrollments);
}

function hideEnrollmentForm() {
  enrollmentsForm.style.display = 'none';
}

// Global functions for onclick
(window as any).editStudent = async (numero_libreta: string) => {
  try {
    const response = await fetch(`${API_BASE}/students/${numero_libreta}`);
    const student: Student = await response.json();
    showStudentForm(student);
  } catch (error) {
    console.error('Error loading student for edit:', error);
  }
};

(window as any).deleteStudent = async (numero_libreta: string) => {
  if (confirm('¿Está seguro de que desea eliminar este alumno? / Are you sure you want to delete this student?')) {
    try {
      await fetch(`${API_BASE}/students/${numero_libreta}`, { method: 'DELETE' });
      loadStudents();
    } catch (error) {
      console.error('Error deleting student:', error);
    }
  }
};

(window as any).editSubject = async (cod_mat: string) => {
  try {
    const response = await fetch(`${API_BASE}/subjects/${cod_mat}`);
    const subject: Subject = await response.json();
    showSubjectForm(subject);
  } catch (error) {
    console.error('Error loading subject for edit:', error);
  }
};

(window as any).deleteSubject = async (cod_mat: string) => {
  if (confirm('¿Está seguro de que desea eliminar esta materia? / Are you sure you want to delete this subject?')) {
    try {
      await fetch(`${API_BASE}/subjects/${cod_mat}`, { method: 'DELETE' });
      loadSubjects();
    } catch (error) {
      console.error('Error deleting subject:', error);
    }
  }
};

(window as any).editEnrollment = async (numero_libreta: string, cod_mat: string) => {
  try {
    const response = await fetch(`${API_BASE}/enrollments/${numero_libreta}/${cod_mat}`);
    const enrollment: Enrollment = await response.json();
    showEnrollmentForm(enrollment);
  } catch (error) {
    console.error('Error loading enrollment for edit:', error);
  }
};

(window as any).deleteEnrollment = async (numero_libreta: string, cod_mat: string) => {
  if (confirm('¿Está seguro de que desea eliminar esta inscripción? / Are you sure you want to delete this enrollment?')) {
    try {
      await fetch(`${API_BASE}/enrollments/${numero_libreta}/${cod_mat}`, { method: 'DELETE' });
      loadEnrollments();
    } catch (error) {
      console.error('Error deleting enrollment:', error);
    }
  }
};

// Initialize
showSection('students');