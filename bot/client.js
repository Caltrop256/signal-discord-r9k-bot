const fs = require('fs'),
    config = require('./config.json'),
    crypto = require('crypto'),
    LZUTF8 = require('lzutf8'),
    mute = require('./util/mute.js'),
    get = require('./util/get.js'),
    embed = require('./util/embed.js'),
    misc = require('./util/misc.js'),
    error = require('./util/error.js'),
    mySQL = require('mysql');

const connection = mySQL.createPool(Object.assign({multipleStatements: true}, config.mySQL));

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

        this.guildInfo = {};

        this.mute = mute;
        this.get = get;
        this.embed = embed;
        this.misc = misc;
        this.error = error;

        this.developers = config.developers;

        this.commands = new global.Discord.Collection();

        this.muteCheckInterval = setInterval(this.mute._loop.bind(this.mute), 2000);

        super.login(config.token);
        this.once('ready', async () => {
            const storedGuilds = (await this.sql('DESCRIBE `messageData`'))[0].map(r => r.Field);
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
                client.sql('SELECT * FROM `channels`;'),
                client.sql('SELECT * FROM `mutes`;'),
                client.sql('SELECT * FROM `settings`;')
            ])).map(r => r[0]);

            for(let i = 0; i < chRows.length; ++i) {
                this.guildInfo[chRows[i].guildId].channels.add(chRows[i].channelId);
            };
            for(let i = 0; i < mutes.length; ++i) {
                const mute = Object.assign({}, mutes[i]);
                delete mute.guildId;
                delete mute.userId;
                mute.start = Number(mute.start);
                mute.lastUpdate = Number(mute.lastUpdate);
                this.guildInfo[mutes[i].guildId].mutes[mutes[i].userId] = mute;
            }
            for(let i = 0; i < settings.length; ++i) {
                const sets = Object.assign({}, settings[i]);
                delete sets.guildId;
                this.guildInfo[settings[i].guildId].settings = sets;
            };
            Promise.all(promises).then(console.log.bind(null, "r9k online!"));

            this.user.setActivity(defaultSettings.prefix + 'help | caltrop.dev/signal', {
                type: 'WATCHING'
            })
        });
    }

    addGuild(id) {
        return new Promise((resolve, reject) => {
            let query = '';
            //Add guild colums to repetition matrix
            query += 'ALTER TABLE `messageData` ADD COLUMN `'+id+'` BIT(1) DEFAULT 0 NOT NULL; ALTER TABLE `attributeData` ADD COLUMN `'+id+'` BIT(1) DEFAULT 0 NOT NULL;';
            //Add settings entry
            query += `INSERT INTO \`settings\` (\`guildId\`, \`muteOnViolation\`, \`muteDecayTime\`, \`prefix\`) VALUES ('${id}', ${defaultSettings.muteOnViolation}, ${defaultSettings.muteDecayTime}, '${defaultSettings.prefix}');`;

            this.guildInfo[id] = {
                mutes: Object.create(null),
                channels: new Set(),
                settings: Object.assign({}, defaultSettings)
            }
            this.sql(query)
            .then(resolve)
            .catch(reject);
        });
    }

    removeGuild(id) {
        return new Promise((resolve, reject) => {
            let query = '';
            //Remove guild colums from repetition matrix
            query += 'ALTER TABLE `messageData` DROP COLUMN `'+id+'`; ALTER TABLE `attributeData` DROP COLUMN `'+id+'`;';
            //Remove settings entry
            query += 'DELETE FROM `settings` WHERE `guildId`='+id+';';
            //Remove mutes
            query += 'DELETE FROM `mutes` WHERE `guildId`='+id+';';
            delete this.guildInfo[id];
            this.sql(query).then(resolve).catch(reject);
        });
    }

    sql(query, escapeArr) {
        return new Promise((resolve, reject) => {
            if(!query || !query.length) return reject(new TypeError('No Query specified!'));
            const opts = {
                sql: query
            };
            if(Array.isArray(escapeArr) && escapeArr.length) opts.values = escapeArr;
            connection.query(opts, function(err, res, fields) {
                if(err) return reject(err);
                resolve([res, fields]);
            });
        });
    }

    loadEvents() {
        return new Promise((resolve, reject) => {
            fs.readdir('./events/', (err, events) => {
                if (err) return reject(err);
                for (let i = 0; i < events.length; ++i) {
                    const ev = require('./events/' + events[i]);
                    this.on(events[i].split('.js')[0], ev.run);
                    delete require.cache[require.resolve('./events/' + events[i])];
                }
                resolve(events);
            });
        })
    }

    loadCommands() {
        return new Promise((resolve, reject) => {
            fs.readdir('./commands/', (err, cmds) => {
                if (err) return reject(err);
                for (let i = 0; i < cmds.length; ++i) {
                    const cmd = require('./commands/' + cmds[i]);
                    this.commands.set(cmds[i].split('.js')[0], Object.assign({
                        cooldown: new Map(),
                        usage: function(guildId) {
                            return 'Usage: `' + (guildId ? client.guildInfo[guildId].settings.prefix : defaultSettings.prefix) + this.name + ' ' + this.args + '`';
                        }
                    }, cmd));
                    delete require.cache[require.resolve('./commands/' + cmds[i])];
                }
                resolve(cmds);
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