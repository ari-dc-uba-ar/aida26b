import { TableStructure } from '../types/types';

export const OrderStatus = {
  PREPARING: "preparing",
  TRAVELLING: "travelling",
  DELIVERED: "delivered",
  FAILED: "failed",
  CANCELLED: "cancelled",
} as const;

export const DriverStatus = {
  READY: "ready",
  TRAVELLING: "travelling",
  BROKEN: "broken",
} as const;

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
    warehouses: {
      columns: {
        address: {
          type: 'string',
          label: { es: 'Dirección', en: 'Address' },
          readonlyOnEdit: true,
          validator: {
            required: true,
          },
        },
        longitude: {
          type: 'number',
          label: { es: 'Longitud', en: 'Longitude' },
          readonlyOnEdit: true,
          validator: {
            required: true,
          },
        },
        latitude: {
          type: 'number',
          label: { es: 'Longitud', en: 'Longitude' },
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
      },
      pk: 'address',
      uiName: { es: 'Almacenes', en: 'Warehouses' },
      title: { es: 'Almacén', en: 'Warehouse' },
      addButtonLabel: { es: 'Añadir Almacén', en: 'Add Warehouse' },
      permissions: {
        read: ["admin"],
        create: ["admin"],
        update: ["admin"],
        delete: ["admin"],
      }
    } satisfies TableStructure,
    transports: {
      columns: {
        license_plate: {
          type: 'string',
          label: { es: "Patente", en: "License Plate" },
          readonlyOnEdit: true,
          validator: {
            required: true,
            pattern: '^[A-Z0-9]{3}-[A-Z0-9]{3}$',
            patternMessage:
              'must match pattern [A-Z0-9] - [A-Z0-9] (3 upper case alpha-numeric characters, one dash, 3 upper case alpha-numeric characters)',
          },
        },
        warehouse_name: {
          type: 'string',
          label: { es: "Almacén", en: "Warehouse" },
          editable: false,
          derivable: {
            originTable: 'warehouses',
            sqlGenerationStatement: `entityName.name`,
          }
        },
        address: {
          type: 'string',
          label: { es: "Dirección de origen", en: "Warehouse's address" },
          readonlyOnEdit: true,
          validator: {
            required: true,
          },
          input: 'select',
          foreignKey: {
            table: "warehouses",
            valueField: "address",
            labelField: "name"
          }
        },
        availability: {
          type: 'string',
          label: { es: "Disponibilidad", en: "Availability" },
          input: 'select',
          validator: {
            nullable: true,
          },
          options: [
            { value: DriverStatus.READY, label: { es: 'Listo', en: 'Ready to Go' } },
            {
              value: DriverStatus.TRAVELLING,
              label: { es: 'Viajando', en: 'Travelling' },
            },
            { value: DriverStatus.BROKEN, label: { es: 'Roto', en: 'Broken' } },
          ],
        }
      },
      pk: 'license_plate',
      uiName: { es: 'Transportes', en: 'Transports' },
      title: { es: 'Transporte', en: 'Transport' },
      addButtonLabel: { es: 'Añadir Transporte', en: 'Add Transport' },
      referencedTables: ['warehouses'],
      permissions: {
        read: ["admin", "driver"],
        create: ["admin"],
        update: ["admin"],
        delete: ["admin"],
      }
    } satisfies TableStructure,
    stocks: {
      columns: {
        cod_stock: {
          type: 'string',
          label: { es: "Código", en: "Code" },
          readonlyOnEdit: true,
          validator: {
            required: true
          }
        },
        name: {
          type: 'string',
          label: { es: "Nombre", en: "Name" },
          validator: {
            required: true
          }
        }
      },
      pk: 'cod_stock',
      uiName: { es: "Stocks", en: "Stocks" },
      title: { es: "Stock", en: "Stock" },
      addButtonLabel: { es: "Añadir Stock", en: "Add Stock" },
      referencedByCount: ['items'],
      permissions: {
        read: ["admin", "client"],
        create: ["admin"],
        update: ["admin"],
        delete: ["admin"],
      }
    } satisfies TableStructure,
    clients: {
      columns: {
        cuit: {
          type: 'string',
          label: { es: "CUIT", en: "CUIT" },
          readonlyOnEdit: true,
          validator: {
            required: true,
            pattern: '^[0-9]{2}-[0-9]{8}-[0-9]{1}$',
            patternMessage:
              'must match pattern CUIT (2 numbers, one dash, 8 numbers, one dash, 1 number)',
          }
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
        address: {
          type: 'string',
          label: { es: 'Dirección', en: 'Address' },
          readonlyOnEdit: true,
          validator: {
            required: true,
          },
        },
        longitude: {
          type: 'number',
          label: { es: 'Longitud', en: 'Longitude' },
          readonlyOnEdit: true,
          validator: {
            required: true,
          },
        },
        latitude: {
          type: 'number',
          label: { es: 'Longitud', en: 'Longitude' },
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
      },
      pk: "cuit",
      uiName: { es: "Clientes", en: "Clients" },
      title: { es: "Cliente", en: "Client" },
      addButtonLabel: { es: "Añadir Cliente", en: "Add Cliente" },
      permissions: {
        read: ["admin"],
        create: ["admin"],
        update: ["admin"],
        delete: ["admin"],
      }
    } satisfies TableStructure,
    orders: {
      columns: {
        uuid: {
          type: 'string',
          label: { es: 'UUID', en: 'UUID' },
          readonlyOnEdit: true,
          validator: {
            required: true,
            pattern: '^ORD[0-9a-fA-F]{16}$',
            patternMessage: 'must be in the format ORD followed by 16 hexadecimal characters (e.g. ORD1A2B3C4D5E6F7A8B)',
          },
        },
        order_date: {
          type: 'string',
          label: { es: 'Fecha', en: 'Date' },
          input: 'date',
          validator: {
            required: true,
            minDate: '1821-08-09',
          },
        },
        cuit_client: {
          type: 'string',
          label: { es: 'Cliente', en: 'Client' },
          input: 'select',
          readonlyOnEdit: true,
          validator: {
            required: true,
          },
          foreignKey: {
            table: "clients",
            valueField: "cuit",
            labelField: "name"
          }
        },
        plate_transport: {
          type: 'string',
          label: { es: 'Transport', en: 'Transport' },
          input: 'select',
          validator: {
            required: true,
            // TO DO: hay que poner una validación para que sólo se valgan transportes ready
          },
          foreignKey: {
            table: "transports",
            valueField: "license_plate",
            labelField: "license_plate",
          },
          readPermissions: ["admin", "driver"],
        },
        status: {
          type: 'string',
          label: { es: "Estado", en: "Status" },
          input: 'select',
          validator: {
            nullable: true,
          },
          options: [
            { value: OrderStatus.PREPARING, label: { es: 'Preparando', en: 'Preparing' } },
            {
              value: OrderStatus.TRAVELLING,
              label: { es: 'Viajando', en: 'Travelling' },
            },
            { value: OrderStatus.DELIVERED, label: { es: 'Entregado', en: 'Delivered' } },
            { value: OrderStatus.FAILED, label: { es: 'No Entregado', en: `Couldn't Deliver` } },
            { value: OrderStatus.CANCELLED, label: { es: 'Cancelado', en: 'Cancelled' } },
          ],
        },
        delivered_at_time: {
          type: 'string',
          label: { es: 'Fecha de entrega', en: 'Delivery Time' },
          editable: false,
          validator: {
            nullable: true,
          }
        },
      },
      pk: 'uuid',
      uiName: { es: 'Pedidos', en: 'Orders' },
      title: { es: 'Pedido', en: 'Order' },
      addButtonLabel: { es: 'Agregar Pedido', en: 'Add Order' },
      cancelButtonLabel: { es: 'Cancelar Pedido', en: 'Cancel Order' },
      permissions: {
        read: ["admin", "client", "driver"],
        create: ["admin"], // los clients pueden crear pedidos pero vía la api específica del carrito
        update: ["admin"],  // idem
        delete: ["admin"],
      }
    } satisfies TableStructure,

    items: {
      columns: {
        cod_item: {
          type: 'string',
          label: { es: 'Item', en: 'Item' },
          validator: {
            required: true,
            pattern: '^ITM\\d{4}$',
            patternMessage: 'must be in the format ITM followed by exactly 4 digits (e.g., ITM0001)',
          }
        },
        cod_stock: {
          type: 'string',
          label: { es: 'Código de Stock', en: 'Stock Code' },
          validator: {
            required: true,
          },
          input: 'select',
          foreignKey: {
            table: "stocks",
            valueField: "cod_stock",
            labelField: "name",
          }
        },
        warehouse_address: {
          type: 'string',
          label: { es: "Almacén", en: "Warehouse" },
          readonlyOnEdit: true,
          validator: {
            required: true,
          },
          input: 'select',
          foreignKey: {
            table: "warehouses",
            valueField: "address",
            labelField: "name"
          }
        },
        order_uuid: {
          type: 'string',
          label: { es: "Pedido", en: "Order" },
          validator: {
            nullable: true,
          },
          input: 'select',
          foreignKey: {
            table: "orders",
            valueField: "uuid",
            labelField: "uuid"
          }
        }
      },
      pk: "cod_item",
      uiName: { es: 'Items', en: 'Items' },
      title: { es: 'Item', en: 'Item' },
      addButtonLabel: { es: 'Agregar Item', en: 'Add Item' },
      permissions: {
        read: ["admin"],
        create: ["admin"],
        update: ["admin"],
        delete: ["admin"],
      }
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
    //addProfessor: { es: 'Agregar Profesor', en: 'Add Professor' },
    //addAdmin: { es: 'Agregar Admin', en: 'Add Admin' },
    added: { es: 'agregado', en: 'added' },

    // Cart
    cartActions: { es: 'Items en Carrito', en: 'Items in Cart' },
    totalAvailableStock: { es: "Total Disponible", en: "Total Available" },

    // Driver specific
    driverActions: { es: "Actualizar Estado", en: "Update Status" },
    deliverOrder: { es: "Entregado", en: "Delivered" },
    couldntDeliverOrder: { es: "No se pudo entregar", en: "Couldn't Deliver" },
    markAsCouldntDeliverOrder: {
      es: "¿Está seguro que quier marcar como no entregada a este pedido?",
      en: "Are you sure you want to mark as not delivered this order?"
    },
    askForClientCUIT: {
      es: "Para marcar como entregada esta orden, debe ingresar el CUIT del cliente,",
      en: "To mark as delivered this order, you must provide the client's CUIT."
    },
    notUpdatableField: {
      es: "No editable",
      en: "Not updatable"
    },
    incorrectClientCUIT: {
      es: "El CUIT ingresado es incorrecto",
      en: "The provided CUIT is inocrrect"
    },
    startTravelling: {
      es: "Comenzar a repartir",
      en: "Start to deliver",
    },
    stopTravelling: {
      es: "Dejar de repartir",
      en: "Stop delivering",
    },
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
    clientAndUserCreated: { es: 'Cliente y usuario creados', en: 'Client and user created' },
    transportAndUserCreated: { es: 'Transporte y usuario creados', en: 'Transport and user created' },
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

    // Cancel confirmation
    cancelConfirm: {
      es: '¿Está seguro de que desea cancelar',
      en: 'Are you sure you want to cancel',
    }
  } satisfies Record<string, LocalizedText>,
};
