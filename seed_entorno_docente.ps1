$ErrorActionPreference = "Stop"

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host " INICIANDO SEED DEL ENTORNO DOCENTE" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

# 1. Verificar Docker
Write-Host "`n1. Verificando contenedores de Docker..." -ForegroundColor Yellow
$dockerStatus = docker ps --filter "name=sga-postgres" --format "{{.Status}}"
if (-not $dockerStatus) {
    Write-Host "Contenedor sga-postgres NO esta en ejecucion. Por favor inicia Docker: docker compose up -d" -ForegroundColor Red
    exit 1
}
Write-Host "Docker OK" -ForegroundColor Green

# 2 y 3 y 4. Verificar base sga y esquemas (se asume OK si Python se conecta, pero lo comprobamos rapido)
Write-Host "`n2. Ejecutando Seed del SGA Principal..." -ForegroundColor Yellow
.\venv\Scripts\python seed_sga_principal.py
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error en seed_sga_principal.py" -ForegroundColor Red
    exit 1
}

Write-Host "`n3. Ejecutando Seed del Microservicio Docente..." -ForegroundColor Yellow
.\venv\Scripts\python seed_sga_docente.py
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error en seed_sga_docente.py" -ForegroundColor Red
    exit 1
}

Write-Host "`n=========================================" -ForegroundColor Cyan
Write-Host " SEED COMPLETADO EXITOSAMENTE" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
