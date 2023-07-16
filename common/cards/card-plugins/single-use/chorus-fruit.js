import SingleUseCard from './_single-use-card'
import {applySingleUse, getActiveRow} from '../../../../server/utils'
import {GameModel} from '../../../../server/models/game-model'

/**
 * @typedef {import('common/types/cards').CardPos} CardPos
 */

class ChorusFruitSingleUseCard extends SingleUseCard {
	constructor() {
		super({
			id: 'chorus_fruit',
			name: 'Chorus Fruit',
			rarity: 'common',
			description: 'Swap your active Hermit with one of your AFK Hermits after attacking.',
		})
	}

	/**
	 * @param {GameModel} game
	 * @param {string} instance
	 * @param {CardPos} pos
	 */
	onAttach(game, instance, pos) {
		const {player} = pos
		const activeRow = getActiveRow(player)

		player.hooks.afterAttack.add(instance, (attack) => {
			applySingleUse(game)

			// Only apply single use once
			player.hooks.afterAttack.remove(instance)
		})

		player.hooks.availableActions.add(instance, (availableActions) => {
			const newActiveRow = getActiveRow(player)
			// Only allow changing hermits once
			if (newActiveRow !== activeRow) {
				player.hooks.availableActions.remove(instance)
			} else {
				// We need to check again because of bdubs
				const isSleeping = activeRow?.ailments.some((a) => a.id === 'sleeping')

				if (!isSleeping && !availableActions.includes('CHANGE_ACTIVE_HERMIT')) {
					availableActions.push('CHANGE_ACTIVE_HERMIT')
				}
			}

			return availableActions
		})
	}

	/**
	 * @param {GameModel} game
	 * @param {CardPos} pos
	 */
	canAttach(game, pos) {
		if (super.canAttach(game, pos) === 'INVALID') return 'INVALID'
		const {player} = pos
		const activeRow = getActiveRow(player)

		const isSleeping = activeRow?.ailments.some((a) => a.id === 'sleeping')
		if (isSleeping) return 'NO'

		return 'YES'
	}

	/**
	 * @param {GameModel} game
	 * @param {string} instance
	 * @param {CardPos} pos
	 */
	onDetach(game, instance, pos) {
		const {player} = pos
		player.hooks.afterAttack.remove(instance)
		player.hooks.availableActions.remove(instance)
	}
}

export default ChorusFruitSingleUseCard
