## Carrito
- ~El carrito es un pequeño sistema en el frontend para que el cliente agregue items.~
- ~Cuando el cliente considera comprar, el carrito envia los items a un endpoint y el servidor maneja automaticamente que almacenes, transporte, e items asignar.~

## Funcionalidades para el cliente
- ~Poder cancelar el pedido.~
- ~Ver los items y su cantidad.~
- ~Poder agregar o quitar items en el carrito.~
- ~Ver la lista de pedidos del cliente. (implementado vía RLS)~

## Funcionalidades para los Choferes de transporte
- ~Los choferes ven los pedidos que se les asignaron~ y las direcciones correspondientes.
- Reciben la proxima direccion al que tienen que ir. Esto podria ser un endpoint especifico.
- ~Tiene la opcion de marcar los pedidos como enviados o no se pudo entregar.~
- ~Tienen la posibilidad de marcarse a sí mismos como viajando.~
- ~Cuando se marcan como `travelling`, todos sus pedidos en `ready` deben pasar a estado `travelling`.~
- ~Cuando se marcan como `ready` (tras estar viajando), todos sus pedidos `travelling` deben pasar a estado `failed` (no se pudo entregar).~

## Stock y compras
- ~Cuando se compra, internamente el sistema elige automaticamente los almacenes y el transporte mas optimo para llevar el producto al cliente. Haria falta un endpoint para realizar al compra y procesar el pedido.~
- ~Calcular cuanto de un stock hay disponible para el cliente. Esto podria involucrar un JOIN generico o especifico por tabla.~ 
- ~Cuando se logra elegir el item para el pedido, se marca como "preparando" en los pedidos.~
- ~Una vez se marca el transporte como "Viajando", se marcan todos los pedidos asociados a ese transporte como "Viajando" tambien.~

## Roles y autentication
- ~Visibilidad por tablas según cliente y chofer~
- Visibilidad por columnas segun cliente y chofer.
- ~Visibilidad por filas según cliente y chofer.~
- Visibilidad de botones de acciones por roles (i.e: agregar warehouse, eliminar o editar filas, carrito, etc).
- Restringuir acceso a endpoints basado en roles.

## Visual
- Revisar consistencia de la UI y el codigo para representar el sistema de logistica como cambiar de nombres academicos a nombres de logistica (ej: el titulo de la pagina).

## Misc
- Agregar patron regex en los 'validator' de la ssot. # PARCIALMENTE IMPLEMENTADO, HAY QUE DECIDIR COMO ES EL FORMATO PARA COD_ITEM Y LOS UUID DE LOS ITEMS
- Considerar poner columna "delivered_at_time" en los pedidos.

## Consideraciones y supuestos
- Al inicio, el sistema elegira las direcciones, los almacenes y los transportes de forma aleatoria. El enfoque es armar la idea base y permitir modificar la forma en que se calcula las elecciones de una forma sencilla sin necesidad de modificar el sistema en sí.
- Por ahora no consideramos meter un "balance" para el cliente, por eso no consideramos meter precios tampoco.

