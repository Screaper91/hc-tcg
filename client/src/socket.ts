import io from 'socket.io-client'

const url =
	__ENV__ === 'development'
		? `${window.location.protocol}//${window.location.hostname}:${__PORT__}`
		: window.location.protocol + '//' + window.location.host

export function newSocket() {
	const socket = io(url, {autoConnect: false})

	socket.on('error', (error) => {
		console.log('Socket error: ', error)
	})

	socket.onAny((event, payload) => {
		console.log('[message]', event, payload)
	})

	return socket
}
