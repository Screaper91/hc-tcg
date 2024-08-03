import {CARDS} from 'common/cards'
import Card from 'common/cards/base/card'
import {CardProps, Hermit, isHermit} from 'common/cards/base/types'
import {
	CardComponent,
	PlayerComponent,
	RowComponent,
	SlotComponent,
	StatusEffectComponent,
} from 'common/components'
import query from 'common/components/query'
import {ViewerComponent} from 'common/components/viewer-component'
import {CONFIG} from 'common/config'
import {EXPANSIONS} from 'common/const/expansions'
import {STRENGTHS} from 'common/const/strengths'
import {CardEntity, PlayerEntity, newEntity} from 'common/entities'
import {GameModel} from 'common/models/game-model'
import {
	MultiturnPrimaryAttackDisabledEffect,
	MultiturnSecondaryAttackDisabledEffect,
} from 'common/status-effects/multiturn-attack-disabled'
import {
	PrimaryAttackDisabledEffect,
	SecondaryAttackDisabledEffect,
} from 'common/status-effects/singleturn-attack-disabled'
import {
	CurrentCoinFlip,
	LocalCurrentCoinFlip,
	LocalGameState,
	LocalPlayerState,
} from 'common/types/game-state'
import {ModalData} from 'common/types/modal-requests'
import {
	LocalCardInstance,
	LocalModalData,
	LocalStatusEffectInstance,
	WithoutFunctions,
} from 'common/types/server-requests'

////////////////////////////////////////
// @TODO sort this whole thing out properly
/////////////////////////////////////////

// Dear Reader,
// On 07/17/23, This still has not been sorted out properly. I think I might have
// even made it worse.
// Sincerely, Lunarmagpie

function randomBetween(min: number, max: number) {
	return Math.floor(Math.random() * (max - min + 1) + min)
}

export function getStarterPack(): Array<LocalCardInstance> {
	const limits = CONFIG.limits

	// only allow some starting types
	const startingTypes = ['balanced', 'builder', 'farm', 'miner', 'redstone']
	const typesCount = randomBetween(2, 3)
	const types = Object.keys(STRENGTHS)
		.filter((type) => startingTypes.includes(type))
		.sort(() => 0.5 - Math.random())
		.slice(0, typesCount)

	const cards = Object.values(CARDS).filter(
		(cardInfo) =>
			!cardInfo.isHermit() ||
			!cardInfo.isItem() ||
			(types.includes(cardInfo.props.type) &&
				EXPANSIONS[cardInfo.props.expansion].disabled === false),
	)

	const effectCards = cards.filter(
		(card) => card.isSingleUse() || card.isAttach(),
	)
	const hermitCount = typesCount === 2 ? 8 : 10

	const deck: Array<Card> = []

	let itemCounts = {
		[types[0]]: {
			items: 0,
			tokens: 0,
		},
		[types[1]]: {
			items: 0,
			tokens: 0,
		},
	}
	if (types[2]) {
		itemCounts[types[2]] = {
			items: 0,
			tokens: 0,
		}
	}
	let tokens = 0

	// hermits, but not diamond ones
	let hermitCards = cards
		.filter((card) => card.isHermit())
		.filter((card) => !isHermit(card.props) || types.includes(card.props.type))
		.filter((card) => card.props.name !== 'diamond') as Array<Card<Hermit>>

	while (deck.length < hermitCount && hermitCards.length > 0) {
		const randomIndex = Math.floor(Math.random() * hermitCards.length)
		const hermitCard = hermitCards[randomIndex]

		// remove this option
		hermitCards = hermitCards.filter((_card, index) => index !== randomIndex)

		// add 1 - 3 of this hermit
		const hermitAmount = Math.min(
			randomBetween(1, 3),
			hermitCount - deck.length,
		)

		tokens +=
			(hermitCard.props.tokens !== 'wild' ? hermitCard.props.tokens : 1) *
			hermitAmount
		for (let i = 0; i < hermitAmount; i++) {
			deck.push(hermitCard)
			itemCounts[hermitCard.props.type].items += 2
		}
	}

	// items
	for (let type in itemCounts) {
		let counts = itemCounts[type]

		for (let i = 0; i < counts.items; i++) {
			deck.push(CARDS[`item_${type}_common`])
		}
	}

	let loopBreaker = 0
	// effects
	while (deck.length < limits.maxCards && deck.length < effectCards.length) {
		const effectCard =
			effectCards[Math.floor(Math.random() * effectCards.length)]

		const duplicates = deck.filter(
			(card) => card.props.numericId === effectCard.props.numericId,
		)
		if (duplicates.length >= limits.maxDuplicates) continue

		const tokenCost =
			effectCard.props.tokens !== 'wild' ? effectCard.props.tokens : 1
		if (tokens + tokenCost >= limits.maxDeckCost) {
			loopBreaker++
			continue
		} else {
			loopBreaker = 0
		}
		if (loopBreaker >= 100) {
			const err = new Error()
			console.log('Broke out of loop while generating starter deck!', err.stack)
			break
		}

		tokens += tokenCost
		deck.push(effectCard)
	}

	return deck.map((card) => {
		return {
			props: WithoutFunctions(CARDS[card.props.numericId].props),
			entity: newEntity('card-entity') as CardEntity,
			slot: null,
			turnedOver: false,
			attackHint: null,
		}
	})
}

