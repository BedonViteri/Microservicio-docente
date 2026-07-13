from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone
from docentes.models import Actividad, Asistencia, ResumenAsistencia
import datetime

class Command(BaseCommand):
    help = 'Semilla de datos para demostración del módulo docente'

    def add_arguments(self, parser):
        parser.add_argument(
            '--id-asignacion',
            type=int,
            default=1,
            help='ID de la asignación generada en el SGA Principal (default: 1)'
        )
        parser.add_argument(
            '--id-estudiante1',
            type=int,
            default=1,
            help='ID de la matrícula del estudiante 1 (default: 1)'
        )
        parser.add_argument(
            '--id-estudiante2',
            type=int,
            default=2,
            help='ID de la matrícula del estudiante 2 (default: 2)'
        )

    def handle(self, *args, **options):
        self.stdout.write("====== INICIANDO SEED DE DATOS EN MICRO-DOCENTE ======")
        
        id_asignacion = options['id_asignacion']
        id_matricula1 = options['id_estudiante1']
        id_matricula2 = options['id_estudiante2']
        
        with transaction.atomic():
            from django.db import connection
            with connection.cursor() as cursor:
                cursor.execute("SELECT id_docente FROM sga_principal.asignaciones WHERE id_asignacion = %s", [id_asignacion])
                row = cursor.fetchone()
                id_docente = row[0] if row else 1

            # 1. Crear Actividades
            act1, created1 = Actividad.objects.get_or_create(
                id_asignacion=id_asignacion,
                nombre="Tarea de prueba",
                defaults={
                    'descripcion': 'Resolver los ejercicios de la página 10',
                    'tipo': 'TAREA',
                    'fecha_entrega': timezone.now().date() + datetime.timedelta(days=7),
                    'id_periodo_id': 1,
                    'ponderacion': 10.0
                }
            )
            if created1:
                self.stdout.write(self.style.SUCCESS(f"Actividad creada: {act1.nombre} (ID: {act1.id_actividad})"))
            else:
                self.stdout.write(f"Actividad ya existe: {act1.nombre} (ID: {act1.id_actividad})")

            act2, created2 = Actividad.objects.get_or_create(
                id_asignacion=id_asignacion,
                nombre="Examen parcial",
                defaults={
                    'descripcion': 'Examen del primer parcial',
                    'tipo': 'EXAMEN_TRIMESTRAL',
                    'fecha_entrega': timezone.now().date() + datetime.timedelta(days=14),
                    'id_periodo_id': 1,
                    'ponderacion': 20.0
                }
            )
            if created2:
                self.stdout.write(self.style.SUCCESS(f"Actividad creada: {act2.nombre} (ID: {act2.id_actividad})"))
            else:
                self.stdout.write(f"Actividad ya existe: {act2.nombre} (ID: {act2.id_actividad})")

            # 2. Crear Asistencia
            fecha_asistencia = timezone.now().date()
            
            asis1, cr1 = Asistencia.objects.get_or_create(
                id_asignacion=id_asignacion,
                id_matricula=id_matricula1,
                fecha=timezone.now().date(),
                defaults={
                    'estado': 'PRESENTE',
                    'id_periodo_id': 1,
                    'registrado_por': id_docente
                }
            )
            if cr1:
                self.stdout.write(f"Asistencia creada para estudiante 1: PRESENTE")
            
            asis2, cr2 = Asistencia.objects.get_or_create(
                id_asignacion=id_asignacion,
                id_matricula=id_matricula2,
                fecha=timezone.now().date(),
                defaults={
                    'estado': 'AUSENTE',
                    'id_periodo_id': 1,
                    'registrado_por': id_docente
                }
            )
            if cr2:
                self.stdout.write(self.style.SUCCESS(f"Asistencia AUSENTE para matrícula {id_matricula2} el {fecha_asistencia}"))

            # 3. Recalcular ResumenAsistencia (simulando el servicio)
            self.stdout.write("Recalculando resúmenes de asistencia...")
            
            for id_mat in [id_matricula1, id_matricula2]:
                asistencias = Asistencia.objects.filter(id_matricula=id_mat, id_asignacion=id_asignacion)
                total_presentes = asistencias.filter(estado='PRESENTE').count()
                total_ausentes = asistencias.filter(estado='AUSENTE').count()
                total_justificados = asistencias.filter(estado='JUSTIFICADO').count()
                total_atrasos = asistencias.filter(estado='ATRASO').count()
                
                res, res_cr = ResumenAsistencia.objects.update_or_create(
                    id_matricula=id_mat,
                    id_asignacion=id_asignacion,
                    id_periodo_id=1,
                    defaults={
                        'total_presentes': total_presentes,
                        'total_ausentes': total_ausentes,
                        'total_justificados': total_justificados,
                        'total_atrasos': total_atrasos
                    }
                )
                self.stdout.write(self.style.SUCCESS(f"Resumen actualizado matrícula {id_mat} -> % {res.porcentaje_asistencia}"))

        self.stdout.write(self.style.SUCCESS("====== DATOS DE PRUEBA EN MICRO-DOCENTE CREADOS ======"))
