// Main application file
// Code and comments in English

const API_BASE = 'http://localhost:3000/api';

// Type definitions
interface Student {
  numero_libreta: string;
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

// Load data functions
async function loadStudents() {
  try {
    const response = await fetch(`${API_BASE}/students`);
    const students: Student[] = await response.json();
    renderStudentsTable(students);
  } catch (error) {
    console.error('Error loading students:', error);
  }
}

async function loadSubjects() {
  try {
    const response = await fetch(`${API_BASE}/subjects`);
    const subjects: Subject[] = await response.json();
    renderSubjectsTable(subjects);
  } catch (error) {
    console.error('Error loading subjects:', error);
  }
}

async function loadEnrollments() {
  try {
    const response = await fetch(`${API_BASE}/enrollments`);
    const enrollments: Enrollment[] = await response.json();
    renderEnrollmentsTable(enrollments);
  } catch (error) {
    console.error('Error loading enrollments:', error);
  }
}

// Render table functions
function renderStudentsTable(students: Student[]) {
  const tbody = studentsTable.querySelector('tbody')!;
  tbody.innerHTML = '';

  students.forEach(student => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${student.numero_libreta}</td>
      <td>${student.first_name}</td>
      <td>${student.last_name}</td>
      <td>${student.email || ''}</td>
      <td>${student.enrollment_date || ''}</td>
      <td>${student.status || ''}</td>
      <td class="actions">
        <button class="edit-btn" onclick="editStudent('${student.numero_libreta}')">Editar / Edit</button>
        <button class="delete-btn" onclick="deleteStudent('${student.numero_libreta}')">Eliminar / Delete</button>
      </td>
    `;
    tbody.appendChild(row);
  });
}

function renderSubjectsTable(subjects: Subject[]) {
  const tbody = subjectsTable.querySelector('tbody')!;
  tbody.innerHTML = '';

  subjects.forEach(subject => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${subject.cod_mat}</td>
      <td>${subject.name}</td>
      <td>${subject.description || ''}</td>
      <td>${subject.credits || ''}</td>
      <td>${subject.department || ''}</td>
      <td class="actions">
        <button class="edit-btn" onclick="editSubject('${subject.cod_mat}')">Editar / Edit</button>
        <button class="delete-btn" onclick="deleteSubject('${subject.cod_mat}')">Eliminar / Delete</button>
      </td>
    `;
    tbody.appendChild(row);
  });
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