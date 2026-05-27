import test from 'node:test';
import assert from 'node:assert';
import dotenv from 'dotenv';
import type {Response} from '../../shared/src/types/types';
import {createAppWithPool} from '../src/app';
import { Pool } from 'pg';
import express from 'express';

const TESTS_PORT = 4000;
const API_BASE = `http://localhost:${TESTS_PORT}/api`;

dotenv.config({path: '.env.tests'});

let server: any;

const testsPool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD
})

test.before(async () => {
    const app = createAppWithPool(testsPool);
    server = app.listen(TESTS_PORT);
});

test.afterEach(async () => await clearDatabase());

test.after(async () => {
  testsPool.end();
  server.close();
});

test('GET /students of empty db returns Response object with success and correct message', async () => {
  try {
    assertToGetAnEmptyTable('students')
  } catch (error) {
    clearDatabase();
    console.log(error);
    throw error;
  }
});

test('GET /subjects of empty db returns Response object with success and correct message', async () => {
  try {
    assertToGetAnEmptyTable('subjects');
  } catch (error) {
    clearDatabase();
    console.log(error);
    throw error;
  }
});

test('GET /enrollments of empty db returns Response object with success and correct message', async () => {
  try {
    assertToGetAnEmptyTable('enrollments');
  } catch (error) {
    clearDatabase();
    console.log(error);
    throw error;
  }
});

test('POST /student to an empty db returns Response object with success and correct message', async () => {
  try {
    const response = await updateDBWithStudent(homeroSimpson.numero_libreta, homeroSimpson.dni, homeroSimpson.first_name, homeroSimpson.last_name, homeroSimpson.email, homeroSimpson.enrollment_date, homeroSimpson.status, false);
    assert.strictEqual(response.status, 201);
    const body = await response.json();
    assert.deepEqual(body.data, homeroSimpson);
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.message, 'Student created successfully');
  } catch (error) {
    clearDatabase();
    console.log(error);
    throw error;
  }
});

test('POST & GET /student to an empty db inserts student to db', async () => {
  try {
    assertToGetAnEmptyTable('students');    
    let response = await updateDBWithStudent(homeroSimpson.numero_libreta, homeroSimpson.dni, homeroSimpson.first_name, homeroSimpson.last_name, homeroSimpson.email, homeroSimpson.enrollment_date, homeroSimpson.status, false);
    assert.strictEqual(response.status, 201);
    let body = await response.json();
    assert.deepEqual(body.data, homeroSimpson);
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.message, 'Student created successfully');

    response = await fetchFullTable('students');
    assert.strictEqual(response.status, 200);
    body = await response.json();
    assert.equal(body.data.length, 1);
    assert.ok(Array.isArray(body.data));
    assert.deepEqual(body.data[0], homeroSimpson);
    assert.ok(body.success);
    assert.strictEqual(body.message, 'Students fetched successfully');
  } catch (error) {
    clearDatabase();
    console.log(error);
    throw error;
  }
});

test('POST & GET /subject to an empty db inserts subject to db', async () => {
  try {
    assertToGetAnEmptyTable('subjects');    
    let response = await updateDBWithSubject(ari.cod_mat, ari.name, ari.description, ari.credits, ari.department, false);
    assert.strictEqual(response.status, 201);
    let body = await response.json();
    assert.deepEqual(body.data, ari);
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.message, 'Subject created successfully');

    response = await fetchFullTable('subjects');
    assert.strictEqual(response.status, 200);
    body = await response.json();
    assert.equal(body.data.length, 1);
    assert.ok(Array.isArray(body.data));
    assert.deepEqual(body.data[0], ari);
    assert.ok(body.success);
    assert.strictEqual(body.message, 'Subjects fetched successfully');
  } catch (error) {
    clearDatabase();
    console.log(error);
    throw error;
  }
});


test('POST & GET /enrollment to an empty db inserts enrollment to db', async () => {
  try {
    DBWithStudentAndSubject();
    let response = await fetchFullTable('subjects');
    assert.strictEqual(response.status, 200);
    let body = await response.json();
    assert.equal(body.data.length, 1);
    assert.ok(Array.isArray(body.data));
    assert.deepEqual(body.data[0], ari);
    assert.ok(body.success);
    assert.strictEqual(body.message, 'Subjects fetched successfully');

    response = await fetchFullTable('students');
    assert.strictEqual(response.status, 200);
    body = await response.json();
    assert.equal(body.data.length, 1);
    assert.ok(Array.isArray(body.data));
    assert.deepEqual(body.data[0], homeroSimpson);
    assert.ok(body.success);
    assert.strictEqual(body.message, 'Students fetched successfully');

    
    response = await updateDBWithEnrollment(enrollmentHomeroAri.numero_libreta, enrollmentHomeroAri.cod_mat, enrollmentHomeroAri.enrollment_date, enrollmentHomeroAri.grade, enrollmentHomeroAri.status, false);
    assert.strictEqual(response.status, 201);
    body = await response.json();
    assert.deepEqual(body.data, enrollmentHomeroAri);
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.message, 'Enrollment created successfully');

  } catch (error) {
    clearDatabase();
    console.log(error);
    throw error;
  }
});


async function assertToGetAnEmptyTable(tableName: string){
    const response = await fetchFullTable(tableName);
    assert.strictEqual(response.status, 200);
    const body = await response.json();
    assert.strictEqual(body.data.length, 0);
    assert.equal(Array.isArray(body.data), true);
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.message, `${tableName.at(0)?.toUpperCase() + tableName.slice(1, tableName.length)} fetched successfully`);
}

