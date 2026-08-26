# Gym Track

PWA instalable para registrar el entreno del gimnasio serie a serie. Sin backend,
sin cuentas: todo se guarda en el propio dispositivo (localStorage). Funciona offline.

## Probar en local

Los módulos ES no cargan desde `file://`, hace falta un servidor:

```bash
cd "01"
python3 -m http.server 8080
```

Abrir `http://localhost:8080` en el ordenador. Para instalarla como PWA de verdad
hace falta HTTPS, así que en local solo sirve para revisar la interfaz.

## Desplegar en GitHub Pages

1. Crear un repositorio en GitHub y subir el contenido de esta carpeta.
2. En el repo: **Settings → Pages → Source**, elegir la rama (`main`) y la carpeta raíz (`/`).
3. GitHub genera una URL tipo `https://tu-usuario.github.io/tu-repo/`. Puede tardar
   un par de minutos en estar disponible tras el primer push.
4. Cada vez que hagas cambios: commit + push, y en unos segundos Pages se actualiza.
   Si el móvil no ve los cambios, sube `CACHE_VERSION` en `sw.js` (por ejemplo a
   `gym-v2`) para forzar que el service worker refresque la caché.

## Instalar en el móvil

- **Android (Chrome)**: abrir la URL, menú (⋮) → "Añadir a pantalla de inicio" /
  "Instalar app".
- **iPhone (Safari)**: abrir la URL, botón de compartir (□↑) → "Añadir a pantalla
  de inicio". Safari ignora parte del manifest, por eso el `index.html` incluye
  también las metas `apple-mobile-web-app-*`.

Una vez instalada, abre como una app normal, sin barra de navegador, y funciona
sin conexión.

## Generar los iconos

Los PNG de `icons/` se generan con Node puro (sin dependencias):

```bash
node tools/make-icons.mjs
```

Solo hace falta volver a ejecutarlo si se quiere cambiar el diseño del icono.

## Estructura

- `js/plan.js` — el plan de entrenamiento como datos (días, ejercicios, series objetivo).
- `js/state.js` / `js/storage.js` — sesiones y ajustes, persistidos en localStorage.
- `js/schedule.js` — bloques de 4 semanas, RPE objetivo por semana.
- `js/suggestions.js` — reglas de progresión sobre el historial.
- `js/ui/*.js` — las 4 pantallas (Hoy, Historial, Progreso, Ajustes) más la pantalla de entreno.

## Copia de seguridad

Los datos viven solo en este dispositivo. Desde Ajustes se puede exportar todo
a un JSON y volver a importarlo (por ejemplo al cambiar de móvil).

## Ampliar el plan

Para añadir un día nuevo (por ejemplo boxeo) basta con añadir una entrada a
`PLAN.days` en `js/plan.js`. Si el tipo de registro es distinto (asaltos en vez
de series y reps), se añade un `type` nuevo y se gestiona en `js/ui/session.js`
junto a `strength`, `warmup` y `checkbox`. El motor de sugerencias solo mira
ejercicios `strength`, así que los tipos nuevos no lo rompen.
