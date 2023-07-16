import SingleUseCard from './_single-use-card'
import {GameModel} from '../../../../server/models/game-model'
import {applySingleUse} from '../../../../server/utils'

/**
 * @typedef {import('common/types/pick-process').PickedSlots} PickedSlots
 * @typedef {import('common/types/cards').CardPos} CardPos
 */

// We could stop displaying the coin flips but I think it may confuse players when Zedaph or Pearl uses fortune.
class FortuneSingleUseCard extends SingleUseCard {
	constructor() {
		super({
			id: 'fortune',
			name: 'Fortune',
			rarity: 'ultra_rare',
			description: 'Any coin flips needed on your attack are not needed and "heads" is assumed.',
		})
	}

	canApply() {
		return true
	}

	/**
	 * @param {GameModel} game
	 * @param {string} instance
	 * @param {CardPos} pos
	 */
	onAttach(game, instance, pos) {
		const {player} = pos

		player.hooks.onApply.add(instance, (pickedSlots, modalResult) => {
			player.hooks.onCoinFlip.add(instance, (id, coinFlips) => {
				for (let i = 0; i < coinFlips.length; i++) {
					coinFlips[i] = 'heads'
				}
				return coinFlips
			})

			player.hooks.onTurnStart.add(instance, () => {
				player.hooks.onTurnStart.remove(instance)
				player.hooks.onCoinFlip.remove(instance)
			})
		})
	}
	/**
	 * @param {GameModel} game
	 * @param {string} instance
	 * @param {CardPos} pos
	 */
	onDetach(game, instance, pos) {
		const {player} = pos

		player.hooks.onApply.remove(instance)
	}
}

export default FortuneSingleUseCard
