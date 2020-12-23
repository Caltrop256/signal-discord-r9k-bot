module.exports = {
    name: 'streak',
    aliases: ['nonce', 'getstreak', 'viewstreak'],
    args: '[user]',
    rate: 5,
    perms: [],

    run: async function(handler, msg, args, output) {
        const gid = msg.channel.guild.id;
        var member = msg.member;
        if(args.length) {
            member = await client.get.member(args.join(' '), gid);
            if(!member) return output.send(client.embed.invalid('Could not locate the specified user, make sure they are in this guild!', 'Unknown User'));
        }
        const guildInfo = client.guildInfo[gid],
            entry = guildInfo.mutes[member.id],
            streak = !entry ? 0 : entry.streak;

        var str = `${member}'s streak is currently at **${streak}**.\n`;
        if(streak) str += `Their streak will lower in **${client.time((entry.lastUpdate + (guildInfo.settings.muteDecayTime * client.mute.$1hour)) - Date.now())}**`;
        str += `\nTheir next mute will be **${client.time(Math.min(Math.pow(2, streak + 1) * 1000, client.mute.MAX_MUTE_TIME))} long**!`;
        output.send(client.embed.info(str, 'Mute Streak'));
    }
}