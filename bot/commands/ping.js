module.exports = {
    name: 'ping',
    aliases: ['latency', 'pong', 'lat', 'status'],
    args: '',
    perms: [],

    run: function(handler, msg, args, output) {
        const embed = client.embed._base()
        .attachFiles(client.images[0])
        .setThumbnail('attachment://thumbnail.png'),
            uptime = client.time(client.uptime),
            ping = client.ws.ping,
            memory = process.memoryUsage(),
            rss = Math.round(memory.rss / 1024 / 1024),
            heap = Math.round(memory.heapUsed / 1024 / 1024),
            total = Math.round(memory.heapTotal / 1024 / 1024);
        embed.addField('🏓 Pong!', `Uptime: **${uptime}**\nPing: **${ping}ms**\nAllocated Memory: **${rss}mb**\nHeap: **${heap}mb** / **${total}mb**`);
        output.send(embed);
    }
}