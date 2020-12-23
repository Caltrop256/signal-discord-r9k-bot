const {matchSorter} = require('match-sorter');

module.exports = {
    channel(str) {
        return new Promise(async r => {
            if (!str || typeof str != 'string') r(undefined);
            const mention = str.match(/^<#!?(\d+)>$/),
                channels = client.channels.cache.filter(c => c.type == 'text'),
                names = channels.map(c => c.name);

            function findHelper(str) {
                const low = str.toLowerCase();
                return channels.find(ch =>
                    ch.name.toLowerCase() == low ||
                    ch.toString() == str
                );
            }

            var channel = channels.get(str);
            if (mention && !channel) channel = channels.get(mention[1]);
            if (!channel) channel = findHelper(str);
            if (!channel) {
                const matches = matchSorter(names, str);
                if (matches[0]) {
                    channel = findHelper(matches[0]);
                };
            };
            r(channel);
        });
    },

    member(str, guildId) {
        return new Promise(async r => {
            if(!str || typeof str != 'string') r(undefined);
            const mention = str.match(/^<@!?(\d+)>$/),
                guild = client.guilds.cache.get(guildId),
                members = await guild.members.fetch({withPresence: false}),
                names = [];

            function findHelper(str) {
                const low = str.toLowerCase();
                return members.find(m => 
                    m.user.username.toLowerCase() == low ||
                    m.displayName.toLowerCase() == low ||
                    m.toString() == str
                )
            }

            var member = members.get(str);
            if(mention && !member) member = members.get([mention[1]]);
            if(!member) member = findHelper(str);
            if(!member) {
                members.forEach(m => {
                    names.push(m.user.username);
                    if(m.nickname) names.push(m.nickname);
                });
                const matches = matchSorter(names, str);
                if(matches[0]) {
                    member = findHelper(matches[0]);
                }
            }
            r(member);
        });
    }
}