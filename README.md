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
| `Esc` | pausa (desde ahí se guarda la partida) |

### El día de trabajo

1. Arrancás a las **08:00** con la tienda cerrada: aprovechá para comprar y reponer.
2. Usá la **computadora** del mostrador: pestaña *Pedidos* para comprar cajas, *Precios* para fijar tu precio de venta y *Negocio* para ver estadísticas.
3. Las cajas llegan a la **vereda**, a la derecha de la puerta.
4. Cambiá el cartel de la puerta a **ABIERTO**: el reloj empieza a correr (1 segundo real = 1 minuto de juego) y llegan clientes. Si lo volvés a cerrar, el tiempo se detiene.
5. Los clientes dejan sus productos en el mostrador: hacé click en cada uno para **escanearlo** y después click en la **caja registradora** para cobrar (efectivo con vuelto o tarjeta).
6. A las **21:00** la tienda cierra sola. Cuando se va el último cliente ves el resumen del día y la partida se guarda.

### Economía

- Cada producto tiene un **costo** (lo que pagás al mayorista) y un **precio de mercado** (lo que el cliente considera normal). Los dos cambian todos los días.
- Si cobrás por encima del mercado ganás más por unidad, pero los clientes compran menos y baja la reputación.
- La **reputación** y la **limpieza** influyen en cuántos clientes llegan. Si no encuentran un producto o esperan demasiado en la fila, se van enojados.

## Estructura del código

```
index.html          HUD y menús
css/style.css       estilos de la interfaz
src/config.js       constantes ajustables: productos, precios, velocidades, horarios
src/main.js         clase Game: arma todo y corre el loop
src/world.js        tienda, calle, edificios, luces y ciclo día/noche
src/shelves.js      góndolas y espacios de los estantes
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
```

Para cambiar la dificultad, los productos o la duración del día, empezá por `src/config.js`.
