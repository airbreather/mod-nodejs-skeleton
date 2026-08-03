// notice: no imports up here. you should put @airbreather/mod-nodejs-types into your tsconfig.json
// instead, since that will get you all the enums and records in addition to the Acore namespace.
//
// if you want to split your OWN app into multiple script files, that's perfectly fine! just import
// from './path/to/script.js' instead of just from './path/to/script' because of a weird quirk of
// what I had to do to get the const enums working properly.
let onlinePlayersWhoseNamesStartWithB: Record<string, number> = {};

// event names roughly follow the convention of "script:method", e.g., the "player:login" event is
// our equivalent to what C++ would do by overriding the PlayerScript::OnPlayerLogin method.
Acore.hooks.addListener('nodejs:before-shutdown', (args) => {
	// when the '.js reload' command is run, mod-nodejs lets us save an arbitrary string onto the
	// args for this hook before the Node.js environment is replaced by a shiny fresh new one. that
	// string can be seen in the 'nodejs:startup' hook on the NEW environment.
	if (args.reloading) {
		args.persistData = JSON.stringify(onlinePlayersWhoseNamesStartWithB);
	}
});

Acore.hooks.addListener('nodejs:startup', (args) => {
	// when using persistData, keep in mind that your NEW version's handler here can only see what
	// the OLD version's 'nodejs:before-shutdown' handler saved. this makes things really confusing
	// sometimes, so it's recommended that you not rely on this too heavily.
	if (args.persistData) {
		onlinePlayersWhoseNamesStartWithB = JSON.parse(args.persistData);
	}
});

Acore.hooks.addListener('player:login', (args) => {
	args.player.sendSystemMessage('Hello, world!');
	if (args.player.name.startsWith('B')) {
		args.player.sendSystemMessage('A special greeting to you, whose name starts with B!');
		// we're always comparing players with other players, so we only need their counter values.
		// since those are numbers that we can easily compare, we just do this decoding in advance.
		onlinePlayersWhoseNamesStartWithB[args.player.name] = Acore.decodeGuid(args.player.guid)[2];
	}
});

Acore.hooks.addListener('player:logout', (args) => {
	delete onlinePlayersWhoseNamesStartWithB[args.player.name];
});

Acore.hooks.on('misc:after-loot-template-process', (args) => {
	// everything you loot will have a copy of whatever item #19019 is.
	args.loot.addItem(19019, 1, 1, 1, LootModes.LOOT_MODE_DEFAULT);
});

Acore.hooks.addListener('player:before-send-chat-message', (args) => {
	// debugging works! https://nodejs.org/learn/getting-started/debugging#inspector-clients has a
	// list of clients that you can use, and the mod_nodejs.conf.dist shows some samples for how to
	// use the command-line options on that page to get it hooked up. I personally use CLion: when
	// the Node.js environment starts up, it puts a link in the console. I can click on that link to
	// start immediately debugging in the same window where I'm already debugging the main app, and
	// I can bounce back and forth between breakpoints in both the script and the server.
	switch (args.type) {
		case ChatMsg.CHAT_MSG_SAY:
		case ChatMsg.CHAT_MSG_CHANNEL:
		case ChatMsg.CHAT_MSG_YELL:
		case ChatMsg.CHAT_MSG_WHISPER:
			// only mess with these message types. the enums get converted to their numeric values
			// by the compiler: the enum objects don't actually exist at runtime, so all these APIs
			// can only be used with the numeric values.
			break;

		default:
			return;
	}
	if (args.player.name in onlinePlayersWhoseNamesStartWithB) {
		// for hooks, anything on 'args' that TypeScript lets you modify it
		// just like writing to the reference in C++.
		args.msg = `B${args.msg}B`;
		// cache a couple of lookups that we're going to do in a loop
		const [_high, _entry, playerId] = Acore.decodeGuid(args.player.guid);
		const sysMessageToBroadcast = `I just changed a message from ${args.player.name}... don't tell them...`;
		for (const otherPlayerId of Object.values(onlinePlayersWhoseNamesStartWithB)) {
			if (playerId !== otherPlayerId) {
				const otherPlayer = Acore.Player.byGuid([0, 0, otherPlayerId]);
				// This SHOULD give us a Player, not undefined, since they haven't logged out yet.
				// It's basically free to still do the check, though, if for no other reason than
				// because it satisfies the type checker. I might also be wrong, lol >.<.
				otherPlayer?.sendSystemMessage(sysMessageToBroadcast);
			}
		}
	}
});
