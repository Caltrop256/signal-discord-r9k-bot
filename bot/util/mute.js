module.exports = {
    name: 'mute',
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

    unmuteNotification: function(userId, guildId, applyId) {
        return new Promise(async (resolve, reject) => {
            if(client.ignoredUsers.has(userId)) return resolve(void 0);
            const channels = Array.from(client.guildInfo[guildId].channels),
                guild = client.guilds.cache.get(guildId)
                member = await guild.members.fetch(userId),
                applying = applyId ? await guild.members.fetch(applyId) : null,
                channelStr = client.misc.endListWithAnd(channels.map(c => '<#' + c + '>'));

            member.send(client.embed.info(`You have been unmuted from **${guild.name}**${applying ? ` by ${applying}` : ''} and can now use the ${channelStr} channel${channels.length == 1 ? '' : 's'} again!`, (applying ? 'Manually' : 'Automatically') + ' unmuted'))
            .then(resolve)
            .catch(() => {}); // User has DMs disabled
        });
    },

    muteNotification: function(userId, guildId, len, applyId) {
        return new Promise(async (resolve, reject) => {
            if(client.ignoredUsers.has(userId)) return resolve(void 0);
            const channels = Array.from(client.guildInfo[guildId].channels),
                guild = client.guilds.cache.get(guildId)
                member = await guild.members.fetch(userId),
                applying = applyId ? await guild.members.fetch(applyId) : null,
                channelStr = client.misc.endListWithAnd(channels.map(c => '<#' + c + '>'));

            member.send(client.embed.info(`You have been muted${applying ? ` by ${applying}` : ''} in **${guild.name}** from the ${channelStr} channel${channels.length == 1 ? '' : 's'} for repeating a phrase!\n\nYour mute will expire in **${client.time(len)}**!`, (applying ? 'Manually' : 'Automatically') +  ' muted'))
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

        client.sql.updateMuteEntry(guildId, userId, now, now, streak, time).then(() => {
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

        client.sql.updateMuteEntries(updates, deletes);
    }
}