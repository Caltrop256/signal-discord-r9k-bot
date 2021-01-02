const R9Kodec = require('../util/r9Kodec.node');

module.exports = {
    name: 'download',
    aliases: ['dl', 'backup'],
    args: '',
    rate: 20,
    perms: [],

    run: function(handler, msg, args, output) {
        client.sql.selectGuildMessageData(msg.channel.guild.id).then(([queryResults]) => {
            const msgData = queryResults[0].map(o => o.content),
                attrData = queryResults[1].map(o => o.hash),
                now = Date.now();

            const json = {
                timestamp: now,
                guildID: msg.channel.guild.id,
                requestedBy: msg.member.id,
                messages: msgData,
                attributes: attrData
            }

            const buffer = R9Kodec.toBuffer(json);

            const attachment = new Discord.MessageAttachment(buffer, `${msg.channel.guild.name}_${new Date(now).toISOString().substring(10)}.r9k`);
            output.send({
                embed: client.embed.success('Successfully encoded your dataset!\nDownload the attached file and use it with the upload command to enable it!'),
                files: [attachment]
            });
        }).catch(handler);
    }
}