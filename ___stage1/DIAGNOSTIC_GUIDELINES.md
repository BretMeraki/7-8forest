# Diagnostic Guidelines for Claude

## Overview
This document provides guidelines for preventing false positives when Claude performs system diagnostics.

## Verification Steps Before Reporting Issues

### 1. **Function Existence Verification**
Before reporting a function as missing:
```bash
# Run the diagnostic verifier
npm run verify:diagnostics

# Or manually verify
node -e "
import { HTACore } from './___stage1/modules/hta-core.js';
const hta = new HTACore();
console.log('Function exists:', typeof hta.functionName === 'function');
"
```

### 2. **Test Suite Verification**
Always run tests before reporting system issues:
```bash
npm test
```

### 3. **File Structure Verification**
Check if files actually exist:
```bash
ls -la ___stage1/modules/hta-core.js
ls -la ___stage1/modules/enhanced-hta-core.js
```

### 4. **Import/Export Verification**
Verify imports work:
```bash
node -e "
import { HTACore } from './___stage1/modules/hta-core.js';
console.log('Import successful:', !!HTACore);
"
```

## Common False Positive Patterns

### 1. **Method Inheritance Issues**
**Problem**: Reporting method as missing when it's inherited from parent class
**Solution**: Check parent class for method definition

### 2. **Async Wrapper Confusion**
**Problem**: Reporting async wrapper as missing when sync method exists
**Solution**: Look for both `methodName` and `methodNameAsync` patterns

### 3. **Dynamic Method Creation**
**Problem**: Missing dynamically created methods
**Solution**: Check for method creation in constructors or initialization

### 4. **Module Resolution**
**Problem**: Import errors due to module resolution
**Solution**: Verify with actual Node.js import test

## Diagnostic Verification Checklist

Before reporting any issue, verify:

- [ ] Function/method actually exists using runtime verification
- [ ] File exists and is readable
- [ ] Tests pass (npm test)
- [ ] Dependencies are installed
- [ ] Import/export statements work
- [ ] No syntax errors in related files

## Automated Verification

Use the diagnostic verifier tool:
```bash
npm run verify:diagnostics
```

This will:
- Verify function existence
- Check file structure
- Run tests
- Validate dependencies
- Generate comprehensive report

## Example Verification Process

```javascript
// Instead of reporting "analyzeGoalComplexityAsync missing"
// First verify:
import { HTACore } from './___stage1/modules/hta-core.js';
const hta = new HTACore();
console.log('Method exists:', typeof hta.analyzeGoalComplexityAsync === 'function');

// Then check if it actually works:
const result = await hta.analyzeGoalComplexityAsync('test goal', 'test context');
console.log('Method works:', !!result);
```

## Reporting Guidelines

When reporting issues:
1. ✅ **DO**: Include verification steps taken
2. ✅ **DO**: Show actual error messages or failures
3. ✅ **DO**: Provide reproduction steps
4. ❌ **DON'T**: Report based on static analysis alone
5. ❌ **DON'T**: Assume missing without runtime verification

## Integration with Development Workflow

1. **Before major changes**: Run diagnostic verification
2. **After fixes**: Verify the fix actually works
3. **In CI/CD**: Include verification in pipeline
4. **For reports**: Always include verification results

## Tools Available

- `npm run verify:diagnostics` - Comprehensive verification
- `npm test` - Test suite verification  
- `npm run validate:hta` - HTA-specific validation
- Manual verification scripts in examples above

## Best Practices

1. **Trust but verify**: Always validate findings
2. **Test-driven diagnostics**: Use tests to confirm issues
3. **Multiple verification methods**: Don't rely on single check
4. **Document findings**: Include verification steps in reports
5. **Fail-safe approach**: When in doubt, verify with runtime test