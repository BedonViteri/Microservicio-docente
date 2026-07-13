import grpc
from concurrent import futures
import time
from django.core.management.base import BaseCommand
import sys
import os
import django

from docentes.grpc_services import docente_pb2_grpc
from docentes.grpc_services.server import DocenteServiceServicer

class Command(BaseCommand):
    help = 'Starts the gRPC server'

    def handle(self, *args, **options):
        # We need to make sure django is set up if it's not already
        if not django.conf.settings.configured:
            os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'micro_docente.settings')
            django.setup()

        port = '9091'
        server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
        
        # Register the servicer
        docente_pb2_grpc.add_DocenteServiceServicer_to_server(DocenteServiceServicer(), server)
        
        server.add_insecure_port(f'[::]:{port}')
        server.start()
        self.stdout.write(self.style.SUCCESS(f'Servidor gRPC iniciado en el puerto {port}'))
        
        try:
            while True:
                time.sleep(86400)
        except KeyboardInterrupt:
            server.stop(0)
