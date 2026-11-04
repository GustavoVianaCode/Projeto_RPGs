# Script de Restauração do Banco PostgreSQL
param(
  [string]$BackupFile = ""
)

$backupDir = Join-Path $PSScriptRoot "..\backups"

if ([string]::IsNullOrWhiteSpace($BackupFile)) {
  if (Test-Path $backupDir) {
    $latestBackup = Get-ChildItem -Path $backupDir -Filter "*.dump" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    if ($latestBackup) {
      $BackupFile = $latestBackup.FullName
      Write-Host "Nenhum arquivo especificado. Utilizando o backup mais recente: $BackupFile" -ForegroundColor Yellow
    }
  }
}

if ([string]::IsNullOrWhiteSpace($BackupFile) -or !(Test-Path $BackupFile)) {
  Write-Host "Arquivo de backup nao encontrado ou nao especificado: $BackupFile" -ForegroundColor Red
  Write-Host "Uso: powershell -ExecutionPolicy Bypass -File ./scripts/restore.ps1 -BackupFile ./backups/<arquivo>.dump" -ForegroundColor Yellow
  exit 1
}

Write-Host "Iniciando restauracao do PostgreSQL a partir de: $BackupFile" -ForegroundColor Cyan

$containerRunning = docker ps --filter "name=worldbuilding_postgres" --format "{{.Names}}" 2>$null

if ($containerRunning -eq "worldbuilding_postgres") {
  Write-Host "Restaurando via container Docker 'worldbuilding_postgres'..." -ForegroundColor Green
  docker cp $BackupFile worldbuilding_postgres:/tmp/restore_target.dump
  docker exec -t worldbuilding_postgres pg_restore -U dev_user -d worldbuilding_db --clean --if-exists -v /tmp/restore_target.dump
  docker exec -t worldbuilding_postgres rm /tmp/restore_target.dump
} else {
  Write-Host "Restaurando localmente via pg_restore..." -ForegroundColor Yellow
  $env:PGPASSWORD = "dev_password"
  pg_restore -h localhost -p 5432 -U dev_user -d worldbuilding_db --clean --if-exists -v $BackupFile
}

Write-Host "Restauracao concluida com sucesso!" -ForegroundColor Green

