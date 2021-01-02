module.exports = {
    name: 'check',
    aliases: ['availability', 'available', 'used', 'alreadyused', 'words'],
    args: '<string>',
    rate: 5,
    perms: [],

    run: async function(handler, msg, args, output) {
        const content = args.join(' ');
        if(!content.length) return output.send(client.embed.invalid('Please include a phrase to check!', 'Missing arguments!', this, msg.channel.guild.id));
        const compressed = await client.compressData(content);
        client.sql.selectWhere('messageData', 'content', compressed, null, 1).then(([rows]) => {
            const row = rows[0] || {};
            let saidIn = 0,
                saidHere = false;

            for(const k in row) {
                if(k == 'content') continue;
                if(!saidHere && k == msg.channel.guild.id) saidHere = true;
                if(row[k][0]) saidIn++;
            }
            saidIn = Math.max(0, saidIn - (+saidHere));
            output.send(client.embed.info(`Your phrase **has${!saidHere ? "n't" : ''}** been used in ${msg.guild.name} before!\n**${saidIn}** other Guild${saidIn == 1 ? ' has' : 's have'} seen this phrase!`, 'Availability'));
        });
    }
}