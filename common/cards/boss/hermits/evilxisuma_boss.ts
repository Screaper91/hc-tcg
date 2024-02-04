import {CARDS, HERMIT_CARDS, ITEM_CARDS} from '../..'
import {AttackModel} from '../../../models/attack-model'
import {CardPosModel} from '../../../models/card-pos-model'
import {GameModel} from '../../../models/game-model'
import {HermitAttackType} from '../../../types/attack'
import {PickRequest} from '../../../types/server-requests'
import {createWeaknessAttack, isTargetingPos} from '../../../utils/attacks'
import {applyAilment, getActiveRow, getActiveRowPos, removeAilment} from '../../../utils/board'
import {isRemovable} from '../../../utils/cards'
import {discardCard} from '../../../utils/movement'
import HermitCard from '../../base/hermit-card'

class EvilXisumaBossHermitCard extends HermitCard {
	constructor() {
		super({
			id: 'evilxisuma_boss',
			numericId: 128,
			name: 'Evil X',
			rarity: 'rare',
			hermitType: 'balanced',
			health: 300,
			primary: {
				name: 'Evil Inside',
				cost: [],
				damage: 40,
				power: null,
			},
			secondary: {
				name: 'Derpcoin',
				cost: ['balanced', 'balanced'],
				damage: 80,
				power:
					"Flip a coin.\n\nIf heads, choose one of the opposing active Hermit's attacks to disable on their next turn.",
			},
		})
	}

	private fireDropper() {
		return Math.floor(Math.random() * 9)
	}

	/** Determines whether the player attempting to use this is the boss */
	private isBeingImitated(pos: CardPosModel) {
		return pos.player.board.rows.length !== 1
	}

	override getAttacks(
		game: GameModel,
		instance: string,
		pos: CardPosModel,
		hermitAttackType: HermitAttackType
	): AttackModel[] {
		// Players who imitate this card should use "evilxisuma_rare" attacks and not the boss'
		if (this.isBeingImitated(pos)) {
			return HERMIT_CARDS['evilxisuma_rare'].getAttacks(game, instance, pos, hermitAttackType)
		}

		if (pos.rowIndex === null || !pos.row || !pos.row.hermitCard) return []

		const {opponentPlayer: opponentPlayer} = game
		const targetIndex = opponentPlayer.board.activeRow
		if (targetIndex === null) return []

		const targetRow = opponentPlayer.board.rows[targetIndex]
		if (!targetRow.hermitCard) return []

		// Create an attack with 0 damage
		const attack = new AttackModel({
			id: this.getInstanceKey(instance),
			attacker: {
				player: pos.player,
				rowIndex: pos.rowIndex,
				row: pos.row,
			},
			target: {
				player: opponentPlayer,
				rowIndex: targetIndex,
				row: targetRow,
			},
			type: hermitAttackType,
		})

		const attacks = [attack]

		if (attack.isType('primary', 'secondary')) {
			const weaknessAttack = createWeaknessAttack(attack)
			if (weaknessAttack) attacks.push(weaknessAttack)
		}

		const rngKey = this.getInstanceKey(instance, 'rng')

		const attackDefs: {
			damageIndex: number
			secondary?: number
			tertiary?: number
		} = {damageIndex: this.fireDropper()}

		const lives = pos.player.lives

		if (lives == 3) {
			attackDefs.damageIndex = [0, 0, 1, 1, 1, 2, 2, 2, 2][attackDefs.damageIndex]
		} else {
			let secondaryIndex = this.fireDropper()
			if (lives == 2) {
				attackDefs.damageIndex = [0, 0, 0, 1, 1, 1, 2, 2, 2][attackDefs.damageIndex]
				secondaryIndex = [0, 0, 0, 1, 1, 1, 2, 2, 2][secondaryIndex]
			} else {
				attackDefs.damageIndex = [0, 0, 0, 0, 1, 1, 1, 2, 2][attackDefs.damageIndex]
				secondaryIndex = [0, 0, 0, 0, 1, 1, 1, 2, 2][secondaryIndex]
				const tertiaryIndex = [0, 0, 0, 0, 1, 1, 1, 2, 2][this.fireDropper()]
				attackDefs.tertiary = tertiaryIndex

				if (tertiaryIndex == 0) {
					// Remove effect card before attack is executed to mimic Curse of Vanishing
					if (targetRow.effectCard && isRemovable(targetRow.effectCard))
						discardCard(game, targetRow.effectCard)
				}
			}

			attackDefs.secondary = secondaryIndex
		}
		attackDefs.damageIndex = attackDefs.damageIndex

		pos.player.custom[rngKey] = attackDefs

		return attacks
	}

