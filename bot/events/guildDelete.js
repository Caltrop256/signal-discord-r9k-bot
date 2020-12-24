module.exports = {
    name: 'guildDelete',
    run: function(guild) {
        client.removeGuild(guild.id).catch(console.error);
    }
}