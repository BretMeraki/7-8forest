# Strategic Framework Redundancy Cleanup

## Key Understanding
The HTA tree IS the strategic framework. Any separate "strategic framework" building is redundant.

## Changes Required

### 1. `gated-onboarding-flow.js`
- **Remove Stage 6**: The entire `buildStrategicFramework()` method (lines 473-537)
- **Update Stage 5**: Make HTA generation the final stage
- **Fix Comments**: Update line 455 comment to just say "HTA tree generated successfully! Onboarding complete!"
- **Remove Gate**: Remove `framework_built` gate tracking
- **Update Stage Count**: Change from "6-stage" to "5-stage" process

### 2. Update the Gated Flow to be 5 Stages:
1. Goal/Dream Capture (Gated)
2. Context Gathering (Gated)  
3. Dynamic Questionnaire (Gated)
4. Complexity Analysis (Gated)
5. HTA Tree Generation (Final)

### 3. Remove `build_framework_forest` Tool
- This tool is redundant since HTA tree generation IS the framework
- Remove from `mcp-core.js` tool definitions
- Remove from any tool lists

### 4. Update `continueOnboarding()` Method
- Remove the case for 'strategic_framework' stage
- Ensure HTA generation marks onboarding as complete

### 5. Update Documentation References
- Change "strategic framework" to "HTA tree" where appropriate
- Update stage counts from 6 to 5
- Clarify that HTA tree serves as the complete strategic learning framework

## Code Changes

### In `gated-onboarding-flow.js`:

1. **Line 445-455**: Update the return message:
```javascript
message: '🌳 HTA tree generated successfully! Onboarding complete!',
```

2. **Remove lines 473-537**: Entire `buildStrategicFramework()` method

3. **Line 66**: Remove `framework_built: false` from gates object

4. **Line 514**: Remove the line that sets `framework_built` gate

5. **Update `continueOnboarding()` to not handle 'strategic_framework' stage**

### In `mcp-core.js`:

1. **Remove `build_framework_forest` tool definition** (lines 578-594)

2. **Update tool count references** from 6-stage to 5-stage

### Result

After these changes:
- The gated onboarding flow will be cleaner and more accurate
- No redundant "strategic framework" step after HTA generation
- HTA tree is correctly understood as THE strategic framework
- Users complete onboarding after HTA tree generation

## Benefits

1. **Clarity**: No confusion about HTA tree vs strategic framework
2. **Efficiency**: One less redundant step in onboarding
3. **Accuracy**: Correctly represents that HTA tree IS the strategic framework
4. **Simplicity**: Cleaner codebase without redundant concepts
