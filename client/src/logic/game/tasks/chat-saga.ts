import {receiveMsg, sendMsg} from 'logic/socket/socket-saga'
import {SagaIterator} from 'redux-saga'
import {call, fork, put, takeEvery} from 'redux-saga/effects'
import {chatMessage, chatUpdate} from '../game-actions'

function* chatMessageSaga(
	action: ReturnType<typeof chatMessage>,
): SagaIterator {
	yield call(sendMsg, 'CHAT_MESSAGE', action.payload)
}

function* receiveMessagesSaga(): SagaIterator {
	while (true) {
		const result = yield call(receiveMsg, 'CHAT_UPDATE')
		const messages = result.payload.slice().reverse()
		yield put(chatUpdate(messages))
	}
}

function* chatSaga(): SagaIterator {
	try {
		yield takeEvery('CHAT_MESSAGE', chatMessageSaga)
		yield fork(receiveMessagesSaga)
	} catch (err) {
		console.error('Chat error: ', err)
	}
}

export default chatSaga
