# Script de Backup do Banco PostgreSQL
param(
  [string]$OutputFile = ""
)

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupDir = Join-Path $PSScriptRoot "..\backups"

if (!(Test-Path $backupDir)) {
  New-Item -ItemType Directory -Path $backupDir | Out-Null
}

if ([string]::IsNullOrWhiteSpace($OutputFile)) {
  $OutputFile = Join-Path $backupDir "worldbuilding_backup_$timestamp.dump"
}

Write-Host "Iniciando backup do PostgreSQL para: $OutputFile" -ForegroundColor Cyan

# Tentar via container Docker se estiver ativo
$containerRunning = docker ps --filter "name=worldbuilding_postgres" --format "{{.Names}}" 2>$null

if ($containerRunning -eq "worldbuilding_postgres") {
  Write-Host "Executando pg_dump via container Docker 'worldbuilding_postgres'..." -ForegroundColor Green
  docker exec -t worldbuilding_postgres pg_dump -U dev_user -d worldbuilding_db -F c -b -v -f /tmp/db_backup.dump
  docker cp worldbuilding_postgres:/tmp/db_backup.dump $OutputFile
  docker exec -t worldbuilding_postgres rm /tmp/db_backup.dump
} else {
  Write-Host "Executando pg_dump localmente..." -ForegroundColor Yellow
  $env:PGPASSWORD = "dev_password"
  pg_dump -h localhost -p 5432 -U dev_user -d worldbuilding_db -F c -b -v -f $OutputFile
}

if (Test-Path $OutputFile) {
  $size = (Get-Item $OutputFile).Length / 1KB
  Write-Host "Backup concluido com sucesso! ($([math]::Round($size, 2)) KB)" -ForegroundColor Green
} else {
  Write-Host "Erro ao gerar arquivo de backup." -ForegroundColor Red
}

