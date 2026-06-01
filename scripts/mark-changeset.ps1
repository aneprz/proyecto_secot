param(
  [Parameter(Position = 0)]
  [string]$ChangesetId
)

$ErrorActionPreference = 'Stop'

function Import-EnvFile {
  param([Parameter(Mandatory = $true)][string]$Path)
  Get-Content -LiteralPath $Path | ForEach-Object {
    $line = $_.Trim()
    if (-not $line -or $line.StartsWith('#')) { return }
    $idx = $line.IndexOf('=')
    if ($idx -lt 1) { return }
    $name = $line.Substring(0, $idx).Trim()
    $value = $line.Substring($idx + 1).Trim()
    if ($name) { Set-Item -LiteralPath "Env:$name" -Value $value }
  }
}

$projectRoot = Split-Path -Parent $PSScriptRoot
$envPath = Join-Path $projectRoot '.env'
$credPath = Join-Path $projectRoot 'credenciales.env'

if (Test-Path -LiteralPath $envPath) {
  Import-EnvFile -Path $envPath
} elseif (Test-Path -LiteralPath $credPath) {
  Import-EnvFile -Path $credPath
}

$schema = if ($env:SUPABASE_DB_SCHEMA) { $env:SUPABASE_DB_SCHEMA } else { 'public' }

function TryParse-PostgresConnectionString {
  param([Parameter(Mandatory = $true)][string]$Value)
  if ($Value -notmatch '^(postgres|postgresql)://') { return $null }
  try {
    $uri = [System.Uri]$Value
  } catch {
    return $null
  }
  if (-not $uri.Host) { return $null }
  $dbNameFromPath = $uri.AbsolutePath.Trim('/')
  if (-not $dbNameFromPath) { $dbNameFromPath = $null }
  $usernameFromUri = $null
  $passwordFromUri = $null
  if ($uri.UserInfo) {
    $parts = $uri.UserInfo.Split(':', 2)
    if ($parts.Count -ge 1 -and $parts[0]) { $usernameFromUri = [System.Uri]::UnescapeDataString($parts[0]) }
    if ($parts.Count -ge 2 -and $parts[1]) { $passwordFromUri = [System.Uri]::UnescapeDataString($parts[1]) }
  }
  if ($passwordFromUri -and $passwordFromUri.StartsWith('[') -and $passwordFromUri.EndsWith(']')) {
    $passwordFromUri = $passwordFromUri.Substring(1, $passwordFromUri.Length - 2)
  }
  $sslmodeFromQuery = $null
  $schemaFromQuery = $null
  if ($uri.Query) {
    $query = $uri.Query.TrimStart('?')
    foreach ($pair in ($query -split '&')) {
      if (-not $pair) { continue }
      $kv = $pair.Split('=', 2)
      $key = $kv[0]
      $val = if ($kv.Count -gt 1) { $kv[1] } else { '' }
      if ($key -ieq 'sslmode') { $sslmodeFromQuery = $val }
      if ($key -ieq 'currentSchema') { $schemaFromQuery = $val }
    }
  }
  return @{
    Host = $uri.Host
    Port = if ($uri.IsDefaultPort) { $null } else { [string]$uri.Port }
    DbName = $dbNameFromPath
    Username = $usernameFromUri
    Password = $passwordFromUri
    SslMode = $sslmodeFromQuery
    Schema = $schemaFromQuery
  }
}

function Get-SupabaseProjectRefFromUrl {
  if (-not $env:SUPABASE_URL) { return $null }
  try {
    $uri = [System.Uri]$env:SUPABASE_URL
    if (-not $uri.Host) { return $null }
    return ($uri.Host.Split('.')[0])
  } catch {
    return $null
  }
}

$projectRef = Get-SupabaseProjectRefFromUrl
$jdbcUrl = $env:SUPABASE_DB_JDBC_URL
if ($jdbcUrl -and $projectRef -and $jdbcUrl.Contains('<project-ref>')) {
  $jdbcUrl = $jdbcUrl.Replace('<project-ref>', $projectRef)
}

$dbUser = $env:SUPABASE_DB_USER
$dbPass = $env:SUPABASE_DB_PASSWORD

