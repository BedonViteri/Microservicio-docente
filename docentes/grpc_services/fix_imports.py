import glob

files = glob.glob('*_pb2_grpc.py')
for file in files:
    with open(file, 'r') as f:
        content = f.read()
    
    content = content.replace('import contexto_docente_pb2 as', 'from . import contexto_docente_pb2 as')
    content = content.replace('import docente_pb2 as', 'from . import docente_pb2 as')
    content = content.replace('import principal_pb2 as', 'from . import principal_pb2 as')
    
    with open(file, 'w') as f:
        f.write(content)
