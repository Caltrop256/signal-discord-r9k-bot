module.exports = {
    name: 'messageUpdate',
    run: async function(old, msg) {
        if(msg.author.bot || !msg.guild || msg.type != 'DEFAULT' || old.content == msg.content) return;
        if(client.guildInfo[msg.channel.guild.id].channels.has(msg.channel.id)) {
            if(msg.attachments.size || msg.embeds.length) return;
            if(msg.content.replace(client.misc.punctuationRegex, '') == old.content.replace(client.misc.punctuationRegex, '')) return;
            try {
                let valid = false;
    
                if(msg.content.length) {
                    const comp = await client.compressData(msg.content);
                    const isUnique = await client.sql.checkAndAppendMessageData(msg.channel.guild.id, comp);
                    if(isUnique) valid = true;
                }
    
                if(!valid) {
                    msg.delete();
                    if(client.guildInfo[msg.channel.guild.id].settings.muteOnViolation) {
                        client.mute.apply(msg.member.id, msg.channel.guild.id);
                    }
                }
            } catch(e) {
                client.error.handler(null, msg.author.id, msg.guild.id, Date.now(), e);
            }
        }
    }
}