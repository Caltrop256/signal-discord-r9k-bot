const mySQL = require('mysql'),
    config = require('../config.json');

const pool = mySQL.createPool(Object.assign({multipleStatements: true}, config.mySQL))


function sql(sql, escapeArr) {
    return new Promise((resolve, reject) => {
        if(!sql || !sql.length) return reject(new TypeError('No Query specified!'));
        const opts = {sql};
        if(Array.isArray(escapeArr) && escapeArr.length) opts.values = escapeArr;
        pool.query(opts, function(err, res, fields) {
            if(err) return reject(err);
            resolve([res, fields]);
        });
    });
};

module.exports = Object.assign(sql, {
    _name: 'sql',
    _pool: pool,
    query: sql,

    test(f, args) {
        const func = this[f];
        if(!func) throw TypeError('Unknown Function');
        return func.apply({query: function() {return [...arguments]}}, args);
    },

    describe(table) {
        return this.query('DESCRIBE `'+table+'`;');
    },

    select(table, field) {
        field = field ? '`' + field + '`' : '*';
        return this.query(`SELECT ${field} FROM \`${table}\`;`);
    },

    selectWhere(table, column, condition, field, limit) {
        field = field ? '`' + field + '`' : '*';
        let query = `SELECT ${field} FROM \`${table}\` WHERE \`${column}\`=?`;
        if(limit) query += ' LIMIT ' + limit;
        query += ';';
        return this.query(query, [condition]);
    },

    addOptOutEntry(id) {
        return this.query('INSERT INTO `dontDM` (`userId`) VALUES ("'+id+'")');
    },

    deleteWhere(table, column, condition) {
        return this.query('DELETE FROM `'+table+'` WHERE `'+column+'`='+condition+';');
    },

    addChannel(guildId, channelId) {
        return this.query('INSERT IGNORE INTO `channels` (`guildId`, `channelId`) VALUES ("'+guildId+'", "'+channelId+'");');
    },

    deleteChannel(guildId, channelId) {
        return this.query('DELETE FROM `channels` WHERE `guildId` = "'+guildId+'" AND `channelId` = "'+channelId+'";');
    },

    clearDataset(guildId) {
        return this.query('UPDATE `messageData` SET `'+guildId+'`=0; UPDATE `attributeData` SET `'+guildId+'`=0;');
    },

    selectGuildMessageData(guildId) {
        return this.query('SELECT `content` FROM `messageData` WHERE `'+guildId+'`=1; SELECT `hash` FROM `attributeData` WHERE `'+guildId+'`=1;');
    },

    updateMuteEntry(guildId, userId, start, lastUpdate, streak, time = null) {
        start = start ? new Date(start) : null;
        lastUpdate = new Date(lastUpdate);
        return this.query(
`INSERT INTO \`mutes\` (\`guildId\`, \`userId\`, \`start\`, \`lastUpdate\`, \`time\`, \`streak\`) VALUES \
("${guildId}", "${userId}", ?, ?, ${time}, ${streak}) ON DUPLICATE KEY UPDATE \
\`start\` = ?, \`lastUpdate\` = ?, \`time\` = ${time}, \`streak\` = ${streak};`,
            [start, lastUpdate, start, lastUpdate]
        );
    },

    changeSettings(guildId, setting, value) {
        return this.query('UPDATE `settings` SET `'+setting+'` = ? WHERE `guildId` = "'+guildId+'";', [value]);
    },

    createDefaultSettings(guildId) {
        const defaultSettings = config.defaultSettings;
        return this.query(`INSERT IGNORE INTO \`settings\` (\`guildId\`, \`muteOnViolation\`, \`muteDecayTime\`, \`prefix\`) VALUES ('${guildId}', ${defaultSettings.muteOnViolation}, ${defaultSettings.muteDecayTime}, '${defaultSettings.prefix}');`);
    },

    checkAndAppendMessageData(guildId, content) {
        return new Promise((resolve, reject) => {
            this.query('CALL selectAndUpdate(?,?);', [content, guildId]).then(([rows]) => {
                const entry = rows[0][0]['id'] || rows[0][0][guildId];
                return resolve(!(entry && entry[0]));
            }).catch(reject);
        });
    },

    checkAndAppendAttributeDataArray(guildId, hashes) {
        return new Promise((resolve, reject) => {
            const escape = Array.from({length: hashes.length * 2}, (_, i) => hashes[(i * 0.5) | 0]);
            const query = (
`SELECT * FROM \`attributeData\` WHERE \`hash\`=? AND \`${guildId}\`=1 LIMIT 1; INSERT INTO \`attributeData\` \
(\`hash\`, \`${guildId}\`) VALUES (?, 1) ON DUPLICATE KEY UPDATE \`${guildId}\`=1;`           
            ).repeat(hashes.length);
            
            this.query(query, escape).then(([rows]) => {
                let valid = false;
                for(let i = 0; i < rows.length; i += 2) {
                    if(!rows[i].length) {
                        valid = true;
                        break;
                    }
                }
                resolve(valid);
            }).catch(reject);
        });
    },

    updateMuteEntries(updates, deletes) {
        const promises = [];
        let query = '';
        for(let i = 0; i < deletes.length; ++i) {
            query += 'DELETE FROM `mutes` WHERE (`guildId`="'+deletes[i][1]+'" AND `userId`="'+deletes[i][0]+'");';
        };
        if(deletes.length) promises.push(this.query(query));
        for(let i = 0; i < updates.length; ++i) {
            promises.push(this.updateMuteEntry(updates[i].guildId, updates[i].userId, updates[i].start, updates[i].lastUpdate, updates[i].streak, updates[i].time));
        }
        return Promise.all(promises);
    },

    tableHasColumn(table, column) {
        return new Promise((resolve, reject) => {
            this.query('SHOW COLUMNS FROM `'+table+'` LIKE "'+column+'"').then(([rows]) => {
                resolve(!!rows.length);
            }).catch(reject);
        })
    },

    addColumnIfNotExists(table, column) {
        return new Promise((resolve, reject) => {
            this.tableHasColumn(table, column).then(hasColumn => {
                if(hasColumn) return resolve(false);
                this.query('ALTER TABLE `'+table+'` ADD COLUMN `'+column+'` BIT(1) DEFAULT 0 NOT NULL;')
                .then(resolve)
                .catch(reject);
            }).catch(reject);
        });
    },

    dropColumnIfExists(table, column) {
        return new Promise((resolve, reject) => {
            this.tableHasColumn(table, column).then(hasColumn => {
                if(!hasColumn) return resolve(false);
                this.query('ALTER TABLE `'+table+'` DROP COLUMN `'+column+'`;')
                .then(resolve)
                .catch(reject);
            }).catch(reject);
        })
    }
});