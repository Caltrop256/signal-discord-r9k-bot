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

    error: function(description = 'An Error occured while trying to process your request.\n\nConsider reporting this error [here](https://github.com/Caltrop256/signal-discord-r9k-bot/issues/new?assignees=&labels=&template=bug_report.md&title=)!', title = 'An Error occured') {
        return this._base().addField('❗ ' + title, description, false).setColor(0xFF0000).attachFiles(client.images[1]);
    }
}