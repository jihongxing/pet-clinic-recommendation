param(
  [Parameter(Mandatory = $true)]
  [string]$BackupFile,
  [string]$ComposeBinary = "docker"
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$envFile = Join-Path $repoRoot ".env.staging"
$composeFile = Join-Path $repoRoot "docker-compose.staging.yml"
$resolvedBackupFile = Resolve-Path $BackupFile
$backupName = Split-Path $resolvedBackupFile -Leaf
$containerBackupPath = "/tmp/$backupName"
$restoreCommand = "pg_restore -U `"$POSTGRES_USER`" -d `"$POSTGRES_DB`" --clean --if-exists --no-owner --no-privileges `"$containerBackupPath`""

if (-not (Test-Path $envFile)) {
  throw "缺少 $envFile，请先复制 .env.staging.example"
}

if (-not (Test-Path $resolvedBackupFile)) {
  throw "备份文件不存在：$BackupFile"
}

& $ComposeBinary compose --env-file $envFile -f $composeFile cp $resolvedBackupFile "postgres:$containerBackupPath"

if ($LASTEXITCODE -ne 0) {
  throw "备份文件上传到 postgres 容器失败"
}

& $ComposeBinary compose --env-file $envFile -f $composeFile exec -T postgres sh -lc $restoreCommand

if ($LASTEXITCODE -ne 0) {
  throw "pg_restore 执行失败"
}

& $ComposeBinary compose --env-file $envFile -f $composeFile exec -T postgres sh -lc "rm -f `"$containerBackupPath`""

Write-Output "恢复完成：$resolvedBackupFile"
