import {CardComponent} from '../components'
import {StatusEffect, systemStatusEffect} from './status-effect'

const TFCDiscardedFromEffect: StatusEffect<CardComponent> = {
	...systemStatusEffect,
	id: 'tfc-discarded-from',
	icon: 'hard-times',
	name: 'Hard Times',
	description:
		'This Hermit can not have their attached effect discarded by Take It Easy.',
}

export default TFCDiscardedFromEffect
