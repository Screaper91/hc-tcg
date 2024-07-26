import {GameModel} from '../../../models/game-model'
import {flipCoin} from '../../../utils/coinFlips'
import Card from '../../base/card'
import {hermit} from '../../base/defaults'
import {Hermit} from '../../base/types'
import {CardComponent, ObserverComponent, StatusEffectComponent} from '../../../components'
import FireEffect from '../../../status-effects/fire'
import * as query from '../../../components/query'

class EthosLabRare extends Card {
	props: Hermit = {
		...hermit,
		id: 'ethoslab_rare',
		numericId: 20,
		name: 'Etho',
		expansion: 'default',
		rarity: 'rare',
		tokens: 3,
		type: 'redstone',
		health: 280,
		primary: {
			name: 'Oh Snappers',
			cost: ['redstone'],
			damage: 50,
			power: null,
		},
		secondary: {
			name: 'Blue Fire',
			cost: ['redstone', 'redstone'],
			damage: 80,
			power: "Flip a coin.\nIf heads, burn your opponent's active Hermit.",
		},
		sidebarDescriptions: [
			{
				type: 'statusEffect',
				name: 'fire',
			},
		],
	}

	override onAttach(game: GameModel, component: CardComponent, observer: ObserverComponent) {
		const {player} = component

		observer.subscribe(player.hooks.onAttack, (attack) => {
			if (!attack.isAttacker(component.entity) || attack.type !== 'secondary') return
			if (!(attack.attacker instanceof CardComponent)) return

			const coinFlip = flipCoin(player, attack.attacker)

			if (coinFlip[0] !== 'heads') return

			let opponentActiveHermit = game.components.find(
				CardComponent,
				query.card.opponentPlayer,
				query.card.active,
				query.card.slot(query.slot.hermit)
			)
			game.components.new(StatusEffectComponent, FireEffect).apply(opponentActiveHermit?.entity)
		})
	}
}

export default EthosLabRare
