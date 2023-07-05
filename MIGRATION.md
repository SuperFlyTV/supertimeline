# Migration instructions

## 8.x.x -> 9.x.x

### API change

- `Resolver.resolveTimeline()` and `Resolver.resolveAllStates()` have been combined into one: `resolveTimeline()`
- `Resolver.getState` have been renamed to `getResolvedState`

```typescript
// Before

// Resolve the timeline
const options: ResolveOptions = {
	time: 0,
}
const resolvedTimeline = Resolver.resolveTimeline(timeline, options)
const resolvedStates = Resolver.resolveAllStates(resolvedTimeline)
// Calculate the state at a certain time:
const state = Resolver.getState(resolvedStates, 15)

// After

// Resolve the timeline
const options: ResolveOptions = {
	time: 0,
}
const resolvedTimeline = resolveTimeline(timeline, options)
// Calculate the state at a certain time:
const state = getResolvedState(resolvedTimeline, 15)
```

### Timeline logic change

Before, references where evaluated on the original (non conflicted timeline objects).
After, the references are updated when a conflict affects the dependees.

```typescript
const timeline = {
    {id: 'A', layer: '1', enable: {start: 10, end: 100}}
    {id: 'B', layer: '1', enable: {start: 50, end: null}}

    {id: 'X', layer: '1', enable: {while: '#A'}}
}

// Before:
// A playing at [{start: 10, end: 50 }] (interrupted by B)
// B playing at [{start: 50, end: null }]
// X playing at [{start: 10, end: 100 }] (still references the original times of A)

// After:
// A playing at [{start: 10, end: 50 }] (interrupted by B)
// B playing at [{start: 50, end: null }]
// X playing at [{start: 10, end: 50 }] (references the updated times of A)
```
