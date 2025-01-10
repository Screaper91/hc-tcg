import ArchitectFalseCommon from '../cards/hermits/architectfalse-common'
import ArchitectFalseRare from '../cards/hermits/architectfalse-rare'
import KingJoelCommon from '../cards/hermits/kingjoel-common'
import KingJoelRare from '../cards/hermits/kingjoel-rare'
import {CardComponent, PlayerComponent} from '../components'
import query from '../components/query'
import {beforeAttack, onTurnEnd} from '../types/priorities'
import {StatusEffect, systemStatusEffect} from './status-effect'

const EmpireEffect: StatusEffect<PlayerComponent> = {
	...systemStatusEffect,
	icon: 'empire',
	id: 'empire',
	name: 'Empire',
	description:
		'King Joel and Grand Architect can not deal damage with their attacks.',
	applyCondition: (_game, value) =>
		value instanceof PlayerComponent && !value.hasStatusEffect(EmpireEffect),
	onApply(game, effect, player, observer) {
		observer.subscribeWithPriority(
			game.hooks.beforeAttack,
			beforeAttack.HERMIT_BLOCK_DAMAGE,
			(attack) => {
				if (attack.player.entity !== player.entity) return
				if (
					attack.attacker instanceof CardComponent &&
					query.card.is(
						KingJoelCommon,
						KingJoelRare,
						ArchitectFalseCommon,
						ArchitectFalseRare,
					)
				) {
					attack.multiplyDamage(effect.entity, 0).lockDamage(effect.entity)
				}
			},
		)

		observer.subscribeWithPriority(
			player.hooks.onTurnEnd,
			onTurnEnd.ON_STATUS_EFFECT_TIMEOUT,
			() => {
				effect.remove()
			},
		)
	},
}

export default EmpireEffect
