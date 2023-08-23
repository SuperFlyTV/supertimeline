/* eslint-disable jest/no-standalone-expect */

import { EventType, ResolvedTimelineObject, TimelineObjectInstance, getResolvedState, resolveTimeline } from '..'
import { baseInstances } from '../resolver/lib/instance'
import { describeVariants } from './testlib'

describeVariants(
	'Resolver, basic',
	(test, fixTimeline, getCache) => {
		beforeEach(() => {
			// resetId()
		})
		test('simple timeline', () => {
			const timeline = fixTimeline([
				{
					id: 'video',
					layer: '0',
					enable: {
						start: 0,
						end: 100,
					},
					content: {},
				},
				{
					id: 'graphic0',
					layer: '1',
					enable: {
						start: '#video.start + 10', // 10
						duration: 10,
					},
					content: {},
				},
				{
					id: 'graphic1',
					layer: '1',
					enable: {
						start: '#graphic0.end + 10', // 30
						duration: 15,
					},
					content: {},
				},
			])
			const resolved = resolveTimeline(timeline, { time: 0, cache: getCache() })

			expect(resolved.objects['video']).toBeTruthy()
			expect(resolved.objects['graphic0']).toBeTruthy()
			expect(resolved.objects['graphic1']).toBeTruthy()

			expect(resolved.statistics.resolvedObjectCount).toEqual(3)
			expect(resolved.objects['video'].resolved).toMatchObject({
				resolvedReferences: true,
				instances: [{ start: 0, end: 100 }],
			})
			expect(resolved.objects['graphic0'].resolved).toMatchObject({
				resolvedReferences: true,
				instances: [{ start: 10, end: 20 }],
			})
			expect(resolved.objects['graphic1'].resolved).toMatchObject({
				resolvedReferences: true,
				instances: [{ start: 30, end: 45 }],
			})

			const state0 = getResolvedState(resolved, 5)
			expect(state0.time).toEqual(5)
			expect(state0.layers).toMatchObject({
				'0': {
					id: 'video',
				},
			})
			expect(state0.layers['1']).toBeFalsy()

			expect(getResolvedState(resolved, 15)).toMatchObject({
				layers: {
					'0': {
						id: 'video',
					},
					'1': {
						id: 'graphic0',
					},
				},
				nextEvents: [
					{
						time: 20,
						type: EventType.END,
						objId: 'graphic0',
					},
					{
						time: 30,
						type: EventType.START,
						objId: 'graphic1',
					},
					{
						time: 45,
						type: EventType.END,
						objId: 'graphic1',
					},
					{
						time: 100,
						type: EventType.END,
						objId: 'video',
					},
				],
			})
			const state1 = getResolvedState(resolved, 21)
			expect(state1.layers).toMatchObject({
				'0': {
					id: 'video',
				},
			})
			expect(state1.layers['1']).toBeFalsy()

			expect(getResolvedState(resolved, 31).layers).toMatchObject({
				'0': {
					id: 'video',
				},
				'1': {
					id: 'graphic1',
				},
			})
			const state2 = getResolvedState(resolved, 46)
			expect(state2.layers).toMatchObject({
				'0': {
					id: 'video',
				},
			})
			expect(state2.layers['1']).toBeFalsy()
		})
		test('repeating object', () => {
			const timeline = fixTimeline([
				{
					id: 'video',
					layer: '0',
					enable: {
						start: 0,
						end: 40,
						repeating: 50,
					},
					content: {},
				},
				{
					id: 'graphic0',
					layer: '1',
					enable: {
						start: '#video.start + 20', // 20
						duration: 19, // 39
					},
					content: {},
				},
			])

			const resolved = resolveTimeline(timeline, { time: 0, limitCount: 99, limitTime: 145, cache: getCache() })

			expect(resolved.statistics.resolvedObjectCount).toEqual(2)

			expect(resolved.objects['video']).toBeTruthy()
			expect(resolved.objects['graphic0']).toBeTruthy()
			expect(baseInstances(resolved.objects['video'].resolved.instances)).toMatchObject([
				{ start: 0, end: 40 },
				{ start: 50, end: 90 },
				{ start: 100, end: 140 },
			])
			expect(baseInstances(resolved.objects['graphic0'].resolved.instances)).toMatchObject([
				{ start: 20, end: 39 },
				{ start: 70, end: 89 },
				{ start: 120, end: 139 },
			])
			const state0 = getResolvedState(resolved, 15)
			expect(state0.layers['1']).toBeFalsy()
			expect(state0).toMatchObject({
				layers: {
					'0': {
						id: 'video',
					},
				},
				nextEvents: [
					{
						time: 20,
						type: EventType.START,
						objId: 'graphic0',
					},
					{
						time: 39,
						type: EventType.END,
						objId: 'graphic0',
					},
					{
						time: 40,
						type: EventType.END,
						objId: 'video',
					},
					// next repeat:
					{
						time: 50,
						type: EventType.START,
						objId: 'video',
					},
					{
						time: 70,
						type: EventType.START,
						objId: 'graphic0',
					},
					{
						time: 89,
						type: EventType.END,
						objId: 'graphic0',
					},
					{
						time: 90,
						type: EventType.END,
						objId: 'video',
					},

					{
						time: 100,
						type: EventType.START,
						objId: 'video',
					},
					{
						time: 120,
						type: EventType.START,
						objId: 'graphic0',
					},
					{
						time: 139,
						type: EventType.END,
						objId: 'graphic0',
					},
					{
						time: 140,
						type: EventType.END,
						objId: 'video',
					},
				],
			})

			expect(getResolvedState(resolved, 21).layers).toMatchObject({
				'0': {
					id: 'video',
				},
				'1': {
					id: 'graphic0',
				},
			})
			const state1 = getResolvedState(resolved, 39)
			expect(state1.layers['1']).toBeFalsy()
			expect(state1).toMatchObject({
				layers: {
					'0': {
						id: 'video',
					},
				},
			})

			expect(getResolvedState(resolved, 51).layers).toMatchObject({
				'0': {
					id: 'video',
				},
			})

			expect(getResolvedState(resolved, 72).layers).toMatchObject({
				'0': {
					id: 'video',
				},
				'1': {
					id: 'graphic0',
				},
			})
		})
		test('classes', () => {
			const timeline = fixTimeline([
				{
					id: 'video0',
					layer: '0',
					enable: {
						start: 0,
						end: 10,
						repeating: 50,
					},
					content: {},
					classes: ['class0'],
				},
				{
					id: 'video1',
					layer: '0',
					enable: {
						start: '#video0.end + 15', // 25
						duration: 10,
						repeating: 50,
					},
					content: {},
					classes: ['class0', 'class1'],
				},
				{
					id: 'graphic0',
					layer: '1',
					enable: {
						while: '.class0',
					},
					content: {},
				},
				{
					id: 'graphic1',
					layer: '2',
					enable: {
						while: '.class1 + 1',
					},
					content: {},
				},
			])

			const resolved = resolveTimeline(timeline, { time: 0, limitTime: 100, cache: getCache() })

			expect(resolved.statistics.resolvedObjectCount).toEqual(4)

			expect(resolved.objects['video0']).toBeTruthy()
			expect(resolved.objects['video1']).toBeTruthy()
			expect(resolved.objects['graphic0']).toBeTruthy()
			expect(resolved.objects['graphic1']).toBeTruthy()

			expect(resolved.objects['video0'].resolved).toMatchObject({
				resolvedReferences: true,
				instances: [
					{ start: 0, end: 10 },
					{ start: 50, end: 60 },
				],
			})
			expect(resolved.objects['video1'].resolved).toMatchObject({
				resolvedReferences: true,
				instances: [
					{ start: 25, end: 35 },
					{ start: 75, end: 85 },
				],
			})
			expect(resolved.objects['graphic0'].resolved).toMatchObject({
				resolvedReferences: true,
				instances: [
					{ start: 0, end: 10 },
					{ start: 25, end: 35 },
					{ start: 50, end: 60 },
					{ start: 75, end: 85 },
				],
			})
			expect(resolved.objects['graphic1'].resolved).toMatchObject({
				resolvedReferences: true,
				instances: [
					{ start: 26, end: 36 },
					{ start: 76, end: 86 },
				],
			})

			const state0 = getResolvedState(resolved, 5)
			expect(state0.layers['2']).toBeFalsy()
			expect(state0.layers).toMatchObject({
				'0': {
					id: 'video0',
				},
				'1': {
					id: 'graphic0',
				},
			})
			const state1 = getResolvedState(resolved, 25)
			expect(state1.layers['2']).toBeFalsy()
			expect(state1.layers).toMatchObject({
				'0': {
					id: 'video1',
				},
				'1': {
					id: 'graphic0',
				},
			})
			expect(getResolvedState(resolved, 26).layers).toMatchObject({
				'0': {
					id: 'video1',
				},
				'1': {
					id: 'graphic0',
				},
				'2': {
					id: 'graphic1',
				},
			})

			expect(getResolvedState(resolved, 76).layers).toMatchObject({
				'0': {
					id: 'video1',
				},
				'1': {
					id: 'graphic0',
				},
				'2': {
					id: 'graphic1',
				},
			})
		})
		test('Unique instance ids', () => {
			const timeline = fixTimeline([
				{
					id: 'video0',
					layer: '0',
					enable: {
						start: 10,
						duration: 80,
					},
					content: {},
				},
				{
					id: 'video1',
					layer: '0',
					enable: {
						start: 10,
						duration: 20,
					},
					content: {},
					priority: 1,
				},
			])

			const resolved = resolveTimeline(timeline, {
				time: 0,
				limitCount: 99,
				limitTime: 199,
				cache: getCache(),
			})

			expect(resolved.statistics.resolvedObjectCount).toEqual(2)

			expect(resolved.objects['video0']).toBeTruthy()
			expect(resolved.objects['video1']).toBeTruthy()

			expect(resolved.objects['video0'].resolved.instances).toMatchObject([
				{ start: 10, end: 10 },
				{ start: 30, end: 90 },
			])
			expect(resolved.objects['video1'].resolved.instances).toMatchObject([{ start: 10, end: 30 }])

			const instanceIds: { [id: string]: true } = {}
			for (const obj of Object.values<ResolvedTimelineObject>(resolved.objects)) {
				for (const instance of Object.values<TimelineObjectInstance>(obj.resolved.instances)) {
					expect(instanceIds[instance.id]).toBeFalsy()
					instanceIds[instance.id] = true
				}
			}

			expect(Object.keys(instanceIds)).toHaveLength(3)
		})
		test('Repeating many', () => {
			const timeline = fixTimeline([
				{
					id: 'video0',
					layer: '0',
					enable: {
						start: 0,
						duration: 8,
						repeating: 10,
					},
					content: {},
				},
			])

			const resolved = resolveTimeline(timeline, {
				time: 0,
				limitCount: 100,
				limitTime: 99999,
				cache: getCache(),
			})

			expect(resolved.statistics.resolvedObjectCount).toEqual(1)

			expect(resolved.objects['video0']).toBeTruthy()
			expect(resolved.objects['video0'].resolved.instances).toHaveLength(100)
		})
		test('Repeating interrupted', () => {
			const timeline = fixTimeline([
				{
					id: 'obj0',
					layer: '0',
					enable: {
						start: 0,
						duration: 5,
						repeating: 10,
					},
					content: {},
				},
				{
					id: 'obj1',
					layer: '0',
					enable: {
						start: 22,
					},
					content: {},
				},
			])

			const resolved = resolveTimeline(timeline, { time: 0, limitCount: 5, cache: getCache() })

			expect(resolved.statistics.resolvedObjectCount).toEqual(2)

			expect(resolved.objects['obj1'].resolved.instances).toMatchObject([
				{ start: 22, end: 30 },
				{ start: 35, end: 40 },
				{ start: 45, end: null }, // because the repeating obj0 is limited by limitCount: 5
			])
			expect(resolved.objects['obj0'].resolved.instances).toMatchObject([
				{ start: 0, end: 5 },
				{ start: 10, end: 15 },
				{ start: 20, end: 22 },
				{ start: 30, end: 35 },
				{ start: 40, end: 45 },
			])
		})
		test('Repeating interrupted by higher prio', () => {
			const timeline = fixTimeline([
				{
					id: 'obj0',
					layer: '0',
					enable: {
						start: 0,
						duration: 5,
						repeating: 10,
					},
					content: {},
				},
				{
					id: 'obj1',
					layer: '0',
					enable: {
						start: 22,
					},
					content: {},
					priority: 1,
				},
			])

			const resolved = resolveTimeline(timeline, { time: 0, limitCount: 5, cache: getCache() })

			expect(resolved.statistics.resolvedObjectCount).toEqual(2)

			expect(resolved.objects['obj1'].resolved.instances).toMatchObject([{ start: 22, end: null }])
			expect(resolved.objects['obj0'].resolved.instances).toMatchObject([
				{ start: 0, end: 5 },
				{ start: 10, end: 15 },
				{ start: 20, end: 22 },
			])
		})
		test('Class not defined', () => {
			const timeline = fixTimeline([
				{
					id: 'video0',
					layer: '0',
					priority: 0,
					enable: {
						while: '!.class0',
					},
					content: {},
				},
			])

			const resolved = resolveTimeline(timeline, { time: 0, limitCount: 10, limitTime: 999, cache: getCache() })

			expect(resolved.statistics.resolvedObjectCount).toEqual(1)

			expect(resolved.objects['video0']).toBeTruthy()
			expect(resolved.objects['video0'].resolved.instances).toHaveLength(1)

			const state = getResolvedState(resolved, 10, 10)
			expect(state.layers['0']).toBeTruthy()
			expect(state.layers['0'].id).toEqual('video0')
		})
		test('Reference duration', () => {
			const timeline = fixTimeline([
				{
					id: 'video0',
					layer: '0',
					priority: 0,
					enable: {
						start: 10,
						end: 100,
					},
					content: {},
				},
				{
					id: 'video1',
					layer: '1',
					priority: 0,
					enable: {
						start: 20,
						duration: '#video0',
					},
					content: {},
				},
			])

			const resolved = resolveTimeline(timeline, { time: 0, limitCount: 10, limitTime: 999, cache: getCache() })

			expect(resolved.statistics.resolvedObjectCount).toEqual(2)

			expect(resolved.objects['video0']).toBeTruthy()
			expect(resolved.objects['video1']).toBeTruthy()
			expect(resolved.objects['video1'].resolved.instances).toMatchObject([
				{
					start: 20,
					end: 110,
				},
			])
		})
		test('Reference own layer', () => {
			// https://github.com/SuperFlyTV/supertimeline/pull/50
			const timeline = fixTimeline([
				{
					id: 'video0',
					layer: '0',
					enable: {
						start: 0,
						duration: 8,
					},
					content: {},
				},
				{
					id: 'video1',
					layer: '0',
					enable: {
						// Play for 2 after each other object on layer 0
						start: '$0.end',
						duration: 2,
					},
					content: {},
				},
				{
					id: 'video2',
					layer: '0',
					enable: {
						// Play for 2 after each other object on layer 0
						start: '$0.end + 1',
						duration: 2,
					},
					content: {},
				},
			])
			for (let i = 0; i < 2; i++) {
				timeline.reverse() // change the order
				expect(timeline.length).toEqual(3)

				const resolved = resolveTimeline(timeline, {
					time: 0,
					limitCount: 100,
					limitTime: 99999,
					cache: getCache(),
				})

				expect(resolved.statistics.resolvedObjectCount).toEqual(3)

				expect(resolved.objects['video0']).toBeTruthy()
				expect(resolved.objects['video0'].resolved.instances).toMatchObject([
					{
						start: 0,
						end: 8,
					},
				])
				expect(resolved.objects['video1']).toBeTruthy()
				expect(resolved.objects['video1'].resolved.isSelfReferencing).toEqual(true)
				expect(resolved.objects['video1'].resolved.instances).toMatchObject([
					{
						start: 8,
						end: 9, // becuse it's overridden by video2
						originalEnd: 10,
					},
				])
				expect(resolved.objects['video2']).toBeTruthy()
				expect(resolved.objects['video2'].resolved.isSelfReferencing).toEqual(true)
				expect(resolved.objects['video2'].resolved.instances).toMatchObject([
					{
						start: 9,
						end: 11,
					},
				])
			}
		})
		test('Reference own class', () => {
			// https://github.com/SuperFlyTV/supertimeline/pull/50
			const timeline = fixTimeline([
				{
					id: 'video0',
					layer: '0',
					enable: {
						start: 0,
						duration: 8,
					},
					content: {},
					classes: ['insert_after'],
				},
				{
					id: 'video1',
					layer: '1',
					enable: {
						// Play for 2 after each other object with class 'insert_after'
						start: '.insert_after.end',
						duration: 2,
					},
					content: {},
					classes: ['insert_after'],
				},
				{
					id: 'video2',
					layer: '1',
					enable: {
						// Play for 2 after each other object with class 'insert_after'
						start: '.insert_after.end + 1',
						duration: 2,
					},
					content: {},
					classes: ['insert_after'],
				},
			])
			for (let i = 0; i < 2; i++) {
				timeline.reverse() // change the order
				expect(timeline.length).toEqual(3)

				const resolved = resolveTimeline(timeline, {
					time: 0,
					limitCount: 100,
					limitTime: 99999,
					cache: getCache(),
				})

				expect(resolved.statistics.resolvedObjectCount).toEqual(3)

				expect(resolved.objects['video0']).toBeTruthy()
				expect(resolved.objects['video0'].resolved.instances).toMatchObject([
					{
						start: 0,
						end: 8,
					},
				])
				expect(resolved.objects['video1']).toBeTruthy()
				expect(resolved.objects['video1'].resolved.isSelfReferencing).toEqual(true)
				expect(resolved.objects['video1'].resolved.instances).toMatchObject([
					{
						start: 8,
						end: 9, // becuse it's overridden by video2
						originalEnd: 10,
					},
				])
				expect(resolved.objects['video2']).toBeTruthy()
				expect(resolved.objects['video2'].resolved.isSelfReferencing).toEqual(true)
				expect(resolved.objects['video2'].resolved.instances).toMatchObject([
					{
						start: 9,
						end: 11,
					},
				])
			}
		})
		test('References', () => {
			const timeline = fixTimeline([
				{
					id: 'a',
					layer: 'aLayer',
					priority: 0,
					enable: {
						start: '100', // 100
						duration: 100, // 200
					},
					content: {},
					classes: ['aClass'],
				},
				{
					id: 'b',
					layer: 'bLayer',
					priority: 0,
					enable: {
						start: '150', // 200
						duration: 100, // 300
					},
					content: {},
					classes: ['bClass'],
				},
				{
					id: 'ref',
					layer: 'refLayer',
					priority: 0,
					enable: {
						while: '.aClass & !.bClass',
					},
					content: {},
				},
			])
			const resolved = resolveTimeline(timeline, {
				time: 0,
				limitCount: 10,
				limitTime: 999,
				cache: getCache(),
			})

			expect(resolved.objects['ref'].resolved.instances).toMatchObject([{ start: 100, end: 150 }])
		})
		test('Continuous combined negated and normal classes on different objects', () => {
			// https://github.com/SuperFlyTV/supertimeline/pull/57
			const timeline = fixTimeline([
				{
					id: 'parent',
					layer: 'p0',
					priority: 0,
					enable: {
						while: 1,
					},
					content: {
						val: 1,
					},
					keyframes: [
						{
							id: 'kf0',
							enable: {
								while: '.playout & !.muted',
							},
							content: {
								val: 2,
							},
						},
					],
				},

				{
					id: 'muted_playout1',
					layer: '2',
					priority: 0,
					enable: {
						start: '100',
						duration: 100,
					},
					content: {},
					classes: ['playout', 'muted'],
				},
				{
					id: 'muted_playout2',
					layer: '2',
					priority: 0,
					enable: {
						start: '200',
						duration: 100,
					},
					content: {},
					classes: ['playout', 'muted'],
				},
				{
					id: 'unmuted_playout1',
					layer: '2',
					priority: 0,
					enable: {
						start: '300',
						duration: 100,
					},
					content: {},
					classes: ['playout'],
				},
			])
			const resolved = resolveTimeline(timeline, {
				time: 0,
				limitCount: 10,
				limitTime: 999,
				cache: getCache(),
			})

			expect(resolved.statistics.resolvedObjectCount).toEqual(4)

			expect(resolved.objects['parent'].resolved.instances).toMatchObject([{ start: 0, end: null }])
			expect(resolved.objects['muted_playout1'].resolved.instances).toMatchObject([{ start: 100, end: 200 }])
			expect(resolved.objects['muted_playout2'].resolved.instances).toMatchObject([{ start: 200, end: 300 }])
			expect(resolved.objects['unmuted_playout1'].resolved.instances).toMatchObject([{ start: 300, end: 400 }])

			expect(resolved.objects['kf0'].resolved.instances).toMatchObject([{ start: 300, end: 400 }])

			// first everything is normal
			expect(getResolvedState(resolved, 50).layers).toMatchObject({
				p0: {
					content: { val: 1 },
				},
			})

			// then we have muted playout
			expect(getResolvedState(resolved, 150).layers).toMatchObject({
				p0: {
					content: { val: 1 },
				},
				'2': { id: 'muted_playout1' },
			})

			// then we have muted playout again
			expect(getResolvedState(resolved, 250).layers).toMatchObject({
				p0: {
					content: { val: 1 },
				},
				'2': { id: 'muted_playout2' },
			})

			// only then we have unmuted playout
			expect(getResolvedState(resolved, 350).layers).toMatchObject({
				p0: {
					content: { val: 2 },
				},
				'2': { id: 'unmuted_playout1' },
			})
		})
		test('zero length object, basic', () => {
			const timeline = fixTimeline([
				{
					id: 'obj0',
					layer: 'L1',
					enable: {
						start: 10,
						end: 10,
					},
					content: {},
				},
			])
			const resolved = resolveTimeline(timeline, { time: 0, cache: getCache() })

			expect(resolved.objects['obj0'].resolved.instances).toMatchObject([
				{
					start: 10,
					end: 10,
				},
			])
		})

		test('zero length object', () => {
			const timeline = fixTimeline([
				{
					id: 'obj0',
					layer: 'L1',
					enable: {
						start: 10,
						end: '#obj1.start', // turns this into a zero-duration
					},
					content: {},
				},
				{
					id: 'obj1',
					layer: 'L2',
					enable: {
						start: 10,
					},
					content: {},
				},
				{
					id: 'obj2',
					layer: 'L3',
					enable: {
						start: '#obj0.start', // 10
						duration: 10, // 20
					},
					content: {},
				},
			])
			const resolved = resolveTimeline(timeline, { time: 0, cache: getCache() })

			expect(resolved.objects['obj0'].resolved.instances).toMatchObject([
				{
					start: 10,
					end: 10,
				},
			])
			expect(resolved.objects['obj2'].resolved.instances).toMatchObject([
				{
					start: 10,
					end: 20,
				},
			])

			const state = getResolvedState(resolved, 15)
			expect(state.layers.L1).toBeUndefined()
			expect(state.layers.L2).toMatchObject({ id: 'obj1' })
			expect(state.layers.L3).toMatchObject({ id: 'obj2' })
		})
		test('zero length object interrupts another', () => {
			const timeline = fixTimeline([
				{
					id: 'obj0',
					layer: 'L1',
					enable: {
						start: 10,
						end: 100,
					},
					content: {},
				},
				{
					id: 'zero',
					layer: 'L1',
					enable: {
						start: 50,
						end: 50,
					},
					content: {},
				},
			])
			const resolved = resolveTimeline(timeline, { time: 0, cache: getCache() })

			expect(resolved.objects['obj0'].resolved.instances).toMatchObject([
				{
					start: 10,
					end: 50,
				},
				{
					start: 50,
					end: 100,
				},
			])
			expect(resolved.objects['zero'].resolved.instances).toMatchObject([
				{
					start: 50,
					end: 50,
				},
			])
		})
		test('zero length object sandwich', () => {
			const timeline = fixTimeline([
				{
					id: 'obj0',
					layer: 'L1',
					enable: {
						start: 10,
						end: '#obj1.start',
					},
					content: {},
				},
				{
					id: 'obj1',
					layer: 'L2',
					enable: {
						start: 10,
						end: '#obj2.start',
					},
					content: {},
				},
				{
					id: 'obj2',
					layer: 'L3',
					enable: {
						start: 10,
					},
					content: {},
				},
			])

			const resolved = resolveTimeline(timeline, { time: 0, cache: getCache() })
			const state = getResolvedState(resolved, 20)
			expect(state.layers.L3).toMatchObject({ id: 'obj2' })
			expect(state.layers.L2).toBeUndefined()
			expect(state.layers.L1).toBeUndefined()
		})
		test('negative length object', () => {
			const timeline = fixTimeline([
				{
					id: 'obj0',
					layer: 'L1',
					enable: {
						start: 15,
						end: 10,
					},
					content: {},
				},
			])

			const resolved = resolveTimeline(timeline, { time: 0, cache: getCache() })

			expect(resolved.objects['obj0'].resolved.instances).toMatchObject([
				{
					start: 15,
					end: 15,
				},
			])
			const state0 = getResolvedState(resolved, 14)
			expect(state0.layers.L1).toBeUndefined()

			const state1 = getResolvedState(resolved, 15)
			expect(state1.layers.L1).toBeUndefined()
		})
		/* eslint-disable jest/no-commented-out-tests */
		// This test is "temporarily" disabled,
		// see https://github.com/SuperFlyTV/supertimeline/pull/60
		// test('negative length object sandwich', () => {
		// 	const timeline = fixTimeline([
		// 		{
		// 			id: 'obj0',
		// 			layer: 'L1',
		// 			enable: {
		// 			  start: 15,
		// 			  end: '#obj1.start' // 15
		// 			},
		// 			content: {}
		// 		},
		// 		{
		// 			id: 'obj1',
		// 			layer: 'L2',
		// 			enable: {
		// 			  start: 15,
		// 			  end: '#obj2.start' // 10
		// 			},
		// 			content: {}
		// 		},
		// 		{
		// 			id: 'obj2',
		// 			layer: 'L3',
		// 			enable: {
		// 			  start: 10
		// 			},
		// 			content: {}
		// 		},
		// 		{
		// 			id: 'obj3',
		// 			layer: 'L4',
		// 			enable: {
		// 			  start: '#obj1.start', // 10
		// 			  duration: 10
		// 			},
		// 			content: {}
		// 		},
		// 		{
		// 			id: 'obj4',
		// 			layer: 'L5',
		// 			enable: {
		// 			  start: '#obj1.end', // 15
		// 			  duration: 10
		// 			},
		// 			content: {}
		// 		}
		// 	]

		// 	const resolved = resolveTimeline(timeline, { time: 0, cache: getCache() })
		// 	expect(resolved.objects['obj1'].resolved.instances).toMatchObject([{
		// 		start: 15,
		// 		end: 10
		// 	}])
		// 	expect(resolved.objects['obj3'].resolved.instances).toMatchObject([{
		// 		start: 10,
		// 		end: 20
		// 	}])
		// 	expect(resolved.objects['obj4'].resolved.instances).toMatchObject([{
		// 		start: 15,
		// 		end: 25
		// 	}])
		// 	const state = getResolvedState(resolved, 20)
		// 	expect(state.layers.L1).toBeUndefined()
		// 	expect(state.layers.L2).toBeUndefined()
		// 	expect(state.layers.L3).toMatchObject({ id: 'obj2' })
		// 	expect(state.layers.L4).toMatchObject({ id: 'obj3' })
		// 	expect(state.layers.L5).toMatchObject({ id: 'obj4' })
		// })
		/* eslint-enable jest/no-commented-out-tests */
		test('negative length object sandwich 2', () => {
			const obj0 = {
				id: 'obj0',
				layer: 'L1',
				enable: {
					start: 10,
					end: '#obj1.start',
				},
				content: {},
			}
			const obj1 = {
				id: 'obj1',
				layer: 'L2',
				enable: {
					start: 20,
					end: '#obj2.start',
				},
				content: {},
			}
			const obj2 = {
				id: 'obj2',
				layer: 'L3',
				enable: {
					start: 30,
					duration: 10,
				},
				content: {},
			}
			const timeline = fixTimeline([obj0, obj1, obj2])
			const resolved0 = resolveTimeline(timeline, { time: 0, cache: getCache() })
			expect(resolved0.objects['obj0'].resolved.instances).toMatchObject([{ start: 10, end: 20 }])
			expect(resolved0.objects['obj1'].resolved.instances).toMatchObject([{ start: 20, end: 30 }])
			expect(resolved0.objects['obj2'].resolved.instances).toMatchObject([{ start: 30, end: 40 }])

			// Move obj2, so that obj1 becomes zero-length

			// @ts-ignore
			obj2.enable.start = 20

			const resolved1 = resolveTimeline(timeline, { time: 0, cache: getCache() })
			expect(resolved1.objects['obj0'].resolved.instances).toMatchObject([{ start: 10, end: 20 }])
			expect(resolved1.objects['obj1'].resolved.instances).toMatchObject([{ start: 20, end: 20 }])
			expect(resolved1.objects['obj2'].resolved.instances).toMatchObject([{ start: 20, end: 30 }])

			// Move obj2, so that obj1 becomes negative-length
			// @ts-ignore
			obj2.enable.start = 15

			const resolved2 = resolveTimeline(timeline, { time: 0, cache: getCache() })
			expect(resolved2.objects['obj0'].resolved.instances).toMatchObject([{ start: 10, end: 20 }])
			expect(resolved2.objects['obj1'].resolved.instances).toMatchObject([{ start: 20, end: 20 }])
			expect(resolved2.objects['obj2'].resolved.instances).toMatchObject([{ start: 15, end: 25 }])

			const state2 = getResolvedState(resolved2, 17)
			expect(state2.layers.L1).toMatchObject({ id: 'obj0' })
			expect(state2.layers.L2).toBeUndefined()
			expect(state2.layers.L3).toMatchObject({ id: 'obj2' })
		})

		test('instances from end boundary', () => {
			const boundary = 20
			const enable0 = {
				id: 'enable0',
				priority: 0,
				enable: {
					start: 10,
				},
				layer: 'run_helper',
				classes: ['class0'],
				content: {},
			}
			const enable1 = {
				id: 'enable1',
				priority: 0,
				enable: {
					start: boundary,
				},
				layer: 'run_helper',
				classes: ['class0'],
				content: {},
			}
			const obj0 = {
				id: 'obj0',
				enable: {
					while: '.class0',
				},
				priority: 1,
				layer: 'layer0',
				content: {},
				seamless: true,
			}

			const timeline = fixTimeline([enable0, enable1, obj0])
			{
				const resolved0 = resolveTimeline(timeline, { time: boundary + 50, cache: getCache() })

				const state0 = getResolvedState(resolved0, boundary + 50)
				expect(state0.layers['layer0'].resolved.instances).toMatchObject([
					{ start: 10, end: null, originalStart: 10 },
				])
				expect(state0.layers['layer0'].instance).toMatchObject(state0.layers['layer0'].resolved.instances[0])

				const state1 = getResolvedState(resolved0, boundary + 50)
				expect(state1.layers['layer0'].resolved.instances).toMatchObject([
					{ start: 10, end: null, originalStart: 10 },
				])
			}

			// Also check when setting an end time:
			// @ts-expect-error
			obj0.enable.end = boundary

			{
				const resolved0 = resolveTimeline(timeline, { time: boundary - 50, cache: getCache() })

				const state0 = getResolvedState(resolved0, boundary + 50)
				expect(state0.layers['layer0'].resolved.instances).toMatchObject([
					{ start: 10, end: null, originalStart: 10 },
				])
				expect(state0.layers['layer0'].instance).toMatchObject(state0.layers['layer0'].resolved.instances[0])

				const state1 = getResolvedState(resolved0, boundary + 50)
				expect(state1.layers['layer0'].resolved.instances).toMatchObject([
					{ start: 10, end: null, originalStart: 10 },
				])
			}
		})
		test('seamless', () => {
			const obj0 = {
				id: 'obj0',
				enable: [
					{ start: 10, end: 20 },
					{ start: 20, end: 30 },

					{ start: 40, end: 50 },
					{ start: 50, end: 50 },
					{ start: 50, end: 51 },

					{ start: 60, end: 60 },
					{ start: 60 },
				],
				layer: 'L0',
				content: {},
				seamless: false,
			}
			const timeline = fixTimeline([obj0])
			{
				const resolved0 = resolveTimeline(timeline, { time: 0, cache: getCache() })
				expect(resolved0.objects['obj0'].resolved.instances).toMatchObject([
					{ start: 10, end: 20, originalStart: 10 },
					{ start: 20, end: 30, originalStart: 20 },

					{ start: 40, end: 50, originalStart: 40 },
					{ start: 50, end: 50, originalStart: 50 },
					{ start: 50, end: 51, originalStart: 50 },

					{ start: 60, end: 60, originalStart: 60 },
					{ start: 60, end: null, originalStart: 60 },
				])
			}
			// Now check when seamless is enabled:
			obj0.seamless = true
			{
				const resolved0 = resolveTimeline(timeline, { time: 0, cache: getCache() })
				expect(resolved0.objects['obj0'].resolved.instances).toMatchObject([
					{ start: 10, end: 30, originalStart: 10 },
					{ start: 40, end: 51, originalStart: 40 },
					{ start: 60, end: null, originalStart: 60 },
				])
			}
		})
		test('too many start events', () => {
			const timeline = fixTimeline([
				{
					id: 'obj0',
					enable: { while: 1 },
					priority: 0,
					layer: 'l0',
					content: {},
				},
				{
					id: 'obj1',
					enable: { while: '1' },
					priority: 2,
					layer: 'l0',
					content: {},
				},
			])

			const resolved0 = resolveTimeline(timeline, { time: 0, cache: getCache() })
			expect(resolved0).toBeTruthy()
		})
		test('too many start events2', () => {
			const timeline = fixTimeline([
				{
					id: 'a',
					enable: {
						while: '!.layer0',
					},
					layer: '',
					content: {},
				},
				{
					id: 'b',
					enable: {
						start: '#a.start + 100', // 100, 10000001100
						end: '.layer0', // 10000000000
					},
					layer: 'layer1',
					content: {},
				},
				{
					id: 'group0',
					enable: {
						start: 10000000000, // 10000000000
					},
					layer: '',
					content: {},
					children: [
						{
							id: 'child0',
							enable: {
								start: 0, // 10000000000
								duration: 1000, // 10000001000
							},
							children: [
								{
									id: 'child0_1',
									enable: {
										start: 0, // 10000000000
										// capped/ends at 10000001000
									},
									layer: 'layer1',
									content: {},
									classes: ['layer0'],
								},
							],
							content: {},
							isGroup: true,
							layer: '',
						},
					],
					isGroup: true,
				},
			] as any)

			const resolved0 = resolveTimeline(timeline, {
				time: 0,
				cache: getCache(),
			})
			expect(resolved0).toBeTruthy()
		})
		test('priorities', () => {
			const timeline = fixTimeline([
				{
					id: 'default',
					enable: {
						start: 100,
					},
					layer: 'layer1',
					content: {},
					// default priority (0)
				},
				{
					id: 'high',
					enable: {
						start: 200,
						end: 500,
					},
					layer: 'layer1',
					content: {},
					priority: 2,
				},
				{
					id: 'medium',
					enable: {
						start: 400,
						end: 600,
					},
					layer: 'layer1',
					content: {},
					priority: 1,
				},
				{
					id: 'low',
					enable: {
						start: 500,
						end: 700,
					},
					layer: 'layer1',
					content: {},
					priority: -1,
				},
			] as any)

			const resolved = resolveTimeline(timeline, {
				time: 0,
				cache: getCache(),
			})
			expect(baseInstances(resolved.objects['default'].resolved.instances)).toMatchObject([
				{ start: 100, end: 200 }, // interrupted by "high"
				{ start: 600, end: null },
			])
			expect(baseInstances(resolved.objects['high'].resolved.instances)).toMatchObject([
				{ start: 200, end: 500 }, // has higher prio than everyone else
			])
			expect(baseInstances(resolved.objects['medium'].resolved.instances)).toMatchObject([
				{ start: 500, end: 600 },
			])
			expect(baseInstances(resolved.objects['low'].resolved.instances)).toMatchObject([]) // Lower prio than everyone
		})

		test('ref-while: Keep originalStart', () => {
			const timeline = fixTimeline([
				{
					id: 'A1',
					layer: 'A',
					enable: {
						start: 10,
						end: 100,
					},
					content: {},
				},
				{
					id: 'A2',
					layer: 'A',
					enable: {
						start: 50,
						end: 60,
					},
					content: {},
				},
				{
					id: 'B',
					layer: 'B',
					enable: {
						while: '#A1',
					},
					content: {},
				},
			])
			const resolved = resolveTimeline(timeline, { time: 0, cache: getCache() })

			expect(resolved.objects['A1']).toBeTruthy()
			expect(resolved.objects['A2']).toBeTruthy()
			expect(resolved.objects['B']).toBeTruthy()

			expect(resolved.objects['A1'].resolved.instances).toMatchObject([
				{ start: 10, end: 50, originalStart: 10 },
				{ start: 60, end: 100, originalStart: 10 },
			])
			expect(resolved.objects['B'].resolved.instances).toMatchObject([
				{ start: 10, end: 50, originalStart: 10 },
				{ start: 60, end: 100, originalStart: 10 }, // Use the referenced originalStart when reference is a 'while'
			])
		})
		test('ref-start: dont keep originalStart', () => {
			const timeline = fixTimeline([
				{
					id: 'A1',
					layer: 'A',
					enable: {
						start: 10,
						end: 100,
					},
					content: {},
				},
				{
					id: 'A2',
					layer: 'A',
					enable: {
						start: 50,
						end: 60,
					},
					content: {},
				},
				{
					id: 'B',
					layer: 'B',
					enable: {
						start: '#A1.start',
						duration: 10,
					},
					content: {},
				},
			])
			const resolved = resolveTimeline(timeline, { time: 0, cache: getCache() })

			expect(resolved.objects['A1']).toBeTruthy()
			expect(resolved.objects['A2']).toBeTruthy()
			expect(resolved.objects['B']).toBeTruthy()

			expect(resolved.objects['A1'].resolved.instances).toMatchObject([
				{ start: 10, end: 50, originalStart: 10 },
				{ start: 60, end: 100, originalStart: 10 },
			])
			expect(resolved.objects['B'].resolved.instances).toMatchObject([
				{ start: 10, end: 20, originalStart: 10 },
				{ start: 60, end: 70, originalStart: 60 }, // Don't use the referenced originalStart when reference is a 'start'
			])
		})
		test('Interrupted, keep originalStart', () => {
			const timeline = fixTimeline([
				{
					id: 'A1',
					layer: 'A',
					enable: {
						while: 1,
					},
					content: {},
				},
				{
					id: 'A2',
					layer: 'A',
					enable: {
						start: 50,
						end: 60,
					},
					content: {},
				},
			])
			const resolved = resolveTimeline(timeline, { time: 0, cache: getCache() })

			expect(resolved.objects['A1']).toBeTruthy()
			expect(resolved.objects['A2']).toBeTruthy()

			expect(resolved.objects['A1'].resolved.instances).toMatchObject([
				{ start: 0, end: 50, originalStart: 0 },
				{ start: 60, end: null, originalStart: 0 },
			])
			expect(resolved.objects['A2'].resolved.instances).toMatchObject([{ start: 50, end: 60, originalStart: 50 }])
		})
		test('start', () => {
			const timeline = fixTimeline([
				{
					id: 'A1',
					layer: '',
					enable: {
						start: 1,
						end: 50,
					},
					classes: ['A'],
					content: {},
				},
				{
					id: 'A2',
					layer: '',
					enable: {
						start: 20,
						end: 60,
					},
					classes: ['A'],
					content: {},
				},
				{
					id: 'ref',
					layer: '',
					enable: {
						start: '.A.start',
						end: '.A.end',
					},
					content: {},
				},
			])
			const resolved = resolveTimeline(timeline, { time: 0, cache: getCache() })

			expect(resolved.objects['A1']).toBeTruthy()
			expect(resolved.objects['A2']).toBeTruthy()

			expect(baseInstances(resolved.objects['ref'].resolved.instances)).toMatchObject([{ start: 1, end: 60 }])
		})
		test('transparent objects', () => {
			// "transparent objects" are objects without a layer
			const timeline = fixTimeline([
				{
					id: 'transp0',
					layer: '',
					enable: {
						start: 10,
						end: 100,
					},
					content: {},
				},
				{
					id: 'ref0',
					layer: 'A',
					enable: {
						start: '#transp0.start+1',
						duration: 10,
					},
					content: {},
				},
			])

			const resolved = resolveTimeline(timeline, { cache: getCache(), time: 0 })

			expect(resolved.objects['transp0']).toBeTruthy()
			expect(resolved.objects['ref0']).toBeTruthy()

			expect(resolved.objects['transp0'].resolved.instances).toMatchObject([{ start: 10, end: 100 }])
			expect(resolved.objects['ref0'].resolved.instances).toMatchObject([{ start: 11, end: 21 }])

			expect(getResolvedState(resolved, 15).layers).toMatchObject({
				A: {
					id: 'ref0',
				},
			})
		})
		test('empty object', () => {
			const timeline = fixTimeline([
				{
					id: 'empty',
					layer: 'A',
					enable: [],
					content: {},
				},
				{
					id: 'emptyObj',
					layer: 'A',
					enable: [{}], // Not really valid, so skipping validation
					content: {},
				},
			])
			const resolved = resolveTimeline(timeline, { cache: getCache(), time: 0, skipValidation: true })
			expect(resolved.objects['empty']).toBeTruthy()
			expect(resolved.objects['emptyObj']).toBeTruthy()
			expect(resolved.objects['empty'].resolved.instances).toMatchObject([])
			expect(resolved.objects['emptyObj'].resolved.instances).toMatchObject([])
		})
		test('skipStatistics', () => {
			const timeline = fixTimeline([
				{
					id: 'A',
					layer: 'A',
					enable: [{ start: 10, end: 100 }],
					content: {},
				},
			])
			const resolved = resolveTimeline(timeline, { cache: getCache(), time: 0, skipStatistics: true })
			expect(resolved.objects['A']).toBeTruthy()

			expect(resolved.statistics).toEqual({
				totalCount: 0,
				resolvedInstanceCount: 0,
				resolvedObjectCount: 0,
				resolvedGroupCount: 0,
				resolvedKeyframeCount: 0,
				resolvingObjectCount: 0,
				resolvingCount: 0,
			})
		})
		test('Class state overrides', () => {
			const timeline = fixTimeline([
				{
					id: 'video0',
					layer: '0',
					priority: 0,
					enable: {
						while: '1',
					},
					content: {},
					classes: ['class0'],
				},
				{
					id: 'video1',
					layer: '0',
					priority: 1,
					enable: {
						while: '1',
					},
					content: {},
					classes: ['class1'],
				},
				{
					id: 'video2',
					layer: '1',
					enable: {
						while: '.class0',
					},
					content: {},
				},
				{
					id: 'video3',
					layer: '2',
					enable: {
						while: '.class1',
					},
					content: {},
				},
			])

			const resolved = resolveTimeline(timeline, { cache: getCache(), time: 0, skipValidation: true })

			expect(resolved.statistics.resolvedObjectCount).toEqual(4)

			expect(resolved.objects['video0']).toBeTruthy()
			expect(resolved.objects['video0'].resolved.instances).toHaveLength(1)
			expect(resolved.objects['video1']).toBeTruthy()
			expect(resolved.objects['video1'].resolved.instances).toHaveLength(1)
			expect(resolved.objects['video2']).toBeTruthy()
			expect(resolved.objects['video2'].resolved.instances).toHaveLength(1)
			expect(resolved.objects['video3']).toBeTruthy()
			expect(resolved.objects['video3'].resolved.instances).toHaveLength(1)

			const state = getResolvedState(resolved, 10, 10)
			expect(state.layers['0']).toBeTruthy()
			expect(state.layers['0'].id).toEqual('video1')
			expect(state.layers['1']).toBeFalsy() // class0 is not in the state
			expect(state.layers['2']).toBeTruthy()
			expect(state.layers['2'].id).toEqual('video3')
		})

		test('dontThrowOnError', () => {
			const timeline = fixTimeline([
				{
					id: 'A',
					layer: 'A',
					enable: [{ start: '#B', duration: 100 }],
					content: {},
				},
				{
					id: 'B',
					layer: 'B',
					enable: [{ start: '#A', end: 100 }],
					content: {},
				},
			])

			expect(() => {
				resolveTimeline(timeline, { cache: getCache(), time: 0, dontThrowOnError: false })
			}).toThrow()

			const resolved = resolveTimeline(timeline, { cache: getCache(), time: 0, dontThrowOnError: true })
			expect(resolved.error).toBeTruthy()
		})
	},
	{
		normal: true,
		reversed: true,
		cache: true,
	}
)
