import {
	CardComponent,
	ObserverComponent,
	StatusEffectComponent,
} from '../../../components'
import {GameModel} from '../../../models/game-model'
import SheepStareEffect from '../../../status-effects/sheep-stare'
import {flipCoin} from '../../../utils/coinFlips'
import Card from '../../base/card'
import {hermit} from '../../base/defaults'
import {Hermit} from '../../base/types'

class ZedaphPlaysRare extends Card {
	props: Hermit = {
		...hermit,
		id: 'zedaphplays_rare',
		numericId: 114,
		name: 'Zedaph',
		expansion: 'default',
		rarity: 'rare',
		type: 'explorer',
		tokens: 2,
		health: 290,
		primary: {
			name: 'Sheep Stare',
			cost: ['explorer'],
			damage: 50,
			power:
				"Flip a coin.\nIf heads, on your opponent's next turn, flip a coin.\nIf heads, your opponent's active Hermit attacks themselves.",
		},
		secondary: {
			name: 'Get Dangled',
			cost: ['explorer', 'explorer'],
			damage: 80,
			power: null,
		},
	}

	override onAttach(
		game: GameModel,
		component: CardComponent,
		observer: ObserverComponent,
	) {
		const {player, opponentPlayer} = component

		observer.subscribe(player.hooks.onAttack, (attack) => {
			if (!attack.isAttacker(component.entity) || attack.type !== 'primary')
				return

			const coinFlip = flipCoin(player, component)
			if (coinFlip[0] !== 'heads') return

			game.components
				.new(StatusEffectComponent, SheepStareEffect, component.entity)
				.apply(opponentPlayer.entity)
		})
	}
}

export default ZedaphPlaysRare
