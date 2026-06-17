import { TableStructure } from '../types/types';

type LocalizedText = {
  es: string;
  en: string;
};

function getCurrentLanguage(): keyof LocalizedText {
  return globalThis.localStorage?.getItem('language') === 'en' ? 'en' : 'es';
}

function localizeText(text: LocalizedText): string {
  return text[getCurrentLanguage()] ?? text.es;
}

export const structure = {
  tables: {
    students: {
      columns: {
        numero_libreta: {
          type: 'string',
          label: { es: 'Número de Libreta', en: 'Student ID' },
          readonlyOnEdit: true,
          validator: {
            required: true,
            pattern: '^\\d{1,4}/\\d{2}$',
            patternMessage:
              'must match pattern NNNN/YY (1-4 digit number, slash, 2-digit year; leading zeros optional on the number)',
            normalize: {
              pattern: '^0+(?=\\d)',
              replacement: '',
            },
          },
        },

        dni: {
          type: 'string',
          label: { es: 'DNI', en: 'ID Number' },
          validator: {
            required: true,
            pattern: '^\\d{7,8}$',
            patternMessage: 'must be 7 or 8 digits',
          },
        },

        first_name: {
          type: 'string',
          label: { es: 'Nombre', en: 'First Name' },
          validator: {
            required: true,
            pattern: '^\\D+$',
            patternMessage: 'must not contain numbers',
          },
        },

        last_name: {
          type: 'string',
          label: { es: 'Apellido', en: 'Last Name' },
          validator: {
            required: true,
            pattern: '^\\D+$',
            patternMessage: 'must not contain numbers',
          },
        },

        email: {
          type: 'string',
          label: { es: 'Email', en: 'Email' },
          input: 'email',
          validator: {
            nullable: true,
            pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$',
            patternMessage: 'must be a valid email address',
          },
        },

        enrollment_date: {
          type: 'string',
          label: { es: 'Fecha de Inscripción', en: 'Enrollment Date' },
          input: 'date',
          validator: {
            nullable: true,
            minDate: '1821-08-09',
            maxDayOffset: 0,
          },
        },

        status: {
          type: 'string',
          label: { es: 'Estado', en: 'Status' },
          input: 'select',
          validator: {
            nullable: true,
          },
          options: [
            { value: 'active', label: { es: 'Activo', en: 'Active' } },
            { value: 'graduated', label: { es: 'Graduado', en: 'Graduated' } },
            {
              value: 'interrupted',
              label: { es: 'Interrumpido', en: 'Interrupted' },
            },
          ],
        },
      },
      pk: 'numero_libreta',
      uiName: { es: 'Alumno', en: 'Student' },
      title: { es: 'Alumnos', en: 'Students' },
      addButtonLabel: { es: 'Agregar Alumno', en: 'Add Student' },
    } satisfies TableStructure,

    departments: {
      columns: {
        dept_code: {
          type: 'string',
          label: { es: 'Código', en: 'Code' },
          readonlyOnEdit: true,
          validator: {
            required: true,
          },
        },
        name: {
          type: 'string',
          label: { es: 'Nombre', en: 'Name' },
          validator: {
            required: true,
          },
        },
        description: {
          type: 'string',
          label: { es: 'Descripción', en: 'Description' },
          input: 'textarea',
          validator: {
            nullable: true,
          },
        },
      },
      pk: 'dept_code',
      uiName: { es: 'Departamento', en: 'Department' },
      title: { es: 'Departamentos', en: 'Departments' },
      addButtonLabel: { es: 'Agregar Departamento', en: 'Add Department' },
    } satisfies TableStructure,

    subjects: {
      columns: {
        cod_mat: {
          type: 'string',
          label: { es: 'Código', en: 'Code' },
          readonlyOnEdit: true,
          validator: {
            required: true,
          },
        },

        name: {
          type: 'string',
          label: { es: 'Nombre', en: 'Name' },
          validator: {
            required: true,
          },
        },

        description: {
          type: 'string',
          label: { es: 'Descripción', en: 'Description' },
          input: 'textarea',
          validator: {
            nullable: true,
          },
        },

        credits: {
          type: 'number',
          label: { es: 'Créditos', en: 'Credits' },
          input: 'number',
          validator: {
            nullable: true,
            integer: true,
            minValue: 1,
          },
        },

        dept_code: {
          type: 'string',
          label: { es: 'Departamento', en: 'Department' },
          input: 'select',
          validator: {
            required: true,
          },
          foreignKey: {
            table: 'departments',
            valueField: 'dept_code',
            labelField: 'name',
          },
        },
      },
      pk: 'cod_mat',
      uiName: { es: 'Materia', en: 'Subject' },
      title: { es: 'Materias', en: 'Subjects' },
      addButtonLabel: { es: 'Agregar Materia', en: 'Add Subject' },
    } satisfies TableStructure,
    enrollments: {
      pk: ['numero_libreta', 'cod_mat'],
      uiName: { es: 'Inscripción', en: 'Enrollment' },
      columns: {
        numero_libreta: {
          type: 'string',
          label: { es: 'Número de Libreta', en: 'Student ID' },
          readonlyOnEdit: true,
          validator: {
            required: true,
            pattern: '^\\d{1,4}/\\d{2}$',
            patternMessage:
              'must match pattern NNNN/YY (1-4 digit number, slash, 2-digit year; leading zeros optional on the number)',
            normalize: {
              pattern: '^0+(?=\\d)',
              replacement: '',
            },
          },
          input: 'select',
          foreignKey: {
            table: 'students',
            valueField: 'numero_libreta',
            labelField: `first_name || ' ' || last_name`,
          },
        },

        student_name: {
          type: 'string',
          label: { es: 'Nombre del Alumno', en: 'Student Name' },
          editable: false,
          derivable: {
            originTable: 'students',
            sqlGenerationStatement:
              `entityName.first_name || ' ' || entityName.last_name`,
          },
        },

        department: {
          type: 'string',
          label: { es: 'Departamento', en: 'Department' },
          input: 'select',
          persist: false,
          validator: {
            required: true,
          },
          readonlyOnEdit: true, 
          foreignKey: {
            table: 'departments',
            valueField: 'dept_code',
            labelField: 'name',
          },
        },

        cod_mat: {
          type: 'string',
          label: { es: 'Código de Materia', en: 'Subject Code' },
          readonlyOnEdit: true,
          validator: {
            required: true,
          },
          input: 'select',
          foreignKey: {
            table: 'subjects',
            valueField: 'cod_mat',
            labelField: 'name',
            dependsOn: {
              field: 'department',
              foreignField: 'dept_code',
            },
          },
        },

        subject_name: {
          type: 'string',
          label: { es: 'Nombre de Materia', en: 'Subject Name' },
          editable: false,
          derivable: {
            originTable: 'subjects',
            sqlGenerationStatement: `entityName.name`,
          },
        },

        enrollment_date: {
          type: 'string',
          label: { es: 'Fecha de Inscripción', en: 'Enrollment Date' },
          input: 'date',
          validator: {
            required: true,
            minDate: '1821-08-09',
          },
        },

        grade: {
          type: 'number',
          label: { es: 'Nota', en: 'Grade' },
          input: 'number',
          validator: {
            nullable: true,
            minValue: 0,
            maxValue: 10,
          },
        },

        status: {
          type: 'string',
          label: { es: 'Estado', en: 'Status' },
          input: 'select',
          validator: {
            nullable: true,
          },
          options: [
            { value: 'enrolled', label: { es: 'Inscrito', en: 'Enrolled' } },
            {
              value: 'completed',
              label: { es: 'Completado', en: 'Completed' },
            },
            { value: 'failed', label: { es: 'Fallido', en: 'Failed' } },
          ],
        },
      },
      title: { es: 'Inscripciones', en: 'Enrollments' },
      addButtonLabel: { es: 'Agregar Inscripción', en: 'Add Enrollment' },
      referencedTables: ['students', 'subjects'],
    } satisfies TableStructure,
  },

  menu: {
    theme: {
      title: { es: 'Tema', en: 'Theme' },
      id: 'theme-picker',
      handler: (value: string) => {
        try {
          if (!value) throw new Error('Theme value is required');

          document.body.setAttribute('data-theme', value);
          localStorage.setItem('theme', value);
        } catch (err) {
          console.error('Error changing theme:', err);
          alert(localizeText(structure.commonText.themeChangeError));
        }
      },
      options: [
        { value: 'light', label: { es: 'Claro', en: 'Light' } },
        { value: 'dark', label: { es: 'Oscuro', en: 'Dark' } },
      ],
      initial: () => localStorage.getItem('theme') || 'light',
    },

    language: {
      title: { es: 'Idioma', en: 'Language' },
      id: 'language-picker',
      handler: (value: string) => {
        try {
          if (value !== 'es' && value !== 'en') {
            throw new Error('Invalid language value');
          }

          localStorage.setItem('language', value);

          window.dispatchEvent(
            new CustomEvent('languagechange', {
              detail: { language: value },
            })
          );
        } catch (err) {
          console.error('Error changing language:', err);
          alert(localizeText(structure.commonText.languageChangeError));
        }
      },
      options: [
        { value: 'es', label: { es: 'Español', en: 'Spanish' } },
        { value: 'en', label: { es: 'Inglés', en: 'English' } },
      ],
      initial: () => localStorage.getItem('language') || 'es',
    },
  },

  commonText: {
    actions: { es: 'Acciones', en: 'Actions' },
    add: { es: 'Agregar', en: 'Add' },
    appTitle: {
      es: 'Sistema de Gestión Académica',
      en: 'Academic Management System',
    },
    cancel: { es: 'Cancelar', en: 'Cancel' },
    delete: { es: 'Eliminar', en: 'Delete' },
    edit: { es: 'Editar', en: 'Edit' },
    update: { es: 'Actualizar', en: 'Update' },
    login: { es: 'Ingresar', en: 'Login' },
    password: { es: 'Contraseña', en: 'Password' },
    changePassword: { es: 'Cambiar contraseña', en: 'Change Password' },
    currentPassword: { es: 'Contraseña actual', en: 'Current Password' },
    newPassword: { es: 'Nueva contraseña', en: 'New Password' },
    logout: { es: 'Salir', en: 'Logout' },
    addProfessor: { es: 'Agregar Profesor', en: 'Add Professor' },
    addAdmin: { es: 'Agregar Admin', en: 'Add Admin' },
    added: { es: 'agregado', en: 'added' },

    // Auth / session messages
    sessionExpired: { es: 'La sesión expiró', en: 'Session expired' },
    passwordChangeRequired: { es: 'Hay que cambiar la contraseña', en: 'Password change required' },
    noPermission: { es: 'No tenés permiso para esa acción', en: 'You do not have permission for that action' },
    invalidCredentials: { es: 'Credenciales inválidas', en: 'Invalid credentials' },
    loginError: { es: 'Error ingresando', en: 'Login error' },
    passwordChangeFailed: { es: 'No se pudo cambiar la contraseña', en: 'Password change failed' },
    passwordChangeError: { es: 'Error cambiando contraseña', en: 'Password change error' },
    themeChangeError: { es: 'Error al cambiar el tema', en: 'Error changing theme' },
    languageChangeError: { es: 'Error al cambiar el idioma', en: 'Error changing language' },

    // Data / record messages
    errorLoadingData: { es: 'Error cargando datos', en: 'Error loading data' },
    errorSaving: { es: 'Error guardando', en: 'Error saving' },
    errorDeleting: { es: 'Error eliminando', en: 'Error deleting' },
    errorLoadingRecord: { es: 'Error cargando registro', en: 'Error loading record' },

    // User management
    onlyAdminCanCreateUsers: { es: 'Solo admin puede crear usuarios', en: 'Only admin can create users' },
    errorCreatingUser: { es: 'Error creando usuario', en: 'Error creating user' },
    noEditPermission: { es: 'No tenés permiso para editar', en: 'You do not have edit permission' },
    studentAndUserCreated: { es: 'Alumno y usuario creados', en: 'Student and user created' },
    userAdded: { es: 'Usuario agregado', en: 'User added' },

    // Form labels
    initialPassword: { es: 'Contraseña inicial', en: 'Initial Password' },
    usernameLabel: { es: 'Usuario', en: 'Username' },
    emailLabel: { es: 'Email', en: 'Email' },
    professorRole: { es: 'Profesor', en: 'Professor' },
    adminRole: { es: 'Admin', en: 'Admin' },
    addUser: { es: 'Agregar usuario', en: 'Add user' },

    // Filters / pagination
    addFilter: { es: 'Agregar Filtro', en: 'Add Filter' },
    selectColumn: { es: 'Seleccionar columna', en: 'Select column' },
    pageInfo: { es: 'Página', en: 'Page' },
    pageOf: { es: 'de', en: 'of' },
    total: { es: 'Total', en: 'Total' },
    previous: { es: 'Anterior', en: 'Previous' },
    next: { es: 'Siguiente', en: 'Next' },
    filterPlaceholder: { es: 'Filtrar...', en: 'Filter...' },

    // Delete confirmation
    deleteConfirm: {
      es: '¿Está seguro de que desea eliminar este',
      en: 'Are you sure you want to delete this',
    },
  } satisfies Record<string, LocalizedText>,
};