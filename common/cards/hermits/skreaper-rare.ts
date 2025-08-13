import {hermit} from '../defaults'
import {Hermit} from '../types'

const SkreaperRare: Hermit = {
	...hermit,
	id: 'skreaper_rare',
	numericId: 902,
	name: "Sk'reaper",
	expansion: 'alter_egos_iii',
	palette: 'alter_egos',
	rarity: 'rare',
	tokens: 1,
	type: 'speedrunner',
	health: 250,
	primary: {
		name: 'Nunchuk',
		cost: ['any'],
		damage: 30,
		power: null,
	},
	secondary: {
		name: 'Save State',
		cost: ['speedrunner', 'any'],
		damage: 70,
		power:
			'If this Hermit is knocked out before the start of your next turn, heal one of your other Hermits 100hp.',
	},
}

export default SkreaperRare
