import {
	CardComponent,
	ObserverComponent,
	StatusEffectComponent,
} from '../../components'
import {GameModel} from '../../models/game-model'
import SleepingEffect from '../../status-effects/sleeping'
import {beforeAttack} from '../../types/priorities'
import {hermit} from '../defaults'
import {Hermit} from '../types'

const BdoubleO100Rare: Hermit = {
	...hermit,
	id: 'bdoubleo100_rare',
	numericId: 1,
	name: 'Bdubs',
	expansion: 'default',
	rarity: 'rare',
	tokens: 1,
	type: 'balanced',
	health: 260,
	primary: {
		name: 'Retexture',
		cost: ['any'],
		damage: 60,
		power: null,
	},
	secondary: {
		name: 'Shreep',
		cost: ['balanced', 'balanced', 'any'],
		damage: 0,
		power:
			'This Hermit restores all HP, then sleeps for the rest of this turn, and the following two turns, before waking up.',
	},
	sidebarDescriptions: [
		{
			type: 'statusEffect',
			name: 'sleeping',
		},
	],
	onAttach(
		game: GameModel,
		component: CardComponent,
		observer: ObserverComponent,
	) {
		observer.subscribeWithPriority(
			game.hooks.beforeAttack,
			beforeAttack.HERMIT_APPLY_ATTACK,
			(attack) => {
				if (!attack.isAttacker(component.entity) || attack.type !== 'secondary')
					return

				component.slot.inRow() && component.slot.row.fullHeal()

				game.components
					.new(StatusEffectComponent, SleepingEffect, component.entity)
					.apply(component.entity)

				game.battleLog.addEntry(
					component.player.entity,
					`$p${component.props.name}$ went to $eSleep$ and restored $gfull health$`,
				)
			},
		)
	},
}

export default BdoubleO100Rare
