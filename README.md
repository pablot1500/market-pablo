# Market Pablo

Juego 3D en primera persona para el navegador, inspirado en *Supermarket Simulator*. Manejás un almacén de barrio: comprás mercadería, reponés las góndolas, cobrás en la caja, mantenés el local limpio y ajustás los precios según el mercado.

Hecho con [Three.js](https://threejs.org/) (incluido en `vendor/`), sin paso de compilación: es HTML + JavaScript puro.

## Cómo jugar

El juego usa módulos de JavaScript, así que hay que abrirlo desde un servidor (no con doble click en el archivo):

```bash
python3 -m http.server 8000
# y abrir http://localhost:8000
```

También se puede publicar gratis con **GitHub Pages** (Settings → Pages → Deploy from branch → `main` / root).

### Controles

| Tecla | Acción |
|---|---|
| `W A S D` | moverse (`Shift` para correr) |
| Mouse | mirar |
| `E` | interactuar: levantar caja, abrir/cerrar tienda, usar la computadora, cambiar el precio de un estante |
| Click | poner un producto en el estante, escanear en la caja, cobrar, limpiar (mantener), tirar caja vacía |
| Click derecho | devolver un producto del estante a la caja |
| `Q` | soltar la caja |
| `F` | agarrar / soltar un mueble (estante, mostrador, escritorio, tacho) |
| `R` o rueda | rotar el mueble que estás moviendo |
| `Esc` | pausa (desde ahí se guarda la partida) |

### El día de trabajo

1. Arrancás a las **08:00** con la tienda cerrada: aprovechá para comprar y reponer.
2. Usá la **computadora** del escritorio: pestaña *Pedidos* para comprar cajas, *Precios* para fijar tu precio de venta y *Negocio* para ver estadísticas.
3. Las cajas llegan a la **vereda**, a la derecha de la puerta.
4. Cambiá el cartel de la puerta a **ABIERTO**: el reloj empieza a correr (1 segundo real = 1 minuto de juego) y llegan clientes. Si lo volvés a cerrar, el tiempo se detiene.
5. Los clientes dejan sus productos en el mostrador: hacé click en cada uno para **escanearlo** y después click en la **caja registradora** para cobrar (efectivo con vuelto o tarjeta).
6. A las **21:00** la tienda cierra sola. Cuando se va el último cliente ves el resumen del día y la partida se guarda.

### Muebles

Todos los muebles se pueden mover: mirá uno y apretá `F`. El mueble te sigue; el piso se marca en verde si entra y en rojo si no. `R` (o la rueda del mouse) lo rota, click o `F` lo suelta y `Q` cancela. El juego no te deja bloquear la puerta ni dejar a los clientes sin poder llegar a la caja o a un estante, y la fila de la caja se reacomoda sola según dónde pongas el mostrador.

La **sensibilidad del mouse** se ajusta desde el menú de inicio o desde la pausa (`Esc`).

### Economía

- Cada producto tiene un **costo** (lo que pagás al mayorista) y un **precio de mercado** (lo que el cliente considera normal). Los dos cambian todos los días.
- Si cobrás por encima del mercado ganás más por unidad, pero los clientes compran menos y baja la reputación.
- La **reputación** y la **limpieza** influyen en cuántos clientes llegan. Si no encuentran un producto o esperan demasiado en la fila, se van enojados.

## Sandbox de personas

Los clientes del juego son personas realistas (14 modelos distintos, incluidos chicos) con animaciones de caminar, agarrar productos, esperar en la fila y mirar el celular. Si los modelos no se pueden cargar, el juego usa los muñecos hechos a mano.

En `sandbox.html` (botón **Sandbox de personas** en el menú) se pueden invocar esas personas, verlas pasear y probar cada animación.

Los modelos y animaciones vienen de [Microsoft Rocketbox](https://github.com/microsoft/Microsoft-Rocketbox) (licencia MIT, ver `assets/people/LICENSE-Rocketbox.md`), convertidos de FBX a glTF con texturas reducidas.

## Estructura del código

```
index.html          HUD y menús
css/style.css       estilos de la interfaz
src/config.js       constantes ajustables: productos, precios, velocidades, horarios
src/main.js         clase Game: arma todo y corre el loop
src/world.js        tienda, calle, edificios, luces y ciclo día/noche
src/exterior.js     edificios, árboles, faroles y mobiliario urbano
src/furniture.js    muebles movibles: mostrador con caja, escritorio con PC, tacho
src/mover.js        lógica para mover y rotar muebles
src/shelves.js      góndolas y espacios de los estantes (productos con InstancedMesh)
src/productMeshes.js modelos 3D de los productos
src/productArt.js   etiquetas de los productos (marcas inventadas)
src/boxes.js        cajas de mercadería
src/player.js       movimiento en primera persona y colisiones
src/customers.js    clientes (compras, fila, paciencia)
src/checkout.js     caja: escaneo y cobro
src/economy.js      dinero, precios y fluctuación del mercado
src/cleaning.js     suciedad del piso
src/traffic.js      autos de la calle
src/pathfinding.js  navegación A* para los clientes
src/ui.js           paneles: computadora, precios, cobro, resumen
src/save.js         guardado en localStorage
src/people.js       carga de personas realistas (glTF) y sus animaciones
src/sandbox.js      página de prueba de personas (sandbox.html)
assets/people/      modelos y animaciones de Rocketbox
tools/              script para versionar archivos al publicar
```

Para cambiar la dificultad, los productos o la duración del día, empezá por `src/config.js`.

### Publicar una actualización

Antes de subir cambios en `src/`, corré `python3 tools/bump-version.py`. Eso agrega un número de versión a cada archivo en `index.html` para que el navegador descargue todos los archivos nuevos juntos y no mezcle versiones viejas guardadas en caché (si se mezclan, el juego no arranca).