if (-not $jdbcUrl) {
  $dbHost = $env:SUPABASE_DB_HOST
  $parsed = $null
  if ($dbHost) {
    $parsed = TryParse-PostgresConnectionString -Value $dbHost
  }
  if ($parsed) {
    $dbHost = $parsed.Host
    if (-not $env:SUPABASE_DB_PORT -and $parsed.Port) { $env:SUPABASE_DB_PORT = $parsed.Port }
    if (-not $env:SUPABASE_DB_NAME -and $parsed.DbName) { $env:SUPABASE_DB_NAME = $parsed.DbName }
    if (-not $dbUser -and $parsed.Username) { $dbUser = $parsed.Username }
    if (-not $dbPass -and $parsed.Password) { $dbPass = $parsed.Password }
    if (-not $env:SUPABASE_DB_SSLMODE -and $parsed.SslMode) { $env:SUPABASE_DB_SSLMODE = $parsed.SslMode }
    if (-not $env:SUPABASE_DB_SCHEMA -and $parsed.Schema) { $env:SUPABASE_DB_SCHEMA = $parsed.Schema }
    $schema = if ($env:SUPABASE_DB_SCHEMA) { $env:SUPABASE_DB_SCHEMA } else { 'public' }
  }

  if ($dbHost -and $projectRef -and $dbHost.Contains('<project-ref>')) {
    $dbHost = $dbHost.Replace('<project-ref>', $projectRef)
  } elseif (-not $dbHost -and $projectRef) {
    $dbHost = "db.$projectRef.supabase.co"
  }
  $port = if ($env:SUPABASE_DB_PORT) { $env:SUPABASE_DB_PORT } else { '5432' }
  $dbName = if ($env:SUPABASE_DB_NAME) { $env:SUPABASE_DB_NAME } else { 'postgres' }
  $sslmode = if ($env:SUPABASE_DB_SSLMODE) { $env:SUPABASE_DB_SSLMODE } else { 'require' }

  if ($projectRef -and $dbHost -and $dbHost -like '*.pooler.supabase.com' -and $dbUser -and ($dbUser -notmatch '\.')) {
    $dbUser = "$dbUser.$projectRef"
  }

  if ($dbHost) {
    $jdbcUrl = "jdbc:postgresql://$dbHost`:$port/${dbName}?sslmode=$sslmode&currentSchema=$schema"
  }
}

if (-not $jdbcUrl -or -not $dbUser -or -not $dbPass) {
  Write-Host "Faltan variables para conectar a Supabase Postgres."
  exit 1
}

$docker = Get-Command docker -ErrorAction SilentlyContinue
if (-not $docker) {
  Write-Host "No encuentro 'docker'."
  exit 1
}

$changelogFile = 'db/changelog/db.changelog-master.yaml'
$volume = "$projectRoot`:/liquibase/project"

$dockerArgs = @(
  'run', '--rm',
  '-v', $volume,
  '-w', '/liquibase/project',
  '-e', "LIQUIBASE_COMMAND_CHANGELOG_FILE=$changelogFile",
  '-e', "LIQUIBASE_COMMAND_URL=$jdbcUrl",
  '-e', "LIQUIBASE_COMMAND_USERNAME=$dbUser",
  '-e', "LIQUIBASE_COMMAND_PASSWORD=$dbPass",
  '-e', "LIQUIBASE_COMMAND_DEFAULT_SCHEMA_NAME=$schema",
  'liquibase/liquibase:latest'
)

$driversDir = Join-Path $projectRoot 'db/drivers'
$postgresDriver = $null
if (Test-Path -LiteralPath $driversDir) {
  $postgresDriver = Get-ChildItem -LiteralPath $driversDir -Filter 'postgresql*.jar' -File -ErrorAction SilentlyContinue |
    Sort-Object -Property Name -Descending |
    Select-Object -First 1
}

if (-not $postgresDriver) {
  Write-Host "No encuentro el driver JDBC de PostgreSQL."
  exit 1
}

$classpath = "db/drivers/$($postgresDriver.Name)"

& docker @dockerArgs "--classpath=$classpath" 'mark-next-changeset-ran'
