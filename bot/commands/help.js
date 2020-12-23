module.exports = {
    name: 'help',
    aliases: ['commands', 'cmds', ''],
    args: '',
    perms: [],

    run: function(handler, msg, args, output) {
        const embed = client.embed.info(`You can find a detailawdeasdawadawsdaw`, 'Help');
        embed.addField('List of commands', client.commands.filter(c => !c.perms.includes('DEV')).map(c => `${client.guildInfo[msg.channel.guild.id].settings.prefix}**${c.name}** ${c.args}`).join('\n'), false);
        output.send(embed);
    }
}