function getLocalStatusEffect(effect: StatusEffectComponent) {
	if (!effect.target) {
		return null
	}
	return {
		props: WithoutFunctions(effect.props),
		instance: effect.entity,
		target:
			effect.target instanceof CardComponent
				? {type: 'card', card: effect.target.entity}
				: {type: 'global', player: effect.target.entity},
		counter: effect.counter,
	}
}

function getLocalCard<Props extends CardProps>(
	game: GameModel,
	card: CardComponent<Props>,
): LocalCardInstance<Props> {
	let attackPreview = null
	if (card.isSingleUse() && card.props.hasAttack && card.props.attackPreview) {
		attackPreview = card.props.attackPreview(game)
	}

	return {
		props: card.card.props as WithoutFunctions<Props>,
		entity: card.entity,
		slot: card.slotEntity,
		turnedOver: card.turnedOver,
		attackHint: attackPreview,
	}
}

function getLocalModalDataPayload(
	game: GameModel,
	modal: ModalData,
): LocalModalData['payload'] {
	if (modal.modalId == 'selectCards') {
		return {
			...modal.payload,
			cards: modal.payload.cards.map((entity) =>
				getLocalCard(game, game.components.get(entity)!),
			),
		}
	} else if (modal.modalId === 'copyAttack') {
		let hermitCard = game.components.get(modal.payload.hermitCard)!
		let blockedActions = hermitCard.player.hooks.blockedActions.callSome(
			[[]],
			(observerEntity) => {
				let observer = game.components.get(observerEntity)
				return observer?.wrappingEntity === hermitCard.entity
			},
		)

		/* Due to an issue with the blocked actions system, we have to check if our target has thier action
		 * blocked by status effects here.
		 */
		if (
			game.components.exists(
				StatusEffectComponent,
				query.effect.is(
					PrimaryAttackDisabledEffect,
					MultiturnPrimaryAttackDisabledEffect,
				),
				query.effect.targetEntity(hermitCard.entity),
			)
		) {
			blockedActions.push('PRIMARY_ATTACK')
		}

		if (
			game.components.exists(
				StatusEffectComponent,
				query.effect.is(
					SecondaryAttackDisabledEffect,
					MultiturnSecondaryAttackDisabledEffect,
				),
				query.effect.targetEntity(hermitCard.entity),
			)
		) {
			blockedActions.push('SECONDARY_ATTACK')
		}

		return {
			...modal.payload,
			hermitCard: getLocalCard(game, hermitCard),
			blockedActions: blockedActions,
		}
	}

	throw new Error('Uknown modal type')
}

function getLocalModalData(game: GameModel, modal: ModalData): LocalModalData {
	return {
		modalId: modal.modalId,
		payload: getLocalModalDataPayload(game, modal),
	} as LocalModalData
}

function getLocalCoinFlip(
	game: GameModel,
	coinFlip: CurrentCoinFlip,
): LocalCurrentCoinFlip {
	return {
		...coinFlip,
		card: getLocalCard(game, game.components.get(coinFlip.card)!),
	}
}

function getLocalPlayerState(
	game: GameModel,
	playerState: PlayerComponent,
): LocalPlayerState {
	let singleUseSlot = game.components.find(
		SlotComponent,
		query.slot.singleUse,
	)?.entity
	let singleUseCard = game.components.find(
		CardComponent,
		query.card.slotEntity(singleUseSlot),
	)

	if (!singleUseSlot) {
		throw new Error('Slot is missing when generating local game state.')
	}

	let board = {
		activeRow:
			game.components.findEntity(
				RowComponent,
				query.row.active,
				query.row.player(playerState.entity),
			) || null,
		singleUse: {
			slot: singleUseSlot,
			card: singleUseCard ? getLocalCard(game, singleUseCard) : null,
		},
		singleUseCardUsed: playerState.singleUseCardUsed,
		rows: game.components
			.filter(RowComponent, query.row.player(playerState.entity))
			.map((row) => {
				const hermitCard = row.getHermit()
				const hermitSlot = row.getHermitSlot()
				const attachCard = row.getAttach()
				const attachSlot = row.getAttachSlot()

				const items = row.getItemSlots().map((itemSlot) => {
					let itemCard = game.components.find(
						CardComponent,
						query.card.slotEntity(itemSlot.entity),
					)
					return {
						slot: itemSlot.entity,
						card: itemCard ? getLocalCard(game, itemCard) : null,
					}
				})

				if (!hermitSlot || !attachSlot)
					throw new Error('Slot is missing when generating local game state.')

				return [
					row.index,
					{
						entity: row.entity,
						hermit: {
							slot: hermitSlot.entity,
							card: hermitCard ? (getLocalCard(game, hermitCard) as any) : null,
						},
						attach: {
							slot: attachSlot.entity,
							card: attachCard ? (getLocalCard(game, attachCard) as any) : null,
						},
						items: items,
						health: row.health,
					},
				] as const
			})
			.sort(([rowIndexA, _rowA], [rowIndexB, _rowB]) => rowIndexA - rowIndexB)
			.map(([_, row]) => row),
	}

	const localPlayerState: LocalPlayerState = {
		entity: playerState.entity,
		playerName: playerState.playerName,
		minecraftName: playerState.minecraftName,
		censoredPlayerName: playerState.censoredPlayerName,
		coinFlips: playerState.coinFlips.map((flip) =>
			getLocalCoinFlip(game, flip),
		),
		lives: playerState.lives,
		board: board,
	}
	return localPlayerState
}

