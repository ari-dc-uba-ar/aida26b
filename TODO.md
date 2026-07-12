## Carrito
- ~El carrito es un pequeño sistema en el frontend para que el cliente agregue items.~
- Cuando el cliente considera comprar, el carrito envia los items a un endpoint y el servidor 
maneja automaticamente que almacenes, transporte, e items asignar.

## Funcionalidades para el cliente
- Poder cancelar el pedido.
- ~Ver los items y su cantidad.~
- ~Poder agregar o quitar items en el carrito.~
- ~Ver la lista de pedidos del cliente. (implementado vía RLS)~

## Funcionalidades para los Choferes de transporte
- Los choferes ven los pedidos que se les asignaron y las direcciones correspondientes.
- Reciben la proxima direccion al que tienen que ir. Esto podria ser un endpoint especifico.
- Tiene la opcion de marcar los pedidos como enviados o no se pudo entregar.

## Stock y compras
- Cuando se compra, internamente el sistema elige automaticamente los almacenes y el transporte
mas optimo para llevar el producto al cliente. Haria falta un endpoint para realizar al compra y procesar el pedido.
- ~Calcular cuanto de un stock hay disponible para el cliente. Esto podria involucrar un JOIN generico o especifico
por tabla.~ 
- Cuando se logra elegir el item para el pedido, se marca como "preparando" en los pedidos.
- Una vez se marca el transporte como "Viajando", se marcan todos los pedidos asociados a ese transporte como
"Viajando" tambien.

## Roles y autentication
- ~Visibilidad por tablas según cliente y chofer~
- Visibilidad por columnas segun cliente y chofer.
- ~Visibilidad por filas según cliente y chofer.~
- Visibilidad de botones de acciones por roles (i.e: agregar warehouse, eliminar o editar filas, carrito, etc).
- Restringuir acceso a endpoints basado en roles.

## Visual
- Revisar consistencia de la UI y el codigo para representar el sistema de logistica como
cambiar de nombres academicos a nombres de logistica (ej: el titulo de la pagina).

## Misc
- Agregar patron regex en los 'validator' de la ssot. # PARCIALMENTE IMPLEMENTADO, HAY QUE DECIDIR COMO ES EL FORMATO PARA COD_ITEM Y LOS UUID DE LOS ITEMS
- Considerar poner columna "delivered_at_time" en los pedidos.

## Consideraciones y supuestos
- Al inicio, el sistema elegira las direcciones, los almacenes y los transportes de forma aleatoria.
El enfoque es armar la idea base y permitir modificar la forma en que se calcula las elecciones de una forma
sencilla sin necesidad de modificar el sistema en sí.
- Por ahora no consideramos meter un "balance" para el cliente, por eso no consideramos meter precios tampoco.

## Refactorizacion?
- Habra que quitar los condicionales que miran isStocksTable dentro de renderAnyTable, ya que rompe con la generalizacion. Seria buena idea separarlo, luego ver si generalizar.
- En frontend/src/app.ts, tenemos en renderAnyTable la creacion de botones. La estructura de crear los botones son muy similares. Se podria hacer un pre-createButton donde se puede incluir el JSON.stringify(pkValues) que usan las acciones por record, el addEventListener para el click, y tambien un post-createButton donde podria incluirse la forma en que se hace el append a la tabla.
- ~Quitar código repetido de la creación de usuarios (chofer/cliente): seguramente hay que ver cómo se crean queries genéricas (en el back ya habían funciones útiles para eso).~
- Los tipos de FormData de types.ts podrían inferirse a partir del struct de single source of truth (por ejemplo, agregando algún campo para decidir si un campo va en el form de creación y añadiendo con un "&" password, username y roles)
- Podríamos generalizar un poco más la tabla de auth.users, ahora mismo queda NULL o bien el campo para la placa del coche o el de
clients, pero quizás es over-engineering para nuestro sistema
- El JOIN para ver la cantidad de items es bastante genérico, pero sólo funciona si en el structure del single source of truth
la tabla de la que partimos NO tiene nada en su referencedRelations. Si hay un referencedRelations no nulo, ignora lo de contar
la cantidad de referencias en otras tablas. Podría verse de hacer que puedan andar ambas a la vez.

## Bugs

- El modal del carrito está siempre en tono claro
- Tras comprar items y volver a la view de stocks, no se actualiza inmediatamente la columna de Total Available (habría que hacer que se vuelva a llamar al endpoint de la API para el GET de la misma)
- Si nos loggeamos como un usuario A (ej admin) y metemos cosas al carrito, nos desloggeamos, loggeamos como un usuario B (ej un client), el B tiene en su carrito lo que puso el A

## "INFORME"

Hay que hacer un markdown con:

- Lo que hicimos (sistema para...).
- Lo que implementamos (vistas para... endpoints para...): carrito, funcionalidad de compra, etc.
- Decisiones tomadas.
