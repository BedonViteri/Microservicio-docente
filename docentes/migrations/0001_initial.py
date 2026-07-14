from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    initial = True

    dependencies = []

    operations = [
        # Removed Postgres-specific CREATE SCHEMA for local SQLite runs.
        migrations.CreateModel(
            name="PeriodoEvaluacion",
            fields=[
                ("id_periodo", models.AutoField(primary_key=True, serialize=False)),
                ("id_ano_lectivo", models.IntegerField()),
                ("tipo", models.CharField(choices=[("TRIMESTRE", "Trimestre"), ("QUIMESTRE", "Quimestre"), ("PARCIAL", "Parcial")], max_length=20)),
                ("nombre", models.CharField(max_length=40)),
                ("fecha_inicio", models.DateField()),
                ("fecha_fin", models.DateField()),
                ("activo", models.BooleanField(default=True)),
            ],
            options={"db_table": "periodos_evaluacion", "ordering": ["id_ano_lectivo", "fecha_inicio"]},
        ),
        migrations.CreateModel(
            name="Actividad",
            fields=[
                ("id_actividad", models.AutoField(primary_key=True, serialize=False)),
                ("id_asignacion", models.IntegerField()),
                ("tipo", models.CharField(choices=[("FORMATIVA", "Formativa"), ("SUMATIVA", "Sumativa"), ("TAREA", "Tarea"), ("LECCION", "Leccion"), ("PROYECTO", "Proyecto"), ("EXAMEN", "Examen")], max_length=20)),
                ("nombre", models.CharField(max_length=200)),
                ("descripcion", models.TextField(blank=True, null=True)),
                ("fecha_entrega", models.DateField()),
                ("ponderacion", models.DecimalField(decimal_places=2, default=0, max_digits=5)),
                ("nota_maxima", models.DecimalField(decimal_places=2, default=10, max_digits=4)),
                ("es_sumativa", models.BooleanField(default=False)),
                ("fecha_creacion", models.DateTimeField(auto_now_add=True)),
                ("id_periodo", models.ForeignKey(db_column="id_periodo", on_delete=django.db.models.deletion.PROTECT, related_name="actividades", to="docentes.periodoevaluacion")),
            ],
            options={"db_table": "actividades", "ordering": ["-fecha_entrega", "id_actividad"]},
        ),
        migrations.CreateModel(
            name="Asistencia",
            fields=[
                ("id_asistencia", models.BigAutoField(primary_key=True, serialize=False)),
                ("id_matricula", models.IntegerField()),
                ("id_asignacion", models.IntegerField()),
                ("fecha", models.DateField()),
                ("estado", models.CharField(choices=[("PRESENTE", "Presente"), ("AUSENTE", "Ausente"), ("JUSTIFICADO", "Justificado"), ("ATRASO", "Atraso")], max_length=20)),
                ("justificacion", models.TextField(blank=True, null=True)),
                ("registrado_por", models.IntegerField(blank=True, null=True)),
                ("fecha_registro", models.DateTimeField(auto_now_add=True)),
                ("fecha_actualizacion", models.DateTimeField(auto_now=True)),
                ("id_periodo", models.ForeignKey(db_column="id_periodo", on_delete=django.db.models.deletion.PROTECT, related_name="asistencias", to="docentes.periodoevaluacion")),
            ],
            options={"db_table": "asistencias", "ordering": ["-fecha", "id_matricula"]},
        ),
        migrations.CreateModel(
            name="Calificacion",
            fields=[
                ("id_calificacion", models.BigAutoField(primary_key=True, serialize=False)),
                ("id_matricula", models.IntegerField()),
                ("nota", models.DecimalField(decimal_places=2, max_digits=4)),
                ("nota_cualitativa", models.CharField(blank=True, choices=[("DAR", "Domina los aprendizajes requeridos"), ("AAR", "Alcanza los aprendizajes requeridos"), ("PAR", "Proximo a alcanzar los aprendizajes requeridos"), ("NAR", "No alcanza los aprendizajes requeridos")], max_length=3)),
                ("observacion", models.TextField(blank=True, null=True)),
                ("registrado_por", models.IntegerField(blank=True, null=True)),
                ("fecha_registro", models.DateTimeField(auto_now_add=True)),
                ("fecha_actualizacion", models.DateTimeField(auto_now=True)),
                ("id_actividad", models.ForeignKey(db_column="id_actividad", on_delete=django.db.models.deletion.CASCADE, related_name="calificaciones", to="docentes.actividad")),
            ],
            options={"db_table": "calificaciones", "ordering": ["-fecha_registro"]},
        ),
        migrations.CreateModel(
            name="PromedioAnual",
            fields=[
                ("id_promedio_anual", models.AutoField(primary_key=True, serialize=False)),
                ("id_matricula", models.IntegerField()),
                ("id_asignacion", models.IntegerField()),
                ("id_ano_lectivo", models.IntegerField()),
                ("promedio_anual", models.DecimalField(decimal_places=2, default=0, max_digits=4)),
                ("nota_cualitativa", models.CharField(choices=[("DAR", "Domina los aprendizajes requeridos"), ("AAR", "Alcanza los aprendizajes requeridos"), ("PAR", "Proximo a alcanzar los aprendizajes requeridos"), ("NAR", "No alcanza los aprendizajes requeridos")], max_length=3)),
                ("registrado_por", models.IntegerField(blank=True, null=True)),
                ("calculado_en", models.DateTimeField(auto_now=True)),
            ],
            options={"db_table": "promedios_anuales"},
        ),
        migrations.CreateModel(
            name="PromedioTrimestral",
            fields=[
                ("id_promedio", models.AutoField(primary_key=True, serialize=False)),
                ("id_matricula", models.IntegerField()),
                ("id_asignacion", models.IntegerField()),
                ("promedio_formativo", models.DecimalField(decimal_places=2, default=0, max_digits=4)),
                ("nota_sumativa", models.DecimalField(decimal_places=2, default=0, max_digits=4)),
                ("promedio_trimestral", models.DecimalField(decimal_places=2, default=0, max_digits=4)),
                ("nota_cualitativa", models.CharField(choices=[("DAR", "Domina los aprendizajes requeridos"), ("AAR", "Alcanza los aprendizajes requeridos"), ("PAR", "Proximo a alcanzar los aprendizajes requeridos"), ("NAR", "No alcanza los aprendizajes requeridos")], max_length=3)),
                ("calculado_en", models.DateTimeField(auto_now=True)),
                ("id_periodo", models.ForeignKey(db_column="id_periodo", on_delete=django.db.models.deletion.PROTECT, related_name="promedios_trimestrales", to="docentes.periodoevaluacion")),
            ],
            options={"db_table": "promedios_trimestrales"},
        ),
        migrations.CreateModel(
            name="ResumenAsistencia",
            fields=[
                ("id_resumen", models.AutoField(primary_key=True, serialize=False)),
                ("id_matricula", models.IntegerField()),
                ("id_asignacion", models.IntegerField()),
                ("total_presentes", models.SmallIntegerField(default=0)),
                ("total_ausentes", models.SmallIntegerField(default=0)),
                ("total_justificados", models.SmallIntegerField(default=0)),
                ("total_atrasos", models.SmallIntegerField(default=0)),
                ("calculado_en", models.DateTimeField(auto_now=True)),
                ("id_periodo", models.ForeignKey(db_column="id_periodo", on_delete=django.db.models.deletion.PROTECT, related_name="resumenes_asistencia", to="docentes.periodoevaluacion")),
            ],
            options={"db_table": "resumen_asistencia"},
        ),
        migrations.CreateModel(
            name="SeguimientoAcademico",
            fields=[
                ("id_seguimiento", models.BigAutoField(primary_key=True, serialize=False)),
                ("id_matricula", models.IntegerField()),
                ("categoria", models.CharField(choices=[("ACADEMICO", "Academico"), ("CONDUCTUAL", "Conductual"), ("ASISTENCIA", "Asistencia"), ("FAMILIAR", "Familiar"), ("OTRO", "Otro")], max_length=20)),
                ("descripcion", models.TextField()),
                ("acciones_tomadas", models.TextField(blank=True, null=True)),
                ("requiere_followup", models.BooleanField(default=False)),
                ("fecha_evento", models.DateField()),
                ("registrado_por", models.IntegerField(blank=True, null=True)),
                ("fecha_registro", models.DateTimeField(auto_now_add=True)),
                ("id_periodo", models.ForeignKey(db_column="id_periodo", on_delete=django.db.models.deletion.PROTECT, related_name="seguimientos", to="docentes.periodoevaluacion")),
            ],
            options={"db_table": "seguimiento_academico", "ordering": ["-fecha_evento", "-fecha_registro"]},
        ),
        migrations.CreateModel(
            name="PromedioAnualDetalle",
            fields=[
                ("id_detalle", models.AutoField(primary_key=True, serialize=False)),
                ("id_promedio_anual", models.ForeignKey(db_column="id_promedio_anual", on_delete=django.db.models.deletion.CASCADE, related_name="detalles", to="docentes.promedioanual")),
                ("id_promedio_trim", models.ForeignKey(db_column="id_promedio_trim", on_delete=django.db.models.deletion.PROTECT, related_name="detalles_anuales", to="docentes.promediotrimestral")),
            ],
            options={"db_table": "promedios_anuales_detalle"},
        ),
        migrations.AddConstraint(
            model_name="asistencia",
            constraint=models.UniqueConstraint(fields=("id_matricula", "id_asignacion", "id_periodo", "fecha"), name="uq_asistencia_matricula_asignacion_periodo_fecha"),
        ),
        migrations.AddConstraint(
            model_name="calificacion",
            constraint=models.UniqueConstraint(fields=("id_actividad", "id_matricula"), name="uq_calificacion_actividad_matricula"),
        ),
        migrations.AddConstraint(
            model_name="promedioanual",
            constraint=models.UniqueConstraint(fields=("id_matricula", "id_asignacion", "id_ano_lectivo"), name="uq_promedio_anual_matricula_asignacion_ano"),
        ),
        migrations.AddConstraint(
            model_name="promediotrimestral",
            constraint=models.UniqueConstraint(fields=("id_matricula", "id_asignacion", "id_periodo"), name="uq_promedio_trim_matricula_asignacion_periodo"),
        ),
        migrations.AddConstraint(
            model_name="resumenasistencia",
            constraint=models.UniqueConstraint(fields=("id_matricula", "id_asignacion", "id_periodo"), name="uq_resumen_asistencia_matricula_asignacion_periodo"),
        ),
        migrations.AddConstraint(
            model_name="promedioanualdetalle",
            constraint=models.UniqueConstraint(fields=("id_promedio_anual", "id_promedio_trim"), name="uq_promedio_anual_detalle"),
        ),
    ]
