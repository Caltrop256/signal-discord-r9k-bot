const LZUTF8 = require('lzutf8'),
    https = require('https');

module.exports = {
    name: 'upload',
    aliases: ['uploadbackup'],
    args: '<attached: .r9k file>',
    rate: 45,
    perms: ['MANAGE_GUILD'],

    run: function(handler, msg, args, output) {
        const attachment = msg.attachments.first();
        if(!attachment || !attachment.name || !attachment.name.endsWith('.r9k')) return output.send(client.embed.invalid('You must attach a valid .r9k file to your message!', 'Invalid arguments', this, msg.channel.guild.id));

        https.get(attachment.url, (res) => {
            const data = [];
            res.on('data', (chunk) => {
                console.log(chunk);
                data.push(chunk);
            }).on('end', () => {
                const buffer = Buffer.concat(data);
                LZUTF8.decompressAsync(buffer, {inputEncoding: 'Buffer'}, async function(res, err) {
                    if(err) return handler(err);
                    try {
                        const {data} = JSON.parse(res);
                        if(!Array.isArray(data.message) || !Array.isArray(data.attribute)) throw new TypeError('Malformed .r9k file');
                        if(await client.misc.confirm(output, msg.member.id, `Uploading this dataset will completely overwrite the current one. Do you wish to proceed? \n(This action can **not** be undone)`, 'Overwrite dataset?')) {
                            await client.sql('UPDATE `messageData` SET `'+msg.channel.guild.id+'`=0; UPDATE `attributeData` SET `'+msg.channel.guild.id+'`=0;').catch(handler);

                            let query = '';
                            const escape = [];

                            for(let i = 0; i < data.message.length; ++i) {
                                const content = data.message[i];
                                if(typeof content !== 'string' || content.length > 2000) throw new TypeError('Malformed .r9k file');
                                query += 'CALL selectAndUpdate(?,?);';
                                escape.push(content, msg.channel.guild.id);
                            }

                            for(let i = 0; i < data.attribute.length; ++i) {
                                const hashed = data.attribute[i];
                                if(typeof hashed !== 'string' || hashed.length > 44) throw new TypeError('Malformed .r9k file');
                                query += 'INSERT INTO `attributeData` (`hash`, `'+msg.channel.guild.id+'`) VALUES (?, 1) ON DUPLICATE KEY UPDATE `'+msg.channel.guild.id+'`=1;';
                                escape.push(hashed);
                            }

                            client.sql(query, escape)
                            .then(() => {
                                output.send(client.embed.success('Successfully updated the dataset!', 'Success'));
                            }).catch(handler);
                        };
                    } catch(err) {
                        handler(err);
                        output.send(client.embed.invalid('The provided .r9k file is corrupted or outdated.'), 'Invalid arguments');
                    }
                })
            });
          }).on('error', (err) => {
            return handler(err);
        });
    }
}