// Main application file
// Code and comments in English

const API_BASE = '/api';



type TypeMap = {
  string: string;
  number: number;
  boolean: boolean;
  date: Date;
};

type MyTypeNames = keyof TypeMap;


type ColumnDef = {
  type: MyTypeNames;
  label?: string;
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
        numero_libreta   :{type: 'string', label: "Número de Libreta / Student ID:"},
        dni              :{type: 'number'},
        first_name       :{type: 'string'},
        last_name        :{type: 'string'},
        email            :{type: 'string'},
        enrollment_date  :{type: 'date'},
        status           :{type: 'string'},
      },
      pk: 'numero_libreta',
      uiName: 'Student',
      endpoint: `${API_BASE}/students`
    } satisfies TableStructure,
    subject: {
      columns:{
        cod_mat     :{type: 'string'},
        name        :{type: 'string'},
        description :{type: 'string'},
        credits     :{type: 'number'},
        department  :{type: 'string'},
      },
      pk: 'cod_mat',
      uiName: 'Subject',
      endpoint: `${API_BASE}/subjects`
    } satisfies TableStructure,
    enrollments: {
        pk: 'numero_libreta', 
        uiName: 'Enrollment',
        columns: {
          numero_libreta: { type: 'string' },
          student_name: { type: 'string' },
          cod_mat: { type: 'string' },
          subject_name: { type: 'string' },
          enrollment_date: { type: 'date' },
          grade: { type: 'number' },
          status: { type: 'string' }
        },
        endpoint: `${API_BASE}/enrollments`
    } satisfies TableStructure
  }
}

// Type definitions
type Student     = InferType<typeof structure.tables.students.columns>;
type Subject     = InferType<typeof structure.tables.subject.columns>;
type Enrollment  = InferType<typeof structure.tables.enrollments.columns>;

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
  const endpoint = tableConfig.endpoint || structureKey;
  try {
    const response = await fetch(`${API_BASE}/${endpoint}`);
    let data = await response.json();
    renderAnyTable(tableElement, tableConfig, data);
  } catch (error) {
    console.error(`Error loading ${endpoint}:`, error);
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
    const {pk, uiName} = tableStructure;
    const pkValue = encodeURIComponent(record[pk]);
    const row = document.createElement('tr');
    row.innerHTML = 
      Object.entries(tableStructure.columns).map(([name]) => `<td>${record[name] || ''}</td>`).join('')
      +
    `
      <td class="actions">
        <button class="edit-btn" onclick="edit${uiName}('${pkValue}')">Editar / Edit</button>
        <button class="delete-btn" onclick="delete${uiName}('${pkValue}')">Eliminar / Delete</button>
      </td>
    `;
    tbody.appendChild(row);
  });
}

// Render table functions
function renderStudentsTable(students: Student[]) {
  console.log(`viendo los estudiantes que arrancan con ${students[0].first_name}`)
  return renderAnyTable(studentsTable, structure.tables.students, students);
}

function renderSubjectsTable(subjects: Subject[]) {
  return renderAnyTable(subjectsTable, structure.tables.subject, subjects);
}

function renderEnrollmentsTable(enrollments: Enrollment[]) {
  return renderAnyTable(enrollmentsTable, structure.tables.enrollments, enrollments.map(e => ({
    numero_libreta: e.numero_libreta,
    student_name: `${e.student_name ?? ''}`,
    cod_mat: e.cod_mat,
    subject_name: e.subject_name,
    enrollment_date: e.enrollment_date,
    grade: e.grade,
    status: e.status
  }))) 
}

// Form functions
addStudentBtn.addEventListener('click', () => showStudentForm());
addSubjectBtn.addEventListener('click', () => showSubjectForm());
addEnrollmentBtn.addEventListener('click', () => showEnrollmentForm());

