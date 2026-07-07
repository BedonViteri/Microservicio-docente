from decimal import Decimal, ROUND_HALF_UP

from django.db.models import Avg, Count, Q

from .models import (
    Asistencia,
    Calificacion,
    EstadoAsistencia,
    PromedioAnual,
    PromedioAnualDetalle,
    PromedioTrimestral,
    ResumenAsistencia,
)


ZERO = Decimal("0.00")


def quantize_score(value):
    return Decimal(value or 0).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def convertir_nota_cualitativa(nota, nivel="EGB"):
    nota = Decimal(nota or 0)
    nivel = (nivel or "EGB").upper()

    if nivel in {"INICIAL", "PREPARATORIA"}:
        if nota >= Decimal("9.00"):
            return "DAR"
        if nota >= Decimal("7.00"):
            return "AAR"
        if nota >= Decimal("4.01"):
            return "PAR"
        return "NAR"

    if nota >= Decimal("9.00"):
        return "DAR"
    if nota >= Decimal("7.00"):
        return "AAR"
    if nota > Decimal("4.00"):
        return "PAR"
    return "NAR"


def calcular_promedio_formativo(id_matricula, id_asignacion, id_periodo):
    resultado = Calificacion.objects.filter(
        id_matricula=id_matricula,
        id_actividad__id_asignacion=id_asignacion,
        id_actividad__id_periodo_id=id_periodo,
        id_actividad__es_sumativa=False,
    ).aggregate(promedio=Avg("nota"))
    return quantize_score(resultado["promedio"])


def calcular_nota_sumativa(id_matricula, id_asignacion, id_periodo):
    resultado = Calificacion.objects.filter(
        id_matricula=id_matricula,
        id_actividad__id_asignacion=id_asignacion,
        id_actividad__id_periodo_id=id_periodo,
        id_actividad__es_sumativa=True,
    ).aggregate(promedio=Avg("nota"))
    return quantize_score(resultado["promedio"])


def calcular_promedio_trimestral(id_matricula, id_asignacion, id_periodo, nivel="EGB"):
    promedio_formativo = calcular_promedio_formativo(
        id_matricula, id_asignacion, id_periodo
    )
    nota_sumativa = calcular_nota_sumativa(id_matricula, id_asignacion, id_periodo)
    promedio_trimestral = quantize_score(
        promedio_formativo * Decimal("0.70") + nota_sumativa * Decimal("0.30")
    )

    promedio, _ = PromedioTrimestral.objects.update_or_create(
        id_matricula=id_matricula,
        id_asignacion=id_asignacion,
        id_periodo_id=id_periodo,
        defaults={
            "promedio_formativo": promedio_formativo,
            "nota_sumativa": nota_sumativa,
            "promedio_trimestral": promedio_trimestral,
            "nota_cualitativa": convertir_nota_cualitativa(
                promedio_trimestral, nivel
            ),
        },
    )
    return promedio


def calcular_resumen_asistencia(id_matricula, id_asignacion, id_periodo):
    conteos = Asistencia.objects.filter(
        id_matricula=id_matricula,
        id_asignacion=id_asignacion,
        id_periodo_id=id_periodo,
    ).aggregate(
        presentes=Count("id_asistencia", filter=Q(estado=EstadoAsistencia.PRESENTE)),
        ausentes=Count("id_asistencia", filter=Q(estado=EstadoAsistencia.AUSENTE)),
        justificados=Count(
            "id_asistencia", filter=Q(estado=EstadoAsistencia.JUSTIFICADO)
        ),
        atrasos=Count("id_asistencia", filter=Q(estado=EstadoAsistencia.ATRASO)),
    )

    resumen, _ = ResumenAsistencia.objects.update_or_create(
        id_matricula=id_matricula,
        id_asignacion=id_asignacion,
        id_periodo_id=id_periodo,
        defaults={
            "total_presentes": conteos["presentes"] or 0,
            "total_ausentes": conteos["ausentes"] or 0,
            "total_justificados": conteos["justificados"] or 0,
            "total_atrasos": conteos["atrasos"] or 0,
        },
    )
    return resumen


def calcular_promedio_anual(
    id_matricula, id_asignacion, id_ano_lectivo, nivel="EGB", registrado_por=None
):
    trimestres = list(
        PromedioTrimestral.objects.filter(
            id_matricula=id_matricula,
            id_asignacion=id_asignacion,
            id_periodo__id_ano_lectivo=id_ano_lectivo,
        )
    )
    if not trimestres:
        promedio_anual = ZERO
    else:
        suma = sum((p.promedio_trimestral for p in trimestres), ZERO)
        promedio_anual = quantize_score(suma / Decimal(len(trimestres)))

    promedio, _ = PromedioAnual.objects.update_or_create(
        id_matricula=id_matricula,
        id_asignacion=id_asignacion,
        id_ano_lectivo=id_ano_lectivo,
        defaults={
            "promedio_anual": promedio_anual,
            "nota_cualitativa": convertir_nota_cualitativa(promedio_anual, nivel),
            "registrado_por": registrado_por,
        },
    )

    PromedioAnualDetalle.objects.filter(id_promedio_anual=promedio).delete()
    PromedioAnualDetalle.objects.bulk_create(
        [
            PromedioAnualDetalle(
                id_promedio_anual=promedio,
                id_promedio_trim=trimestre,
            )
            for trimestre in trimestres
        ]
    )
    return promedio
