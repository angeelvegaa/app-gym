# Gym Track

PWA instalable para registrar el entreno del gimnasio serie a serie. Todo se
guarda en el propio dispositivo (localStorage) y funciona offline, sin backend
ni cuenta — salvo que actives tú mismo la copia en la nube (opcional, apagada
por defecto, ver más abajo).

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

## Copia en la nube (opcional)

Apagada por defecto: quien no la active tiene la app 100% local, sin ninguna
llamada de red, exactamente igual que antes de que existiera esta función.

Quien la activa desde Ajustes → Copia en la nube:

- Inicia sesión con email + contraseña (Supabase Auth; la confirmación de
  email está activada a propósito, así que tras crear cuenta hay que
  confirmarla por email antes de poder iniciar sesión).
- Genera una clave de cifrado AES-GCM en el dispositivo (Web Crypto), que
  nunca sale de él — solo el dato ya cifrado sube a Supabase. La clave se
  muestra una vez como "código de recuperación": sin guardarlo aparte, no hay
  forma de recuperar los datos ya sincronizados en un dispositivo nuevo (ni
  nosotros podemos hacerlo).
- `js/sync.js` sube (con debounce) cada escritura de `gym.sessions`,
  `gym.settings` y `gym.plans`, y al abrir la app descarga y fusiona por
  "último cambio gana" (sin resolución de conflictos compleja).
- La tabla en Supabase (`sync_data`) tiene RLS: cada cuenta solo puede leer o
  escribir sus propias filas, verificado en la base de datos.

Test e2e real contra el proyecto de Supabase (`e2e/cloud-sync.spec.js`):
requiere una cuenta ya confirmada (Dashboard → Authentication → Users → Add
user → "Auto Confirm User") y sus credenciales como variables de entorno:

```bash
GYM_SYNC_TEST_EMAIL=... GYM_SYNC_TEST_PASSWORD=... npm run test:e2e
```

Sin esas variables, ese test se salta solo (no falla el resto de la suite).

## Ampliar el plan

Para añadir un día nuevo (por ejemplo boxeo) basta con añadir una entrada a
`PLAN.days` en `js/plan.js`. Si el tipo de registro es distinto (asaltos en vez
de series y reps), se añade un `type` nuevo y se gestiona en `js/ui/session.js`
junto a `strength`, `warmup` y `checkbox`. El motor de sugerencias solo mira
ejercicios `strength`, así que los tipos nuevos no lo rompen.