	override onAttach(game: GameModel, instance: string, pos: CardPosModel) {
		if (this.isBeingImitated(pos)) {
			HERMIT_CARDS['evilxisuma_rare'].onAttach(game, instance, pos)
			return
		}

		// Apply an ailment to act on EX's ninth turn
		applyAilment(game, 'exboss-nine', instance)

		const {player, opponentPlayer, row} = pos

		// Let EX use secondary attack in case opponent blocks primary
		player.hooks.availableEnergy.add(instance, (availableEnergy) => {
			return availableEnergy.length ? availableEnergy : ['balanced', 'balanced']
		})

		const rngKey = this.getInstanceKey(instance, 'rng')
		player.hooks.onAttack.add(instance, (attack) => {
			if (attack.id !== this.getInstanceKey(instance)) return
			if (attack.type !== 'primary' && attack.type !== 'secondary') return

			const attackDefs: {
				damageIndex: number
				secondary?: number
				tertiary?: number
			} = player.custom[rngKey]

			// If the opponent blocks EX's "attack", then EX can not deal damage or set opponent on fire
			const isAttackingDisabled = game.getAllBlockedActions().find((blockedAction) => {
				return blockedAction == 'PRIMARY_ATTACK' || blockedAction == 'SECONDARY_ATTACK'
			})

			let attackDef: any = {}
			const damage: number = [50, 70, 90][attackDefs.damageIndex]
			if (attackDefs.secondary !== undefined) {
				const opponentActiveRow = getActiveRow(opponentPlayer)

				switch (attackDefs.tertiary) {
					case 0:
						// Remove the effect attached to opponent's active Hermit
						// This is done in getAttacks() to imitate playing Curse of Vanishing
						attackDef.tertiary = 'Remove effect'
						break
					case 1:
						// Deal 20 DMG to each AFK Hermit
						attackDef.tertiary = 'AFK 20DMG'
						if (isAttackingDisabled) break
						const opponentRows = opponentPlayer.board.rows
						for (let i = 0; i < opponentRows.length; i++) {
							const opponentRow = opponentRows[i]
							if (!opponentRow || !opponentRow.hermitCard || i == opponentPlayer.board.activeRow)
								continue
							const newAttack = new AttackModel({
								id: this.getInstanceKey(instance, 'inactive'),
								attacker: getActiveRowPos(player),
								target: {
									player: opponentPlayer,
									rowIndex: i,
									row: opponentRow,
								},
								type: attack.type,
							}).addDamage(this.id, 20)
							attack.addNewAttack(newAttack)
						}
						break
					case 2:
						// Remove an item card attached to the opponent's active Hermit
						attackDef.tertiary = 'Remove item'
						if (
							opponentActiveRow &&
							opponentActiveRow.itemCards.find((card) => card && CARDS[card.cardId]?.type == 'item')
						) {
							const pickRequest: PickRequest = {
								playerId: opponentPlayer.id,
								id: this.id,
								message: 'Choose an item to discard from your active Hermit.',
								onResult(pickResult) {
									if (pickResult.playerId !== opponentPlayer.id) return 'FAILURE_WRONG_PLAYER'

									const rowIndex = pickResult.rowIndex
									if (rowIndex === undefined) return 'FAILURE_INVALID_SLOT'
									if (rowIndex !== opponentPlayer.board.activeRow) return 'FAILURE_INVALID_SLOT'

									if (pickResult.slot.type !== 'item') return 'FAILURE_INVALID_SLOT'
									if (!pickResult.card) return 'FAILURE_INVALID_SLOT'

									const itemCard = ITEM_CARDS[pickResult.card.cardId]
									if (!itemCard) return 'FAILURE_INVALID_SLOT'

									discardCard(game, pickResult.card)

									return 'SUCCESS'
								},
								onTimeout() {
									// Discard the first available item card
									const activeRow = getActiveRow(opponentPlayer)
									if (!activeRow) return
									const itemCard = activeRow.itemCards.find((card) => !!card)
									if (!itemCard) return
									discardCard(game, itemCard)
								},
							}

							// If opponent is knocked out by this attack, the pickRequest should not be added
							const rowPos = attack.target
							if (rowPos)
								player.hooks.afterAttack.add(instance, (attack) => {
									if (!isTargetingPos(attack, rowPos) || !attack.target) return
									const {row} = attack.target
									if (row.health) game.addPickRequest(pickRequest)
									player.hooks.afterAttack.remove(instance)
								})
						}
						break
				}

				switch (attackDefs.secondary) {
					case 0:
						// Heal for 150 damage
						attackDef.secondary = 'HEAL 150'
						if (pos.row && pos.row.health) {
							const row = pos.row
							row.health = Math.min(row.health + 150, 300)
						}
						break
					case 1:
						// Set opponent ablaze
						attackDef.secondary = 'SET ABLAZE'
						if (opponentActiveRow && opponentActiveRow.hermitCard && !isAttackingDisabled)
							applyAilment(game, 'fire', opponentActiveRow.hermitCard.cardInstance)
						break
					case 2:
						// Deal double damage
						attackDef.secondary = 'DOUBLE DMG'
						attack.multiplyDamage(this.id, 2)
						break
				}
			}
			attackDef.primary = damage
			delete player.custom[rngKey]
			if (!isAttackingDisabled) attack.addDamage(this.id, damage)
			console.log('EX attack:', attackDef)
		})

		// EX is immune to poison, fire, and slowness
		const IMMUNE_AILMENTS = new Set(['poison', 'fire', 'slowness'])
		opponentPlayer.hooks.afterApply.add(instance, () => {
			// If opponent plays Dropper, remove the Fletching Tables added to the draw pile
			if (player.pile.length) player.pile = []

			if (!row) return
			const ailmentsToRemove = game.state.ailments.filter((ail) => {
				return (
					ail.targetInstance === row.hermitCard?.cardInstance && IMMUNE_AILMENTS.has(ail.ailmentId)
				)
			})
			ailmentsToRemove.forEach((ail) => {
				removeAilment(game, pos, ail.ailmentInstance)
			})
		})
		player.hooks.onDefence.add(instance, (_) => {
			if (!row) return
			const ailmentsToRemove = game.state.ailments.filter((ail) => {
				return (
					ail.targetInstance === row.hermitCard?.cardInstance && IMMUNE_AILMENTS.has(ail.ailmentId)
				)
			})
			ailmentsToRemove.forEach((ail) => {
				removeAilment(game, pos, ail.ailmentInstance)
			})
		})

		// EX manually updates lives so it doesn't leave the board and trigger an early end
		opponentPlayer.hooks.afterAttack.addBefore(instance, () => {
			if (player.lives > 1) {
				if (!row || row.health === null || row.health > 0) return

				row.health = 300
				player.lives -= 1

				player.hooks.onHermitDeath.call(pos)

				const rewardCard = opponentPlayer.pile.shift()
				if (rewardCard) opponentPlayer.hand.push(rewardCard)
			} else {
				opponentPlayer.hooks.afterAttack.remove(instance)
			}
		})
	}

	override onDetach(game: GameModel, instance: string, pos: CardPosModel) {
		if (this.isBeingImitated(pos)) {
			HERMIT_CARDS['evilxisuma_rare'].onDetach(game, instance, pos)
			return
		}

		const {player, opponentPlayer} = pos
		player.hooks.availableEnergy.remove(instance)
		player.hooks.onAttack.remove(instance)
		opponentPlayer.hooks.afterApply.remove(instance)
		player.hooks.onDefence.remove(instance)
		opponentPlayer.hooks.afterAttack.remove(instance)
	}

	override getExpansion() {
		return 'boss'
	}

	override getPalette() {
		return 'alter_egos'
	}

	override getBackground() {
		return 'alter_egos_background'
	}
}

export default EvilXisumaBossHermitCard