# Integración Frontend ↔ Backend (correr el proyecto en local)

## 1. Instalar PostgreSQL
1. Descarga PostgreSQL (versión 16 o 17) de https://www.postgresql.org/download/ e instálalo.
2. Durante la instalación te pide una **contraseña para el usuario `postgres`**: anótala, va en el `.env`.
3. Deja el puerto en **5432**.

## 2. Crear la base de datos y cargar los datos
Abre una terminal (en Windows: *SQL Shell (psql)* o PowerShell con `psql` en el PATH) dentro de la carpeta del proyecto:

```bash
psql -U postgres -c "CREATE DATABASE \"EvaluacionDocentes\""
psql -U postgres -d EvaluacionDocentes -f sql/carga_inicial.sql
psql -U postgres -d EvaluacionDocentes -f sql/datos_prueba.sql
psql -U postgres -d EvaluacionDocentes -f sql/modulo_talleres_laboratorios.sql
```

> `modulo_talleres_laboratorios.sql` va **después** de los otros dos porque sus tablas hacen referencia a `Alumno` y `CicloEscolar`. Crea `Instalacion`, `PreguntaInstalacion`, `EvaluacionInstalacion` y `RespuestaInstalacion`, más 2 instalaciones y 7 preguntas de ejemplo. Solo se corre una vez (si lo repites, falla porque las tablas ya existen).

> El error `database "EvaluacionDocentes" already exists` al correr `carga_inicial.sql` es normal: la primera línea del script intenta crearla otra vez. Las tablas sí se crean.

También puedes hacerlo desde pgAdmin: crea la BD `EvaluacionDocentes` y ejecuta los tres `.sql` en el Query Tool, en el mismo orden.

## 3. Configurar el `.env`
Copia `.env.example` como `.env` y pon tu contraseña de Postgres en `DB_PASSWORD` y cualquier texto largo en `JWT_SECRET`.
El `.env` **no se sube** a GitHub (`.gitignore` lo ignora); `.env.example` sí, porque no tiene contraseñas.

## 4. Correr el proyecto (dos terminales)
```bash
pnpm install          # o npm install
pnpm dev:backend      # terminal 1 → API en http://localhost:3000
pnpm dev:frontend     # terminal 2 → app en http://localhost:8443
```
Vite reenvía todo lo que empieza con `/api` al backend (proxy en `vite.config.ts`), así que no hace falta CORS.

Comprobar que todo conecta: abre http://localhost:3000/api/salud → debe decir `"baseDeDatos":"ok"`.

## Usuarios de prueba (contraseña de todos: `demo123`)
| Área | Usuario |
|---|---|
| Alumno | `ALU001` o `alumno@escuela.edu` |
| Docente | `DOC001` (Juan Pérez), `DOC002`, `DOC003` |
| Coordinación | `COORD001` |
| Administración | `ADMIN001` |

## Endpoints
| Método | Ruta | Rol | Qué hace |
|---|---|---|---|
| GET | `/api/salud` | público | Revisa servidor y BD |
| POST | `/api/auth/login` | público | `{usuario, contrasena, area}` → JWT |
| GET | `/api/alumno/materias` | Alumno | Materias inscritas del ciclo activo y si ya están evaluadas |
| POST | `/api/evaluaciones` | Alumno | `{crn, calificaciones[15], comentarios?}` (valida que esté inscrito) |
| GET | `/api/evaluaciones/mi-promedio` | Docente | Promedio y clasificación propios |
| GET | `/api/docentes/me/resultados` | Docente | Desglose por CRN: promedio por pregunta y comentarios anónimos |
| GET | `/api/docentes` | Coordinador, Administrador | Docentes con sus materias |
| GET | `/api/evaluaciones/promedio/:docenteId` | Coordinador, Administrador | Promedio y clasificación de un docente |
| GET | `/api/participacion` | Coordinador, Administrador | Alumnos inscritos por CRN del ciclo activo y si ya respondieron (`respondio`). Sin calificaciones, promedio, fecha ni comentarios |
| GET | `/api/instalaciones` | Alumno | Talleres y laboratorios activos y si el alumno ya evaluó cada uno en el ciclo activo (`evaluada`) |
| GET | `/api/instalaciones/:id/preguntas` | Alumno | Datos de la instalación, `evaluada` y sus preguntas activas (generales + propias), ordenadas por dimensión |
| POST | `/api/instalaciones/:id/evaluacion` | Alumno | `{respuestas: [{idPregunta, valor}], comentarios?}`. Valores 0, 2.5, 5, 7.5 o 10; exactamente todas las preguntas activas, una vez cada una. 400 si ya evaluó en el ciclo |
| GET | `/api/instalaciones/resultados` | Coordinador, Administrador | Por instalación: total, promedio general, por dimensión, por pregunta y comentarios anónimos en orden aleatorio. Ciclo activo por defecto; acepta `?id_ciclo=` |
| GET | `/api/instalaciones/catalogo` | Administrador | Todas las instalaciones y preguntas, incluidas inactivas |
| POST | `/api/instalaciones` | Administrador | `{nombre, tipo, descripcion?}`. 400 si el nombre ya existe |
| PATCH | `/api/instalaciones/:id` | Administrador | Cualquiera de `{nombre, tipo, descripcion, activa}` |
| POST | `/api/instalaciones/preguntas` | Administrador | `{id_instalacion, dimension, texto}`. `id_instalacion: null` = aplica a todas. Dimensión: Equipamiento, Disponibilidad o Limpieza |
| PATCH | `/api/instalaciones/preguntas/:id` | Administrador | Cualquiera de `{id_instalacion, dimension, texto, activa}`. Las preguntas no se borran, solo se desactivan |

## Qué falta
- **Panel de Administración**: sigue con datos locales (no hay endpoints de CRUD de usuarios, materias, preguntas ni periodos).
- **Fechas del periodo**: el backend no bloquea evaluaciones fuera de `fecha_inicio_eval`/`fecha_cierre_eval`.
