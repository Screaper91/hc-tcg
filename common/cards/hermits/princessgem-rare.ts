import {
	CardComponent,
	ObserverComponent,
	StatusEffectComponent,
} from '../../components'
import {GameModel} from '../../models/game-model'
import EmpireEffect from '../../status-effects/empire'
import {beforeAttack} from '../../types/priorities'
import {hermit} from '../defaults'
import {Hermit} from '../types'

const PrincessGemRare: Hermit = {
	...hermit,
	id: 'princessgem_rare',
	numericId: 168,
	name: 'Princess Gem',
	expansion: 'alter_egos_iii',
	background: 'alter_egos',
	palette: 'alter_egos',
	rarity: 'rare',
	tokens: 1,
	type: 'speedrunner',
	health: 270,
	primary: {
		name: 'Sunny Days',
		cost: ['any'],
		damage: 40,
		power: null,
	},
	secondary: {
		name: 'Empire',
		cost: ['speedrunner', 'speedrunner', 'any'],
		damage: 90,
		power:
			"On opponent's next turn, any attack from King Joel or Grand Architect does no damage. Does not include status or effect cards.",
	},
	onAttach(
		game: GameModel,
		component: CardComponent,
		observer: ObserverComponent,
	) {
		const {opponentPlayer} = component

		observer.subscribeWithPriority(
			game.hooks.beforeAttack,
			beforeAttack.HERMIT_APPLY_ATTACK,
			(attack) => {
				if (!attack.isAttacker(component.entity) || attack.type !== 'secondary')
					return

				game.components
					.new(StatusEffectComponent, EmpireEffect, component.entity)
					.apply(opponentPlayer.entity)
			},
		)
	},
}

export default PrincessGemRare
