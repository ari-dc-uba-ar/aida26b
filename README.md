# Sistema de Gestión Académica - Facultad de Ciencias Exactas UBA

Este proyecto implementa un sistema de gestión académica para la Facultad de Ciencias Exactas de la Universidad de Buenos Aires. El sistema permite gestionar alumnos, materias e inscripciones, con el objetivo de automatizar procesos académicos como la identificación de alumnos elegibles para títulos de grado y la generación de certificados.

## Características

- **Gestión de Alumnos**: CRUD completo con número de libreta como identificador único
- **Gestión de Materias**: CRUD con código de materia como identificador
- **Gestión de Inscripciones**: Relación muchos-a-muchos entre alumnos y materias con clave compuesta
- **Interfaz Web**: Grillas interactivas con botones de agregar, editar y eliminar
- **API REST**: Backend en Node.js con TypeScript
- **Base de Datos**: PostgreSQL

## Tecnologías Utilizadas

- **Backend**: Node.js, TypeScript, Express.js
- **Frontend**: Vanilla TypeScript, HTML5, CSS3
- **Base de Datos**: PostgreSQL
- **ORM**: SQL directo con pg library

## Estructura del Proyecto

```
/
├── backend/           # API REST
│   ├── src/
│   │   └── server.ts
│   ├── package.json
│   ├── tsconfig.json
│   └── .env
├── frontend/          # Interfaz web
│   ├── src/
│   │   └── app.ts
│   ├── index.html
│   ├── package.json
│   └── tsconfig.json
├── database/
│   ├── bootstrap.sql       # Crea roles y base de datos (corre una vez)
│   └── migrations/         # Migraciones SQL versionadas
└── README.md
```

## Instalación y Configuración

### Prerrequisitos

- Node.js (versión 16 o superior)
- PostgreSQL (versión 12 o superior)
- npm o yarn

### Base de Datos

1. Setup inicial (una vez por entorno, como superusuario de Postgres):
   ```
   psql -U postgres -f database/bootstrap.sql
   ```
   Esto crea los roles `aida26_owner` / `aida26_user` y la base `faculty_management`.

2. Aplicar migraciones (desde `backend/`):
   ```
   npm run migrate
   ```
   Esto crea/actualiza las tablas según los archivos en `database/migrations/`.

   Las migraciones son **forward-only** y nombradas con timestamp
   (ej. `20260520_120000_initial_schema.sql`). Para cambiar el schema,
   se agrega una migración nueva — nunca se editan las ya aplicadas.

   **Para deshacer un cambio:** no se edita la migración original — se escribe
   una migración nueva que aplique el revert. Ej: si
   `20260601_120000_add_phone.sql` hizo `ALTER TABLE students ADD COLUMN phone`,
   para sacarla escribimos `20260602_090000_remove_phone.sql` con
   `ALTER TABLE students DROP COLUMN phone`. Las migraciones aplicadas son
   inmutables — modificarlas rompe la verificación de checksum.

   El backend al arrancar verifica que la DB matchee con los archivos del repo
   y se niega a levantar si no coincide (`process.exit(1)` con el detalle al
   stderr). También expone `/api/health` que reporta el mismo estado en runtime.

3. Generar migraciones automáticamente (opcional, desde `backend/`):

   El schema deseado se declara en `backend/src/schema-def.ts`. Después de
   editarlo:
   ```
   npm run migrate:diff -- nombre_descriptivo
   ```
   compara la declaración contra la DB local y genera un **borrador** de
   migración en `database/migrations/` con la diferencia. Los cambios aditivos
   (tabla nueva, columna nullable, default) salen listos para aplicar; los
   que pueden chocar con datos existentes salen con un `TODO` de backfill, y
   los destructivos (`DROP`) salen comentados — siempre revisar el borrador
   antes de `npm run migrate`. El generador no detecta renames (aparecen como
   DROP + ADD: reescribirlos a mano como `RENAME`) y se niega a correr si hay
   migraciones pendientes.

   `schema-def.ts` y la migración generada se commitean **juntos** — si
   divergen, el próximo `migrate:diff` lo delata (no da "in sync").

### Backend

1. Navegar al directorio `backend`
2. Instalar dependencias: `npm install`
3. Configurar variables de entorno en `.env`:
   ```
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=faculty_management
   DB_USER=tu_usuario
   DB_PASSWORD=tu_contraseña
   PORT=3000
   ```
