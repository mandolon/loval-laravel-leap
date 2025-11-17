# Annotation Performance Analysis & Recommendations

## Current Implementation Analysis

### Performance Bottlenecks Identified

1. **Raycasting on Every Mouse Move (CRITICAL)**
   - **Location**: `useAnnotationInteraction.ts` line 195-235
   - **Issue**: Raycasting runs on every `mousemove` event (can fire 60+ times/second)
   - **Impact**: With 100+ annotations, this means:
     - Traversing all annotation groups on every mouse move
     - Building array of clickable objects
     - Casting ray against all objects
   - **Current Cost**: O(n) where n = number of annotations

2. **No Spatial Indexing**
   - All annotations are checked on every raycast
   - No octree, BVH, or spatial hash for fast lookups
   - No frustum culling (annotations outside view still checked)

3. **No Throttling/Debouncing**
   - Mouse move events fire at full rate
   - No requestAnimationFrame batching
   - State updates can cause unnecessary re-renders

4. **All Annotations Always Rendered**
   - No distance-based LOD
   - No visibility culling
   - CSS2DObject labels always active (even when far away)

5. **Memory Management**
   - Good: Geometry/material disposal on removal ✅
   - Good: Cleanup on unmount ✅
   - Issue: No object pooling for frequently created/destroyed annotations

## Performance Impact Projections

### Current Performance (Estimated)
- **10 annotations**: ~60 FPS (smooth)
- **50 annotations**: ~45-50 FPS (acceptable)
- **100 annotations**: ~30-35 FPS (noticeable lag)
- **200+ annotations**: <20 FPS (poor UX)

### With Optimizations (Projected)
- **10 annotations**: ~60 FPS (no change)
- **50 annotations**: ~60 FPS (maintained)
- **100 annotations**: ~55-60 FPS (smooth)
- **200+ annotations**: ~45-50 FPS (acceptable)

## Recommended Optimizations

### Priority 1: Critical (Implement Now)

#### 1. Throttle Raycasting
```typescript
// Add throttling to mousemove handler
const throttle = (func: Function, limit: number) => {
  let inThrottle: boolean;
  return function(this: any, ...args: any[]) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

// Use requestAnimationFrame for smoother updates
let rafId: number | null = null;
const handleMouseMove = (event: MouseEvent) => {
  if (rafId) return; // Skip if already queued
  rafId = requestAnimationFrame(() => {
    // ... existing raycast logic
    rafId = null;
  });
};
```

**Impact**: Reduces raycast calls by ~80% (from 60/sec to ~12/sec)
**Effort**: Low (30 minutes)
**Risk**: Low

#### 2. Early Exit for Empty Annotations
```typescript
// Already implemented - good! ✅
if (clickableObjects.length === 0) {
  // Early return
}
```

#### 3. Cache Clickable Objects List
```typescript
// Only rebuild when annotations change, not on every mousemove
const clickableObjectsRef = useRef<Mesh[]>([]);

useEffect(() => {
  const objects: Mesh[] = [];
  annotationGroupsRef.current.forEach((group) => {
    group.traverse((child: any) => {
      if (child.userData?.isAnnotationBoundingBox || 
          (child.type === 'Mesh' && child.userData?.annotationId)) {
        objects.push(child);
      }
    });
  });
  clickableObjectsRef.current = objects;
}, [annotations]); // Only rebuild when annotations change
```

**Impact**: Eliminates traversal on every mousemove
**Effort**: Low (20 minutes)
**Risk**: Low

### Priority 2: High Impact (Implement Soon)

#### 4. Spatial Indexing (BVH or Octree)
```typescript
import { Octree } from 'three/examples/jsm/math/Octree.js';

// Build spatial index when annotations change
const spatialIndexRef = useRef<Octree | null>(null);

useEffect(() => {
  const octree = new Octree();
  annotationGroupsRef.current.forEach((group) => {
    // Add bounding boxes to octree
    group.traverse((child: any) => {
      if (child.userData?.isAnnotationBoundingBox) {
        octree.add(child, child.geometry.boundingBox);
      }
    });
  });
  spatialIndexRef.current = octree;
}, [annotations]);

// Use for raycasting
const intersects = spatialIndexRef.current?.raycast(ray) || [];
```

