const LZUTF8 = require('lzutf8');

module.exports = {
    name: 'download',
    aliases: ['dl', 'backup'],
    args: '',
    rate: 20,
    perms: ['MANAGE_GUILD'],

    run: function(handler, msg, args, output) {
        client.sql('SELECT `content` FROM `messageData` WHERE `'+msg.channel.guild.id+'`=1; SELECT `hash` FROM `attributeData` WHERE `'+msg.channel.guild.id+'`=1;')
        .then(([queryResults]) => {
            const msgData = queryResults[0].map(o => o.content),
                attrData = queryResults[1].map(o => o.hash),
                now = Date.now();

            const json = {
                timestamp: now,
                guildId: msg.channel.guild.id,
                requestedBy: msg.member.id,
                data: {
                    message: Array.from(msgData),
                    attribute: Array.from(attrData)
                }
            }

            LZUTF8.compressAsync(JSON.stringify(json), {outputEncoding: 'Buffer'}, function(buffer, err) {
                if(err) return handler(err);
                if(Buffer.byteLength(buffer) >= 8e+6) {
                    handler(new Error('Download file too large (over 8mb)'));
                    return output.send(client.embed.invalid('The output file is too large to post.\nApologies for the inconvenience.', 'File over 8mb'));
                }
                const attachment = new Discord.MessageAttachment(buffer, `${msg.channel.guild.name}_${new Date(now).toLocaleString().split(' ')[0]}.r9k`);
                output.send({
                    embed: client.embed.success('Successfully encoded your dataset!\nDownload the attached file and use it with the upload command to enable it!'),
                    files: [attachment]
                });
            });
        }).catch(handler);
    }
}