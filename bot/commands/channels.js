module.exports = {
    name: 'channels',
    aliases: ['ch', 'channel', 'network', 'networks'],
    args: '[add|remove] [channel]',
    perms: ['MANAGE_GUILD'],


    run: async function(handler, msg, args, output) {
        const guild = msg.channel.guild;

        if(!args.length) {
            output.send(client.embed.info(client.misc.endListWithAnd(Array.from(client.guildInfo[msg.channel.guild.id].channels).map(c => '<#' + c + '>')), 'List of Channels'));
        } else if(args.length >= 2) {
            if(!client.misc.getPerms(msg.member).includes('MANAGE_GUILD')) return output.send(client.embed.invalid('You are missing the **manage guild** permission!\n\nConsider asking a Moderator for help.', 'Missing Permissions'));
            const str = args.join(' ').substring((args[0].length)).trim();
            var channel = null;
            switch(args[0].toLowerCase()) {
                case 'add':
                case 'a':
                case 'connect':
                case 'c':
                    channel = await client.get.channel(str);
                    if(!channel) {
                        return output.send(client.embed.invalid(`Couldn't find specified channel!`, 'Invalid Channel', this, msg.channel.guild.id));
                    }
                    if(client.guildInfo[guild.id].channels.has(channel.id)) {
                        return output.send(client.embed.invalid(`The ${channel} channel has already been added to the network!`, 'Invalid Channel', this, msg.channel.guild.id));
                    }
                    client.guildInfo[guild.id].channels.add(channel.id);
                    for(const userId in client.guildInfo[guild.id].mutes) {
                        client.mute.muteUpdateChannelPerms(userId, guild.id).catch(console.error);
                    }
                    client.sql('INSERT INTO `channels` (`guildId`, `channelId`) VALUES ("'+guild.id+'", "'+channel.id+'");')
                    .then(() => {
                        output.send(client.embed.success(`The ${channel} channel has been added to the network!`, 'Success!'));
                    })
                    .catch(console.error);
                    break;
                case 'remove':
                case 'r':
                case 'disconnect':
                case 'd':
                    channel = await client.get.channel(str);
                    if(!channel) {
                        return output.send(client.embed.invalid(`Couldn't find specified channel!`, 'Invalid Channel', this, msg.channel.guild.id));
                    }
                    if(!client.guildInfo[guild.id].channels.has(channel.id)) {
                        return output.send(client.embed.invalid(`The ${channel} channel is not part of the network yet!`, 'Invalid Channel', this, msg.channel.guild.id));
                    }
                    //if(!(await client.misc.confirm(output, msg.member.id, `Are you sure you want to remove ${channel} from the network?`))) return;
                    client.guildInfo[guild.id].channels.delete(channel.id);
                    for(const userId in client.guildInfo[guild.id].mutes) {
                        const member = await guild.members.fetch(userId)
                        channel.updateOverwrite(member, client.mute.unmuteObj).then(updCh => {
                            const perm = updCh.permissionOverwrites.get(userId);
                            if(perm && !perm.allow.bitfield && !perm.deny.bitfield) perm.delete().catch(console.error);
                        }).catch(console.error);
                    }
                    client.sql('DELETE FROM `channels` WHERE `guildId` = "'+guild.id+'" AND `channelId` = "'+channel.id+'";')
                    .then(() => {
                        output.send(client.embed.success(`The ${channel} channel has been removed from the network!`, 'Success!'));
                    })
                    .catch(console.error);
                    break;
                default :
                    output.send(client.embed.invalid(`Invalid action, use either **add** or **remove**`, 'Invalid arguments', this, msg.channel.guild.id));
            }
        } else output.send(client.embed.invalid(`Invalid amount of arguments`, 'Invalid arguments', this, msg.channel.guild.id));
    }
}