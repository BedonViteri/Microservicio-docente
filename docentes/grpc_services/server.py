import grpc
from django.db import transaction
from django.core.exceptions import ObjectDoesNotExist
from docentes.models import Calificacion, Actividad, PeriodoEvaluacion
from . import docente_pb2
from . import docente_pb2_grpc
from .client import validate_teacher_assignment

def get_nota_cualitativa(nota):
    val = float(nota)
    if val >= 9.0: return "DAR"
    elif val >= 7.0: return "AAR"
    elif val >= 5.0: return "PAR"
    else: return "NAR"

class DocenteServiceServicer(docente_pb2_grpc.DocenteServiceServicer):
    
    def _validate_auth(self, context, id_asignacion):
        metadata = dict(context.invocation_metadata())
        id_docente = metadata.get('docente_id')
        internal_token = metadata.get('internal_token')
        
        if internal_token != 'dev-token-123':
            context.abort(grpc.StatusCode.UNAUTHENTICATED, "Token interno inválido o ausente")

        if not id_docente:
            context.abort(grpc.StatusCode.UNAUTHENTICATED, "docente_id requerido en metadatos")
            
        validation = validate_teacher_assignment(int(id_docente), id_asignacion)
        if not validation or not validation.get('is_valid'):
            context.abort(grpc.StatusCode.PERMISSION_DENIED, "El docente no tiene acceso a esta asignación")
            
        return int(id_docente)

    def ObtenerCalificaciones(self, request, context):
        try:
            # Consultar calificaciones en la base de datos para la matrícula y periodo indicados
            # request.trimestre es el id_periodo
            calificaciones = Calificacion.objects.filter(
                id_matricula=request.id_matricula,
                id_actividad__id_periodo_id=request.trimestre
            )
            
            pb_list = []
            for c in calificaciones:
                pb_list.append(
                    docente_pb2.Calificacion(
                        id_calificacion=c.id_calificacion,
                        id_actividad=c.id_actividad_id,
                        id_matricula=c.id_matricula,
                        nota=float(c.nota),
                        nota_cualitativa=c.nota_cualitativa,
                        registrado_por=c.registrado_por or 0
                    )
                )
                
            return docente_pb2.ObtenerCalificacionesResponse(calificaciones=pb_list)
        except Exception as e:
            context.abort(grpc.StatusCode.INTERNAL, str(e))

    def RegistrarCalificacion(self, request, context):
        try:
            try:
                actividad = Actividad.objects.get(id_actividad=request.id_actividad)
            except ObjectDoesNotExist:
                context.abort(grpc.StatusCode.NOT_FOUND, "Actividad no encontrada")
                
            id_docente = self._validate_auth(context, actividad.id_asignacion)
            
            with transaction.atomic():
                cualitativa = get_nota_cualitativa(request.nota)
                
                calificacion, created = Calificacion.objects.get_or_create(
                    id_matricula=request.id_matricula,
                    id_actividad=actividad,
                    defaults={
                        'nota': request.nota,
                        'nota_cualitativa': cualitativa,
                        'registrado_por': id_docente
                    }
                )
                
                if not created:
                    calificacion.nota = request.nota
                    calificacion.nota_cualitativa = cualitativa
                    calificacion.registrado_por = id_docente
                    calificacion.save()
                    
            return docente_pb2.RegistrarCalificacionResponse(
                exitoso=True,
                mensaje="Calificación registrada correctamente",
                id_calificacion=calificacion.id_calificacion
            )
        except grpc.RpcError:
            raise
        except Exception as e:
            if hasattr(context, '_state') and getattr(context._state, 'aborted', False):
                raise
            context.abort(grpc.StatusCode.INTERNAL, str(e))

    def CalcularPromedioFormativo(self, request, context):
        try:
            califs = Calificacion.objects.filter(
                id_matricula=request.id_matricula,
                id_actividad__id_periodo_id=request.trimestre,
                id_actividad__es_sumativa=False
            )
            promedio = sum(float(c.nota) for c in califs) / len(califs) if califs else 0.0
            return docente_pb2.PromedioResponse(promedio=promedio)
        except Exception as e:
            context.abort(grpc.StatusCode.INTERNAL, str(e))

    def CalcularPromedioFinal(self, request, context):
        try:
            califs_formativas = Calificacion.objects.filter(
                id_matricula=request.id_matricula,
                id_actividad__id_periodo_id=request.trimestre,
                id_actividad__es_sumativa=False
            )
            califs_sumativas = Calificacion.objects.filter(
                id_matricula=request.id_matricula,
                id_actividad__id_periodo_id=request.trimestre,
                id_actividad__es_sumativa=True
            )
            
            prom_formativo = sum(float(c.nota) for c in califs_formativas) / len(califs_formativas) if califs_formativas else 0.0
            prom_sumativo = sum(float(c.nota) for c in califs_sumativas) / len(califs_sumativas) if califs_sumativas else 0.0
            
            if califs_sumativas:
                prom_final = (prom_formativo * 0.8) + (prom_sumativo * 0.2)
            else:
                prom_final = prom_formativo
                
            return docente_pb2.PromedioResponse(promedio=prom_final)
        except Exception as e:
            context.abort(grpc.StatusCode.INTERNAL, str(e))

    def ConvertirACualitativa(self, request, context):
        try:
            cualitativa = get_nota_cualitativa(request.nota)
            return docente_pb2.ConvertirACualitativaResponse(cualitativa=cualitativa)
        except Exception as e:
            context.abort(grpc.StatusCode.INTERNAL, str(e))
