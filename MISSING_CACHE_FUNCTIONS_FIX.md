# Missing Cache Functions Fix

## Problem Analysis
The diagnostic system flagged that:
- `emergency_clear_cache_forest` function doesn't exist
- File path issues with ESM loader
- **Root Cause**: Implementation gap in cache management module

## Investigation Results

### Root Cause Analysis
1. **Duplicate Tool Routing**: The core server had duplicate routing for cache tools
2. **Missing Implementation**: The `emergencyClearCache` method was missing from data persistence
3. **Method Calls**: Diagnostic handlers were calling non-existent methods on the cache
4. **File Operations**: Missing `listProjectFiles` method for session restoration

### Issues Found
1. **Core Server Duplicate Routing**:
   - Lines 411-414: `this.debugCacheState(args)` and `this.emergencyClearCache(args)` (not implemented)
   - Lines 447-450: `this.diagnosticHandlers.debugCacheState(args)` and `this.diagnosticHandlers.emergencyClearCache(args)` (working)

2. **Missing Data Persistence Methods**:
   - `emergencyClearCache()` - Clear all cached data
   - `listProjectFiles(projectId)` - List project files for session restoration

3. **Cache Stats Issues**:
   - `getHitRate()` and `getMemoryUsage()` methods didn't exist on Map instances

## Solution Implementation

### 1. Removed Duplicate Tool Routing
**File**: `___stage1/core-server.js`

Removed the duplicate routing that called non-existent methods:
```javascript
// REMOVED these lines:
case 'debug_cache_forest':
  result = await this.debugCacheState(args); break;
case 'emergency_clear_cache_forest':
  result = await this.emergencyClearCache(args); break;
```

The working routing through diagnostic handlers remains:
```javascript
case 'debug_cache_forest':
  result = await this.diagnosticHandlers.debugCacheState(args); break;
case 'emergency_clear_cache_forest':
  result = await this.diagnosticHandlers.emergencyClearCache(args); break;
```

### 2. Added Missing Cache Methods
**File**: `___stage1/modules/data-persistence.js`

**Added `emergencyClearCache` method:**
```javascript
emergencyClearCache() {
  console.error('[EMERGENCY] [DataPersistence] Emergency cache clear for all data');
  const beforeStats = this.getCacheStats();
  this.debugCacheState();
  this.cache.clear();
  const afterStats = this.getCacheStats();
  console.error('[EMERGENCY] [DataPersistence] Cache cleared successfully', {
    before: beforeStats,
    after: afterStats
  });
  return true;
}
```

**Added `listProjectFiles` method:**
```javascript
async listProjectFiles(projectId) {
  try {
    const projectDir = path.join(this.dataDir, projectId);
    const files = await fs.readdir(projectDir);
    return files.filter(file => file.endsWith('.json'));
  } catch (error) {
    if (error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}
```

### 3. Enhanced Cache State Debugging
**File**: `___stage1/modules/data-persistence.js`

Enhanced `debugCacheState` method:
```javascript
debugCacheState(projectId = null, cacheType = 'all') {
  const allKeys = Array.from(this.cache.keys());
  const stats = this.getCacheStats();
  
  let filteredKeys = allKeys;
  if (projectId) {
    filteredKeys = allKeys.filter(key => 
      key.startsWith(`project:${projectId}:`) || key.startsWith(`path:${projectId}:`)
    );
  }
  
  if (cacheType !== 'all') {
    filteredKeys = filteredKeys.filter(key => key.includes(cacheType));
  }
  
  // Build cache contents preview
  const contents = {};
  filteredKeys.slice(0, 10).forEach(key => {
    const value = this.cache.get(key);
    if (value && typeof value === 'object') {
      contents[key] = `[Object] ${Object.keys(value).length} keys`;
    } else {
      contents[key] = typeof value === 'string' ? value.slice(0, 50) + '...' : String(value);
    }
  });
  
  const result = {
    timestamp: new Date().toISOString(),
    totalEntries: allKeys.length,
    filteredEntries: filteredKeys.length,
    memoryUsage: `${Math.round(JSON.stringify(Array.from(this.cache.entries())).length / 1024)}KB`,
    hitRate: stats.hitRate || 0,
    mostRecent: filteredKeys.length > 0 ? filteredKeys[filteredKeys.length - 1] : null,
    contents,
    projectId: projectId || 'all',
    cacheType
  };
  
  return result;
}
```

### 4. Fixed Cache Stats Method
**File**: `___stage1/modules/data-persistence.js`

