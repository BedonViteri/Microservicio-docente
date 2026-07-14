import grpc
from django.db import transaction
from django.core.exceptions import ObjectDoesNotExist
from docentes.models import Actividad, PeriodoEvaluacion
from . import actividades_pb2
from . import actividades_pb2_grpc
from .client import validate_teacher_assignment

class ActividadServiceServicer(actividades_pb2_grpc.ActividadServiceServicer):
    
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
            
        return True
        
    def CrearActividad(self, request, context):
        try:
            self._validate_auth(context, request.id_asignacion)
            
            periodo = PeriodoEvaluacion.objects.get(id_periodo=request.id_periodo)
            
            actividad = Actividad.objects.create(
                id_asignacion=request.id_asignacion,
                id_periodo=periodo,
                tipo=request.tipo,
                nombre=request.nombre,
                descripcion=request.descripcion,
                fecha_entrega=request.fecha_entrega,
                ponderacion=request.ponderacion,
                nota_maxima=request.nota_maxima,
                es_sumativa=request.es_sumativa
            )
            
            dto = actividades_pb2.ActividadDto(
                id_actividad=actividad.id_actividad,
                id_asignacion=actividad.id_asignacion,
                id_periodo=actividad.id_periodo_id,
                tipo=actividad.tipo,
                nombre=actividad.nombre,
                descripcion=actividad.descripcion or "",
                fecha_entrega=str(actividad.fecha_entrega),
                ponderacion=float(actividad.ponderacion),
                nota_maxima=float(actividad.nota_maxima),
                es_sumativa=actividad.es_sumativa
            )
            
            return actividades_pb2.ActividadResponse(
                exitoso=True,
                mensaje="Actividad creada exitosamente",
                actividad=dto
            )
        except ObjectDoesNotExist:
            context.abort(grpc.StatusCode.NOT_FOUND, "Periodo de evaluación no encontrado")
        except Exception as e:
            if type(e).__name__ in ('_RpcEnded', 'RpcError') or 'grpc' in type(e).__module__:
                raise
            context.abort(grpc.StatusCode.INTERNAL, str(e))
            
    def EditarActividad(self, request, context):
        try:
            actividad = Actividad.objects.get(id_actividad=request.id_actividad)
            self._validate_auth(context, actividad.id_asignacion)
            
            actividad.tipo = request.tipo
            actividad.nombre = request.nombre
            actividad.descripcion = request.descripcion
            actividad.fecha_entrega = request.fecha_entrega
            actividad.ponderacion = request.ponderacion
            actividad.nota_maxima = request.nota_maxima
            actividad.es_sumativa = request.es_sumativa
            actividad.save()
            
            dto = actividades_pb2.ActividadDto(
                id_actividad=actividad.id_actividad,
                id_asignacion=actividad.id_asignacion,
                id_periodo=actividad.id_periodo_id,
                tipo=actividad.tipo,
                nombre=actividad.nombre,
                descripcion=actividad.descripcion or "",
                fecha_entrega=str(actividad.fecha_entrega),
                ponderacion=float(actividad.ponderacion),
                nota_maxima=float(actividad.nota_maxima),
                es_sumativa=actividad.es_sumativa
            )
            
            return actividades_pb2.ActividadResponse(
                exitoso=True,
                mensaje="Actividad actualizada exitosamente",
                actividad=dto
            )
        except ObjectDoesNotExist:
            context.abort(grpc.StatusCode.NOT_FOUND, "Actividad no encontrada")
        except Exception as e:
            if type(e).__name__ in ('_RpcEnded', 'RpcError') or 'grpc' in type(e).__module__:
                raise
            context.abort(grpc.StatusCode.INTERNAL, str(e))
            
    def ObtenerActividad(self, request, context):
        try:
            actividad = Actividad.objects.get(id_actividad=request.id_actividad)
            self._validate_auth(context, actividad.id_asignacion)
            
            dto = actividades_pb2.ActividadDto(
                id_actividad=actividad.id_actividad,
                id_asignacion=actividad.id_asignacion,
                id_periodo=actividad.id_periodo_id,
                tipo=actividad.tipo,
                nombre=actividad.nombre,
                descripcion=actividad.descripcion or "",
                fecha_entrega=str(actividad.fecha_entrega),
                ponderacion=float(actividad.ponderacion),
                nota_maxima=float(actividad.nota_maxima),
                es_sumativa=actividad.es_sumativa
            )
            
            return actividades_pb2.ActividadResponse(
                exitoso=True,
                mensaje="Actividad obtenida",
                actividad=dto
            )
        except ObjectDoesNotExist:
            context.abort(grpc.StatusCode.NOT_FOUND, "Actividad no encontrada")
        except Exception as e:
            if type(e).__name__ in ('_RpcEnded', 'RpcError') or 'grpc' in type(e).__module__:
                raise
            context.abort(grpc.StatusCode.INTERNAL, str(e))
            
    def ListarActividades(self, request, context):
        try:
            self._validate_auth(context, request.id_asignacion)
            
            query = Actividad.objects.filter(id_asignacion=request.id_asignacion)
            if request.id_periodo > 0:
                query = query.filter(id_periodo_id=request.id_periodo)
                
            actividades_list = []
            for actividad in query:
                dto = actividades_pb2.ActividadDto(
                    id_actividad=actividad.id_actividad,
                    id_asignacion=actividad.id_asignacion,
                    id_periodo=actividad.id_periodo_id,
                    tipo=actividad.tipo,
                    nombre=actividad.nombre,
                    descripcion=actividad.descripcion or "",
                    fecha_entrega=str(actividad.fecha_entrega),
                    ponderacion=float(actividad.ponderacion),
                    nota_maxima=float(actividad.nota_maxima),
                    es_sumativa=actividad.es_sumativa
                )
                actividades_list.append(dto)
                
            return actividades_pb2.ListarActividadesResponse(
                exitoso=True,
                mensaje=f"{len(actividades_list)} actividades encontradas",
                actividades=actividades_list
            )
        except Exception as e:
            if type(e).__name__ in ('_RpcEnded', 'RpcError') or 'grpc' in type(e).__module__:
                raise
            context.abort(grpc.StatusCode.INTERNAL, str(e))
            
    def EliminarActividad(self, request, context):
        try:
            actividad = Actividad.objects.get(id_actividad=request.id_actividad)
            self._validate_auth(context, actividad.id_asignacion)
            
            actividad.delete()
            
            return actividades_pb2.EliminarActividadResponse(
                exitoso=True,
                mensaje="Actividad eliminada exitosamente"
            )
        except ObjectDoesNotExist:
            context.abort(grpc.StatusCode.NOT_FOUND, "Actividad no encontrada")
        except Exception as e:
            if type(e).__name__ in ('_RpcEnded', 'RpcError') or 'grpc' in type(e).__module__:
                raise
            context.abort(grpc.StatusCode.INTERNAL, str(e))
