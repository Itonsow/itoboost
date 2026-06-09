# Changelog

## Version 1.1.0 - 2026-06-08

### Update Type

Minor update

### Context

This release improves the reliability and responsiveness of ItoBoost optimization actions after the OneDrive removal flow left Windows known folders pointing to OneDrive paths.

### Changes

- Restored the OneDrive removal action to move `Documents`, `Desktop`, and `Pictures` back to the local user profile before removing OneDrive.
- Added cleanup for the modern `Microsoft.OneDriveSync` package, OneDrive app data, and the residual user `OneDrive` folder.
- Added safety checks to avoid deleting the residual OneDrive folder while Windows known folders still point to it.
- Improved OneDrive status detection by checking known-folder redirects, classic executable remnants, app package state, and app data.
- Limited concurrent optimization status checks to reduce PowerShell and registry query spikes.
- Updated action flows so optimization, cleanup, and app install actions update only the affected card/item instead of refreshing entire views.
- Memoized optimization cards to reduce unnecessary React renders after user interactions.
- Adjusted the Windows release build configuration to allow local unsigned test releases without the blocked executable editing step.
- Updated OneDrive optimization copy to describe the safer restore, copy, and residual-folder cleanup behavior.

### Improvements

- More complete and safer OneDrive removal.
- Faster perceived response when applying or reverting tasks.
- Reduced UI churn after cleanup and app installation actions.
- Lower process spikes during optimization list refreshes.
- Reliable local release generation for testing.

### Impacted Areas

- `electron/services/windowsOptimizationService.ts`
- `src/hooks/useOptimizations.ts`
- `src/hooks/useCleanup.ts`
- `src/hooks/useInstallableApps.ts`
- `src/components/optimizations/OptimizationCard.tsx`
- `src/data/optimizations.ts`
- `package.json`
- `package-lock.json`

### Technical Notes

- Registry backup files generated during local Windows repair were intentionally not included in version control.
- The generated release artifacts are build outputs and should remain outside the commit unless the project explicitly decides to version binaries.
