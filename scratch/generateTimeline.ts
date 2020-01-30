import { generateTimeline } from '../src/__tests__/timelineGenerator'
import * as fs from 'fs'

const seed = 49
const count = 100
const depth = 3

fs.writeFileSync('./generatedTimeline.json', JSON.stringify(generateTimeline(seed, count, depth)))
