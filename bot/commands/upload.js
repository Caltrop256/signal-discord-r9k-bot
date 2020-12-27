const R9Kodec = require('../util/r9Kodec.node'),
    https = require('https');


const MAGIC = 'r9k!uwu\0'.split('').map(s => s.charCodeAt(0));

module.exports = {
    name: 'upload',
    aliases: ['uploadbackup'],
    args: '<attached: .r9k file>',
    rate: 45,
    perms: ['MANAGE_GUILD'],

    run: function(handler, msg, args, output) {
        const attachment = msg.attachments.first();
        if(!attachment || !attachment.name || !attachment.name.endsWith('.r9k')) return output.send(client.embed.invalid('You must attach a valid .r9k file to your message!', 'Invalid arguments', this, msg.channel.guild.id));

        const request = https.get(attachment.url, (res) => {
            const len = Number(res.headers['content-length']);
            if(!len || len < 40) return output.send(client.embed.invalid('The provided .r9k file is corrupted or outdated.', 'Invalid .r9k file'));
            const buf = Buffer.alloc(len);
            let bufIndex = 0;
            let valid = false;
            res.on('data', (chunk) => {
                const chunkLen = Buffer.byteLength(chunk);
                for(let i = 0; i < chunkLen; ++i) {
                    buf[bufIndex++] = chunk[i];
                }

                if(!valid && bufIndex >= 8) {
                    let i = MAGIC.length;
                    while(i-->0) {
                        if(buf[i] != MAGIC[i]) {
                            res.removeListener('end', handleBuffer);
                            request.abort();
                            return output.send(client.embed.invalid('The provided .r9k file is corrupted or outdated.', 'Invalid .r9k file'));
                        }
                    }
                    valid = true;
                }
            });

            async function handleBuffer() {
                try {
                    const json = R9Kodec.fromBuffer(buf);
                    let user;
                    try {
                        user = await (new Discord.User(client, {id: json.requestedBy})).fetch();
                    } catch(e) {
                        user = {
                            tag: 'Unknown User'
                        }
                    }

                    if(await client.misc.confirm(output, msg.member.id, `This Dataset was provided by **${user.tag}** and is **${client.time(Date.now() - json.timestamp)}** old!\n\nUploading this dataset will completely overwrite the current one. Do you wish to proceed? \n(This action can **not** be undone)`, 'Overwrite dataset?')) {
                        await client.sql.clearDataset(msg.channel.guild.id);

                        const msgs = [...new Set(json.messages)],
                            attr = [...new Set(json.attributes)];
                        let query = '';

                        for(let i = 0; i < msgs.length; ++i) {
                            const content = msgs[i];
                            if(typeof content !== 'string' || content.length > 2000) throw new TypeError('Malformed .r9k file');
                            query += 'CALL selectAndUpdate('+client.sql._pool.escape(content)+',\''+msg.channel.guild.id+'\');';
                        }

                        for(let i = 0; i < attr.length; ++i) {
                            const hashed = attr[i];
                            if(typeof hashed !== 'string' || hashed.length > 32) throw new TypeError('Malformed .r9k file');
                            query += 'INSERT INTO `attributeData` (`hash`, `'+msg.channel.guild.id+'`) VALUES ('+client.sql._pool.escape(hashed)+', 1) ON DUPLICATE KEY UPDATE `'+msg.channel.guild.id+'`=1;';
                        };

                        client.sql(query)
                        .then(() => {
                            output.send(client.embed.success('Successfully updated the dataset!', 'Success'));
                        }).catch(handler);
                    };
                } catch(err) {
                    handler.output = null;
                    handler(err);
                    output.send(client.embed.invalid('The provided .r9k file is corrupted or outdated.', 'Invalid r9k file'));
                }
            }

            res.on('end', handleBuffer)
          
            res.on('error', (err) => {
                return handler(err);
            });
        });
    }
}