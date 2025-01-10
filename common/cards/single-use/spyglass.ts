import {CardComponent, ObserverComponent} from '../../components'
import query from '../../components/query'
import {GameModel} from '../../models/game-model'
import {flipCoin} from '../../utils/coinFlips'
import {getFormattedName} from '../../utils/game'
import {singleUse} from '../defaults'
import {SingleUse} from '../types'

const Spyglass: SingleUse = {
	...singleUse,
	id: 'spyglass',
	numericId: 91,
	name: 'Spyglass',
	expansion: 'default',
	rarity: 'rare',
	tokens: 1,
	description:
		"Look through your opponent's hand. Flip a coin.\nIf heads, opponent chooses 1 of those cards to discard.",
	showConfirmationModal: true,
	log: (values) => `${values.defaultLog}, and ${values.coinFlip}`,
	attachCondition: query.every(
		singleUse.attachCondition,
		(game, _pos) => game.state.turn.turnNumber !== 1,
	),
	onAttach(
		game: GameModel,
		component: CardComponent,
		observer: ObserverComponent,
	) {
		const {player, opponentPlayer} = component

		observer.subscribe(player.hooks.onApply, () => {
			const coinFlip = flipCoin(game, player, component)
			const canDiscard =
				coinFlip[0] === 'heads' && opponentPlayer.getHand().length > 0

			const getEntry = (card: CardComponent): string => {
				return `$p{You|${player.playerName}}$ discarded ${getFormattedName(
					card.props.id,
					true,
				)} from {$o${opponentPlayer.playerName}'s$|your} hand`
			}

			game.addModalRequest({
				player: player.entity,
				modal: {
					type: 'selectCards',
					name: 'Spyglass',
					description: '',
					cards: opponentPlayer.getHand().map((card) => card.entity),
					selectionSize: 0,
					cancelable: true,
					primaryButton: {
						text: canDiscard ? 'Confirm Selection' : 'Close',
						variant: 'default',
					},
				},
				onResult(_modalResult) {},
				onTimeout() {},
			})

			if (!canDiscard) return

			game.addPickRequest({
				id: component.entity,
				player: opponentPlayer.entity,
				message: 'Select 1 card from your hand to discard',
				canPick: query.slot.hand,
				onResult(pickedSlot) {
					const card = pickedSlot.getCard()
					if (!card) return

					card.discard()

					game.battleLog.addEntry(player.entity, getEntry(card))

					return
				},
				onTimeout() {
					// Discard a random card from the opponent's hand
					let opponentHand = opponentPlayer.getHand()
					const slotIndex = Math.floor(Math.random() * opponentHand.length)
					game.battleLog.addEntry(
						player.entity,
						getEntry(opponentHand[slotIndex]),
					)
					opponentHand[slotIndex].discard()
				},
			})
		})
	},
}

export default Spyglass