function showStudentForm(student?: Student) {
  const isEdit = !!student;
  studentsForm.innerHTML = `
    <form id="student-form">
      <h3>${isEdit ? 'Editar Alumno / Edit Student' : 'Agregar Alumno / Add Student'}</h3>
      <div class="form-group">
        <label for="numero_libreta">Número de Libreta / Student ID:</label>
        <input type="text" id="numero_libreta" value="${student?.numero_libreta || ''}" ${isEdit ? 'readonly' : ''} required>
      </div>
      <div class="form-group">
        <label for="dni">DNI / ID Number:</label>
        <input type="text" id="dni" value="${student?.dni || ''}" required>
      </div>
      <div class="form-group">
        <label for="first_name">Nombre / First Name:</label>
        <input type="text" id="first_name" value="${student?.first_name || ''}" required>
      </div>
      <div class="form-group">
        <label for="last_name">Apellido / Last Name:</label>
        <input type="text" id="last_name" value="${student?.last_name || ''}" required>
      </div>
      <div class="form-group">
        <label for="email">Email:</label>
        <input type="email" id="email" value="${student?.email || ''}">
      </div>
      <div class="form-group">
        <label for="enrollment_date">Fecha de Inscripción / Enrollment Date:</label>
        <input type="date" id="enrollment_date" value="${student?.enrollment_date || ''}">
      </div>
      <div class="form-group">
        <label for="status">Estado / Status:</label>
        <select id="status">
          <option value="active" ${student?.status === 'active' ? 'selected' : ''}>Activo / Active</option>
          <option value="graduated" ${student?.status === 'graduated' ? 'selected' : ''}>Graduado / Graduated</option>
          <option value="interrupted" ${student?.status === 'interrupted' ? 'selected' : ''}>Interrumpido / Interrupted</option>
        </select>
      </div>
      <div class="form-actions">
        <button type="submit">${isEdit ? 'Actualizar / Update' : 'Agregar / Add'}</button>
        <button type="button" class="cancel-btn" onclick="hideStudentForm()">Cancelar / Cancel</button>
      </div>
    </form>
  `;

  studentsForm.style.display = 'block';

  const form = document.getElementById('student-form') as HTMLFormElement;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    const studentData = {
      numero_libreta: (document.getElementById('numero_libreta') as HTMLInputElement).value,
      dni: (document.getElementById('dni') as HTMLInputElement).value,
      first_name: (document.getElementById('first_name') as HTMLInputElement).value,
      last_name: (document.getElementById('last_name') as HTMLInputElement).value,
      email: (document.getElementById('email') as HTMLInputElement).value,
      enrollment_date: (document.getElementById('enrollment_date') as HTMLInputElement).value,
      status: (document.getElementById('status') as HTMLSelectElement).value,
    };

    try {
      if (isEdit) {
        await fetch(`${API_BASE}/students/${studentData.numero_libreta}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(studentData),
        });
      } else {
        await fetch(`${API_BASE}/students`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(studentData),
        });
      }
      hideStudentForm();
      loadStudents();
    } catch (error) {
      console.error('Error saving student:', error);
    }
  });
}

function hideStudentForm() {
  studentsForm.style.display = 'none';
}

function showSubjectForm(subject?: Subject) {
  const isEdit = !!subject;
  subjectsForm.innerHTML = `
    <form id="subject-form">
      <h3>${isEdit ? 'Editar Materia / Edit Subject' : 'Agregar Materia / Add Subject'}</h3>
      <div class="form-group">
        <label for="cod_mat">Código / Code:</label>
        <input type="text" id="cod_mat" value="${subject?.cod_mat || ''}" ${isEdit ? 'readonly' : ''} required>
      </div>
      <div class="form-group">
        <label for="name">Nombre / Name:</label>
        <input type="text" id="name" value="${subject?.name || ''}" required>
      </div>
      <div class="form-group">
        <label for="description">Descripción / Description:</label>
        <textarea id="description">${subject?.description || ''}</textarea>
      </div>
      <div class="form-group">
        <label for="credits">Créditos / Credits:</label>
        <input type="number" id="credits" value="${subject?.credits || ''}">
      </div>
      <div class="form-group">
        <label for="department">Departamento / Department:</label>
        <input type="text" id="department" value="${subject?.department || ''}">
      </div>
      <div class="form-actions">
        <button type="submit">${isEdit ? 'Actualizar / Update' : 'Agregar / Add'}</button>
        <button type="button" class="cancel-btn" onclick="hideSubjectForm()">Cancelar / Cancel</button>
      </div>
    </form>
  `;

  subjectsForm.style.display = 'block';

  const form = document.getElementById('subject-form') as HTMLFormElement;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const subjectData = {
      cod_mat: (document.getElementById('cod_mat') as HTMLInputElement).value,
      name: (document.getElementById('name') as HTMLInputElement).value,
      description: (document.getElementById('description') as HTMLTextAreaElement).value,
      credits: parseInt((document.getElementById('credits') as HTMLInputElement).value) || 0,
      department: (document.getElementById('department') as HTMLInputElement).value,
    };

    try {
      if (isEdit) {
        await fetch(`${API_BASE}/subjects/${subjectData.cod_mat}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(subjectData),
        });
      } else {
        await fetch(`${API_BASE}/subjects`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(subjectData),
        });
      }
      hideSubjectForm();
      loadSubjects();
    } catch (error) {
      console.error('Error saving subject:', error);
    }
  });
}

