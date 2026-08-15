function Add-Phase31RequiredBlocker([bool] $Condition,[string] $Code,[string] $Message) {
  if (-not $Condition) {
    Add-Phase31Finding -Findings $Findings -Severity BLOCKER -Code $Code -Message $Message
  }
}

function Get-Phase31ProcessEnvironment([string[]] $Names) {
  $Values = @{}
  foreach ($Name in $Names) {
    $Value = [Environment]::GetEnvironmentVariable($Name,'Process')
    if ([string]::IsNullOrWhiteSpace($Value)) {
      Add-Phase31Finding -Findings $Findings -Severity ERROR -Code 'MIG31-CONNECTION-ENV' -Message "Missing process environment variable: $Name"
    }
    else {
      $Values[$Name] = $Value
    }
  }
  return $Values
}

function Invoke-Phase31ReadOnlySql([string] $SqlPath,[string] $LogPath,$Psql,[hashtable] $Connection) {
  $Names = @('PGHOST','PGPORT','PGDATABASE','PGUSER','PGPASSWORD','PGSSLMODE','PGOPTIONS')
  $Saved = @{}
  foreach ($Name in $Names) { $Saved[$Name] = [Environment]::GetEnvironmentVariable($Name,'Process') }
  try {
    [Environment]::SetEnvironmentVariable('PGHOST',[string]$Connection.BUILDMAP_PHASE31_PGHOST,'Process')
    [Environment]::SetEnvironmentVariable('PGPORT',[string]$Connection.BUILDMAP_PHASE31_PGPORT,'Process')
    [Environment]::SetEnvironmentVariable('PGDATABASE',[string]$Connection.BUILDMAP_PHASE31_PGDATABASE,'Process')
    [Environment]::SetEnvironmentVariable('PGUSER',[string]$Connection.BUILDMAP_PHASE31_PGUSER,'Process')
    [Environment]::SetEnvironmentVariable('PGPASSWORD',[string]$Connection.BUILDMAP_PHASE31_PGPASSWORD,'Process')
    [Environment]::SetEnvironmentVariable('PGSSLMODE',[string]$Connection.BUILDMAP_PHASE31_PGSSLMODE,'Process')
    [Environment]::SetEnvironmentVariable('PGOPTIONS','-c default_transaction_read_only=on -c statement_timeout=30000 -c lock_timeout=3000 -c idle_in_transaction_session_timeout=15000','Process')
    return Invoke-Phase31Native -CapturePath $LogPath -Command {
      & $Psql.Source -X --no-psqlrc --set ON_ERROR_STOP=1 --file $SqlPath
    }
  }
  finally {
    foreach ($Name in $Names) { [Environment]::SetEnvironmentVariable($Name,$Saved[$Name],'Process') }
  }
}

function Test-Phase31Probe([hashtable] $Probe,[ValidateSet('before','after')] [string] $Mode,[string] $DatabaseName) {
  $Before = @($Findings).Count
  foreach ($Key in @('TRANSACTION_READ_ONLY','DATABASE_NAME','MIGRATION_HISTORY_COUNT','MIGRATION_VERSIONS','PUBLIC_USER_OBJECT_COUNT')) {
    if (-not $Probe.ContainsKey($Key)) {
      Add-Phase31Finding -Findings $Findings -Severity ERROR -Code 'MIG31-PROBE-MISSING' -Message "$Mode probe key missing: $Key"
    }
  }
  if ($Probe.TRANSACTION_READ_ONLY -ne 'on') {
    Add-Phase31Finding -Findings $Findings -Severity BLOCKER -Code 'MIG31-PROBE-READONLY' -Message "$Mode probe was not read-only."
  }
  if ($Probe.DATABASE_NAME -ne $DatabaseName) {
    Add-Phase31Finding -Findings $Findings -Severity BLOCKER -Code 'MIG31-PROBE-DATABASE' -Message "$Mode database identity mismatch."
  }
  if ($Mode -eq 'before') {
    if (
      $Probe.PGCRYPTO_AVAILABLE -ne 'true' -or
      $Probe.MIGRATION_HISTORY_COUNT -ne '0' -or
      -not [string]::IsNullOrEmpty([string]$Probe.MIGRATION_VERSIONS) -or
      $Probe.PUBLIC_USER_OBJECT_COUNT -ne '0'
    ) {
      Add-Phase31Finding -Findings $Findings -Severity BLOCKER -Code 'MIG31-PRESTATE' -Message 'Target is no longer empty and compatible.'
    }
  }
  else {
    $ObjectCount = 0
    if (
      $Probe.MIGRATION_HISTORY_COUNT -ne '11' -or
      $Probe.MIGRATION_VERSIONS -ne $ExpectedVersionCsv -or
      -not [int]::TryParse([string]$Probe.PUBLIC_USER_OBJECT_COUNT,[ref]$ObjectCount) -or
      $ObjectCount -le 0
    ) {
      Add-Phase31Finding -Findings $Findings -Severity BLOCKER -Code 'MIG31-POSTSTATE' -Message 'Post-migration history/object contract failed.'
    }
  }
  return @($Findings).Count -eq $Before
}

