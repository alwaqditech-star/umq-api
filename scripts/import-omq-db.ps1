# Import legacy omq_db.sql into local MySQL (XAMPP default).
param(
  [string]$SqlPath = "$env:USERPROFILE\Downloads\omq_db.sql",
  [string]$MysqlBin = "C:\xampp\mysql\bin\mysql.exe",
  [string]$User = "root",
  [string]$Password = ""
)

if (-not (Test-Path $MysqlBin)) {
  Write-Error "MySQL client not found at $MysqlBin. Set -MysqlBin to your mysql.exe path."
  exit 1
}

if (-not (Test-Path $SqlPath)) {
  Write-Error "SQL file not found: $SqlPath"
  exit 1
}

$args = @("-u", $User)
if ($Password) { $args += @("-p$Password") }

Write-Host "Importing $SqlPath into database omq_db ..."
& $MysqlBin @args -e "CREATE DATABASE IF NOT EXISTS omq_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
Get-Content -Raw -Encoding UTF8 $SqlPath | & $MysqlBin @args omq_db
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Write-Host "Done. Legacy data is in omq_db."
