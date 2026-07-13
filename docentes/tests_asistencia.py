from django.test import TestCase
from django.utils import timezone
from unittest.mock import patch, MagicMock
from docentes.models import PeriodoEvaluacion, TipoPeriodo, Asistencia, ResumenAsistencia, EstadoAsistencia
from docentes.grpc_services.asistencia_service import AsistenciaServiceServicer
from docentes.grpc_services import asistencia_pb2
import grpc

class DummyContext:
    def __init__(self, metadata):
        self._metadata = metadata
        self._aborted = False
        self._abort_code = None
        self._abort_details = None

    def invocation_metadata(self):
        return self._metadata

    def abort(self, code, details):
        self._aborted = True
        self._abort_code = code
        self._abort_details = details
        raise grpc.RpcError(details)

class AsistenciaServiceTest(TestCase):
    def setUp(self):
        self.servicer = AsistenciaServiceServicer()
        self.periodo = PeriodoEvaluacion.objects.create(
            id_ano_lectivo=1,
            tipo=TipoPeriodo.TRIMESTRE,
            nombre="Primer Trimestre",
            fecha_inicio="2026-05-01",
            fecha_fin="2026-08-01",
            activo=True
        )

    @patch('docentes.grpc_services.asistencia_service.validate_teacher_assignment')
    @patch('docentes.grpc_services.asistencia_service.get_students_by_assignment')
    def test_registro_grupal_correcto(self, mock_get_students, mock_validate_assignment):
        mock_validate_assignment.return_value = {"is_valid": True}
        mock_get_students.return_value = [
            {"id_matricula": 101},
            {"id_matricula": 102}
        ]

        context = DummyContext((
            ('docente_id', '10'),
            ('internal_token', 'dev-token-123')
        ))

        request = asistencia_pb2.RegistrarAsistenciaGrupalRequest(
            id_asignacion=50,
            id_periodo=self.periodo.id_periodo,
            fecha="2026-07-15",
            asistencias=[
                asistencia_pb2.AsistenciaItemRequest(id_matricula=101, estado="PRESENTE", justificacion=""),
                asistencia_pb2.AsistenciaItemRequest(id_matricula=102, estado="AUSENTE", justificacion="Faltó")
            ]
        )

        response = self.servicer.RegistrarAsistenciaGrupal(request, context)

        self.assertTrue(response.success)
        self.assertEqual(len(response.asistencias), 2)
        
        # Validar DB
        self.assertEqual(Asistencia.objects.count(), 2)
        
        # Validar Resumen
        res_101 = ResumenAsistencia.objects.get(id_matricula=101)
        self.assertEqual(res_101.total_presentes, 1)
        self.assertEqual(res_101.total_ausentes, 0)
        
        res_102 = ResumenAsistencia.objects.get(id_matricula=102)
        self.assertEqual(res_102.total_ausentes, 1)

    @patch('docentes.grpc_services.asistencia_service.validate_teacher_assignment')
    def test_asignacion_ajena(self, mock_validate_assignment):
        mock_validate_assignment.return_value = {"is_valid": False}

        context = DummyContext((
            ('docente_id', '10'),
            ('internal_token', 'dev-token-123')
        ))

        request = asistencia_pb2.RegistrarAsistenciaGrupalRequest(
            id_asignacion=50,
            id_periodo=self.periodo.id_periodo,
            fecha="2026-07-15",
            asistencias=[]
        )

        with self.assertRaises(grpc.RpcError):
            self.servicer.RegistrarAsistenciaGrupal(request, context)
            
        self.assertEqual(context._abort_code, grpc.StatusCode.PERMISSION_DENIED)

    @patch('docentes.grpc_services.asistencia_service.validate_teacher_assignment')
    @patch('docentes.grpc_services.asistencia_service.get_students_by_assignment')
    def test_estudiante_no_matriculado(self, mock_get_students, mock_validate_assignment):
        mock_validate_assignment.return_value = {"is_valid": True}
        # Solo estudiante 101 es válido
        mock_get_students.return_value = [
            {"id_matricula": 101}
        ]

        context = DummyContext((
            ('docente_id', '10'),
            ('internal_token', 'dev-token-123')
        ))

        request = asistencia_pb2.RegistrarAsistenciaGrupalRequest(
            id_asignacion=50,
            id_periodo=self.periodo.id_periodo,
            fecha="2026-07-15",
            asistencias=[
                asistencia_pb2.AsistenciaItemRequest(id_matricula=102, estado="PRESENTE", justificacion="")
            ]
        )

        with self.assertRaises(grpc.RpcError):
            self.servicer.RegistrarAsistenciaGrupal(request, context)
            
        self.assertEqual(context._abort_code, grpc.StatusCode.INVALID_ARGUMENT)

    @patch('docentes.grpc_services.asistencia_service.validate_teacher_assignment')
    @patch('docentes.grpc_services.asistencia_service.get_students_by_assignment')
    def test_registro_duplicado(self, mock_get_students, mock_validate_assignment):
        mock_validate_assignment.return_value = {"is_valid": True}
        mock_get_students.return_value = [
            {"id_matricula": 101}
        ]
        
        Asistencia.objects.create(
            id_matricula=101,
            id_asignacion=50,
            id_periodo=self.periodo,
            fecha="2026-07-15",
            estado="PRESENTE",
            registrado_por=10
        )

        context = DummyContext((
            ('docente_id', '10'),
            ('internal_token', 'dev-token-123')
        ))

        request = asistencia_pb2.RegistrarAsistenciaGrupalRequest(
            id_asignacion=50,
            id_periodo=self.periodo.id_periodo,
            fecha="2026-07-15",
            asistencias=[
                asistencia_pb2.AsistenciaItemRequest(id_matricula=101, estado="PRESENTE", justificacion="")
            ]
        )

        with self.assertRaises(grpc.RpcError):
            self.servicer.RegistrarAsistenciaGrupal(request, context)
            
        self.assertEqual(context._abort_code, grpc.StatusCode.ALREADY_EXISTS)

    @patch('docentes.grpc_services.asistencia_service.validate_teacher_assignment')
    def test_actualizacion_estado(self, mock_validate_assignment):
        mock_validate_assignment.return_value = {"is_valid": True}
        
        asistencia = Asistencia.objects.create(
            id_matricula=101,
            id_asignacion=50,
            id_periodo=self.periodo,
            fecha="2026-07-15",
            estado="PRESENTE",
            registrado_por=10
        )
        
        # Crear un resumen inicial
        ResumenAsistencia.objects.create(
            id_matricula=101,
            id_asignacion=50,
            id_periodo=self.periodo,
            total_presentes=1
        )

        context = DummyContext((
            ('docente_id', '10'),
            ('internal_token', 'dev-token-123')
        ))

        request = asistencia_pb2.ActualizarAsistenciaRequest(
            id_asistencia=asistencia.id_asistencia,
            estado="ATRASO",
            justificacion="Llegó tarde"
        )

        response = self.servicer.ActualizarAsistencia(request, context)
        self.assertTrue(response.success)
        
        asistencia.refresh_from_db()
        self.assertEqual(asistencia.estado, "ATRASO")
        
        # Validar recálculo
        res = ResumenAsistencia.objects.get(id_matricula=101)
        self.assertEqual(res.total_presentes, 0)
        self.assertEqual(res.total_atrasos, 1)

    def test_token_invalido(self):
        context = DummyContext((
            ('docente_id', '10'),
            ('internal_token', 'bad-token')
        ))

        request = asistencia_pb2.RegistrarAsistenciaGrupalRequest(
            id_asignacion=50,
            id_periodo=self.periodo.id_periodo,
            fecha="2026-07-15",
            asistencias=[]
        )

        with self.assertRaises(grpc.RpcError):
            self.servicer.RegistrarAsistenciaGrupal(request, context)
            
        self.assertEqual(context._abort_code, grpc.StatusCode.UNAUTHENTICATED)
