from rest_framework.routers import DefaultRouter

from .views import (
    ActividadViewSet,
    AsistenciaViewSet,
    CalificacionViewSet,
    PeriodoEvaluacionViewSet,
    PromedioAnualDetalleViewSet,
    PromedioAnualViewSet,
    PromedioTrimestralViewSet,
    ResumenAsistenciaViewSet,
    SeguimientoAcademicoViewSet,
)


router = DefaultRouter()
router.register("periodos-evaluacion", PeriodoEvaluacionViewSet)
router.register("actividades", ActividadViewSet)
router.register("calificaciones", CalificacionViewSet)
router.register("asistencias", AsistenciaViewSet)
router.register("resumen-asistencia", ResumenAsistenciaViewSet)
router.register("promedios-trimestrales", PromedioTrimestralViewSet)
router.register("promedios-anuales", PromedioAnualViewSet)
router.register("promedios-anuales-detalle", PromedioAnualDetalleViewSet)
router.register("seguimiento-academico", SeguimientoAcademicoViewSet)

urlpatterns = router.urls
