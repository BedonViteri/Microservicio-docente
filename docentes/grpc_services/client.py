import grpc
import os
from . import contexto_docente_pb2
from . import contexto_docente_pb2_grpc

SGA_PRINCIPAL_HOST = os.environ.get("SGA_PRINCIPAL_GRPC_HOST", "localhost:9092")

def get_context_stub():
    channel = grpc.insecure_channel(SGA_PRINCIPAL_HOST)
    return contexto_docente_pb2_grpc.TeacherContextServiceStub(channel)

def validate_teacher_assignment(id_docente, id_asignacion):
    stub = get_context_stub()
    request = contexto_docente_pb2.ValidateAssignmentRequest(
        id_docente=id_docente,
        id_asignacion=id_asignacion
    )
    try:
        response = stub.ValidateTeacherAssignment(request, metadata=[('internal_token', 'dev-token-123')])
        return {
            "is_valid": response.is_valid,
            "id_asignatura": response.id_asignatura,
            "id_grado": response.id_grado,
            "id_paralelo": response.id_paralelo,
            "id_ano_lectivo": response.id_ano_lectivo,
            "is_active": response.is_active
        }
    except grpc.RpcError as e:
        print(f"Error gRPC ValidateTeacherAssignment: {e}")
        return None

def validate_student_enrollment(id_matricula, id_asignacion):
    stub = get_context_stub()
    request = contexto_docente_pb2.ValidateEnrollmentRequest(
        id_matricula=id_matricula,
        id_asignacion=id_asignacion
    )
    try:
        response = stub.ValidateStudentEnrollment(request, metadata=[('internal_token', 'dev-token-123')])
        return {
            "is_valid": response.is_valid,
            "id_estudiante": response.id_estudiante
        }
    except grpc.RpcError as e:
        print(f"Error gRPC ValidateStudentEnrollment: {e}")
        return None

def get_current_academic_year():
    stub = get_context_stub()
    request = contexto_docente_pb2.EmptyRequest()
    try:
        response = stub.GetCurrentAcademicYear(request, metadata=[('internal_token', 'dev-token-123')])
        return {
            "id_ano_lectivo": response.id_ano_lectivo,
            "nombre": response.nombre,
            "fecha_inicio": response.fecha_inicio,
            "fecha_fin": response.fecha_fin
        }
    except grpc.RpcError as e:
        print(f"Error gRPC GetCurrentAcademicYear: {e}")
        return None

def get_students_by_assignment(id_asignacion):
    stub = get_context_stub()
    request = contexto_docente_pb2.StudentsByAssignmentRequest(
        id_asignacion=id_asignacion
    )
    try:
        response = stub.GetStudentsByAssignment(request, metadata=[('internal_token', 'dev-token-123')])
        return [
            {
                "id_estudiante": student.id_estudiante,
                "cedula": student.cedula,
                "nombres": student.nombres,
                "apellidos": student.apellidos,
                "id_matricula": student.id_matricula
            }
            for student in response.students
        ]
    except grpc.RpcError as e:
        print(f"Error gRPC GetStudentsByAssignment: {e}")
        return []