/*Test objects*/
const homeroSimpson = {numero_libreta: '1/23', dni: '123456789', first_name: 'Homero', last_name: 'Simpson', email: 'homeroSimpson@dc.uba.ar', enrollment_date: '2023-02-12T03:00:00.000Z', status: 'active'};
const lennyLennard = {numero_libreta: '2/23', dni: '987654321', first_name: 'Lenford', last_name: 'Leonard', email: 'lennyLeonard@dc.uba.ar', enrollment_date: '2023-02-11T03:00:00.000Z', status: 'active'};
const carlCarlson = {numero_libreta: '3/23', dni: '123459876', first_name: 'Carlton', last_name: 'Carlson', email: 'carlCarlson@dc.uba.ar', enrollment_date: '2023-02-13T03:00:00.000Z', status: 'active'};

const ari = {cod_mat: 'ARI1C26', name: 'Almacenamiento y Recuperación de la Información', description: 'Bases de datos para los amigos', credits: 0, department: 'DC'};

const enrollmentHomeroAri = {
    numero_libreta: homeroSimpson.numero_libreta,
    cod_mat: ari.cod_mat,
    enrollment_date:  '2023-02-11T03:00:00.000Z',
    grade: 0,
    status: 'enrolled'
}


const DBWithStudentAndSubject = () => {
    updateDBWithStudent(homeroSimpson.numero_libreta, homeroSimpson.dni, homeroSimpson.first_name, homeroSimpson.last_name, homeroSimpson.email, homeroSimpson.enrollment_date, homeroSimpson.status, false);
    updateDBWithSubject(ari.cod_mat, ari.name, ari.description, ari.credits, ari.department, false);
}

/*Helpers*/
async function fetchStudent(numero_libreta: string) {
    const queryParams = new URLSearchParams([['numero_libreta', numero_libreta]]).toString();
    try {
        return await fetch(`${API_BASE}/students?` + queryParams);
    } catch (error) {
        console.log(error);
        throw error;
    }
}

async function fetchSubject(cod_mat: string){
    const queryParams = new URLSearchParams([['cod_mat', cod_mat]]).toString();
    try {
        return await fetch(`${API_BASE}/subjects?` + queryParams);
    } catch (error) {
        console.log(error);
        throw error;
    }
}

async function fetchEnrollment(numero_libreta: string, cod_mat: string){
    const queryParams = new URLSearchParams([['numero_libreta', numero_libreta], ['cod_mat', cod_mat]]).toString();
    try {
        return await fetch(`${API_BASE}/enrollments?` + queryParams);
    } catch (error) {
        console.log(error);
        throw error;
    }
}

async function fetchFullTable(tableName: string){
    try {
        return await fetch(`${API_BASE}/${tableName}`);
    } catch (error) {
        console.log(error);
        throw error;
    }
}

async function updateDBWithStudent(numero_libreta: string, dni: string, first_name: string, last_name: string, email: string, enrollment_date: string, status: string, isEdit: boolean) {
    const requestBody = {numero_libreta: numero_libreta,
         dni: dni, 
         first_name: first_name,
         last_name: last_name,
         email: email, 
         enrollment_date: enrollment_date,
         status: status};
    const queryParams: string = new URLSearchParams([['numero_libreta', numero_libreta]]).toString();
    try {
        return await fetch(`${API_BASE}/students?` + queryParams, {
            method: isEdit ? 'PUT' : 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(requestBody),
        });
    } catch (error) {
        console.log(error);
        throw error;
    }
}

async function updateDBWithSubject(cod_mat: string, name: string, description: string, credits: number, department: string, isEdit: boolean) {
    const requestBody = {cod_mat: cod_mat, name: name, description: description, credits: credits, department: department};
    const queryParams: string = new URLSearchParams([['cod_mat', cod_mat]]).toString();
    try {
        return await fetch(`${API_BASE}/subjects?` + queryParams, {
            method: isEdit? 'PUT' : 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(requestBody),
        });
    } catch (error) {
        console.log(error);
        throw error;
    }}

async function updateDBWithEnrollment(numero_libreta: string, cod_mat: string, enrollment_date: string, grade: number, status: string, isEdit: boolean) {
    const requestBody = {numero_libreta: numero_libreta, cod_mat: cod_mat, enrollment_date: enrollment_date, grade: grade,status: status};
    
    const queryParams: string = new URLSearchParams([['numero_libreta', numero_libreta], ['cod_mat', cod_mat]]).toString();
    
    try {
        return await fetch(`${API_BASE}/enrollments?` + queryParams, {
            method: isEdit ? 'PUT' : 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(requestBody),
        });
    } catch (error) {
        console.log(error);
        throw error;
    }
}

async function deleteStudent(numero_libreta: string) {
    const queryParams: string = new URLSearchParams([['numero_libreta', numero_libreta]]).toString();
    try {
        return await fetch(`${API_BASE}/students?` + queryParams, {method: 'DELETE'});
    } catch (error) {
        console.log(error);
        throw error;
    }
}

async function deleteSubject(cod_mat: string) {
    const queryParams: string = new URLSearchParams([['cod_mat', cod_mat]]).toString();
    try {
        return await fetch(`${API_BASE}/subjects?` + queryParams, {method: 'DELETE'});
    } catch (error) {
        console.log(error);
        throw error;
    }}

async function deleteEnrollment(numero_libreta: string, cod_mat: string) {
    const queryParams: string = new URLSearchParams([['numero_libreta', numero_libreta], ['cod_mat', cod_mat]]).toString();
    
    try {
        return await fetch(`${API_BASE}/enrollments?` + queryParams, {method: 'DELETE'});
    } catch (error) {
        console.log(error);
        throw error;
    }
}

async function clearDatabase(){
    await testsPool.query(`TRUNCATE TABLE students, subjects, enrollments CASCADE`);
}

