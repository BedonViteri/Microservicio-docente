from django.contrib import admin

from .models import (
    Actividad,
    Asistencia,
    Calificacion,
    PeriodoEvaluacion,
    PromedioAnual,
    PromedioAnualDetalle,
    PromedioTrimestral,
    ResumenAsistencia,
    SeguimientoAcademico,
)


admin.site.register(PeriodoEvaluacion)
admin.site.register(Actividad)
admin.site.register(Calificacion)
admin.site.register(Asistencia)
admin.site.register(ResumenAsistencia)
admin.site.register(PromedioTrimestral)
admin.site.register(PromedioAnual)
admin.site.register(PromedioAnualDetalle)
admin.site.register(SeguimientoAcademico)
