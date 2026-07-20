function Test-PackPassLog {
  param(
    [Parameter(Mandatory = $true)][string] $Path,
    [Parameter(Mandatory = $true)] $Pack,
    [Parameter(Mandatory = $true)][AllowEmptyCollection()][object[]] $ScenarioContract,
    [Parameter(Mandatory = $true)][AllowEmptyCollection()][System.Collections.Generic.List[string]] $Failures
  )

  $PackId = [string]$Pack.packId
  if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
    Add-GateFailure -Failures $Failures -Message "${PackId} pass log not found: $Path"
    return
  }
  $Lines = @(Get-Content -LiteralPath $Path)

  $Overall = @($Lines | Where-Object { $_ -match '^OverallResult:\s*\S+\s*$' })
  if ($Overall.Count -ne 1) {
    Add-GateFailure -Failures $Failures -Message "${PackId} log requires exactly one OverallResult line; observed $($Overall.Count)."
  }
  elseif ($Overall[0] -notmatch '^OverallResult:\s*PASS\s*$') {
    Add-GateFailure -Failures $Failures -Message "${PackId} OverallResult is not PASS: $($Overall[0])"
  }

  $Remote = @($Lines | Where-Object { $_ -match '^Remote commands used:\s*.+$' })
  if ($Remote.Count -ne 1 -or $Remote[0] -notmatch '^Remote commands used:\s*none\s*$') {
    Add-GateFailure -Failures $Failures -Message "${PackId} log requires exactly one 'Remote commands used: none'."
  }

  foreach ($Flag in @($Pack.failureFlags)) {
    $Name = [string]$Flag
    $Rows = @($Lines | Where-Object { $_ -match ('^' + [regex]::Escape($Name) + ':\s*(True|False)\s*$') })
    if ($Rows.Count -ne 1) {
      Add-GateFailure -Failures $Failures -Message "${PackId} log requires exactly one $Name line; observed $($Rows.Count)."
    }
    elseif ($Rows[0] -match ':\s*True\s*$') {
      Add-GateFailure -Failures $Failures -Message "${PackId} blocker flag is true: $Name"
    }
  }
  foreach ($Flag in @($Pack.requiredPositiveFlags)) {
    $Name = [string]$Flag
    $Rows = @($Lines | Where-Object { $_ -match ('^' + [regex]::Escape($Name) + ':\s*(True|False)\s*$') })
    if ($Rows.Count -ne 1) {
      Add-GateFailure -Failures $Failures -Message "${PackId} log requires exactly one $Name line; observed $($Rows.Count)."
    }
    elseif ($Rows[0] -notmatch ':\s*True\s*$') {
      Add-GateFailure -Failures $Failures -Message "${PackId} required positive flag is not true: $Name"
    }
  }

  $ExpectedByName = @{}
  foreach ($ScenarioFile in $ScenarioContract) {
    $Name = Split-Path -Leaf ([string]$ScenarioFile.Path)
    if ($ExpectedByName.ContainsKey($Name)) {
      Add-GateFailure -Failures $Failures -Message "${PackId} contract has duplicate filename: $Name"
    }
    else { $ExpectedByName[$Name] = [int]$ScenarioFile.ExpectedCount }
  }

  $Pattern = '^FileResult:\s*(?<file>[^|]+?)\s*\|\s*ExitCode=(?<exit>[+-]?\d+)\s*\|\s*ExpectedScenarioCount=(?<expected>\d+)\s*\|\s*ObservedScenarioCount=(?<observed>\d+)\s*\|\s*MissingScenarioIds=(?<missing>[^|]+?)\s*\|\s*DuplicateScenarioIds=(?<duplicate>[^|]+?)\s*\|\s*ConflictingScenarioIds=(?<conflicting>[^|]+?)\s*\|\s*ParsedSignals=(?<signals>[^|]+?)\s*\|\s*FileOverallResult=(?<result>\S+)\s*$'
  $ObservedNames = New-Object System.Collections.Generic.List[string]
  $RawFileResultCount = 0
  $ParsedFileResultCount = 0
  $ExpectedTotal = 0
  $ObservedTotal = 0

  foreach ($Line in $Lines) {
    if ($Line -match '^FileResult:') { $RawFileResultCount += 1 }
    if ($Line -notmatch $Pattern) { continue }
    $ParsedFileResultCount += 1
    $Name = $Matches['file'].Trim()
    $ObservedNames.Add($Name)
    $DeclaredExpected = [int]$Matches['expected']
    $DeclaredObserved = [int]$Matches['observed']
    $ExpectedTotal += $DeclaredExpected
    $ObservedTotal += $DeclaredObserved

    if (-not $ExpectedByName.ContainsKey($Name)) {
      Add-GateFailure -Failures $Failures -Message "${PackId} log contains unexpected FileResult: $Name"
      continue
    }
    if ([int]$Matches['exit'] -ne 0) { Add-GateFailure -Failures $Failures -Message "${PackId} non-zero ExitCode: $Name" }
    if ($DeclaredExpected -ne $ExpectedByName[$Name]) { Add-GateFailure -Failures $Failures -Message "${PackId} expected count mismatch: $Name" }
    if ($DeclaredObserved -ne $DeclaredExpected) { Add-GateFailure -Failures $Failures -Message "${PackId} observed count mismatch: $Name" }
    if ($Matches['missing'].Trim() -ne 'none') { Add-GateFailure -Failures $Failures -Message "${PackId} MissingScenarioIds is not none: $Name" }
    if ($Matches['duplicate'].Trim() -ne 'none') { Add-GateFailure -Failures $Failures -Message "${PackId} DuplicateScenarioIds is not none: $Name" }
    if ($Matches['conflicting'].Trim() -ne 'none') { Add-GateFailure -Failures $Failures -Message "${PackId} ConflictingScenarioIds is not none: $Name" }
    $SignalText = $Matches['signals'].Trim()
    if ($SignalText -eq 'none') {
      Add-GateFailure -Failures $Failures -Message "${PackId} ParsedSignals is none: $Name"
    }
    else {
      $SignalNames = @(
        $SignalText -split ',' | ForEach-Object {
          (($_ -split '=', 2)[0]).Trim().ToUpperInvariant()
        }
      )
      $UnexpectedSignals = @($SignalNames | Where-Object { $_ -notin @('PASS', 'EXPECTED_DENY') } | Sort-Object -Unique)
      if ($UnexpectedSignals.Count -gt 0) {
        Add-GateFailure -Failures $Failures -Message "${PackId} ParsedSignals contains blocker or unknown signals in ${Name}: $($UnexpectedSignals -join ',')"
      }
    }
    if ($Matches['result'].Trim() -ne 'PASS') { Add-GateFailure -Failures $Failures -Message "${PackId} FileOverallResult is not PASS: $Name" }
  }

  if ($RawFileResultCount -ne $ParsedFileResultCount) {
    Add-GateFailure -Failures $Failures -Message "${PackId} log contains malformed FileResult lines: raw=$RawFileResultCount, parsed=$ParsedFileResultCount."
  }
  $UniqueNames = @($ObservedNames | Sort-Object -Unique)
  if ($ObservedNames.Count -ne [int]$Pack.expectedFileCount) {
    Add-GateFailure -Failures $Failures -Message "${PackId} FileResult count mismatch: expected $($Pack.expectedFileCount), observed $($ObservedNames.Count)."
  }
  if ($UniqueNames.Count -ne $ObservedNames.Count) {
    Add-GateFailure -Failures $Failures -Message "${PackId} log contains duplicate FileResult entries."
  }
  foreach ($Name in $ExpectedByName.Keys) {
    if ($UniqueNames -notcontains $Name) { Add-GateFailure -Failures $Failures -Message "${PackId} log is missing FileResult: $Name" }
  }
  if ($ExpectedTotal -ne [int]$Pack.expectedScenarioCount -or $ObservedTotal -ne [int]$Pack.expectedScenarioCount) {
    Add-GateFailure -Failures $Failures -Message "${PackId} total scenario mismatch: manifest=$($Pack.expectedScenarioCount), expected-total=$ExpectedTotal, observed-total=$ObservedTotal"
  }
}
