import grpc
from django.db import transaction
from django.core.exceptions import ObjectDoesNotExist
from docentes.models import Asistencia, ResumenAsistencia, PeriodoEvaluacion, EstadoAsistencia
from . import asistencia_pb2
from . import asistencia_pb2_grpc
from .client import validate_teacher_assignment, get_students_by_assignment

class AsistenciaServiceServicer(asistencia_pb2_grpc.AsistenciaServiceServicer):
    
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

    def _actualizar_resumen(self, id_matricula, id_asignacion, periodo):
        # Cuenta todos los estados para este estudiante en esta asignación y periodo
        asistencias = Asistencia.objects.filter(
            id_matricula=id_matricula,
            id_asignacion=id_asignacion,
            id_periodo=periodo
        )
        
        total_presentes = 0
        total_ausentes = 0
        total_justificados = 0
        total_atrasos = 0
        
        for a in asistencias:
            if a.estado == 'PRESENTE':
                total_presentes += 1
            elif a.estado == 'AUSENTE':
                total_ausentes += 1
            elif a.estado == 'JUSTIFICADO':
                total_justificados += 1
            elif a.estado == 'ATRASO':
                total_atrasos += 1
                
        # Upsert del resumen
        resumen, created = ResumenAsistencia.objects.get_or_create(
            id_matricula=id_matricula,
            id_asignacion=id_asignacion,
            id_periodo=periodo,
            defaults={
                'total_presentes': total_presentes,
                'total_ausentes': total_ausentes,
                'total_justificados': total_justificados,
                'total_atrasos': total_atrasos
            }
        )
        
        if not created:
            resumen.total_presentes = total_presentes
            resumen.total_ausentes = total_ausentes
            resumen.total_justificados = total_justificados
            resumen.total_atrasos = total_atrasos
            resumen.save()

    def RegistrarAsistenciaGrupal(self, request, context):
        try:
            id_docente = self._validate_auth(context, request.id_asignacion)
            
            try:
                periodo = PeriodoEvaluacion.objects.get(id_periodo=request.id_periodo)
            except ObjectDoesNotExist:
                context.abort(grpc.StatusCode.NOT_FOUND, "Periodo de evaluación no encontrado")
                
            # Evitar N+1 y llamadas a gRPC individuales obteniendo los estudiantes válidos
            estudiantes = get_students_by_assignment(request.id_asignacion)
            matriculas_validas = {est['id_matricula'] for est in estudiantes}
            
            asistencias_creadas = []
            
            with transaction.atomic():
                for item in request.asistencias:
                    if item.id_matricula not in matriculas_validas:
                        context.abort(grpc.StatusCode.INVALID_ARGUMENT, f"Estudiante con matrícula {item.id_matricula} no pertenece a la asignación")
                        
                    # Validar estados válidos
                    if item.estado not in [e.value for e in EstadoAsistencia]:
                        context.abort(grpc.StatusCode.INVALID_ARGUMENT, f"Estado {item.estado} inválido")
                        
                    # Política para duplicados: si ya existe para la fecha, ignorar (NO DUPLICAR NI HACER UPSERT SILENCIOSO)
                    # El requerimiento dice: "Si ya existe asistencia para esa fecha, no dupliques registros. Devuelve conflicto o utiliza actualización explícita según el endpoint."
                    # Si enviamos grupal y ya hay algunas creadas, mejor devolver conflicto para toda la transacción si intentan sobrescribir, o ignorarlas silenciosamente si es un submit parcial.
                    # Asumiremos conflicto estricto según la regla solicitada: "Devuelve conflicto"
                    if Asistencia.objects.filter(id_matricula=item.id_matricula, id_asignacion=request.id_asignacion, fecha=request.fecha).exists():
                        context.abort(grpc.StatusCode.ALREADY_EXISTS, f"Ya existe asistencia registrada para el estudiante {item.id_matricula} en la fecha {request.fecha}")
                        
                    asistencia = Asistencia.objects.create(
                        id_matricula=item.id_matricula,
                        id_asignacion=request.id_asignacion,
                        id_periodo=periodo,
                        fecha=request.fecha,
                        estado=item.estado,
                        justificacion=item.justificacion,
                        registrado_por=id_docente
                    )
                    
                    self._actualizar_resumen(item.id_matricula, request.id_asignacion, periodo)
                    
                    asistencias_creadas.append(
                        asistencia_pb2.AsistenciaDTO(
                            id_asistencia=asistencia.id_asistencia,
                            id_matricula=asistencia.id_matricula,
                            id_asignacion=asistencia.id_asignacion,
                            id_periodo=asistencia.id_periodo_id,
                            fecha=str(asistencia.fecha),
                            estado=asistencia.estado,
                            justificacion=asistencia.justificacion or ""
                        )
                    )
            
            return asistencia_pb2.AsistenciaListResponse(
                success=True,
                message=f"Se registraron {len(asistencias_creadas)} asistencias correctamente.",
                asistencias=asistencias_creadas
            )
            
        except grpc.RpcError:
            raise
        except Exception as e:
            if hasattr(context, '_state') and getattr(context._state, 'aborted', False):
                raise
            context.abort(grpc.StatusCode.INTERNAL, str(e))

    def ActualizarAsistencia(self, request, context):
        try:
            try:
                asistencia = Asistencia.objects.get(id_asistencia=request.id_asistencia)
            except ObjectDoesNotExist:
                context.abort(grpc.StatusCode.NOT_FOUND, "Registro de asistencia no encontrado")
                
            self._validate_auth(context, asistencia.id_asignacion)
            
            if request.estado not in [e.value for e in EstadoAsistencia]:
                context.abort(grpc.StatusCode.INVALID_ARGUMENT, f"Estado {request.estado} inválido")
                
            with transaction.atomic():
                asistencia.estado = request.estado
                asistencia.justificacion = request.justificacion
                asistencia.save()
                
                self._actualizar_resumen(asistencia.id_matricula, asistencia.id_asignacion, asistencia.id_periodo)
                
            dto = asistencia_pb2.AsistenciaDTO(
                id_asistencia=asistencia.id_asistencia,
                id_matricula=asistencia.id_matricula,
                id_asignacion=asistencia.id_asignacion,
                id_periodo=asistencia.id_periodo_id,
                fecha=str(asistencia.fecha),
                estado=asistencia.estado,
                justificacion=asistencia.justificacion or ""
            )
            
            return asistencia_pb2.AsistenciaResponse(
                success=True,
                message="Asistencia actualizada exitosamente",
                asistencia=dto
            )
            
        except grpc.RpcError:
            raise
        except Exception as e:
            if hasattr(context, '_state') and getattr(context._state, 'aborted', False):
                raise
            context.abort(grpc.StatusCode.INTERNAL, str(e))

    def ConsultarAsistencia(self, request, context):
        try:
            self._validate_auth(context, request.id_asignacion)
            
            query = Asistencia.objects.filter(id_asignacion=request.id_asignacion)
            
            if request.fecha:
                query = query.filter(fecha=request.fecha)
            if request.id_periodo > 0:
                query = query.filter(id_periodo_id=request.id_periodo)
            if request.id_matricula > 0:
                query = query.filter(id_matricula=request.id_matricula)
                
            resultados = []
            for a in query:
                resultados.append(
                    asistencia_pb2.AsistenciaDTO(
                        id_asistencia=a.id_asistencia,
                        id_matricula=a.id_matricula,
                        id_asignacion=a.id_asignacion,
                        id_periodo=a.id_periodo_id,
                        fecha=str(a.fecha),
                        estado=a.estado,
                        justificacion=a.justificacion or ""
                    )
                )
                
            return asistencia_pb2.AsistenciaListResponse(
                success=True,
                message=f"{len(resultados)} registros encontrados",
                asistencias=resultados
            )
            
        except grpc.RpcError:
            raise
        except Exception as e:
            if hasattr(context, '_state') and getattr(context._state, 'aborted', False):
                raise
            context.abort(grpc.StatusCode.INTERNAL, str(e))

    def ConsultarResumenAsistencia(self, request, context):
        try:
            self._validate_auth(context, request.id_asignacion)
            
            query = ResumenAsistencia.objects.filter(id_asignacion=request.id_asignacion, id_periodo_id=request.id_periodo)
            
            if request.id_matricula > 0:
                query = query.filter(id_matricula=request.id_matricula)
                
            resultados = []
            for r in query:
                total = r.total_presentes + r.total_ausentes + r.total_justificados + r.total_atrasos
                porcentaje = 0.0
                if total > 0:
                    porcentaje = ((r.total_presentes + r.total_justificados + r.total_atrasos) / total) * 100.0
                    
                resultados.append(
                    asistencia_pb2.ResumenAsistenciaDTO(
                        id_resumen=r.id_resumen,
                        id_matricula=r.id_matricula,
                        id_asignacion=r.id_asignacion,
                        id_periodo=r.id_periodo_id,
                        total_presentes=r.total_presentes,
                        total_ausentes=r.total_ausentes,
                        total_justificados=r.total_justificados,
                        total_atrasos=r.total_atrasos,
                        porcentaje_asistencia=porcentaje
                    )
                )
                
            return asistencia_pb2.ResumenAsistenciaListResponse(
                success=True,
                message=f"{len(resultados)} resúmenes encontrados",
                resumenes=resultados
            )
            
        except grpc.RpcError:
            raise
        except Exception as e:
            if hasattr(context, '_state') and getattr(context._state, 'aborted', False):
                raise
            context.abort(grpc.StatusCode.INTERNAL, str(e))
