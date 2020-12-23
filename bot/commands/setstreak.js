module.exports = {
    name: 'setstreak',
    aliases: ['changestreak', 'setnonce', 'changenonce'],
    args: '<number> [user]',
    rate: 5,
    perms: ['MANAGE_MESSAGES'],

    run: async function(handler, msg, args, output) {
        const gid = msg.channel.guild.id;
        if(!args.length) return output.send(client.embed.invalid('Please specify the number of streaks you wish to apply.', 'Missing Arguments', this, gid));
        var member = msg.member;
        var num = Number(args[0]);
        if(isNaN(num) || !isFinite(num) || num < 0 || num > client.mute.MAX_STREAK || (num | 0) - num) return output.send(client.embed.invalid('The Number must an integer above or equal to 0 and below ' + (client.mute.MAX_STREAK + 1), 'invalid arguments', this, gid));
        if(args.length > 1) {
            member = await client.get.member(args[1], gid);
            if(!member) return output.send(client.embed.invalid('Could not locate the specified user, make sure they are in this guild!', 'Unknown User', this, gid));
        }
        const guildInfo = client.guildInfo[gid];
        var entry = guildInfo.mutes[member.id];

        if(entry) {
            entry.streak = num;
            entry.lastUpdate = Date.now();
        }
        else entry = (client.guildInfo[gid].mutes[member.id] = {
            start: null,
            lastUpdate: Date.now(),
            streak: num,
            time: null
        });
        client.sql('INSERT INTO `mutes` (`guildId`, `userId`, `start`, `lastUpdate`, `time`, `streak`) VALUES ("'+gid+'", "'+member.id+'", ?, ?, '+entry.time+', '+entry.streak+') ON DUPLICATE KEY UPDATE `start` = ?, `lastUpdate` = ?, `time` = '+entry.time+', `streak` = '+entry.streak+';', [entry.start, entry.lastUpdate, entry.start, entry.lastUpdate].map(d => d ? new Date(d) : null))
        .then(() => {
            output.send(client.embed.success(`Set ${member}'s streak to **${num}**!\n\nTheir next mute will be **${client.time(Math.min(Math.pow(2, num + 1) * 1000, client.mute.MAX_MUTE_TIME))} long**!`, 'Streak Updated'));
        })
        .catch(handler);
    }
}