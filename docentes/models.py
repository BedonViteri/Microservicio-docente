from django.db import models


class TipoPeriodo(models.TextChoices):
    TRIMESTRE = "TRIMESTRE", "Trimestre"
    QUIMESTRE = "QUIMESTRE", "Quimestre"
    PARCIAL = "PARCIAL", "Parcial"


class TipoActividad(models.TextChoices):
    FORMATIVA = "FORMATIVA", "Formativa"
    SUMATIVA = "SUMATIVA", "Sumativa"
    TAREA = "TAREA", "Tarea"
    LECCION = "LECCION", "Leccion"
    PROYECTO = "PROYECTO", "Proyecto"
    EXAMEN = "EXAMEN", "Examen"


class NotaCualitativa(models.TextChoices):
    DAR = "DAR", "Domina los aprendizajes requeridos"
    AAR = "AAR", "Alcanza los aprendizajes requeridos"
    PAR = "PAR", "Proximo a alcanzar los aprendizajes requeridos"
    NAR = "NAR", "No alcanza los aprendizajes requeridos"


class EstadoAsistencia(models.TextChoices):
    PRESENTE = "PRESENTE", "Presente"
    AUSENTE = "AUSENTE", "Ausente"
    JUSTIFICADO = "JUSTIFICADO", "Justificado"
    ATRASO = "ATRASO", "Atraso"


class CategoriaSeguimiento(models.TextChoices):
    ACADEMICO = "ACADEMICO", "Academico"
    CONDUCTUAL = "CONDUCTUAL", "Conductual"
    ASISTENCIA = "ASISTENCIA", "Asistencia"
    FAMILIAR = "FAMILIAR", "Familiar"
    OTRO = "OTRO", "Otro"


class PeriodoEvaluacion(models.Model):
    id_periodo = models.AutoField(primary_key=True)
    id_ano_lectivo = models.IntegerField()
    tipo = models.CharField(max_length=20, choices=TipoPeriodo.choices)
    nombre = models.CharField(max_length=40)
    fecha_inicio = models.DateField()
    fecha_fin = models.DateField()
    activo = models.BooleanField(default=True)

    class Meta:
        db_table = 'sga_docente"."periodos_evaluacion'
        ordering = ["id_ano_lectivo", "fecha_inicio"]

    def __str__(self):
        return self.nombre


class Actividad(models.Model):
    id_actividad = models.AutoField(primary_key=True)
    id_asignacion = models.IntegerField()
    id_periodo = models.ForeignKey(
        PeriodoEvaluacion,
        models.PROTECT,
        db_column="id_periodo",
        related_name="actividades",
    )
    tipo = models.CharField(max_length=20, choices=TipoActividad.choices)
    nombre = models.CharField(max_length=200)
    descripcion = models.TextField(blank=True, null=True)
    fecha_entrega = models.DateField()
    ponderacion = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    nota_maxima = models.DecimalField(max_digits=4, decimal_places=2, default=10)
    es_sumativa = models.BooleanField(default=False)
    fecha_creacion = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'sga_docente"."actividades'
        ordering = ["-fecha_entrega", "id_actividad"]

    def __str__(self):
        return self.nombre


class Calificacion(models.Model):
    id_calificacion = models.BigAutoField(primary_key=True)
    id_actividad = models.ForeignKey(
        Actividad,
        models.CASCADE,
        db_column="id_actividad",
        related_name="calificaciones",
    )
    id_matricula = models.IntegerField()
    nota = models.DecimalField(max_digits=4, decimal_places=2)
    nota_cualitativa = models.CharField(
        max_length=3, choices=NotaCualitativa.choices, blank=True
    )
    observacion = models.TextField(blank=True, null=True)
    registrado_por = models.IntegerField(blank=True, null=True)
    fecha_registro = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'sga_docente"."calificaciones'
        ordering = ["-fecha_registro"]
        constraints = [
            models.UniqueConstraint(
                fields=["id_actividad", "id_matricula"],
                name="uq_calificacion_actividad_matricula",
            )
        ]

    def __str__(self):
        return f"{self.id_matricula} - {self.id_actividad_id}: {self.nota}"


class Asistencia(models.Model):
    id_asistencia = models.BigAutoField(primary_key=True)
    id_matricula = models.IntegerField()
    id_asignacion = models.IntegerField()
    id_periodo = models.ForeignKey(
        PeriodoEvaluacion,
        models.PROTECT,
        db_column="id_periodo",
        related_name="asistencias",
    )
    fecha = models.DateField()
    estado = models.CharField(max_length=20, choices=EstadoAsistencia.choices)
    justificacion = models.TextField(blank=True, null=True)
    registrado_por = models.IntegerField(blank=True, null=True)
    fecha_registro = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'sga_docente"."asistencias'
        ordering = ["-fecha", "id_matricula"]
        constraints = [
            models.UniqueConstraint(
                fields=["id_matricula", "id_asignacion", "id_periodo", "fecha"],
                name="uq_asistencia_matricula_asignacion_periodo_fecha",
            )
        ]


