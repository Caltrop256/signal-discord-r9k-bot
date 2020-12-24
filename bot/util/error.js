module.exports = {
    name: 'error',
    handler: function(output, userId, guildId, timestamp, error = {}) {
        console.error(`\x1b[31m[${error.name || 'ERROR'}] \x1b[35m[${new Date(timestamp).toLocaleString()}]\x1b[0m : \x1b[36m"${error.message || 'Poorly structured error'}"\x1b[0m ; list[${client.error.list.length}]`);
        client.error.list.push({userId, guildId, timestamp, error});
        if(output) output.send(client.embed.error('An Error occured while trying to process your request.\n\nConsider reporting this error here'));
    },
    list: []
}