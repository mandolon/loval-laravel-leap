# IFC Property Adapter Performance Analysis

## File Length Impact: ✅ NOT A CONCERN

**File size (3419 lines) does NOT affect runtime performance:**
- JavaScript files are parsed once at bundle time
- Only executed code affects runtime
- Modern bundlers (Vite/Webpack) tree-shake unused code
- File organization is separate from performance

## Actual Performance Concerns: ⚠️

### 1. **No Caching - CRITICAL ISSUE**

**Problem:**
- `extractStandardizedElementMetrics()` is called on **every object click**
- Makes multiple expensive async calls every time:
  - `ifcAPI.getProperties()` called 2+ times per extraction
  - `extractElementIdentity()` also calls `getProperties()` 2 times
  - Multiple `extractQuantityValue()` calls
  - Multiple `extractPropertyValueFromPsets()` calls

**Current Flow (on each click):**
```
User clicks object
  → extractStandardizedElementMetrics()
    → getProperties() [baseProps]
    → getProperties() [props with psets]
    → extractElementIdentity()
      → getProperties() [baseProps] (duplicate!)
      → getProperties() [props] (duplicate!)
      → getItemProperties() [type lookup]
    → extractStandardized[Type]Metrics()
      → extractQuantityValue() [multiple times]
      → extractPropertyValueFromPsets() [multiple times]
      → extractBaseQuantitiesFromPsets()
```

**Impact:**
- Clicking same object twice: **Full re-extraction** (wasteful)
- Rapid clicking: **Multiple concurrent extractions** (can cause race conditions)
- Large models: **Slow property extraction** (100-500ms per click)

### 2. **Redundant Property Calls**

**Issue:**
- `extractElementIdentity()` calls `getProperties()` twice
- `extractStandardizedElementMetrics()` also calls `getProperties()` twice
- **Result**: Same properties fetched 4 times per click!

**Example (Stair extraction):**
```typescript
// In extractStandardizedElementMetrics:
const baseProps = await ifcAPI.getProperties(modelID, expressID, false, false); // Call 1

// In extractElementIdentity (called from extractStandardizedStairMetrics):
const baseProps = await ifcAPI.getProperties(modelID, expressID, false, false); // Call 2 (duplicate!)
const props = await ifcAPI.getProperties(modelID, expressID, true, false);      // Call 3

// Back in extractStandardizedStairMetrics:
const props = await ifcAPI.getProperties(modelID, expressID, true, false);     // Call 4 (duplicate!)
```

### 3. **Sequential Async Calls**

**Issue:**
- Many async calls are made sequentially when they could be parallel
- Each `extractQuantityValue()` waits for previous one
- Property set extraction happens one at a time

**Example:**
```typescript
// Sequential (slow):
let numberOfRisers = await extractQuantityValue(...);
let numberOfTreads = await extractQuantityValue(...);
let riserHeight = await extractQuantityValue(...);

// Could be parallel (faster):
const [numberOfRisers, numberOfTreads, riserHeight] = await Promise.all([
  extractQuantityValue(...),
  extractQuantityValue(...),
  extractQuantityValue(...)
]);
```

## Performance Impact Projections

### Current Performance (Estimated)
- **First click on object**: 100-300ms (acceptable)
- **Clicking same object again**: 100-300ms (wasteful - should be instant)
- **Rapid clicking**: 200-500ms+ (queues up extractions)
- **Large models (1000+ elements)**: 300-800ms (slow)

### With Optimizations (Projected)
- **First click on object**: 100-300ms (same)
- **Clicking same object again**: <5ms (cached - instant)
- **Rapid clicking**: 100-300ms (deduplicated)
- **Large models**: 200-400ms (30-50% faster with parallel calls)

## Recommended Optimizations

### Priority 1: Critical (Implement Now)

#### 1. Add Result Caching
```typescript
// Simple in-memory cache
const metricsCache = new Map<string, StandardizedElementMetrics>();

export async function extractStandardizedElementMetrics(...) {
  const cacheKey = `${modelID}-${expressID}`;
  
  // Check cache first
  if (metricsCache.has(cacheKey)) {
    return metricsCache.get(cacheKey);
  }
  
  // Extract (existing code)
  const result = await extractMetrics(...);
  
  // Cache result
  metricsCache.set(cacheKey, result);
  
  return result;
}
```

**Impact**: Eliminates redundant extractions
**Effort**: Low (30 minutes)
**Risk**: Low (can add cache invalidation if needed)

