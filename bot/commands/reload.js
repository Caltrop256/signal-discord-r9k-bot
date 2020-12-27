module.exports = {
    name: 'reload',
    aliases: [],
    args: '',
    perms: ['DEV'],

    run: function(handler, msg, args, output) {
        Promise.all([
            client.loadModules(),
            client.loadEvents(),
            client.loadCommands()
        ]).then(() => {
            output.send(client.embed.success('Successfully reloaded all events, commands, and modules!', 'Reload Successful!'));
        }).catch(handler);
    }
}