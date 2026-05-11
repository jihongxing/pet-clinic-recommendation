param(
  [string]$OutputDir = "backups/staging",
  [string]$ComposeBinary = "docker"
)

$ErrorActionPreference = "Stop"

function Get-EnvValue {
  param(
    [string]$FilePath,
    [string]$Key
  )

  $line = Get-Content $FilePath |
    Where-Object { $_ -match "^\s*$Key=" } |
    Select-Object -First 1

  if (-not $line) {
    throw "未在 $FilePath 中找到 $Key"
  }

  return ($line -split "=", 2)[1].Trim()
}

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$envFile = Join-Path $repoRoot ".env.staging"
$composeFile = Join-Path $repoRoot "docker-compose.staging.yml"

if (-not (Test-Path $envFile)) {
  throw "缺少 $envFile，请先复制 .env.staging.example"
}

$dbName = Get-EnvValue -FilePath $envFile -Key "DB_DATABASE"
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$localOutputDir = Join-Path $repoRoot $OutputDir
$dumpFileName = "$dbName-$timestamp.dump"
$containerDumpPath = "/tmp/$dumpFileName"
$localDumpPath = Join-Path $localOutputDir $dumpFileName
$latestDumpPath = Join-Path $localOutputDir "$dbName-latest.dump"
$dumpCommand = "pg_dump -U `"$POSTGRES_USER`" -d `"$POSTGRES_DB`" -Fc -f `"$containerDumpPath`""

New-Item -ItemType Directory -Force -Path $localOutputDir | Out-Null

& $ComposeBinary compose --env-file $envFile -f $composeFile exec -T postgres sh -lc $dumpCommand

if ($LASTEXITCODE -ne 0) {
  throw "pg_dump 执行失败"
}

& $ComposeBinary compose --env-file $envFile -f $composeFile cp "postgres:$containerDumpPath" $localDumpPath

if ($LASTEXITCODE -ne 0) {
  throw "备份文件拷贝失败"
}

Copy-Item -Force $localDumpPath $latestDumpPath
& $ComposeBinary compose --env-file $envFile -f $composeFile exec -T postgres sh -lc "rm -f `"$containerDumpPath`""

Write-Output "备份完成：$localDumpPath"
Write-Output "最新快照：$latestDumpPath"