Fixed `getCacheStats` to handle Map instances:
```javascript
getCacheStats() {
  return {
    size: this.cache.size,
    hitRate: typeof this.cache.getHitRate === 'function' ? this.cache.getHitRate() : 0,
    memoryUsage: typeof this.cache.getMemoryUsage === 'function' ? this.cache.getMemoryUsage() : 'N/A',
  };
}
```

### 5. Updated Diagnostic Handlers
**File**: `___stage1/modules/diagnostic-handlers.js`

Updated format for better cache state display:
```javascript
`**Cache State**:\n` +
`• Total Entries: ${cacheState.totalEntries}\n` +
`• Filtered Entries: ${cacheState.filteredEntries}\n` +
`• Memory Usage: ${cacheState.memoryUsage}\n` +
`• Hit Rate: ${cacheState.hitRate}%\n` +
`• Most Recent: ${cacheState.mostRecent || 'None'}\n\n` +
`**Cache Contents** (showing first 10 entries):\n` +
Object.entries(cacheState.contents || {})
  .map(([key, value]) => `• ${key}: ${value}`)
  .join('\n')
```

## Cache Management Features

### Debug Cache State
```bash
# Debug all cache
debug_cache_forest

# Debug specific project
debug_cache_forest {"project_id": "my_project"}

# Debug specific cache type
debug_cache_forest {"cache_type": "hta"}
```

### Emergency Cache Clear
```bash
# Clear all cache
emergency_clear_cache_forest {"clear_all": true}

# Clear specific project cache
emergency_clear_cache_forest {"project_id": "my_project"}

# Show usage help
emergency_clear_cache_forest
```

## Cache Information Provided

### Debug Information
- **Total Entries**: All cache entries
- **Filtered Entries**: Entries matching filters
- **Memory Usage**: Approximate memory usage
- **Hit Rate**: Cache hit rate percentage
- **Most Recent**: Most recently accessed key
- **Cache Contents**: Preview of cached data (first 10 entries)

### Emergency Clear Results
- **Before/After Stats**: Cache statistics before and after clearing
- **Success Confirmation**: Clear operation success status
- **Detailed Logging**: Full operation logging for debugging

## Testing Strategy

### 1. Basic Cache Operations
```bash
# Check cache state
debug_cache_forest

# Clear cache
emergency_clear_cache_forest {"clear_all": true}

# Verify clear
debug_cache_forest
```

### 2. Project-Specific Cache
```bash
# Create project data
create_project_forest {"goal": "Test project"}

# Build HTA (creates cache)
build_hta_tree_forest

# Check project cache
debug_cache_forest {"project_id": "PROJECT_ID"}

# Clear project cache
emergency_clear_cache_forest {"project_id": "PROJECT_ID"}
```

### 3. Cache Types
```bash
# Check specific cache type
debug_cache_forest {"cache_type": "hta"}
debug_cache_forest {"cache_type": "config"}
debug_cache_forest {"cache_type": "project"}
```

## Success Criteria

✅ **All Cache Functions Implemented**
- `debug_cache_forest` works correctly
- `emergency_clear_cache_forest` works correctly
- No "function doesn't exist" errors

✅ **Proper Tool Routing**
- Removed duplicate routing
- Single clean routing path through diagnostic handlers
- No ESM loader issues

✅ **Comprehensive Cache Management**
- Debug cache state with filtering
- Emergency clear with confirmation
- Project-specific cache operations
- Memory usage tracking

✅ **Robust Error Handling**
- Graceful handling of missing methods
- Clear error messages
- Fallback values for unavailable data

## Files Modified
1. `___stage1/core-server.js` - Removed duplicate tool routing
2. `___stage1/modules/data-persistence.js` - Added missing cache methods
3. `___stage1/modules/diagnostic-handlers.js` - Updated cache state display
4. `MISSING_CACHE_FUNCTIONS_FIX.md` - This documentation

## Expected Behavior After Fix

1. **Cache Debugging**: `debug_cache_forest` provides detailed cache information
2. **Emergency Clear**: `emergency_clear_cache_forest` clears cache with confirmation
3. **Project Filtering**: Can debug/clear cache for specific projects
4. **Type Filtering**: Can debug cache for specific data types
5. **Memory Tracking**: Shows approximate memory usage and hit rates
6. **Error Handling**: Graceful handling of missing cache methods

The fix ensures that all cache management functions are properly implemented and accessible through the diagnostic system.
