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
```

> El error `database "EvaluacionDocentes" already exists` al correr `carga_inicial.sql` es normal: la primera línea del script intenta crearla otra vez. Las tablas sí se crean.

También puedes hacerlo desde pgAdmin: crea la BD `EvaluacionDocentes` y ejecuta los dos `.sql` en el Query Tool.

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

## Qué falta
- **Panel de Administración**: sigue con datos locales (no hay endpoints de CRUD de usuarios, materias, preguntas ni periodos).
- **Fechas del periodo**: el backend no bloquea evaluaciones fuera de `fecha_inicio_eval`/`fecha_cierre_eval`.
