function Write-Phase31ExecutionEvidence {
  $Head = ''
  if ($null -ne $Git) { $Head = [string](@(& $Git.Source -C $Root rev-parse HEAD 2>$null))[0] }
  $Evidence = [ordered]@{
    schemaVersion='1.0'
    phase='Phase31'
    runId=$RunId
    generatedAtUtc=[DateTimeOffset]::UtcNow.ToString('o')
    repositoryHead=$Head
    phase30_5MergeCommit=[string]$Manifest.phase30_5MergeCommit
    phase30Bundle=$(if ($BundleResult) {
      [ordered]@{ manifestPath=$BundleResult.ManifestPath; manifestSha256=$BundleResult.ManifestSha256; bundleId=[string]$BundleResult.Manifest.bundleId }
    } else { $null })
    phase30_5Attestation=$(if ($AttestationResult) {
      [ordered]@{ path=$AttestationResult.Path; sha256=$AttestationResult.Sha256 }
    } else { $null })
    target=[ordered]@{
      environment='staging'
      projectRef=$TargetProjectRef
      connectionIdentityHash=$ConnectionIdentityHash
      databaseName=$DatabaseValue
    }
    operatorAttestation=[ordered]@{
      operatorName=$OperatorName
      maintenanceWindow=$MaintenanceWindow
      recoveryPlanReference=$RecoveryPlanReference
      rollbackOwner=$RollbackOwner
      executionApproved=$State.executionApproved
    }
    execution=[ordered]@{
      engine=[string]$Manifest.executionEngine
      supabaseCliVersion=$State.supabaseCliVersion
      expectedFiles=$ExpectedFiles
      dryRunObservedFiles=$DryRunObserved
      dryRunUnexpectedFiles=$DryRunUnexpected
      dryRunResult=$State.dryRunResult
      preExecutionStateResult=$State.preExecutionStateResult
      executionAttempted=$State.executionAttempted
      applyExitCode=$State.applyExitCode
      migrationHistoryResult=$State.migrationHistoryResult
      catalogReadinessResult=$State.catalogReadinessResult
      postValidationResult=$State.postValidationResult
      automaticRollback=$false
      productionDeployment='OUT_OF_SCOPE'
    }
    probe=[ordered]@{
      beforeHistory=$PreProbe.MIGRATION_HISTORY_COUNT
      beforeVersions=$PreProbe.MIGRATION_VERSIONS
      afterHistory=$PostProbe.MIGRATION_HISTORY_COUNT
      afterVersions=$PostProbe.MIGRATION_VERSIONS
    }
    catalog=$(if ($CatalogResult) {
      [ordered]@{
        result=$CatalogResult.Result
        observedScenarioCount=@($CatalogResult.Rows).Count
        missingIds=$CatalogResult.MissingIds
        unexpectedIds=$CatalogResult.UnexpectedIds
        duplicateIds=$CatalogResult.DuplicateIds
        conflictingIds=$CatalogResult.ConflictingIds
        logs=$CatalogResult.Logs
      }
    } else { $null })
    logs=[ordered]@{
      version=(Get-Phase31LogEvidence $Logs.version)
      init=(Get-Phase31LogEvidence $Logs.init)
      link=(Get-Phase31LogEvidence $Logs.link)
      beforeList=(Get-Phase31LogEvidence $Logs.beforeList)
      dryRun=(Get-Phase31LogEvidence $Logs.dryRun)
      beforeProbe=(Get-Phase31LogEvidence $Logs.beforeProbe)
      apply=(Get-Phase31LogEvidence $Logs.apply)
      afterList=(Get-Phase31LogEvidence $Logs.afterList)
      afterProbe=(Get-Phase31LogEvidence $Logs.afterProbe)
    }
    findings=@($Findings)
    controlledStagingMigrationResult=$State.controlledStagingMigrationResult
  }
  [IO.File]::WriteAllText(
    $EvidencePath,
    (($Evidence | ConvertTo-Json -Depth 12) + [Environment]::NewLine),
    [Text.UTF8Encoding]::new($false)
  )
}
