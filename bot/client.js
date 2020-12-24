const fs = require('fs'),
    config = require('./config.json'),
    crypto = require('crypto'),
    LZUTF8 = require('lzutf8');

const defaultSettings = config.defaultSettings;

global.Discord = require('discord.js');

class R9K extends global.Discord.Client {
    constructor() {
        super({
            retryLimit: 30,
            disableMentions: 'everyone'
        });

        this.images = [
            'blue',
            'red',
            'yellow'
        ].map(a => new Discord.MessageAttachment(fs.readFileSync('./assets/signal_' + a + '.png'), 'thumbnail.png'));

        this.guildInfo = Object.create(null);

        this.developers = config.developers;

        this.commands = new global.Discord.Collection();
        this.eventFunctions = new Map();

        super.login(config.token);
        this.once('ready', async () => {
            await this.loadModules().catch(console.error);
            const storedGuilds = (await this.sql.describe('messageData'))[0].map(r => r.Field);
            storedGuilds.shift();

            const promises = [
                this.loadEvents(),
                this.loadCommands()
            ]
            
            this.guilds.cache.forEach(async g => {
                if(!storedGuilds.includes(g.id)) {
                    promises.push(this.addGuild(g.id));
                };

                this.guildInfo[g.id] = {
                    mutes: Object.create(null),
                    channels: new Set(),
                    settings: Object.assign({}, defaultSettings)
                }
            });

            const [chRows, mutes, settings] = (await Promise.all([
                client.sql.select('channels'),
                client.sql.select('mutes'),
                client.sql.select('settings')
            ])).map(r => r[0]);

            for(let i = 0; i < chRows.length; ++i) {
                const entry = this.guildInfo[chRows[i].guildId];
                if(entry) entry.channels.add(chRows[i].channelId);
            };
            for(let i = 0; i < mutes.length; ++i) {
                const entry = this.guildInfo[mutes[i].guildId];
                if(!entry) continue;
                const mute = Object.assign({}, mutes[i]);
                delete mute.guildId;
                delete mute.userId;
                mute.start = Number(mute.start);
                mute.lastUpdate = Number(mute.lastUpdate);
                entry.mutes[mutes[i].userId] = mute;
            }
            for(let i = 0; i < settings.length; ++i) {
                const entry = this.guildInfo[settings[i].guildId];
                if(!entry) continue;
                const sets = Object.assign({}, settings[i]);
                delete sets.guildId;
                entry.settings = sets;
            };
            Promise.all(promises).then(console.log.bind(null, "r9k online!")).catch(console.error);
            this.muteCheckInterval = setInterval(this.mute._loop.bind(this.mute), 2000);
            this.user.setActivity(defaultSettings.prefix + 'help | caltrop.dev/signal', {
                type: 'WATCHING'
            })
        });
    }

    addGuild(id) {
        this.guildInfo[id] = {
            mutes: Object.create(null),
            channels: new Set(),
            settings: Object.assign({}, defaultSettings)
        };
        return Promise.all([
            this.sql.addColumnIfNotExists('messageData', id),
            this.sql.addColumnIfNotExists('attributeData', id),
            this.sql.createDefaultSettings(id)
        ]);
    }

    removeGuild(id) {
        delete this.guildInfo[id];
        return Promise.all([
            this.sql.dropColumnIfExists('messageData', id),
            this.sql.dropColumnIfExists('attributeData', id),
            this.sql.deleteWhere('settings', 'guildId', id),
            this.sql.deleteWhere('mutes', 'guildId', id)
        ]);
    }

    loadDirectory(path, extension) {
        if(!path.endsWith('/')) path += '/';
        return new Promise((resolve, reject) => {
            fs.readdir(path, function(err, files) {
                if(err) return reject(err);
                const fileArr = [];
                for(let i = 0; i < files.length; ++i) {
                    const file = files[i];
                    if(!file.endsWith(extension)) continue;
                    fileArr.push(require(path + file));
                    delete require.cache[require.resolve(path + file)];
                }
                resolve(fileArr);
            });
        })
    }

    loadEvents() {
        return new Promise((resolve, reject) => {
            this.loadDirectory('./events', '.js').then(events => {
                for(let i = 0; i < events.length; ++i) {
                    const event = events[i],
                        oldEvent = this.eventFunctions.get(event.name);
                    if(oldEvent) this.removeListener(event.name, oldEvent.run);
                    this.on(event.name, event.run);
                    this.eventFunctions.set(event.name, event);
                };
                resolve(events);
            });
        })
    }

    loadCommands() {
        return new Promise((resolve, reject) => {
            this.loadDirectory('./commands', 'js').then(commands => {
                for(let i = 0; i < commands.length; ++i) {
                    this.commands.set(commands[i].name, Object.assign({
                        cooldown: new Map(),
                        usage: function(guildId) {
                            return 'Usage: `' + (guildId ? client.guildInfo[guildId].settings.prefix : defaultSettings.prefix) + this.name + ' ' + this.args + '`';
                        }
                    }, commands[i]));
                }
                resolve(commands.map(c => c.name));
            });
        });
    }

    loadModules() {
        return new Promise((resolve, reject) => {
            this.loadDirectory('./util', 'js').then(modules => {
                for(let i = 0; i < modules.length; ++i) {
                    this[modules[i].name] = modules[i];
                }
                resolve(modules.map(m => m.name));
            });
        });
    }

    compressData(data) {
        return new Promise((resolve, reject) => {
            if(typeof data == 'string') {
                const parsed = data.toLowerCase().replace(/<a?(:.+?:)[0-9]+>/g, '$1').replace(this.misc.punctuationRegex, '').replace(/(\s){2,}/g, ' ');
                LZUTF8.compressAsync(parsed, {outputEncoding: "StorageBinaryString"}, function(res, err) {
                    if(err) return reject(err);
                    return resolve(res);
                });
            } else if(data instanceof Discord.MessageAttachment) {
                const str = data.name + '_' + data.size + '_' + String(data.width) + '_' + String(data.height);
                LZUTF8.compressAsync(str, {}, function(res, err) {
                    if(err) return reject(err);
                    return resolve(crypto.createHash('sha256').update(res).digest('utf8'))
                });
            } else if(data instanceof Discord.MessageEmbed) {
                const str = JSON.stringify({
                    desc: data.description,
                    fields: data.fields,
                    length: data.length
                });
                LZUTF8.compressAsync(str, {}, function(res, err) {
                    if(err) return reject(err);
                    return resolve(crypto.createHash('sha256').update(res).digest('utf8'))
                });
            } else throw new TypeError('Can not resolve Data Type to compress');
        })
    }

    time(ms) {
        const o = {
            day: Math.floor(ms / 86400000),
            hour: Math.floor(ms / 3600000) % 24,
            minute: Math.floor(ms / 60000) % 60,
            second: Math.floor(ms / 1000) % 60,
        }
        let str = '';
        for (const t in o)
            if (o[t]) str += `${o[t]} ${o[t] == 1 ? t : t + 's'}, `;
        return (str ? str.replace(/, ([^,]*)$/, '').replace(/, ([^,]*)$/, ` and $1`) : 'less than a second');
    }
};

global.client = new R9K();

process.on('unhandledRejection', err => {
    client.error.handler(null, 'Unknown', 'Unknown', Date.now(), err);
});