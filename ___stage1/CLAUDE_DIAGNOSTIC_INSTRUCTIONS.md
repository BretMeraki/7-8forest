# Claude Diagnostic Instructions

## 🚨 Important: ALWAYS Verify Before Reporting Issues

Before reporting any system issues, bugs, or missing functions, **ALWAYS** use the diagnostic tools to verify your findings.

## Available Diagnostic Tools

### 1. `verify_system_health_forest`
**Purpose**: Check overall system health before reporting any issues
**Usage**:
```json
{
  "include_tests": true
}
```
**When to use**: Before reporting any system-wide issues

### 2. `verify_function_exists_forest` 
**Purpose**: Verify if a specific function actually exists before reporting it as missing
**Usage**:
```json
{
  "function_name": "analyzeGoalComplexityAsync",
  "file_path": "___stage1/modules/hta-core.js"
}
```
**When to use**: Before reporting missing functions, methods, or exports

### 3. `run_diagnostic_verification_forest`
**Purpose**: Comprehensive verification of multiple reported issues
**Usage**:
```json
{
  "reported_issues": [
    {
      "type": "function",
      "function_name": "someFunction",
      "file_path": "path/to/file.js",
      "description": "Function reportedly missing"
    }
  ]
}
```
**When to use**: When you have multiple issues to verify

## Verification Workflow

1. **BEFORE** reporting any issue, run the appropriate diagnostic tool
2. **Check the verification results** - look for "FALSE POSITIVE" indicators
3. **Only report issues** that are verified as real problems
4. **Include verification results** in your diagnostic reports

## Example: Proper Diagnostic Process

❌ **Wrong approach**:
"The function `analyzeGoalComplexityAsync` is missing from hta-core.js and needs to be implemented."

✅ **Correct approach**:
1. Run: `verify_function_exists_forest` with function_name and file_path
2. Check result: "✅ LIKELY FALSE POSITIVE - Function exists and is accessible"
3. Report: "Initial analysis suggested the function was missing, but verification shows it exists and is working correctly."

## Integration with MCP

These tools are available as MCP tools when Claude is connected to the Forest MCP server. They will help prevent false positives and ensure accurate diagnostic reporting.

## Benefits

- **Prevents False Positives**: Avoid reporting non-existent issues
- **Saves Time**: No need to fix things that aren't broken
- **Builds Trust**: More accurate diagnostics increase reliability
- **Systematic Approach**: Consistent verification process

## Remember

🔍 **Verify first, report second**
📊 **Include verification results in reports**  
✅ **Trust the verification tools**
❌ **Don't assume issues exist without verification**