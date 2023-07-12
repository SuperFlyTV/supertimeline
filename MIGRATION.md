# Migration instructions

## 8.x.x -> 9.x.x

### API change

- `Resolver.resolveTimeline()` and `Resolver.resolveAllStates()` have been combined into one: `resolveTimeline()`.
- `Resolver.getState` has been renamed to `getResolvedState`.
- `validateIdString` has been renamed to `validateReferenceString`.
- `resolvedTimeline.statistics` properties have changed.

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

Before, references where evaluated on the original (non conflicted timeline-objects).
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

### Modified tests:

- basic.test.ts: "negative length object"
  Instead of resolving to an instance of negative length, it resolves to a zero-length instance
- basic.test.ts: "negative length object sandwich 2"
  Instead of resolving to an instance of negative length, it resolves to a zero-length instance
- basic.test.ts: "seamless"
  Zero-length enables are kept as zero-length instances (before, they where removed)
- various:
  Instance references does now contain references on the form "#ObjId", ".className",
  before they could be naked strings

## 7.x.x -> 8.x.x

This release dropped support for **Node 8**.

## 6.x.x -> 7.x.x

### API Change

The structure of the timeline-objects has changed significantly.

```typescript
// Before:
const beforeTL = [
	{
		id: 'A',
		trigger: {
			type: Timeline.Enums.TriggerType.TIME_RELATIVE,
			value: '#objId.start',
		},
		duration: 60,
		LLayer: 1,
	},
	{
		id: 'B',
		trigger: {
			type: Timeline.Enums.TriggerType.TIME_ABSOLUTE,
			value: 100,
		},
		duration: 60,
		LLayer: 1,
	},
]

// After:
const afterTL = [
	{
		id: 'A',
		enable: {
			start: '#objId.start',
			duration: 60,
		},
		layer: 1,
	},
	{
		id: 'B',
		enable: {
			start: 100,
			duration: 60,
		},
		layer: 1,
	},
]
```
