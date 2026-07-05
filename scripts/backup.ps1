# Copia de seguridad de la BD de Mercadeo (MySQL, contenedor Docker).
# Uso:   .\scripts\backup.ps1 [carpeta_destino]
# Tarea programada: Programador de tareas -> diaria -> powershell -File backup.ps1
#
# IMPORTANTE (seccion 12 del plan, requisito "Backup"): $Dest debe apuntar a una
# ubicacion DISTINTA al servidor principal (unidad de red, NAS, disco externo, etc.).
# El valor por defecto (.\backups) es solo para pruebas locales.

param(
  [string]$Dest = ".\backups",
  [string]$Container = "mercadeo-mysql",
  [string]$DbName = $(if ($env:DB_NAME) { $env:DB_NAME } else { "mercadeo" }),
  [string]$DbUser = $(if ($env:DB_USER) { $env:DB_USER } else { "mercadeo" }),
  [string]$DbPassword = $(if ($env:DB_PASSWORD) { $env:DB_PASSWORD } else { "" })
)

$ErrorActionPreference = "Stop"
$stamp = Get-Date -Format "yyyy-MM-dd_HHmm"
New-Item -ItemType Directory -Force -Path $Dest | Out-Null
$abs = (Resolve-Path $Dest).Path
$outFile = Join-Path $abs "mercadeo-$stamp.sql"

docker exec $Container mysqldump -u $DbUser "-p$DbPassword" --single-transaction --routines --triggers $DbName |
  Out-File -FilePath $outFile -Encoding utf8

Write-Output "Backup creado: $outFile"

# Conserva solo los ultimos 30 respaldos.
Get-ChildItem "$abs\mercadeo-*.sql" | Sort-Object LastWriteTime -Descending | Select-Object -Skip 30 | Remove-Item -Force
