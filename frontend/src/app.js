import { structure } from "../../shared/structure/structure";
const API_BASE = '/api';
function inferTypeFromMyTypes(element) {
    let value = element.value;
    switch (element.type) {
        case "number":
            return parseFloat(element.value) || 0;
        case "boolean":
            return (element.value === "true");
        case "date":
            return new Date(element.value);
        case "status":
            return { type: "status", label: "Estado / Status:" };
        default:
            return element.value;
    }
}
function defineTable(def) { return def; }
const statusOptions = {
    Enrollment: [
        { value: "enrolled", label: "Inscripto / Enrolled" },
        { value: "completed", label: "Completado / Completed" },
        { value: "failed", label: "Fallido / Failed" }
    ],
    Student: [
        { value: "active", label: "Activo / Active" },
        { value: "graduated", label: "Graduado / Graduated" },
        { value: "interrupted", label: "Interrumpido / Interrupted" }
    ]
};
const pkValuesSeparator = "_";
// DOM elements
const studentsBtn = document.getElementById('students-btn');
const subjectsBtn = document.getElementById('subjects-btn');
const enrollmentsBtn = document.getElementById('enrollments-btn');
const studentsSection = document.getElementById('students-section');
const subjectsSection = document.getElementById('subjects-section');
const enrollmentsSection = document.getElementById('enrollments-section');
const addStudentBtn = document.getElementById('add-student-btn');
const addSubjectBtn = document.getElementById('add-subject-btn');
const addEnrollmentBtn = document.getElementById('add-enrollment-btn');
const studentsForm = document.getElementById('students-form-container');
const subjectsForm = document.getElementById('subjects-form-container');
const enrollmentsForm = document.getElementById('enrollments-form-container');
const studentsTable = document.getElementById('students-table');
const subjectsTable = document.getElementById('subjects-table');
const enrollmentsTable = document.getElementById('enrollments-table');
// Navigation
studentsBtn.addEventListener('click', () => showSection('students'));
subjectsBtn.addEventListener('click', () => showSection('subjects'));
enrollmentsBtn.addEventListener('click', () => showSection('enrollments'));
function showSection(section) {
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
async function loadTableData(table) {
    const endpoint = getEndpointFromTable(table);
    try {
        const response = await fetch(`${API_BASE}/${endpoint}`);
        let jsonResponse = await response.json();
        alert(jsonResponse.message);
        renderAnyTable(document.getElementById(endpoint + "-table"), table, jsonResponse.data);
    }
    catch (error) {
        alert(`Error loading ${endpoint}`);
        console.error(`Error loading ${endpoint}:`, error);
    }
}
//load tables
const loadStudents = () => loadTableData(structure.tables.students);
const loadSubjects = () => loadTableData(structure.tables.subjects);
const loadEnrollments = () => loadTableData(structure.tables.enrollments);
//Render
function renderAnyTable(tableElement, tableStructure, records) {
    const tbody = tableElement.querySelector('tbody');
    tbody.innerHTML = '';
    records.forEach(record => {
        const { pk, uiName } = tableStructure;
        const pkValue = pk.split(' ').map(elem => String(encodeURIComponent(record[elem]) ?? ''));
        const row = document.createElement('tr');
        Object.entries(tableStructure.columnsToDisplay).forEach(([name]) => {
            const tdElement = document.createElement("td");
            tdElement.textContent = `${record[name] || ''}`;
            row.appendChild(tdElement);
        });
        const tdButtons = document.createElement("td");
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
const renderStudentsTable = (students) => renderAnyTable(studentsTable, structure.tables.students, students);
const renderSubjectsTable = (subjects) => renderAnyTable(subjectsTable, structure.tables.subjects, subjects);
const renderEnrollmentsTable = (enrollments) => renderAnyTable(enrollmentsTable, structure.tables.enrollments, enrollments);
// Form functions
addStudentBtn.addEventListener('click', () => showStudentForm());
addSubjectBtn.addEventListener('click', () => showSubjectForm());
addEnrollmentBtn.addEventListener('click', () => showEnrollmentForm());
function showStudentForm(student) {
    showAnyForm(structure.tables.students, student);
}
function showSubjectForm(subject) {
    showAnyForm(structure.tables.subjects, subject);
}
function showEnrollmentForm(enrollment) {
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
function hideForm(form) {
    form.style.display = 'none';
}
// Global functions for onclick
window.editStudent = editTable(structure.tables.students);
window.editSubject = editTable(structure.tables.subjects);
window.editEnrollment = editTable(structure.tables.enrollments);
function editTable(table) {
    return async (...args) => {
        try {
            const encodedPath = args.map(arg => encodeURIComponent(decodeURIComponent(arg))).join(pkValuesSeparator);
            const response = await fetch(`${API_BASE}/${getEndpointFromTable(table)}/${encodedPath}`);
            const jsonResponse = await response.json();
            alert(jsonResponse.message);
            showAnyForm(table, jsonResponse.data);
        }
        catch (error) {
            alert(`Error loading ${table.uiName.toLowerCase()} for edit`);
            console.error(`Error loading ${table.uiName} for edit:`, error);
        }
    };
}
;
window.deleteStudent = async (numero_libreta) => {
    deleteTupleFromTable(structure.tables.students, numero_libreta);
};
window.deleteSubject = async (cod_mat) => {
    deleteTupleFromTable(structure.tables.subjects, cod_mat);
};
window.deleteEnrollment = async (numero_libreta, cod_mat) => {
    deleteTupleFromTable(structure.tables.enrollments, `${numero_libreta} ${cod_mat}`);
};
async function deleteTupleFromTable(table, pk) {
    if (confirm(`¿Está seguro de que desea eliminar este ${table.uiName.toLowerCase()}? / Are you sure you want to delete this ${table.uiName.toLowerCase()}?`)) {
        try {
            const tableElementsName = getEndpointFromTable(table);
            const response = await fetch(`${API_BASE}/${tableElementsName}/${pk.split(' ').join(pkValuesSeparator)}`, { method: 'DELETE' });
            const jsonResponse = await response.json();
            alert(jsonResponse.message);
            loadTableData(table);
        }
        catch (error) {
            console.error(`Error deleting ${table.uiName.toLowerCase()}:`, error);
            alert(`Error deleting ${table.uiName.toLowerCase()}`);
        }
    }
}
function getEndpointFromTable(table) {
    return table.uiName.toLowerCase() + 's';
}
function extractValuesFromForm(table) {
    let structureTableData = {};
    const formID = `${getEndpointFromTable(table)}-form`;
    const formInputs = document.forms.namedItem(formID)?.elements;
    if (formInputs) {
        for (let i = 0; i < formInputs.length; i++) {
            const element = formInputs.item(i);
            if (element && element.id && isHTMLInputElement(element)) {
                let value = element.value;
                if (element instanceof HTMLInputElement) {
                    value = inferTypeFromMyTypes(element); //En el resto de casos nos sirve que quede como string
                }
                structureTableData[element.id] = value;
            }
        }
    }
    return structureTableData;
}
function isHTMLInputElement(element) {
    return element instanceof HTMLInputElement ||
        element instanceof HTMLSelectElement ||
        element instanceof HTMLTextAreaElement;
}
function inputFor(tableName, tableForm, column, field, isEdit, pk, entity) {
    const entityRecord = entity;
    const value = entityRecord ? (entityRecord[field] || '') : '';
    if (!column.deduced) {
        let htmlContent = document.createElement("div");
        htmlContent.classList.add("forms-group");
        const label = document.createElement("label");
        label.htmlFor = field;
        label.textContent = column.label || '';
        htmlContent.appendChild(label);
        let input;
        if (field === "status") {
            const select = document.createElement("select");
            statusOptions[tableName].forEach(statusOption => select.add(new Option(statusOption.label, statusOption.value, false, statusOption.value === value)));
            input = select;
        }
        else if (field === "description") {
            input = document.createElement("textarea");
            input.value = value;
        }
        else {
            input = document.createElement("input");
            input.type = column.type;
            input.value = value;
            input.required = column.required === true;
            input.readOnly = isEdit && pk.includes(field);
        }
        input.id = field;
        input.name = field;
        htmlContent.appendChild(input);
        tableForm.appendChild(htmlContent);
    }
}
function addFormActions(tableForm, isEdit) {
    let htmlContent = document.createElement("div");
    htmlContent.classList.add("forms-actions");
    const submitBtn = document.createElement("button");
    submitBtn.type = "submit";
    submitBtn.textContent = `${isEdit ? 'Actualizar / Update' : 'Agregar / Add'}`;
    htmlContent.appendChild(submitBtn);
    const cancelBtn = document.createElement("button");
    cancelBtn.classList.add("cancel-btn");
    cancelBtn.textContent = "Cancelar / Cancel";
    htmlContent.appendChild(cancelBtn);
    tableForm.appendChild(htmlContent);
}
async function showAnyForm(table, entity) {
    const isEdit = !!entity;
    const formName = `${getEndpointFromTable(table)}-form`;
    const formContainer = document.getElementById(formName + "-container");
    const form = document.createElement("form");
    form.id = formName;
    formContainer.innerHTML = '';
    formContainer.appendChild(form);
    const formHeader = document.createElement("h3");
    formHeader.textContent = `${isEdit ? 'Edit ' + table.uiName : 'Add ' + table.uiName}`;
    form.appendChild(formHeader);
    //Add inputs
    for (const field of table.tableColumns) {
        inputFor(table.uiName, form, table.columnsToDisplay[field], field, isEdit, table.pk, entity);
    }
    //Add buttons
    addFormActions(form, isEdit);
    formContainer.style.display = 'block';
    const formElement = form.querySelector('form');
    const cancelBtn = form.querySelector('.cancel-btn');
    cancelBtn.addEventListener('click', () => hideForm(formContainer));
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        submitData(table, form, isEdit);
    });
}
async function submitData(table, tablesFormContainer, isEdit) {
    const entityData = extractValuesFromForm(table);
    try {
        const endpoint = getEndpointFromTable(table);
        let url = `${API_BASE}/${endpoint}`;
        if (isEdit) {
            url += `/${table.pk.split(' ').map(elem => encodeURIComponent(entityData[elem])).join(pkValuesSeparator)}`;
        }
        const response = await fetch(url, {
            method: isEdit ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(entityData),
        });
        const jsonResponse = await response.json();
        alert(jsonResponse.message);
        hideForm(tablesFormContainer);
        loadTableData(table);
    }
    catch (error) {
        console.error(`Error saving ${table.uiName}:`, error);
    }
}
// Initialize
showSection('students');
