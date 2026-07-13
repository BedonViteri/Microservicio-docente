$ProtoDir = Resolve-Path "..\sga-principal\src\main\proto" | Select-Object -ExpandProperty Path
$OutDir = Resolve-Path ".\docentes\grpc_services" | Select-Object -ExpandProperty Path

Write-Host "Generando archivos gRPC en Python desde $ProtoDir..."

if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
    Write-Host "Python no encontrado en el PATH."
    exit 1
}

python -m grpc_tools.protoc -I"$ProtoDir" --python_out="$OutDir" --grpc_python_out="$OutDir" "$ProtoDir\*.proto"

Write-Host "Generación completada."
