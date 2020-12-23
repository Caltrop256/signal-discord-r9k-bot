module.exports = {
    run: function(guild) {
        client.removeGuild(guild.id).catch(console.error);
    }
}