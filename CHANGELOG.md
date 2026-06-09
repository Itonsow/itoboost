# Changelog

## Version 1.2.0 - 2026-06-08

### Update Type

Minor update

### Context

This release improves perceived speed and feedback while navigating ItoBoost sections and running longer actions, and corrects issues found while auditing the Windows optimization tasks.

### Changes

- Kept visited sections mounted so switching between tabs feels immediate after the first load.
- Added in-memory caching for system info, optimization status, cleanup data, and installable app data.
- Added an action progress popup with 0-100% feedback for optimizations, cleanup, and app installation actions.
- Reduced repeated motion work in navigation, optimization cards, and cleanup header rendering.
- Corrected the Game Bar optimization so it does not alter the separate Game Mode state.
- Aligned gaming app removal with its status check by including `Microsoft.GamingServices`.
- Improved network optimization apply/revert handling so `netsh` failures are reported instead of silently succeeding.

### Improvements

- Faster tab switching after a section has already loaded.
- Clearer visual confirmation while actions are actually running.
- Less UI churn during repeated interactions.
- More accurate optimization behavior and failure reporting.

### Impacted Areas

- `electron/services/windowsOptimizationService.ts`
- `src/App.tsx`
- `src/components/layout/Sidebar.tsx`
- `src/components/optimizations/OptimizationCard.tsx`
- `src/components/ui/ActionProgressPopup.tsx`
- `src/hooks/useActionProgress.ts`
- `src/hooks/useCleanup.ts`
- `src/hooks/useInstallableApps.ts`
- `src/hooks/useOptimizations.ts`
- `src/hooks/useSystemInfo.ts`
- `src/pages/Apps.tsx`
- `src/pages/Cleanup.tsx`
- `src/pages/Optimizations.tsx`
- `package.json`
- `package-lock.json`

### Technical Notes

- The progress popup reflects task-level completion and controlled estimated progress while Windows, PowerShell, or Winget commands are running, because those commands do not always expose granular native progress events.
- Generated release artifacts remain ignored and are not included in version control.

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
