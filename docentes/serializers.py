from rest_framework import serializers

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
from .services import convertir_nota_cualitativa


class PeriodoEvaluacionSerializer(serializers.ModelSerializer):
    class Meta:
        model = PeriodoEvaluacion
        fields = "__all__"


class ActividadSerializer(serializers.ModelSerializer):
    class Meta:
        model = Actividad
        fields = "__all__"


class CalificacionSerializer(serializers.ModelSerializer):
    nivel = serializers.CharField(write_only=True, required=False, default="EGB")

    class Meta:
        model = Calificacion
        fields = "__all__"
        read_only_fields = ["nota_cualitativa", "fecha_registro", "fecha_actualizacion"]

    def validate(self, attrs):
        actividad = attrs.get("id_actividad") or getattr(self.instance, "id_actividad", None)
        nota = attrs.get("nota") or getattr(self.instance, "nota", None)
        if actividad and nota is not None and nota > actividad.nota_maxima:
            raise serializers.ValidationError(
                {"nota": "La nota no puede superar la nota maxima de la actividad."}
            )
        return attrs

    def create(self, validated_data):
        nivel = validated_data.pop("nivel", "EGB")
        validated_data["nota_cualitativa"] = convertir_nota_cualitativa(
            validated_data["nota"], nivel
        )
        return super().create(validated_data)

    def update(self, instance, validated_data):
        nivel = validated_data.pop("nivel", "EGB")
        if "nota" in validated_data:
            validated_data["nota_cualitativa"] = convertir_nota_cualitativa(
                validated_data["nota"], nivel
            )
        return super().update(instance, validated_data)


class AsistenciaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Asistencia
        fields = "__all__"


class ResumenAsistenciaSerializer(serializers.ModelSerializer):
    class Meta:
        model = ResumenAsistencia
        fields = "__all__"
        read_only_fields = ["calculado_en"]


class PromedioTrimestralSerializer(serializers.ModelSerializer):
    class Meta:
        model = PromedioTrimestral
        fields = "__all__"
        read_only_fields = [
            "promedio_formativo",
            "nota_sumativa",
            "promedio_trimestral",
            "nota_cualitativa",
            "calculado_en",
        ]


class PromedioAnualSerializer(serializers.ModelSerializer):
    class Meta:
        model = PromedioAnual
        fields = "__all__"
        read_only_fields = ["promedio_anual", "nota_cualitativa", "calculado_en"]


class PromedioAnualDetalleSerializer(serializers.ModelSerializer):
    class Meta:
        model = PromedioAnualDetalle
        fields = "__all__"


class SeguimientoAcademicoSerializer(serializers.ModelSerializer):
    class Meta:
        model = SeguimientoAcademico
        fields = "__all__"
        read_only_fields = ["fecha_registro"]
