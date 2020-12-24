const leven = require('leven');

module.exports = {    
    name: 'misc',
    punctuationRegex: /[!-/:-@[-`{-~¡-©«-¬®-±´¶-¸»¿×÷˂-˅˒-˟˥-˫˭˯-˿͵;΄-΅·϶҂՚-՟։-֊־׀׃׆׳-״؆-؏؛؞-؟٪-٭۔۩۽-۾܀-܍߶-߹।-॥॰৲-৳৺૱୰௳-௺౿ೱ-ೲ൹෴฿๏๚-๛༁-༗༚-༟༴༶༸༺-༽྅྾-࿅࿇-࿌࿎-࿔၊-၏႞-႟჻፠-፨᎐-᎙᙭-᙮᚛-᚜᛫-᛭᜵-᜶។-៖៘-៛᠀-᠊᥀᥄-᥅᧞-᧿᨞-᨟᭚-᭪᭴-᭼᰻-᰿᱾-᱿᾽᾿-῁῍-῏῝-῟῭-`´-῾\u2000-\u206e⁺-⁾₊-₎₠-₵℀-℁℃-℆℈-℉℔№-℘℞-℣℥℧℩℮℺-℻⅀-⅄⅊-⅍⅏←-⏧␀-␦⑀-⑊⒜-ⓩ─-⚝⚠-⚼⛀-⛃✁-✄✆-✉✌-✧✩-❋❍❏-❒❖❘-❞❡-❵➔➘-➯➱-➾⟀-⟊⟌⟐-⭌⭐-⭔⳥-⳪⳹-⳼⳾-⳿⸀-\u2e7e⺀-⺙⺛-⻳⼀-⿕⿰-⿻\u3000-〿゛-゜゠・㆐-㆑㆖-㆟㇀-㇣㈀-㈞㈪-㉃㉐㉠-㉿㊊-㊰㋀-㋾㌀-㏿䷀-䷿꒐-꓆꘍-꘏꙳꙾꜀-꜖꜠-꜡꞉-꞊꠨-꠫꡴-꡷꣎-꣏꤮-꤯꥟꩜-꩟﬩﴾-﴿﷼-﷽︐-︙︰-﹒﹔-﹦﹨-﹫！-／：-＠［-｀｛-･￠-￦￨-￮￼-�]|\ud800[\udd00-\udd02\udd37-\udd3f\udd79-\udd89\udd90-\udd9b\uddd0-\uddfc\udf9f\udfd0]|\ud802[\udd1f\udd3f\ude50-\ude58]|\ud809[\udc00-\udc7e]|\ud834[\udc00-\udcf5\udd00-\udd26\udd29-\udd64\udd6a-\udd6c\udd83-\udd84\udd8c-\udda9\uddae-\udddd\ude00-\ude41\ude45\udf00-\udf56]|\ud835[\udec1\udedb\udefb\udf15\udf35\udf4f\udf6f\udf89\udfa9\udfc3]|\ud83c[\udc00-\udc2b\udc30-\udc93]/g,

    getPerms(member) {
        const perms = [],
            P = global.Discord.Permissions;
        for(const flag in P.FLAGS) if ((P.FLAGS[flag] & member.permissions.bitfield) == P.FLAGS[flag]) perms.push(flag);
        if(member.id == member.guild.ownerID) perms.push('GUILD_OWNER');
        if(member.id == client.developers[0]) perms.push('BOT_OWNER');
        if(client.developers.includes(member.id)) perms.push('DEV');
        return perms;
    },

    confirm(output, userId, desc, title = 'Confirm Selection', del = true) {
        return new Promise(resolve => {
            const embed = client.embed._base()
                .setAuthor(title)
                .setDescription(desc || 'An Error occured: No confirmation description specified!')
                .setColor(0xE9B41A)
                .attachFiles(client.images[2])
                .setThumbnail('attachment://thumbnail.png')
                .setTimestamp();
            output.send({
                    embed
            })
            .then(async msg => {
                const emojis = ['✅', '❎']
                await msg.react(emojis[0]);
                await msg.react(emojis[1]);
                const filter = () => 1;
                const collector = msg.createReactionCollector(filter, {
                    time: 60000
                });
                collector.on('collect', reaction => {
                    if (!emojis.includes(reaction.emoji.name)) return msg.reactions.cache.last().remove(reaction.users.cache.first().id).catch(() => {});
                    for (var u of reaction.users.cache) {
                        if ((u[0] != msg.author.id) && (u[0] != userId)) {
                            return reaction.remove(u[0]).catch(() => {});
                        };
                    };
                    collector.stop();
                    resolve(reaction.emoji.name == emojis[0]);
                });
                collector.on('end', () => {
                    if (del) msg.delete().catch(() => {});
                });
            })
        })
    },
    similarity: function(a,b) {
        const max = Math.max(a.length, b.length);
        return (max - leven(a.toLowerCase(), b.toLowerCase())) / max;
    },
    endListWithAnd(arr, useOr) {
        if(!arr.length) return '';
        if(arr.length == 1) return arr[0];
        let str = '';
        for(let i = 0; i < arr.length - 1; ++i) {
            if(i) str += ', ';
            str += arr[i];
        }
        str += (arr.length == 2 ? ' ' : ', ')+(useOr ? 'or' : 'and')+' ' + arr[arr.length - 1];
        return str;
    }
}