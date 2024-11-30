export default {
	port: 9000,
	clientDevPort: 3002,
	clientPath: 'client/dist',
	cors: [
		'http://localhost:3002',
		'https://hc-tcg-beta.fly.dev',
		'https://hc-tcg-testing.fly.dev',
		'https://hc-tcg.online',
		'https://testing.hc-tcg.online',
	],
	world: 'LTF42',
	limits: {
		maxTurnTime: 90,
		extraActionTime: 30,
		minCards: 42,
		maxCards: 42,
		maxDuplicates: 3,
		maxDeckCost: 42,
		bannedCards: [
			'evilxisuma_boss',
			'feather',
			'item_any_rare',
			'full_bundle',
			// Enable Dec 4th
			'elder_guardian',
			'allay',
			// Enable Dec 7th
			'tnt_minecart',
			'arrow_of_poison',
			// Enable Dec 11th
			'redstone_torch',
			'smithing_table',
			// Enable Dec 14th
			'sculk_catalyst',
			'wind_burst',
			'bundle',
			// Enable Dec 18th
			'zookeeperscar_rare',
			'zookeeperscar_common',
			// Enable Dec 21st
			'cyberpunkimpulse_rare',
			'cyberpunkimpulse_common',
			// Enable Dec 25th
			'postmasterpearl_rare',
			'postmasterpearl_common',
		],
	},
	logoSubText: 'Over 3 Games Played!',
}