4. Compilar solo backend: `npm run build`
5. Ejecutar: `npm start` (servirá en http://localhost:3000 y también servirá `frontend/dist`)

### Frontend

1. Navegar al directorio `frontend`
2. Instalar dependencias: `npm install`
3. Compilar assets de producción: `npm run build`
4. Ejecutar el servidor de desarrollo con proxy API: `npm run dev` (servirá en http://localhost:8080)

### Comandos desde la raíz

1. Instalar frontend y backend: `npm run install:all`
2. Compilar frontend y backend: `npm run build`
3. Ejecutar backend compilado: `npm start`
4. Ejecutar backend en desarrollo: `npm run dev:backend`
5. Ejecutar frontend en desarrollo: `npm run dev:frontend`
6. Ejecutar tests unitarios frontend+backend: `npm test`
7. Ejecutar tests de integración con base de datos: `npm run test:db`
8. Ejecutar tests E2E Playwright: `npm run test:e2e`

## Uso

1. Ejecutar el backend: `npm start` en la raíz o en el directorio backend (servirá en http://localhost:3000)
2. Abrir el navegador en http://localhost:3000
3. Navegar entre las secciones de Alumnos, Materias e Inscripciones
4. Usar los botones "Agregar" para crear nuevos registros
5. Usar los botones "Editar" y "Eliminar" en cada fila de las grillas

## API Endpoints

### Alumnos
- `GET /api/students` - Listar todos los alumnos
- `GET /api/students/:numero_libreta` - Obtener alumno específico
- `POST /api/students` - Crear nuevo alumno
- `PUT /api/students/:numero_libreta` - Actualizar alumno
- `DELETE /api/students/:numero_libreta` - Eliminar alumno

### Materias
- `GET /api/subjects` - Listar todas las materias
- `GET /api/subjects/:cod_mat` - Obtener materia específica
- `POST /api/subjects` - Crear nueva materia
- `PUT /api/subjects/:cod_mat` - Actualizar materia
- `DELETE /api/subjects/:cod_mat` - Eliminar materia

### Inscripciones
- `GET /api/enrollments` - Listar todas las inscripciones
- `GET /api/enrollments/:numero_libreta/:cod_mat` - Obtener inscripción específica
- `POST /api/enrollments` - Crear nueva inscripción
- `PUT /api/enrollments/:numero_libreta/:cod_mat` - Actualizar inscripción
- `DELETE /api/enrollments/:numero_libreta/:cod_mat` - Eliminar inscripción

## Desarrollo Futuro

- Implementar autenticación y autorización
- Agregar validaciones más robustas
- Implementar búsqueda y filtros
- Generar reportes y estadísticas
- Automatizar procesos de titulación
- Generar certificados de alumno regular

## Testing de Paginación (Frontend + TypeScript)

La paginación del frontend usa el parámetro `page` y el backend pagina con un `limit` fijo de **20** registros por página.
El UI muestra el estado como: `Página X de Y (Total: N)` y ofrece botones `Anterior` / `Siguiente`.

### Prerrequisitos

- Backend y base de datos corriendo (la suite crea y borra registros de `students` vía API)
- Frontend servido en el mismo host/puerto que el backend (por defecto `http://localhost:3000`)
- Node.js 18+

### Ejecutar los tests

1. Instalar dependencias del frontend:
   - `cd frontend`
   - `npm install`
   - `npx playwright install`
2. (Opcional) Configurar URL base (por defecto `http://localhost:3000`):
   - `set E2E_BASE_URL=http://localhost:3000`
3. Ejecutar (desde `frontend/`):
   - `npm run test:e2e`

Por defecto corre en modo headless. Para ver el navegador:

- `set E2E_HEADLESS=0`

### Casos cubiertos

- Contenido menor a una página (ej: 5 items → 1/1)
- Contenido exactamente una página (20 items → 1/1)
- Contenido mayor a una página (21 items → 1/2, navegación prev/next)
- Muchas páginas (85 items → 1/5 ... 5/5)

## Contribución

Este proyecto es parte del sistema académico de la Facultad de Ciencias Exactas. Para contribuciones, por favor contactar al equipo de desarrollo.

## Licencia

Este proyecto es propiedad de la Universidad de Buenos Aires - Facultad de Ciencias Exactas.