#### 2. Pass Properties to Extractors
```typescript
// Instead of each extractor calling getProperties() again:
export async function extractStandardizedElementMetrics(...) {
  const baseProps = await ifcAPI.getProperties(modelID, expressID, false, false);
  const props = await ifcAPI.getProperties(modelID, expressID, true, false);
  
  const identity = await extractElementIdentity(ifcAPI, ifcManager, modelID, expressID, ifcClass, baseProps, props);
  
  // Pass props to extractors to avoid re-fetching
  switch (elementCategory) {
    case 'stair':
      return await extractStandardizedStairMetrics(ifcAPI, ifcManager, modelID, expressID, props);
  }
}
```

**Impact**: Reduces property calls by 50%
**Effort**: Medium (2-3 hours - need to update all extractors)
**Risk**: Medium (requires refactoring)

### Priority 2: High Impact (Implement Soon)

#### 3. Parallelize Async Calls
```typescript
// Instead of sequential:
let numberOfRisers = await extractQuantityValue(...);
let numberOfTreads = await extractQuantityValue(...);

// Use Promise.all:
const [numberOfRisers, numberOfTreads] = await Promise.all([
  extractQuantityValue(ifcManager, modelID, props, 'NumberOfRisers', 'Qto_StairFlightBaseQuantities'),
  extractQuantityValue(ifcManager, modelID, props, 'NumberOfTreads', 'Qto_StairFlightBaseQuantities')
]);
```

**Impact**: 30-50% faster extraction
**Effort**: Medium (1-2 hours per extractor)
**Risk**: Low

#### 4. Debounce Rapid Clicks
```typescript
// In useInspectMode.ts
const lastClickRef = useRef<{ expressID: number; timestamp: number } | null>(null);

const handleClick = async (event: MouseEvent) => {
  // Debounce rapid clicks on same object
  if (lastClickRef.current?.expressID === result.id && 
      Date.now() - lastClickRef.current.timestamp < 100) {
    return; // Skip if clicked same object within 100ms
  }
  
  lastClickRef.current = { expressID: result.id, timestamp: Date.now() };
  // ... existing extraction code
};
```

**Impact**: Prevents redundant extractions from rapid clicking
**Effort**: Low (15 minutes)
**Risk**: Low

### Priority 3: Nice to Have (Future)

#### 5. Property Caching at IFC Level
- Cache `getProperties()` results in ifcManager wrapper
- More complex but could help across entire app

#### 6. Lazy Loading
- Only extract properties when properties panel is visible
- Extract basic info first, detailed metrics on demand

## Implementation Strategy

### Phase 1: Quick Wins (This Week)
1. ✅ Add result caching (30 min)
2. ✅ Add click debouncing (15 min)
3. ✅ Add performance logging (15 min)

**Expected Result**: 2-3x faster for repeated clicks

### Phase 2: Refactoring (Next Week)
1. Pass properties to extractors (2-3 hours)
2. Parallelize async calls (2-3 hours)
3. Testing

**Expected Result**: 30-50% faster overall

## Testing Recommendations

### Performance Benchmarks
- Measure extraction time for different element types
- Test with same object clicked multiple times
- Test rapid clicking scenario
- Test with large models (1000+ elements)

### Metrics to Track
- Time to extract metrics (ms)
- Number of `getProperties()` calls
- Cache hit rate
- Memory usage (cache size)

## Migration Considerations

### If We Don't Optimize Now
- **Short term**: Performance acceptable for small models
- **Medium term**: Users notice lag with large models or rapid clicking
- **Long term**: Becomes bottleneck as models grow

### If We Optimize Now
- **Short term**: Better UX, faster response
- **Medium term**: Scales well with larger models
- **Long term**: Foundation for advanced features

### Breaking Changes Risk
- **Low**: Caching is transparent to consumers
- **Compatibility**: All changes backward compatible
- **Testing**: Need to verify cache invalidation works correctly

## Code Quality Recommendations

1. **Add Performance Monitoring**
   ```typescript
   const startTime = performance.now();
   const result = await extractStandardizedElementMetrics(...);
   const duration = performance.now() - startTime;
   if (duration > 200) {
     logger.warn('Slow extraction:', duration, 'ms for', expressID);
   }
   ```

2. **Add Cache Statistics**
   ```typescript
   let cacheHits = 0;
   let cacheMisses = 0;
   // Log cache performance in dev mode
   ```

3. **Configurable Cache Size**
   ```typescript
   const MAX_CACHE_SIZE = 100; // Limit memory usage
   if (metricsCache.size > MAX_CACHE_SIZE) {
     // Remove oldest entries (LRU)
   }
   ```

## Conclusion

**File length is NOT a performance issue** - the lack of caching is.

**Recommendation**: Implement Phase 1 optimizations (caching + debouncing) immediately. These are low-risk, high-impact changes that will significantly improve performance for repeated clicks.

**Timeline**:
- Phase 1: 1 hour (this week)
- Phase 2: 4-6 hours (next week)

**Risk Assessment**: Low risk, high reward. Caching is a standard optimization pattern.

