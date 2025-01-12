import {
	CardComponent,
	ObserverComponent,
	PlayerComponent,
	StatusEffectComponent,
} from '../../components'
import {GameModel} from '../../models/game-model'
import {IgnoreAttachSlotEffect} from '../../status-effects/ignore-attach'
import {beforeAttack} from '../../types/priorities'
import {applySingleUse} from '../../utils/board'
import {singleUse} from '../defaults'
import {SingleUse} from '../types'

const GoldenAxe: SingleUse = {
	...singleUse,
	id: 'golden_axe',
	numericId: 31,
	name: 'Golden Axe',
	expansion: 'default',
	rarity: 'rare',
	tokens: 2,
	description:
		"Do 40hp damage to your opponent's active Hermit.\nAny effect card attached to your opponent's active Hermit is ignored during this turn.",
	hasAttack: true,
	attackPreview: (_game) => '$A40$',
	onAttach(
		game: GameModel,
		component: CardComponent,
		observer: ObserverComponent,
	) {
		const {player, opponentPlayer} = component

		observer.subscribe(player.hooks.getAttack, () => {
			const axeAttack = game
				.newAttack({
					attacker: component.entity,
					player: player.entity,
					target: opponentPlayer.activeRowEntity,
					type: 'effect',
					log: (values) =>
						`${values.defaultLog} to attack ${values.target} for ${values.damage} damage`,
				})
				.addDamage(component.entity, 40)

			game.components
				.new(StatusEffectComponent, IgnoreAttachSlotEffect, component.entity)
				.apply(opponentPlayer.getActiveHermit()?.entity)

			return axeAttack
		})

		observer.subscribeWithPriority(
			game.hooks.beforeAttack,
			beforeAttack.APPLY_SINGLE_USE_ATTACK,
			(attack) => {
				if (attack.isAttacker(component.entity)) {
					applySingleUse(game)
					observer.unsubscribeFromEverything()
				}
			},
		)
	},
}

function getAxeMultiplier(opponentPlayer: PlayerComponent): number {
	return Math.max(
		4,
		opponentPlayer.activeRow
			?.getItems(true)
			.reduce(
				(r, card) => r + (card.isItem() ? card.props.energy.length : 1),
				0,
			) ?? 0,
	)
}

export const GoldenAxe_V2: SingleUse = {
	...singleUse,
	id: 'golden_axe_v2',
	numericId: 255,
	name: 'Golden Axe (v2)',
	expansion: 'alter_egos',
	rarity: 'rare',
	tokens: 2,
	description:
		'Do 20hp damage for every item card attached to opposing active Hermit up to a maximum of 80hp.',
	hasAttack: true,
	attackPreview: (game) => `$A${20 * getAxeMultiplier(game.opponentPlayer)}$`,
	onAttach(game, component, observer) {
		const {player, opponentPlayer} = component

		observer.subscribe(player.hooks.getAttack, () => {
			const axeAttack = game
				.newAttack({
					attacker: component.entity,
					player: player.entity,
					target: opponentPlayer.activeRowEntity,
					type: 'effect',
					log: (values) =>
						`${values.defaultLog} to attack ${values.target} for ${values.damage} damage`,
				})
				.addDamage(component.entity, 20)
				.multiplyDamage(component.entity, getAxeMultiplier(opponentPlayer))

			return axeAttack
		})

		observer.subscribeWithPriority(
			game.hooks.beforeAttack,
			beforeAttack.APPLY_SINGLE_USE_ATTACK,
			(attack) => {
				if (attack.isAttacker(component.entity)) {
					applySingleUse(game)
					observer.unsubscribeFromEverything()
				}
			},
		)
	},
}

export default GoldenAxe
