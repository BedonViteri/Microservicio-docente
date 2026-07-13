import grpc
from . import docente_pb2
from . import docente_pb2_grpc
from .client import validate_teacher_assignment

class DocenteServiceServicer(docente_pb2_grpc.DocenteServiceServicer):
    
    def RegistrarCalificacion(self, request, context):
        print(f"Recibida petición RegistrarCalificacion gRPC: Matricula {request.id_matricula}, Actividad {request.id_actividad}")
        
        # OBTENEMOS METADATOS (por ejemplo, el ID del docente y el token interno)
        metadata = dict(context.invocation_metadata())
        id_docente = metadata.get('docente_id')
        internal_token = metadata.get('internal_token')
        
        if internal_token != 'dev-token-123':
            print("Token interno inválido o ausente.")
            context.abort(grpc.StatusCode.UNAUTHENTICATED, "Token interno inválido o ausente")

        if not id_docente:
            print("No se proporcionó docente_id en los metadatos.")
            context.abort(grpc.StatusCode.UNAUTHENTICATED, "docente_id requerido en metadatos")
            
        print(f"Docente autenticado desde metadata: {id_docente}")

        # Aquí deberíamos tener la actividad y sacar su id_asignacion
        # Para la Fase A (prueba básica), asumiremos un id_asignacion ficticio de la base de datos
        id_asignacion = 1 # TODO: Cargar la asignación real desde BD usando request.id_actividad
        
        # Llamamos al SGA Principal (Spring Boot 9092) para validar
        validation = validate_teacher_assignment(int(id_docente), id_asignacion)
        
        if not validation or not validation.get('is_valid'):
            print(f"Validación fallida para docente {id_docente} y asignación {id_asignacion}")
            context.abort(grpc.StatusCode.PERMISSION_DENIED, "El docente no tiene acceso a esta asignación")
            
        print("Validación en SGA Principal exitosa!")
        
        # Simular registro exitoso
        return docente_pb2.RegistrarCalificacionResponse(
            exitoso=True,
            mensaje="Validado por SGA Principal y simulado con éxito",
            id_calificacion=999
        )