export function getLocalGameState(
	game: GameModel,
	viewer: ViewerComponent,
): LocalGameState | null {
	const playerState = game.components.find(
		PlayerComponent,
		(_game, player) => player.entity == viewer.playerOnLeft.entity,
	)

	if (!playerState)
		throw new Error('Player should be added to ECS before fetching local state')

	const opponentState = playerState.opponentPlayer

	let isCurrentPlayer =
		!viewer.spectator &&
		viewer.playerOnLeft.entity === game.currentPlayer.entity

	const turnState = game.state.turn

	// convert player states
	const players: Record<PlayerEntity, LocalPlayerState> = {}
	players[viewer.playerOnLeft.entity] = getLocalPlayerState(game, playerState)
	players[viewer.playerOnRight.entity] = getLocalPlayerState(
		game,
		opponentState,
	)

	// Pick message or modal id
	playerState.pickableSlots = null
	let currentPickMessage = null
	let currentModalData = null

	const currentPickRequest = game.state.pickRequests[0]
	const currentModalRequest = game.state.modalRequests[0]

	if (currentModalRequest?.player === viewer.playerOnLeft.entity) {
		// We must send modal requests first, to stop pick requests from overwriting them.
		currentModalData = getLocalModalData(game, currentModalRequest.data)
	} else if (currentPickRequest?.player === viewer.playerOnLeft.entity) {
		// Once there are no modal requests, send pick requests
		currentPickMessage = currentPickRequest.message
		// Add the card name before the request
		const pickRequestCreator = game.components.get(currentPickRequest.id)
		if (pickRequestCreator) {
			currentPickMessage = `${pickRequestCreator.props.name}: ${currentPickMessage}`
		}
		// We also want to highlight the slots for the player that must select a slot
		if (currentPickRequest.player == viewer.playerOnLeft.entity) {
			playerState.pickableSlots = game.getPickableSlots(
				currentPickRequest.canPick,
			)
		}
		// We also want to highlight the slots for the player that must select a slot
		if (currentPickRequest.player == viewer.playerOnLeft.entity) {
			playerState.pickableSlots = game.getPickableSlots(
				currentPickRequest.canPick,
			)
		}
	}

	let currentPickableSlots = playerState.pickableSlots

	const localGameState: LocalGameState = {
		turn: {
			turnNumber: turnState.turnNumber,
			currentPlayerEntity: game.currentPlayer.entity,
			availableActions: isCurrentPlayer
				? turnState.availableActions
				: turnState.opponentAvailableActions,
		},
		order: game.state.order,
		statusEffects: game.components
			.filter(StatusEffectComponent)
			.sort((a, b) => a.order - b.order)
			.map(getLocalStatusEffect)
			.filter((effect) => effect !== null) as Array<LocalStatusEffectInstance>,

		// personal info
		hand: game.components
			.filter(
				CardComponent,
				query.card.slot(query.slot.player(playerState.entity), query.slot.hand),
			)
			.sort(CardComponent.compareOrder)
			.map((card) => getLocalCard(game, card)),
		pileCount: game.components.filter(
			CardComponent,
			query.card.slot(query.slot.player(playerState.entity), query.slot.deck),
		).length,
		discarded: game.components
			.filter(
				CardComponent,
				query.card.slot(
					query.slot.player(playerState.entity),
					query.slot.discardPile,
				),
			)
			.map((card) => getLocalCard(game, card)),

		// The entity of the player on the left of the screen
		playerEntity: players[viewer.playerOnLeft.entity].entity,
		// The entity for the player on the the right of the screen
		opponentPlayerEntity: players[viewer.playerOnRight.entity].entity,

		lastActionResult: game.state.lastActionResult,

		currentCardsCanBePlacedIn: playerState
			.getCardsCanBePlacedIn()
			.map(([card, place]) => [getLocalCard(game, card), place]),
		currentPickableSlots,
		currentPickMessage,
		currentModalData,

		players,

		timer: game.state.timer,

		isBossGame: game.state.isBossGame,
	}

	return localGameState
}
