module.exports = {
    defaultBaseDurationS: 2,
    MAX_STREAK: 23,
    MAX_MUTE_TIME: Math.pow(2, 32) - 1,
    $1hour: 3600000,
    unmuteObj: {
        "SEND_MESSAGES": null,
        "ADD_REACTIONS": null
    },
    muteObj: {
        "SEND_MESSAGES": false,
        "ADD_REACTIONS": false
    },

    unmuteUpdateChannelPerms: function(userId, guildId) {
        return new Promise(async (resolve, reject) => {
            const channels = Array.from(client.guildInfo[guildId].channels),
                guild = client.guilds.cache.get(guildId)
                member = await guild.members.fetch(userId),
                promises = [];
            for(let i = 0; i < channels.length; ++i) {
                const channel = guild.channels.cache.get(channels[i]);
                promises.push(channel.updateOverwrite(member, this.unmuteObj));
            }
            return Promise.all(promises)
            .then(() => {
                const permDeletPromise = [];
                for(let i = 0; i < channels.length; ++i) {
                    const channel = guild.channels.cache.get(channels[i]),
                        perm = channel.permissionOverwrites.get(member.id);
                    if(perm && !perm.allow.bitfield && !perm.deny.bitfield) permDeletPromise.push(perm.delete());
                };
                Promise.all(permDeletPromise).then(resolve).catch(reject);
            }).catch(reject);
        });
    },
    muteUpdateChannelPerms: function(userId, guildId) {
        return new Promise(async (resolve, reject) => {
            const channels = Array.from(client.guildInfo[guildId].channels),
                guild = client.guilds.cache.get(guildId)
                member = await guild.members.fetch(userId),
                promises = [];
            for(let i = 0; i < channels.length; ++i) {
                const channel = guild.channels.cache.get(channels[i]);
                promises.push(channel.updateOverwrite(member, this.muteObj));
            }
            return Promise.all(promises)
            .then(resolve)
            .catch(reject);
        });
    },

    unmuteNotification: function(userId, guildId) {
        return new Promise(async (resolve, reject) => {
            const channels = Array.from(client.guildInfo[guildId].channels),
                guild = client.guilds.cache.get(guildId)
                member = await guild.members.fetch(userId),
                channelStr = client.misc.endListWithAnd(channels.map(c => '<#' + c + '>'));

            member.send(client.embed.info(`You have been unmuted from **${guild.name}** and can now use the ${channelStr} channel${channels.length == 1 ? '' : 's'} again!`, 'Automatically unmuted'))
            .then(resolve)
            .catch(() => {}); // User has DMs disabled
        });
    },

    muteNotification: function(userId, guildId, len) {
        return new Promise(async (resolve, reject) => {
            const channels = Array.from(client.guildInfo[guildId].channels),
                guild = client.guilds.cache.get(guildId)
                member = await guild.members.fetch(userId),
                channelStr = client.misc.endListWithAnd(channels.map(c => '<#' + c + '>'));

            member.send(client.embed.info(`You have been muted in **${guild.name}** from the ${channelStr} channel${channels.length == 1 ? '' : 's'} for repeating a phrase!\n\nYour mute will expire in **${client.time(len)}**!`, 'Automatically muted'))
            .then(resolve)
            .catch(() => {}); // User has DMs disabled
    
        })
        
    },

    apply: function(userId, guildId) {
        const guildInfo = client.guildInfo[guildId];
        const entry = guildInfo.mutes[userId],
            streak = Math.min(entry ? entry.streak + 1 : 1, this.MAX_STREAK),
            time = Math.min(Math.pow(this.defaultBaseDurationS, streak) * 1000, this.MAX_MUTE_TIME),
            now = new Date(),
            nNow = +now;

        client.sql('INSERT INTO `mutes` (`guildId`, `userId`, `start`, `lastUpdate`, `time`, `streak`) VALUES ("'+guildId+'", "'+userId+'", ?, ?, '+time+', '+streak+') ON DUPLICATE KEY UPDATE `start` = ?, `lastUpdate` = ?, `time` = '+time+', `streak` = '+streak+';', [now, now, now, now])
        .then(() => {
            client.guildInfo[guildId].mutes[userId] = {
                start: nNow,
                lastUpdate: nNow,
                streak: streak,
                time: time
            };
            this.muteUpdateChannelPerms(userId, guildId).catch(console.error);
            this.muteNotification(userId, guildId, time);
        }).catch(console.error);
    },

    _loop() {
        const now = Date.now(),
            deletes = [],
            updates = [];
        let query = '';
        for(const guildId in client.guildInfo) {
            const guildInfo = client.guildInfo[guildId];
            for(const userId in client.guildInfo[guildId].mutes) {
                const entry = client.guildInfo[guildId].mutes[userId];

                var deleteEntry = false,
                    changeEntry = false;
                if(entry.start && entry.start + entry.time <= now) {
                    //unmute user
                    changeEntry = true;
                    const len = entry.time;
                    this.unmuteUpdateChannelPerms(userId, guildId)
                    .then(() => {
                        if(len >= 30 * 1000) this.unmuteNotification(userId, guildId);
                    })
                    .catch(console.error);
                    entry.start = null;
                    entry.time = null;
                }

                if(entry.streak > 0 && now - (this.$1hour * guildInfo.settings.muteDecayTime) >= entry.lastUpdate) {
                    //lower streak
                    changeEntry = true;
                    entry.lastUpdate = now;
                    entry.streak -= 1;
                    if(entry.streak < 0) entry.streak = 0;
                }

                if(entry.streak <= 0 && !entry.start) {
                    deleteEntry = true;
                    delete client.guildInfo[guildId].mutes[userId];
                }

                if(changeEntry && !deleteEntry) {
                    updates.push(Object.assign({userId, guildId}, entry));
                } else if(deleteEntry) {
                    deletes.push([userId, guildId]);
                }
            }
        }

        if(deletes.length) {
            query += 'DELETE FROM `mutes` WHERE (`guildId`="'+deletes[0][1]+'" AND `userId`="'+deletes[0][0]+'")';
            if(deletes.length >= 2) {
                for(let i = 1; i < deletes.length; ++i) {
                    query += ' OR (`guildId`="'+deletes[i][1]+'" AND `userId`="'+deletes[i][0]+'")';
                }
            };
            query += ';';
        };

        const escapes = [];
        for(let i = 0; i < updates.length; ++i) {
            query += 'UPDATE `mutes` SET `start`=?,`lastUpdate`=?,`time`=?,`streak`='+updates[i].streak+' WHERE `userId`="'+updates[i].userId+'" AND `guildId`="'+updates[i].guildId+'";';
            const start = updates[i].start ? new Date(updates[i].start) : null,
                time = updates[i].time || null;
            escapes.push(start, new Date(updates[i].lastUpdate), time);
        }

        if(query.length) {
            client.sql(query, escapes).catch(console.error);
        }
    }
}