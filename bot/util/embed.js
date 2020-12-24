module.exports = {
    name: 'embed',
    _base: function() {
        return new global.Discord.MessageEmbed().setFooter('caltrop.dev/signal').setColor(0x2178DA).setTimestamp().setThumbnail('attachment://thumbnail.png');
    },

    info: function(description, title = 'Information') {
        return this._base().setAuthor(title, 'https://caltrop.dev/info.png').setDescription(description).attachFiles(client.images[0]);
    },

    success: function(description, title = 'Success') {
        return this._base().addField('☑️ ' + title, description, false).attachFiles(client.images[0]);
    },

    invalid: function(description, title = 'Invalid Input', cmd, guildId) {
        if(cmd) description += '\n\n' + cmd.usage(guildId);
        return this._base().addField('🚫 ' + title, description, false).setColor(0xFB3131).attachFiles(client.images[1]);
    },

    error: function(description = 'Consider reporting this here: ', title = 'An Error occured') {
        return this._base().addField('❗ ' + title, description, false).setColor(0xFF0000).attachFiles(client.images[1]);
    }
}