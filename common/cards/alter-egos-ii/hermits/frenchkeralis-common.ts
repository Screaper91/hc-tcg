import Card from '../../base/card'
import {hermit} from '../../base/defaults'
import {Hermit} from '../../base/types'

class FrenchKeralisCommon extends Card {
	props: Hermit = {
		...hermit,
		id: 'frenchkeralis_common',
		numericId: 231,
		name: 'Frenchralis',
		expansion: 'alter_egos_ii',
		background: 'alter_egos',
		palette: 'alter_egos',
		rarity: 'common',
		tokens: 0,
		type: 'explorer',
		health: 290,
		primary: {
			name: 'Bonjour',
			cost: ['explorer'],
			damage: 60,
			power: null,
		},
		secondary: {
			name: 'La Baguette',
			cost: ['explorer', 'explorer'],
			damage: 80,
			power: null,
		},
	}
}

export default FrenchKeralisCommon
