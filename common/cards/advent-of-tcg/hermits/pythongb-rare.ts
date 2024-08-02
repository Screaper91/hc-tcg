import {GameModel} from '../../../models/game-model'
import {CardComponent, ObserverComponent} from '../../../components'
import Card from '../../base/card'
import {hermit} from '../../base/defaults'
import {Hermit} from '../../base/types'
import query from '../../../components/query'
import XisumavoidCommon from '../../default/hermits/xisumavoid-common'
import XisumavoidRare from '../../default/hermits/xisumavoid-rare'
import RendogCommon from '../../default/hermits/rendog-common'
import RendogRare from '../../default/hermits/rendog-rare'

class PythonGBRare extends Card {
	props: Hermit = {
		...hermit,
		id: 'pythongb_rare',
		numericId: 216,
		name: 'Python',
		expansion: 'advent_of_tcg',
		palette: 'advent_of_tcg',
		background: 'advent_of_tcg',
		rarity: 'rare',
		tokens: 3,
		type: 'redstone',
		health: 250,
		primary: {
			name: 'Say Whaatt',
			cost: ['any'],
			damage: 30,
			power: null,
		},
		secondary: {
			name: 'The Logfellas',
			cost: ['redstone', 'redstone'],
			damage: 40,
			power:
				'For each of your adjacent Rendogs or Xisumas, attack damage doubles.',
		},
	}

	override onAttach(
		game: GameModel,
		component: CardComponent,
		observer: ObserverComponent,
	) {
		const {player} = component

		observer.subscribe(player.hooks.onAttack, (attack) => {
			if (!attack.isAttacker(component.entity) || attack.type !== 'secondary')
				return

			const logfellaAmount = game.components.filter(
				CardComponent,
				query.card.currentPlayer,
				query.card.attached,
				query.card.is(
					XisumavoidCommon,
					XisumavoidRare,
					RendogCommon,
					RendogRare,
				),
				query.card.row(query.row.adjacent(query.row.active)),
			).length

			attack.multiplyDamage(component.entity, Math.pow(2, logfellaAmount))
		})
	}
}

export default PythonGBRare
