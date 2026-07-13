import grpc
from concurrent import futures
import time
from django.core.management.base import BaseCommand
import sys
import os
import sys
import os

# Añadir el directorio grpc_services al path para que los imports generados por protoc funcionen
import django
current_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
grpc_services_dir = os.path.join(current_dir, 'grpc_services')
if grpc_services_dir not in sys.path:
    sys.path.append(grpc_services_dir)

from docentes.grpc_services import docente_pb2_grpc, actividades_pb2_grpc, asistencia_pb2_grpc
from docentes.grpc_services.server import DocenteServiceServicer
from docentes.grpc_services.actividades_service import ActividadServiceServicer
from docentes.grpc_services.asistencia_service import AsistenciaServiceServicer

class Command(BaseCommand):
    help = 'Starts the gRPC server'

    def handle(self, *args, **options):
        # We need to make sure django is set up if it's not already
        if not django.conf.settings.configured:
            os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'micro_docente.settings')
            django.setup()

        port = '9091'
        server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
        
        docente_pb2_grpc.add_DocenteServiceServicer_to_server(DocenteServiceServicer(), server)
        actividades_pb2_grpc.add_ActividadServiceServicer_to_server(ActividadServiceServicer(), server)
        asistencia_pb2_grpc.add_AsistenciaServiceServicer_to_server(AsistenciaServiceServicer(), server)
        
        server.add_insecure_port(f'[::]:{port}')
        server.start()
        self.stdout.write(self.style.SUCCESS(f'Servidor gRPC iniciado en el puerto {port}'))
        
        try:
            while True:
                time.sleep(86400)
        except KeyboardInterrupt:
            server.stop(0)
