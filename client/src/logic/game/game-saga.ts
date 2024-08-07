import {PlayerEntity} from 'common/entities'
import {LocalGameState} from 'common/types/game-state'
import {receiveMsg, sendMsg} from 'logic/socket/socket-saga'
import {AnyAction} from 'redux'
import {SagaIterator} from 'redux-saga'
import {
	all,
	call,
	cancel,
	fork,
	put,
	putResolve,
	race,
	take,
	takeEvery,
	takeLatest,
} from 'redux-saga/effects'
import {select} from 'typed-redux-saga'
import {
	gameEnd,
	gameStart,
	gameStateReceived,
	localGameState,
	setOpponentConnection,
	showEndGameOverlay,
} from './game-actions'
import {getEndGameOverlay} from './game-selectors'
import {
	localApplyEffect,
	localChangeActiveHermit,
	localEndTurn,
	localRemoveEffect,
} from './local-state'
import actionLogicSaga from './tasks/action-logic-saga'
import actionModalsSaga from './tasks/action-modals-saga'
import attackSaga from './tasks/attack-saga'
import chatSaga from './tasks/chat-saga'
import coinFlipSaga from './tasks/coin-flips-saga'
import slotSaga from './tasks/slot-saga'

function* sendTurnAction(type: string, entity: PlayerEntity, payload: any) {
	yield* sendMsg('TURN_ACTION', {
		type,
		playerEntity: entity,
		payload: {...payload},
	})
}

function* actionSaga(playerEntity: PlayerEntity): SagaIterator {
	const turnAction = yield race({
		playCard: take([
			'PLAY_HERMIT_CARD',
			'PLAY_ITEM_CARD',
			'PLAY_EFFECT_CARD',
			'PLAY_SINGLE_USE_CARD',
		]),
		applyEffect: take('APPLY_EFFECT'),
		removeEffect: take('REMOVE_EFFECT'),
		pickCard: take('PICK_REQUEST'),
		customModal: take('MODAL_REQUEST'),
		attack: take(['SINGLE_USE_ATTACK', 'PRIMARY_ATTACK', 'SECONDARY_ATTACK']),
		endTurn: take('END_TURN'),
		changeActiveHermit: take('CHANGE_ACTIVE_HERMIT'),
	})

	if (turnAction.playCard) {
		// This is updated for the client in slot-saga
		yield call(
			sendTurnAction,
			turnAction.playCard.type,
			playerEntity,
			turnAction.playCard.payload,
		)
	} else if (turnAction.applyEffect) {
		yield* localApplyEffect()
		yield call(
			sendTurnAction,
			'APPLY_EFFECT',
			playerEntity,
			turnAction.applyEffect.payload,
		)
	} else if (turnAction.removeEffect) {
		yield* localRemoveEffect()
		yield call(sendTurnAction, 'REMOVE_EFFECT', playerEntity, {})
	} else if (turnAction.pickCard) {
		yield call(
			sendTurnAction,
			'PICK_REQUEST',
			playerEntity,
			turnAction.pickCard.payload,
		)
	} else if (turnAction.customModal) {
		yield call(
			sendTurnAction,
			'MODAL_REQUEST',
			playerEntity,
			turnAction.customModal.payload,
		)
	} else if (turnAction.attack) {
		yield call(
			sendTurnAction,
			turnAction.attack.type,
			playerEntity,
			turnAction.attack.payload,
		)
	} else if (turnAction.endTurn) {
		yield* localEndTurn()
		yield call(sendTurnAction, 'END_TURN', playerEntity, {})
	} else if (turnAction.changeActiveHermit) {
		yield* localChangeActiveHermit(turnAction.changeActiveHermit)
		yield call(
			sendTurnAction,
			'CHANGE_ACTIVE_HERMIT',
			playerEntity,
			turnAction.changeActiveHermit.payload,
		)
	}
}

function* gameStateSaga(action: AnyAction): SagaIterator {
	const gameState: LocalGameState = action.payload.localGameState

	// First show coin flips, if any
	yield call(coinFlipSaga, gameState)

	// Actually update the local state
	yield put(localGameState(gameState))

	if (gameState.turn.availableActions.includes('WAIT_FOR_TURN')) return
	if (gameState.turn.availableActions.includes('WAIT_FOR_OPPONENT_ACTION'))
		return

	const logic = yield all([
		fork(actionModalsSaga),
		fork(slotSaga),
		fork(actionLogicSaga, gameState),
		takeEvery('START_ATTACK', attackSaga),
	])

	// Handle core funcionality
	yield call(actionSaga, gameState.playerEntity)

	// After we send an action, disable logic till the next game state is received
	yield cancel(logic)
}

function* gameStateReceiver(): SagaIterator {
	// constantly forward GAME_STATE messages from the server to the store
	while (true) {
		const {payload} = yield call(receiveMsg, 'GAME_STATE')
		yield put(gameStateReceived(payload.localGameState))
	}
}

function* gameActionsSaga(initialGameState?: LocalGameState): SagaIterator {
	yield takeEvery('FORFEIT', function* () {
		yield call(sendMsg, 'FORFEIT')
	})

	yield fork(gameStateReceiver)

	yield takeLatest('GAME_STATE_RECEIVED', gameStateSaga)

	console.log('Game started')
	if (initialGameState) {
		yield put(gameStateReceived(initialGameState))
	}
}

function* opponentConnectionSaga(): SagaIterator {
	while (true) {
		const message = yield call(receiveMsg, 'OPPONENT_CONNECTION')
		yield put(setOpponentConnection(message.payload))
	}
}

function* gameSaga(initialGameState?: LocalGameState): SagaIterator {
	const backgroundTasks = yield all([
		fork(opponentConnectionSaga),
		fork(chatSaga),
	])
	try {
		yield put(gameStart())
		const result = yield race({
			game: call(gameActionsSaga, initialGameState),
			gameEnd: call(receiveMsg, 'GAME_END'),
			gameCrash: call(receiveMsg, 'GAME_CRASH'),
		})

		if (Object.hasOwn(result, 'game')) {
			throw new Error('Unexpected game ending')
		} else if (Object.hasOwn(result, 'gameCrash')) {
			console.log('Server error')
			yield put(showEndGameOverlay('server_crash'))
		} else if (Object.hasOwn(result, 'gameEnd')) {
			const {gameState: newGameState, outcome, reason} = result.gameEnd.payload
			if (newGameState) {
				yield call(coinFlipSaga, newGameState)
				yield putResolve(
					localGameState({
						...newGameState,
						availableActions: [],
					}),
				)
			}
			yield put(showEndGameOverlay(outcome, reason))
		}
	} catch (err) {
		console.error('Client error: ', err)
		yield put(showEndGameOverlay('client_crash'))
	} finally {
		const hasOverlay = yield* select(getEndGameOverlay)
		if (hasOverlay) yield take('SHOW_END_GAME_OVERLAY')
		console.log('Game ended')
		yield put(gameEnd())
		yield cancel(backgroundTasks)
	}
}

export default gameSaga
