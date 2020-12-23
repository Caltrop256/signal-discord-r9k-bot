module.exports = {
    run: async function(old, msg) {
        if(msg.author.bot || !msg.guild || msg.type != 'DEFAULT' || old.content == msg.content) return;
        try {
            let valid = false;

            if(msg.content.length) {
                const comp = await client.compressData(msg.content)
                const [rows] = await client.sql(`CALL selectAndUpdate(?,?)`, [comp, msg.channel.guild.id]);
                if(!(rows[0][0]['id'] || rows[0][0][msg.channel.guild.id])) {
                    valid = true;
                }
            }

            if(!valid) {
                msg.delete();
                if(client.guildInfo[msg.channel.guild.id].settings.muteOnViolation) {
                    client.mute(msg.member, msg.channel.guild.id);
                }
            }
        } catch(e) {
            console.error(e);
        }
    }
}