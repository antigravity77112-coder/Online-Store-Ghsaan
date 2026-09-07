# Layer 1 pg_dump for Windows. READ-ONLY. Does not restore or wipe anything.
# Requires: PostgreSQL bin on PATH (pg_dump), DIRECT_URL in backend\.env

$ErrorActionPreference = 'Stop'
$backendRoot = Split-Path -Parent $PSScriptRoot
Set-Location $backendRoot

if (-not (Get-Command pg_dump -ErrorAction SilentlyContinue)) {
  Write-Error 'pg_dump not found on PATH. Install PostgreSQL client tools first.'
}

node .\scripts\pg-dump-backup.js
