module.exports = {
    run: function(guild) {
        client.addGuild(guild.id).then(async () => {
            function isValid(channel) {
                if(!channel) return false;
                const perm = channel.permissionsFor(guild.me);
                return perm.has('SEND_MESSAGES') && perm.has('VIEW_CHANNEL');
            }

            const channels = [
                await client.get.channel('signal'),
                await client.get.channel('r9k'),
                await client.get.channel('welcome'), 
                await client.get.channel('general'), 
                await client.get.channel('main'),
                ...Array.from(guild.channels.cache).map(c => c[1]).filter(c => c.type == 'text').sort((a,b) => a.position - b.position)
            ]

            for(let i = 0; i < channels.length; ++i) {
                if(isValid(channels[i])) {
                    channels[i].send('hey');
                    break;
                }
            }
        }).catch(console.error);
    }
}