**Impact**: Reduces raycast complexity from O(n) to O(log n)
**Effort**: Medium (2-3 hours)
**Risk**: Medium (requires testing)

#### 5. Frustum Culling
```typescript
// Only check annotations visible in viewport
const camera = context.getCamera();
const frustum = new THREE.Frustum();
frustum.setFromProjectionMatrix(
  new THREE.Matrix4().multiplyMatrices(
    camera.projectionMatrix,
    camera.matrixWorldInverse
  )
);

const visibleObjects = clickableObjects.filter(obj => {
  const box = new THREE.Box3().setFromObject(obj);
  return frustum.intersectsBox(box);
});
```

**Impact**: Reduces raycast objects by 50-70% (only visible ones)
**Effort**: Medium (1-2 hours)
**Risk**: Low

### Priority 3: Nice to Have (Future)

#### 6. Distance-Based LOD
- Hide text labels when far from camera
- Simplify sphere geometry at distance
- Use billboards for distant annotations

#### 7. Object Pooling
- Reuse geometry/materials for frequently created annotations
- Reduces GC pressure

#### 8. Web Workers for Heavy Calculations
- Move spatial index updates to worker
- Only for very large annotation counts (500+)

## Implementation Strategy

### Phase 1: Quick Wins (This Week)
1. ✅ Add throttling to raycasting (30 min)
2. ✅ Cache clickable objects list (20 min)
3. ✅ Add early exits (already done)

**Expected Result**: 2-3x performance improvement with 100+ annotations

### Phase 2: Spatial Optimization (Next Week)
1. Implement frustum culling (1-2 hours)
2. Add spatial indexing (2-3 hours)
3. Performance testing

**Expected Result**: 5-10x performance improvement with 200+ annotations

### Phase 3: Advanced (Future)
1. Distance-based LOD
2. Object pooling
3. Web workers (if needed)

## Testing Recommendations

### Performance Benchmarks
Create test cases with:
- 10 annotations (baseline)
- 50 annotations (moderate)
- 100 annotations (high)
- 200 annotations (stress test)
- 500 annotations (extreme)

### Metrics to Track
- FPS during mouse movement
- Raycast time (ms)
- Memory usage
- Frame time consistency

### Tools
- Chrome DevTools Performance Profiler
- React DevTools Profiler
- Three.js Stats.js for FPS monitoring

## Migration Considerations

### If We Don't Optimize Now
- **Short term (1-3 months)**: Performance degrades gradually as annotations accumulate
- **Medium term (3-6 months)**: Users notice lag with 50+ annotations
- **Long term (6+ months)**: Significant performance issues, user complaints

### If We Optimize Now
- **Short term**: Better performance, smoother UX
- **Medium term**: Scales well as annotations grow
- **Long term**: Foundation for advanced features (annotation clustering, etc.)

### Breaking Changes Risk
- **Low**: Optimizations are internal, API stays same
- **Compatibility**: All changes backward compatible
- **Testing**: Need to verify hover/click still works correctly

## Code Quality Recommendations

1. **Add Performance Monitoring**
   ```typescript
   if (process.env.NODE_ENV === 'development') {
     const start = performance.now();
     // ... raycast logic
     const duration = performance.now() - start;
     if (duration > 16) { // > 1 frame
       logger.warn('Slow raycast:', duration, 'ms');
     }
   }
   ```

2. **Add Configurable Limits**
   ```typescript
   const MAX_ANNOTATIONS_FOR_RAYCAST = 100;
   if (clickableObjects.length > MAX_ANNOTATIONS_FOR_RAYCAST) {
     // Use spatial index instead
   }
   ```

3. **Add Performance Warnings**
   ```typescript
   if (annotations.length > 200) {
     logger.warn('High annotation count may impact performance:', annotations.length);
   }
   ```

## Conclusion

**Recommendation**: Implement Phase 1 optimizations immediately (throttling + caching). These are low-risk, high-impact changes that will significantly improve performance with minimal effort.

**Timeline**:
- Phase 1: 1-2 hours (this week)
- Phase 2: 4-6 hours (next week)
- Phase 3: Future enhancement

**Risk Assessment**: Low risk, high reward. All optimizations are additive and don't change existing functionality.

