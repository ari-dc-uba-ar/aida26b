# Sistema de Gestión Logística

Este proyecto implementa un sistema de gestión logística para administrar el stock de productos, pedidos de clientes y entregas realizadas por transportistas.

El sistema fue desarrollado originalmente como un gestor académico genérico, pero evolucionó hacia una plataforma configurable mediante un Single Source of Truth (SSOT) que define la estructura de las entidades, formularios, tablas, validaciones y permisos del sistema.

Actualmente implementa un flujo completo de gestión de pedidos con autenticación, autorización mediante PostgreSQL Row Level Security y una interfaz web dinámica.

## Características

### Gestión de entidades

El sistema permite administrar:

- Almacenes
- Productos (Stocks)
- Items físicos
- Clientes
- Transportistas
- Pedidos
- Usuarios de la aplicación

Todas las entidades utilizan el mismo conjunto de endpoints CRUD genéricos.

### Clientes
Los clientes autenticados pueden:

- consultar el catálogo de productos disponibles.
- visualizar el stock existente.
- agregar productos a un carrito.
- generar pedidos.
- consultar únicamente sus propios pedidos.
- cancelar pedidos mientras permanezcan en estado Preparing (todavía no salieron del almacén donde están)-

### Transportistas

Los transportistas autenticados pueden:

- consultar únicamente los pedidos que les fueron asignados
- cambiar su estado operativo (Ready ↔ Travelling)
- marcar pedidos como entregados
- marcar pedidos cuya entrega no pudo realizarse

El sistema aplica automáticamente las reglas de negocio correspondientes al cambiar el estado del transportista.

### Administradores

Los administradores poseen acceso completo al sistema (son usuarios root, vaya).

Pueden realizar operaciones CRUD sobre todas las entidades y administrar usuarios.

## Características técnicas

### Single Source of Truth

La aplicación está impulsada por una estructura declarativa (structure) que define para cada tabla:

- columnas
- claves primarias
- validaciones para los formularios (ej: patrón que debe cumplir una placa de vehículo)
- tipos de input
- claves foráneas
- permisos de visiblidad de tablas

A partir de esta definición se generan automáticamente:

- formularios
- tablas
- validaciones
- filtros
- ordenamiento
- operaciones CRUD

### Backend genérico

El backend implementa handlers genéricos para:

GET
POST
PUT
DELETE

sobre cualquier entidad declarada en el SSOT.

Las operaciones específicas de negocio (por ejemplo cancelar un pedido o actualizar el estado de un transportista) se implementan mediante endpoints dedicados.

### Seguridad

El sistema implementa varios niveles de seguridad.

#### Autenticación

Los usuarios se autentican mediante usuario y contraseña.

Las contraseñas se almacenan utilizando hash.

#### Autorización

Cada usuario posee un rol.

Actualmente existen: `admin | editor | reader | client | driver`, siendo los más importantes los de `admin | client | driver` 

Los permisos se controlan tanto en frontend como en backend.

### Row Level Security

Se utilizan policies de PostgreSQL para restringir qué filas puede consultar cada usuario.

Por ejemplo:

- un cliente únicamente puede consultar sus propios pedidos.
- un transportista únicamente puede consultar los pedidos asignados a sí mismo (su vehículo).

Esto evita exponer información de otros usuarios incluso si se realizan consultas directas contra la API.

### Permisos del frontend

El frontend utiliza el SSOT para determinar qué tablas son visibles para cada rol.

Asimismo, los botones de acción disponibles dependen del rol del usuario y del estado actual de cada registro.

Por ejemplo:

- un cliente sólo puede cancelar pedidos en estado Preparing
- un transportista sólo puede modificar pedidos en estado Travelling

## Reglas de negocio, funcionalidades específicas y supuestos

### clientes

- Pueden ver el stock disponible de los distintos productos cargados al sistema y agregarlos a un carrito.
- Una compra sólo se puede realizar si, para cada producto seleccionado, hay en existencia una cantidad mayor o igual a la que se quiere comprar (ej: se pueden comprar 2 teclados sólo si hay, efectivamente, al menos 2 que no fueron ya vendidos).
- Una compra sólo se puede realizar si, al momento de realizarla, existe al menos un transportista con disponibilidad `ready` (está en un almacén y listo para salir a entregar).
- Pueden cancelar pedidos que hayan realizado y todavía no estén en proceso de ser entregados (o sea, sólo cancelan los que están en estado `preparing`).

### transportistas

- Sólo pueden ver y modificar el estado de pedidos asignados a sí mismos.
- Pueden marcarse a sí mismos como `travelling` (entregando pedidos) o `ready` (listo en su almacén).
- Cuando un transportista comienza a viajar, todos sus pedidos en estado `preparing` pasan a estado `travelling` (se asume reparten todo lo que tienen asignado en el mismo viaje).
- Cuando un transportista deja de viajar, todos sus pedidos en estado `travelling` pasan a estado `failed` (se asume que si volvieron y no lo entregaron, es porque no estaba el cliente o algo impidió dárselo).
- Para confirmar la entrega de un pedido, debe ingresar el CUIT del cliente al que se lo está entregando (ya conocen los CUITs, pero esto simula una validación de identidad: para chequear que sos la persona a la que se lo debo entregar, te pido el CUIT y lo ingreso).
- Un transportista puede marcar manualmente como `failed`, no se pudo entregar, a un pedido (distinto de `cancelled`, que es cuando un client dice que al final no lo quiere).

## Ejecución (Docker)

El proyecto puede ejecutarse completamente mediante Docker Compose (recomendado).

Basta hacer

```bash
docker-compose -f docker-compose.combined.yml up --build
```

desde el directorio raíz.

La inicialización crea:

- base de datos
- un usuario `admin`
- backend
- frontend

Tanto el back como el frontend se pueden acceder en `http://localhost:3000` y la base de datos en el puerto `localhost:5432`.

Las migraciones se aplican automáticamente durante el arranque.