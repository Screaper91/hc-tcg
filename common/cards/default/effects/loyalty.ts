import {CardComponent, ObserverComponent} from '../../../components'
import query from '../../../components/query'
import {AttackModel} from '../../../models/attack-model'
import {GameModel} from '../../../models/game-model'
import Card from '../../base/card'
import {attach} from '../../base/defaults'
import {Attach} from '../../base/types'

class Loyalty extends Card {
	props: Attach = {
		...attach,
		id: 'loyalty',
		numericId: 77,
		name: 'Loyalty',
		expansion: 'default',
		rarity: 'rare',
		tokens: 0,
		description:
			'When the Hermit this card is attached to is knocked out, all attached item cards are returned to your hand.',
	}

	override onAttach(
		game: GameModel,
		component: CardComponent,
		observer: ObserverComponent,
	) {
		const {player, opponentPlayer} = component

		const afterAttack = (_attack: AttackModel) => {
			if (!component.slot.inRow() || component.slot.row.health) return

			game.components
				.filter(
					CardComponent,
					query.card.player(player.entity),
					query.card.active,
					query.card.slot(query.slot.item),
				)
				.forEach((card) => card.draw())
		}

		observer.subscribe(player.hooks.afterAttack, (attack) =>
			afterAttack(attack),
		)
		observer.subscribe(opponentPlayer.hooks.afterAttack, (attack) =>
			afterAttack(attack),
		)
	}
}

export default Loyalty