## Refactorizacion?
- Habra que quitar los condicionales que miran isStocksTable dentro de renderAnyTable, ya que rompe con la generalizacion. Seria buena idea separarlo, luego ver si generalizar.
- ~En frontend/src/app.ts, tenemos en renderAnyTable la creacion de botones. La estructura de crear los botones son muy similares. Se podria hacer un pre-createButton donde se puede incluir el JSON.stringify(pkValues) que usan las acciones por record, el addEventListener para el click, y tambien un post-createButton donde podria incluirse la forma en que se hace el append a la tabla.~
- ~Quitar código repetido de la creación de usuarios (chofer/cliente): seguramente hay que ver cómo se crean queries genéricas (en el back ya habían funciones útiles para eso).~
- Los tipos de FormData de types.ts podrían inferirse a partir del struct de single source of truth (por ejemplo, agregando algún campo para decidir si un campo va en el form de creación y añadiendo con un "&" password, username y roles)
- Podríamos generalizar un poco más la tabla de auth.users, ahora mismo queda NULL o bien el campo para la placa del coche o el de
clients, pero quizás es over-engineering para nuestro sistema
- El JOIN para ver la cantidad de items es bastante genérico, pero sólo funciona si en el structure del single source of truth
la tabla de la que partimos NO tiene nada en su referencedRelations. Si hay un referencedRelations no nulo, ignora lo de contar
la cantidad de referencias en otras tablas. Podría verse de hacer que puedan andar ambas a la vez.
- ~las funciones de tipo window.fun() que se usan en app.ts para actualizar el estado de los pedidos son mega redundantes.~
- Muchas de las funciones de tipo window.fun() nuestra usan funciones que están ahí tiradas en el app.ts, habría que llevarlas a algún dir específico.
- ~toda la lógica de actualización de estado de los drivers habría que llevarla a un endpoint específico sobre el que ellos puedan hacer POST, ahora mismo, a mano, hacen un PUT a la API genérica de transports (no deberían, eso en principio permite modificar a otros drivers también)~
- ~En muchos lugares se hardcodea el status de los drivers y las órdenes con el string pelado, convendría encapsular eso en una variable o tipo particular para, si decimos agregar estados o algo, no tener que hacer validaciones por doquier (o no comernos la cabeza debuggeando si escribimos mal un string)~
- en renderAnyForm se podría también extraer la generación de headers dinámicos (o sea, para los buttons particulares, esos ifs hardcodeados), también se podría llevar todas esas funciones a otro dir


## Bugs

- ~El modal del carrito está siempre en tono claro~
- ~Tras comprar items y volver a la view de stocks, no se actualiza inmediatamente la columna de Total Available (habría que hacer que se vuelva a llamar al endpoint de la API para el GET de la misma)~
- ~Si nos loggeamos como un usuario A (ej admin) y metemos cosas al carrito, nos desloggeamos, loggeamos como un usuario B (ej un client), el B tiene en su carrito lo que puso el A~
- En clients, si tengo algunas ordenes preparing y otras que no, se ve medio fea la UI.
- En orders se ve fea en general la UI para los drivers
- En la tabla de orders el status de la misma aparece hardcoadeado con su value `deliver | travelling | failed | cancelled` y no con el label corrspondiente
- Al cambiar el lenguaje de la aplicación, el botón de drivers fallbackea al texto default (VER `applyStaticLanguageToUI()`) 
- En el form de editar clients, sale el username y la password (NO DEBERIA)
- Tras comprar algo, el client defaultea a la tabla de transports (NO DEBERIA, NO ES READABLE PARA EL)

## Edgecases a considerar (¿Qué hacemos en estos casos?)

- ¿Dejamos que los admins puedan marcar como travelling/ready a los camiones?
- Si alguien cancela un pedido o se marca como no entregado (**son dos estados distintos**), ¿Qué hacemos con los items asociados al mismo? ¿Le volvemos NULL so foreign key de pedidos? (OJO, eso hace que no nos podamos preguntar, por ejemplo, ¿Qué cosas tenían los pedidos que fueron cancelados o no se pudieron entregar? porque esos items ya no estarían asociados a los mismos)
- ¿Hacemos que los drivers tengan mail de usuario? (ahora mismo se hardcodea algo para meterlo en su entrada en `auth.users`, pero es medio MUY tosco)
- ¿Permitimos que se **eliminen** pedidos? O sea, no marcar como cancelado o no entregado, **borrarlos del mapa** (implica perder data si alguien quisiera luego hacer algo de análisis sobre las ventas del sistemita).
- ¿Qué pasa si un camión se marca como `broken`? ¿Se rompió viajando o en el almacén? ¿Quién lo marca así (admins o button para que ellos mismos lo hagan)? ¿Qué pasa con los estados de sus pedidos?



## "INFORME"

Hay que hacer un markdown con:

- Lo que hicimos (sistema para...).
- Lo que implementamos (vistas para... endpoints para...): carrito, funcionalidad de compra, etc.
- Decisiones tomadas.
