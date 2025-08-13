import {hermit} from '../defaults'
import {Hermit} from '../types'

const SkreaperCommon: Hermit = {
	...hermit,
	id: 'skreaper_common',
	numericId: 901,
	name: "Sk'reaper",
	expansion: 'alter_egos_iii',
	palette: 'alter_egos',
	rarity: 'common',
	tokens: 0,
	type: 'farm',
	health: 300,
	primary: {
		name: 'Howdy',
		cost: ['farm'],
		damage: 60,
		power: null,
	},
	secondary: {
		name: 'One-Chunk',
		cost: ['farm', 'farm'],
		damage: 80,
		power: null,
	},
}

export default SkreaperCommon
