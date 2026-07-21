function New-ScenarioContractRow {
  param(
    [Parameter(Mandatory = $true)][string] $Path,
    [Parameter(Mandatory = $true)][string[]] $ExpectedIds,
    [Parameter(Mandatory = $true)][string] $SourceValidationMode
  )
  $Ids = @($ExpectedIds | ForEach-Object { ([string]$_).ToUpperInvariant() })
  return [pscustomobject]@{
    Path = Get-NormalizedRelativePath -Path $Path
    ExpectedCount = $Ids.Count
    ExpectedIds = $Ids
    SourceValidationMode = $SourceValidationMode
  }
}

function Get-Phase20ScenarioContract {
  param(
    [Parameter(Mandatory = $true)][string] $Root,
    [Parameter(Mandatory = $true)][AllowEmptyCollection()][System.Collections.Generic.List[string]] $Failures
  )
  $RunnerPath = Join-Path $Root 'scripts/manual-local-rls/run-phase20-p0-local.ps1'
  if (-not (Test-Path -LiteralPath $RunnerPath -PathType Leaf)) {
    Add-GateFailure -Failures $Failures -Message "Phase20 contract runner missing: $RunnerPath"
    return @()
  }
  $Text = Get-Content -Raw -LiteralPath $RunnerPath
  $Block = [regex]::Match(
    $Text,
    '(?s)\$ExpectedScenariosByFile\s*=\s*@\{(?<body>.*?)\r?\n\}',
    [System.Text.RegularExpressions.RegexOptions]::IgnoreCase
  )
  if (-not $Block.Success) {
    Add-GateFailure -Failures $Failures -Message 'Cannot parse Phase20 embedded scenario contract block.'
    return @()
  }
  $FileMatches = [regex]::Matches(
    $Block.Groups['body'].Value,
    '(?s)"(?<file>phase20_[^"]+\.sql)"\s*=\s*@\((?<ids>.*?)\r?\n\s*\)',
    [System.Text.RegularExpressions.RegexOptions]::IgnoreCase
  )
  $Rows = New-Object System.Collections.Generic.List[object]
  foreach ($FileMatch in $FileMatches) {
    $FileName = $FileMatch.Groups['file'].Value
    $IdMatches = [regex]::Matches($FileMatch.Groups['ids'].Value, '"(?<id>[^"]+)"')
    $Ids = @($IdMatches | ForEach-Object { $_.Groups['id'].Value })
    $RelativePath = "scripts/manual-local-rls/$FileName"
    $Mode = 'exact_source'
    if ($RelativePath -in @(
      'scripts/manual-local-rls/phase20_00_preflight.sql',
      'scripts/manual-local-rls/phase20_01_seed_p0_fixture.sql'
    )) { $Mode = 'contract_only' }
    $Rows.Add((New-ScenarioContractRow -Path $RelativePath -ExpectedIds $Ids -SourceValidationMode $Mode))
  }
  return $Rows.ToArray()
}

function Get-Phase25ScenarioContract {
  param(
    [Parameter(Mandatory = $true)][string] $Root,
    [Parameter(Mandatory = $true)][AllowEmptyCollection()][System.Collections.Generic.List[string]] $Failures
  )
  $ManifestPath = Join-Path $Root 'scripts/manual-local-link-sharing/phase26_link_sharing_regression_baseline.json'
  try { $Source = Get-Content -Raw -LiteralPath $ManifestPath | ConvertFrom-Json }
  catch {
    Add-GateFailure -Failures $Failures -Message "Cannot parse Phase26 source contract: $($_.Exception.Message)"
    return @()
  }
  $Rows = New-Object System.Collections.Generic.List[object]
  foreach ($ScenarioFile in @($Source.scenarioFiles)) {
    $Rows.Add((New-ScenarioContractRow `
      -Path ([string]$ScenarioFile.path) `
      -ExpectedIds @($ScenarioFile.expectedIds) `
      -SourceValidationMode 'exact_source'))
  }
  return $Rows.ToArray()
}

function Get-Phase27ScenarioContract {
  param(
    [Parameter(Mandatory = $true)][string] $Root,
    [Parameter(Mandatory = $true)][AllowEmptyCollection()][System.Collections.Generic.List[string]] $Failures
  )
  $ManifestPath = Join-Path $Root 'scripts/manual-local-rls-p1/phase27_p1_scenario_manifest.json'
  try { $Source = Get-Content -Raw -LiteralPath $ManifestPath | ConvertFrom-Json }
  catch {
    Add-GateFailure -Failures $Failures -Message "Cannot parse Phase27 source contract: $($_.Exception.Message)"
    return @()
  }
  $Rows = New-Object System.Collections.Generic.List[object]
  foreach ($ScenarioFile in @($Source.files)) {
    $Rows.Add((New-ScenarioContractRow `
      -Path ("scripts/manual-local-rls-p1/" + [string]$ScenarioFile.file) `
      -ExpectedIds @($ScenarioFile.expected_scenarios) `
      -SourceValidationMode 'exact_source'))
  }
  return $Rows.ToArray()
}

function Get-PackScenarioContract {
  param(
    [Parameter(Mandatory = $true)][string] $PackId,
    [Parameter(Mandatory = $true)][string] $Root,
    [Parameter(Mandatory = $true)][AllowEmptyCollection()][System.Collections.Generic.List[string]] $Failures
  )
  switch ($PackId) {
    'phase20-p0-rls' { return @(Get-Phase20ScenarioContract -Root $Root -Failures $Failures) }
    'phase25-link-sharing' { return @(Get-Phase25ScenarioContract -Root $Root -Failures $Failures) }
    'phase27-p1-rls' { return @(Get-Phase27ScenarioContract -Root $Root -Failures $Failures) }
    default {
      Add-GateFailure -Failures $Failures -Message "Unsupported pack contract source: $PackId"
      return @()
    }
  }
}