function hideSubjectForm() {
  subjectsForm.style.display = 'none';
}

function showEnrollmentForm(enrollment?: Enrollment) {
  const isEdit = !!enrollment;
  enrollmentsForm.innerHTML = `
    <form id="enrollment-form">
      <h3>${isEdit ? 'Editar Inscripción / Edit Enrollment' : 'Agregar Inscripción / Add Enrollment'}</h3>
      <div class="form-group">
        <label for="numero_libreta">Número de Libreta / Student ID:</label>
        <input type="text" id="numero_libreta" value="${enrollment?.numero_libreta || ''}" ${isEdit ? 'readonly' : ''} required>
      </div>
      <div class="form-group">
        <label for="cod_mat">Código de Materia / Subject Code:</label>
        <input type="text" id="cod_mat" value="${enrollment?.cod_mat || ''}" ${isEdit ? 'readonly' : ''} required>
      </div>
      <div class="form-group">
        <label for="enrollment_date">Fecha de Inscripción / Enrollment Date:</label>
        <input type="date" id="enrollment_date" value="${enrollment?.enrollment_date || ''}" required>
      </div>
      <div class="form-group">
        <label for="grade">Nota / Grade:</label>
        <input type="number" id="grade" step="0.01" value="${enrollment?.grade || ''}">
      </div>
      <div class="form-group">
        <label for="status">Estado / Status:</label>
        <select id="status">
          <option value="enrolled" ${enrollment?.status === 'enrolled' ? 'selected' : ''}>Inscrito / Enrolled</option>
          <option value="completed" ${enrollment?.status === 'completed' ? 'selected' : ''}>Completado / Completed</option>
          <option value="failed" ${enrollment?.status === 'failed' ? 'selected' : ''}>Fallido / Failed</option>
        </select>
      </div>
      <div class="form-actions">
        <button type="submit">${isEdit ? 'Actualizar / Update' : 'Agregar / Add'}</button>
        <button type="button" class="cancel-btn" onclick="hideEnrollmentForm()">Cancelar / Cancel</button>
      </div>
    </form>
  `;

  enrollmentsForm.style.display = 'block';

  const form = document.getElementById('enrollment-form') as HTMLFormElement;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const enrollmentData = {
      numero_libreta: (document.getElementById('numero_libreta') as HTMLInputElement).value,
      cod_mat: (document.getElementById('cod_mat') as HTMLInputElement).value,
      enrollment_date: (document.getElementById('enrollment_date') as HTMLInputElement).value,
      grade: parseFloat((document.getElementById('grade') as HTMLInputElement).value) || null,
      status: (document.getElementById('status') as HTMLSelectElement).value,
    };

    try {
      if (isEdit) {
        await fetch(`${API_BASE}/enrollments/${enrollmentData.numero_libreta}/${enrollmentData.cod_mat}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(enrollmentData),
        });
      } else {
        await fetch(`${API_BASE}/enrollments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(enrollmentData),
        });
      }
      hideEnrollmentForm();
      loadEnrollments();
    } catch (error) {
      console.error('Error saving enrollment:', error);
    }
  });
}

function hideEnrollmentForm() {
  enrollmentsForm.style.display = 'none';
}

// Global functions for onclick
(window as any).editStudent    = editTable(structure.tables.students);

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

(window as any).editSubject    = editTable(structure.tables.subject);

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

(window as any).editEnrollment = editTable(structure.tables.enrollments);

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

function editTable(table: TableStructure) {
  return async (...args: string[]) => {
    try {
      const encodedPath = args.map(arg => encodeURIComponent(decodeURIComponent(arg))).join('/');
      const response = await fetch(`${API_BASE}/${table.endpoint}/${encodedPath}`);
      const data = await response.json();
      showAnyForm(table, data);
    } catch (error) {
      console.error(`Error loading ${table.uiName} for edit:`, error);
    }
  };
};

// Initialize
showSection('students');