function Invoke-Phase31CatalogValidation($Psql,[hashtable] $Connection,[string] $RunDirectory) {
  $ExpectedIds = @($Manifest.postValidation.expectedScenarioIds)
  $Rows = [System.Collections.Generic.List[object]]::new()
  $Logs = [System.Collections.Generic.List[object]]::new()
  $ExecutionFailed = $false
  foreach ($RelativePath in @($Manifest.postValidation.sqlPaths)) {
    $SqlPath = Join-Path $Root ([string]$RelativePath)
    $LogPath = Join-Path $RunDirectory (([IO.Path]::GetFileNameWithoutExtension($RelativePath)) + '.log')
    $Execution = Invoke-Phase31ReadOnlySql $SqlPath $LogPath $Psql $Connection
    $Logs.Add([pscustomobject]@{
      path=$LogPath
      sha256=(Get-Phase31NormalizedSha256 $LogPath)
      exitCode=$Execution.ExitCode
    })
    if ($Execution.ExitCode -ne 0) { $ExecutionFailed = $true }
    foreach ($Line in $Execution.Lines) {
      if ($Line -match '\b(?<id>MIG29-(?:CATALOG|INCR|HARD)-\d{3})\s+(?<signal>PASS|FAIL|PROMOTION_BLOCKER)\b') {
        $Rows.Add([pscustomobject]@{Id=$Matches.id.ToUpperInvariant();Signal=$Matches.signal.ToUpperInvariant()})
      }
    }
  }
  $Observed = @($Rows.Id | Sort-Object -Unique)
  $Missing = @($ExpectedIds | Where-Object { $Observed -notcontains $_ })
  $Unexpected = @($Observed | Where-Object { $ExpectedIds -notcontains $_ })
  $Duplicate = @($Rows | Group-Object Id | Where-Object Count -gt 1 | ForEach-Object Name)
  $Conflict = @($Rows | Group-Object Id | Where-Object { @($_.Group.Signal | Sort-Object -Unique).Count -gt 1 } | ForEach-Object Name)
  $Result = if (
    -not $ExecutionFailed -and
    $Rows.Count -eq 26 -and
    $Missing.Count -eq 0 -and
    $Unexpected.Count -eq 0 -and
    $Duplicate.Count -eq 0 -and
    $Conflict.Count -eq 0 -and
    @($Rows | Where-Object Signal -ne 'PASS').Count -eq 0
  ) { 'PASS' } else { 'FAIL' }
  return [pscustomobject]@{
    Result=$Result
    Rows=@($Rows)
    Logs=@($Logs)
    MissingIds=$Missing
    UnexpectedIds=$Unexpected
    DuplicateIds=$Duplicate
    ConflictingIds=$Conflict
  }
}

function Get-Phase31LogEvidence([string] $Path) {
  if (Test-Path $Path -PathType Leaf) {
    return [ordered]@{ path=$Path; sha256=(Get-Phase31NormalizedSha256 $Path) }
  }
  return $null
}