class ResumenAsistencia(models.Model):
    id_resumen = models.AutoField(primary_key=True)
    id_matricula = models.IntegerField()
    id_asignacion = models.IntegerField()
    id_periodo = models.ForeignKey(
        PeriodoEvaluacion,
        models.PROTECT,
        db_column="id_periodo",
        related_name="resumenes_asistencia",
    )
    total_presentes = models.SmallIntegerField(default=0)
    total_ausentes = models.SmallIntegerField(default=0)
    total_justificados = models.SmallIntegerField(default=0)
    total_atrasos = models.SmallIntegerField(default=0)
    calculado_en = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'sga_docente"."resumen_asistencia'
        constraints = [
            models.UniqueConstraint(
                fields=["id_matricula", "id_asignacion", "id_periodo"],
                name="uq_resumen_asistencia_matricula_asignacion_periodo",
            )
        ]


class PromedioTrimestral(models.Model):
    id_promedio = models.AutoField(primary_key=True)
    id_matricula = models.IntegerField()
    id_asignacion = models.IntegerField()
    id_periodo = models.ForeignKey(
        PeriodoEvaluacion,
        models.PROTECT,
        db_column="id_periodo",
        related_name="promedios_trimestrales",
    )
    promedio_formativo = models.DecimalField(max_digits=4, decimal_places=2, default=0)
    nota_sumativa = models.DecimalField(max_digits=4, decimal_places=2, default=0)
    promedio_trimestral = models.DecimalField(max_digits=4, decimal_places=2, default=0)
    nota_cualitativa = models.CharField(max_length=3, choices=NotaCualitativa.choices)
    calculado_en = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'sga_docente"."promedios_trimestrales'
        constraints = [
            models.UniqueConstraint(
                fields=["id_matricula", "id_asignacion", "id_periodo"],
                name="uq_promedio_trim_matricula_asignacion_periodo",
            )
        ]


class PromedioAnual(models.Model):
    id_promedio_anual = models.AutoField(primary_key=True)
    id_matricula = models.IntegerField()
    id_asignacion = models.IntegerField()
    id_ano_lectivo = models.IntegerField()
    promedio_anual = models.DecimalField(max_digits=4, decimal_places=2, default=0)
    nota_cualitativa = models.CharField(max_length=3, choices=NotaCualitativa.choices)
    registrado_por = models.IntegerField(blank=True, null=True)
    calculado_en = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'sga_docente"."promedios_anuales'
        constraints = [
            models.UniqueConstraint(
                fields=["id_matricula", "id_asignacion", "id_ano_lectivo"],
                name="uq_promedio_anual_matricula_asignacion_ano",
            )
        ]


class PromedioAnualDetalle(models.Model):
    id_detalle = models.AutoField(primary_key=True)
    id_promedio_anual = models.ForeignKey(
        PromedioAnual,
        models.CASCADE,
        db_column="id_promedio_anual",
        related_name="detalles",
    )
    id_promedio_trim = models.ForeignKey(
        PromedioTrimestral,
        models.PROTECT,
        db_column="id_promedio_trim",
        related_name="detalles_anuales",
    )

    class Meta:
        db_table = 'sga_docente"."promedios_anuales_detalle'
        constraints = [
            models.UniqueConstraint(
                fields=["id_promedio_anual", "id_promedio_trim"],
                name="uq_promedio_anual_detalle",
            )
        ]


class SeguimientoAcademico(models.Model):
    id_seguimiento = models.BigAutoField(primary_key=True)
    id_matricula = models.IntegerField()
    id_periodo = models.ForeignKey(
        PeriodoEvaluacion,
        models.PROTECT,
        db_column="id_periodo",
        related_name="seguimientos",
    )
    categoria = models.CharField(max_length=20, choices=CategoriaSeguimiento.choices)
    descripcion = models.TextField()
    acciones_tomadas = models.TextField(blank=True, null=True)
    requiere_followup = models.BooleanField(default=False)
    fecha_evento = models.DateField()
    registrado_por = models.IntegerField(blank=True, null=True)
    fecha_registro = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'sga_docente"."seguimiento_academico'
        ordering = ["-fecha_evento", "-fecha_registro"]
