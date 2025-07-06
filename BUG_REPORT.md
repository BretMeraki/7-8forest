# Forest MCP Server Bug Report

## Executive Summary

This report documents critical bugs discovered in the Forest MCP server system during testing and implementation. The issues primarily relate to data persistence validation, task selection method resolution, and onboarding flow failures.

## Bug #1: Data Persistence Validation Errors
**Status**: ✅ FIXED  
**Severity**: Critical  
**Component**: Data Persistence Module

### Description
The `data-persistence.js` module methods (`loadProjectData`, `saveProjectData`, `savePathData`, `loadPathData`) were receiving objects instead of strings for the `projectId` parameter, causing `path.join` errors.

### Root Cause
- Landing page generation in `core-server.js` was calling `coreIntelligence.generateLogicalDeductions` with a context object
- Methods lacked validation for the `projectId` argument type
- Objects being passed to `path.join()` instead of strings

### Symptoms
```
Error: Invalid path argument (object passed instead of string)
TypeError: path.join expects string arguments
```

### Fix Applied
- Added validation in all data persistence methods to check `projectId` is a non-empty string
- Modified landing page generation to call fallback directly without loading project-specific data
- Added warning logs when objects are received instead of strings

### Validation
- All validation tests now pass
- Live server no longer throws path argument errors

---

## Bug #2: HTA Tree Conversion Method Error
**Status**: ✅ FIXED  
**Severity**: Medium  
**Component**: Enhanced HTA Core

### Description
The `convertSchemaTreeToHTAFormat` method in `enhanced-hta-core.js` was failing when `strategicBranches` or its `strategic_branches` property was undefined before calling `.map()`.

### Root Cause
- Missing defensive checks for undefined `strategicBranches`
- No fallback for missing `strategic_branches` property

### Symptoms
```
TypeError: Cannot read property 'map' of undefined
```

### Fix Applied
- Added defensive checks to safely handle undefined `strategicBranches`
- Implemented fallback to empty array when `strategic_branches` is missing
- Added proper error handling and logging

---

## Bug #3: Task Selection Method Not Found
**Status**: ❌ UNRESOLVED  
**Severity**: High  
**Component**: Task Logic Module

### Description
The `get_next_task_forest` tool fails with `TaskSelector.selectOptimalTask is not a function` despite the method being clearly defined in the source code.

### Root Cause Analysis
- The `selectOptimalTask` method exists as a static method in `TaskSelector` class in `modules/task-logic/task-selector.js`
- Method signature: `static async selectOptimalTask(tasks, context, preferences = {})`
- The error suggests a module import or resolution problem

### File Locations Verified
- ✅ `modules/task-logic/task-selector.js` - Method exists and is properly defined
- ❌ `___stage1/modules/task-selector.js` - File does not exist (searched but not found)

### Symptoms
```
Error: TaskSelector.selectOptimalTask is not a function
```

### Investigation Status
- Source code inspection confirms method exists
- No obvious import/export issues found
- May be related to module resolution or class instantiation
- Requires runtime debugging to identify exact cause

### Recommended Actions
1. Add debug logging to trace module loading
2. Verify import statements in calling code
3. Check for naming conflicts or shadowing
4. Validate class instantiation vs static method calls

---

## Bug #4: Learning Journey Onboarding Flow Failure
**Status**: ❌ UNRESOLVED  
**Severity**: Medium  
**Component**: Onboarding System

### Description
The `start_learning_journey_forest` tool repeatedly fails to accept provided learning goals, continuously asking for a goal despite one being supplied.

### Symptoms
- Tool asks "What would you like to learn or achieve?" even when goal is provided
- Multiple attempts with different goal formats all fail
- System doesn't progress past initial goal collection

### Investigation Notes
- Correct tool to use is `create_project_forest` (confirmed working)
- `start_learning_journey_forest` may have parameter validation issues
- Gated onboarding tools were also attempted but not recognized

---

## Bug #5: PowerShell Command Execution Issues
**Status**: ❌ MINOR  
**Severity**: Low  
**Component**: Test Infrastructure

### Description
Test execution fails in PowerShell due to incorrect use of `&&` operator and missing test files.

### Symptoms
```
The term '&&' is not recognized as the name of a cmdlet
```

### Root Cause
- PowerShell doesn't support `&&` operator like bash
- Missing `run_tests.js` file in root directory

### Workaround
- Use `;` instead of `&&` in PowerShell
- Use individual commands instead of chained commands

---

## System Environment
- **Platform**: Windows (PowerShell)
- **Node.js Version**: [Not specified]
- **MCP Server**: Forest MCP Server (stdio transport)
- **Status**: Live server running and responsive

## Test Coverage
- ✅ Data persistence validation tests pass
- ✅ HTA tree conversion tests pass
- ❌ Task selection tests fail due to Bug #3
- ❌ Onboarding flow tests incomplete due to Bug #4

## Priority Actions Required
1. **High Priority**: Resolve TaskSelector method resolution issue (Bug #3)
2. **Medium Priority**: Fix learning journey onboarding flow (Bug #4)
3. **Low Priority**: Improve PowerShell compatibility (Bug #5)

## Files Modified
- `modules/data-persistence.js` - Added projectId validation
- `___stage1/core-server.js` - Fixed landing page generation
- `___stage1/modules/enhanced-hta-core.js` - Added defensive checks

## Testing Recommendations
1. Implement comprehensive integration tests for task selection
2. Add unit tests for onboarding flow validation
3. Create cross-platform test scripts for Windows/PowerShell support
4. Add runtime debugging for module resolution issues

---

**Report Generated**: [Current Date]  
**Last Updated**: Based on conversation history through task selection error investigation
