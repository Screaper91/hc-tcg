import {hermit} from '../defaults'
import {Hermit} from '../types'

const WormManCommon: Hermit = {
	...hermit,
	id: 'wormman_common',
	numericId: 240,
	name: 'Worm Man',
	expansion: 'alter_egos_ii',
	background: 'alter_egos',
	palette: 'alter_egos',
	rarity: 'common',
	tokens: 0,
	type: 'terraform',
	health: 290,
	primary: {
		name: 'Underpants of Justice',
		shortName: 'Justice',
		cost: ['terraform'],
		damage: 60,
		power: null,
	},
	secondary: {
		name: 'Worm Man Away!',
		shortName: 'Away!',
		cost: ['terraform', 'terraform', 'any'],
		damage: 90,
		power: null,
	},
}

export default WormManCommon
