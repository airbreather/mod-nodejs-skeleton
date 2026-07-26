let onlinePlayersWhoseNamesStartWithB: Record<string, number> = {};

Acore.hooks.addListener('nodejs:startup', (args) => {
	if (args.persistData) {
		onlinePlayersWhoseNamesStartWithB = JSON.parse(args.persistData);
	}
});

Acore.hooks.on('misc:after-loot-template-process', (args) => {
	args.loot.addItem(19019, 1, 1, 1, LootModes.LOOT_MODE_DEFAULT);
});

Acore.hooks.addListener('nodejs:before-shutdown', (args) => {
	if (args.reloading) {
		args.persistData = JSON.stringify(onlinePlayersWhoseNamesStartWithB);
	}
});

Acore.hooks.addListener('player:login', (args) => {
	args.player.sendSystemMessage('Hello, world!');
	if (args.player.name.startsWith('B')) {
		args.player.sendSystemMessage('A special greeting to you, whose name starts with B!');
		onlinePlayersWhoseNamesStartWithB[args.player.name] = Acore.decodeGuid(args.player.guid)[2];
	}
});

Acore.hooks.addListener('player:before-send-chat-message', (args) => {
	switch (args.type) {
		case ChatMsg.CHAT_MSG_SAY:
		case ChatMsg.CHAT_MSG_CHANNEL:
		case ChatMsg.CHAT_MSG_YELL:
		case ChatMsg.CHAT_MSG_WHISPER:
			break;

		default:
			return;
	}
	if (args.player.name in onlinePlayersWhoseNamesStartWithB) {
		args.msg = `B${args.msg}B`;
		// cache a couple of lookups that we're going to do in a loop
		const [_high, _entry, playerId] = Acore.decodeGuid(args.player.guid);
		const sysMessageToBroadcast = `I just changed a message from ${args.player.name}... don't tell them...`;
		for (const otherPlayerId of Object.values(onlinePlayersWhoseNamesStartWithB)) {
			if (playerId !== otherPlayerId) {
				Acore.Player.byGuid([0, 0, otherPlayerId])?.sendSystemMessage(sysMessageToBroadcast);
			}
		}
	}
});

Acore.hooks.addListener('player:logout', (args) => {
	if (args.player.name in onlinePlayersWhoseNamesStartWithB) {
		delete onlinePlayersWhoseNamesStartWithB[args.player.name];
	}
});
