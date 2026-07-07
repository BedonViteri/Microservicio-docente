# MICRO-DOCENTE

Microservicio Django REST para el modulo de docentes del SGA de la Escuela de Educacion Basica Provincias Unidas.

## Stack

- Python 3.13
- Django 6.0.6
- Django REST Framework
- PostgreSQL Supabase
- Schema: `sga_docente`
- Puerto: `8081`

## Instalacion

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python manage.py migrate
python manage.py runserver 0.0.0.0:8081
```

La configuracion de Supabase se toma desde variables de entorno. El archivo `.env.example` contiene los valores base entregados para desarrollo.

## Endpoints

Base URL local: `http://localhost:8081/api/docente/`

| Recurso | Endpoint |
| --- | --- |
| Periodos de evaluacion | `/periodos-evaluacion/` |
| Actividades | `/actividades/` |
| Calificaciones | `/calificaciones/` |
| Asistencias | `/asistencias/` |
| Resumen de asistencia | `/resumen-asistencia/` |
| Promedios trimestrales | `/promedios-trimestrales/` |
| Promedios anuales | `/promedios-anuales/` |
| Detalle de promedios anuales | `/promedios-anuales-detalle/` |
| Seguimiento academico | `/seguimiento-academico/` |

Todos los recursos tienen CRUD REST: `GET`, `POST`, `GET /{id}/`, `PUT`, `PATCH`, `DELETE`.

## Endpoints de negocio

### Promedio formativo

```http
GET /api/docente/calificaciones/promedio-formativo/?id_matricula=1&id_asignacion=10&id_periodo=1&nivel=EGB
```

Calcula promedio simple de calificaciones asociadas a actividades no sumativas.

### Promedio trimestral

```http
POST /api/docente/promedios-trimestrales/calcular/
Content-Type: application/json

{
  "id_matricula": 1,
  "id_asignacion": 10,
  "id_periodo": 1,
  "nivel": "EGB"
}
```

Formula: `promedio_trimestral = promedio_formativo * 0.70 + nota_sumativa * 0.30`.

### Promedio anual

```http
POST /api/docente/promedios-anuales/calcular/
Content-Type: application/json

{
  "id_matricula": 1,
  "id_asignacion": 10,
  "id_ano_lectivo": 2026,
  "nivel": "EGB",
  "registrado_por": 1
}
```

Promedia los promedios trimestrales calculados para el estudiante, asignacion y ano lectivo.

### Resumen de asistencia

```http
POST /api/docente/resumen-asistencia/calcular/
Content-Type: application/json

{
  "id_matricula": 1,
  "id_asignacion": 10,
  "id_periodo": 1
}
```

Cuenta presentes, ausentes, justificados y atrasos.

## Conversion cuantitativa a cualitativa

Para `EGB`:

| Rango | Codigo |
| --- | --- |
| 9.00 - 10.00 | `DAR` |
| 7.00 - 8.99 | `AAR` |
| 4.01 - 6.99 | `PAR` |
| 0.00 - 4.00 | `NAR` |
