import {CardComponent, ObserverComponent} from '../../components'
import query from '../../components/query'
import {GameModel} from '../../models/game-model'
import {beforeAttack} from '../../types/priorities'
import {attach} from '../defaults'
import {Attach} from '../types'
import {
	ChainmailArmor,
	DiamondArmor,
	GoldArmor,
	IronArmor,
	NetheriteArmor,
} from './armor'

const Wolf: Attach = {
	...attach,
	id: 'wolf',
	numericId: 108,
	name: 'Wolf',
	expansion: 'default',
	rarity: 'rare',
	tokens: 1,
	description: 'Opponent takes 20hp damage after their attack.\nIgnores armour',
	onAttach(
		game: GameModel,
		component: CardComponent,
		observer: ObserverComponent,
	) {
		const {opponentPlayer} = component
		let activated = false

		observer.subscribe(opponentPlayer.hooks.onTurnStart, () => {
			// Allow another activation this turn
			activated = false
		})

		observer.subscribeWithPriority(
			game.hooks.beforeAttack,
			beforeAttack.REACT_TO_DAMAGE,
			(attack) => {
				if (attack.isType('status-effect') || attack.isBacklash) return
				// Only on opponents turn
				if (game.currentPlayerEntity !== opponentPlayer.entity) return

				// Make sure they are targeting this player
				if (attack.player !== opponentPlayer) return
				if (!attack.isTargeting(component)) return

				// Make sure the attack is doing some damage
				if (attack.calculateDamage() <= 0) return

				if (activated) return
				activated = true

				const backlashAttack = game
					.newAttack({
						attacker: component.entity,
						target: opponentPlayer.activeRowEntity,
						type: 'effect',
						isBacklash: true,
						log: (values) =>
							`${values.target} took ${values.damage} damage from $eWolf$`,
						shouldIgnoreSlots: [
							query.card.is(
								GoldArmor,
								IronArmor,
								DiamondArmor,
								NetheriteArmor,
								ChainmailArmor,
							),
						],
					})
					.addDamage(component.entity, 20)

				attack.addNewAttack(backlashAttack)
			},
		)
	},
}

export default Wolf
