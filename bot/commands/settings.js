const p2n = {
    muteOnViolation: 'mute',
    muteDecayTime: 'decay',
    prefix: 'prefix'
};

module.exports = {
    name: 'settings',
    aliases: ['sets', 'perferences', 'prefs', 'options', 'opts'],
    args: '[setting] [value]',
    rate: 5,
    perms: ['MANAGE_GUILD'],

    run: async function(handler, msg, args, output) {
        const gid = msg.channel.guild.id,
            current = Object.assign({}, client.guildInfo[gid].settings);
        if(!args.length) {
            const embed = client.embed.info('You may change these values by doing **'+current.prefix+'settings <setting name> <value>**', 'Settings')
            .addField('🗣️ Mute', '**' + (current.muteOnViolation ? 'Yes' : 'No') + '**', true)
            .addField('⏲️ Decay', '**' + current.muteDecayTime + ' hour'+(current.muteDecayTime == 1 ? '' : 's')+'**', true)
            .addField('🔑 Prefix', '**' + current.prefix + '**', true);

            return output.send(embed);
        } else if(args.length >= 2) {
            if(!client.misc.getPerms(msg.member).includes('MANAGE_GUILD')) return output.send(client.embed.invalid('You are missing the **manage guild** permission!\n\nConsider asking a Moderator for help.', 'Missing Permissions'));

            var target = '',
                escape = [];

            switch(args[0].toLowerCase()) {
                case 'mute':
                    const booleanYes = ['yes', 'y', 'on', 'true', '1', 'do'].includes(args[1].toLowerCase()),
                        booleanNo = ['no', 'n', 'off', 'false', '0', 'dont', 'don\'t'].includes(args[1].toLowerCase());
                    if(!booleanYes && !booleanNo) return output.send(client.embed.invalid('Mute parameters must either be **true** or **false**', 'Invalid arguments'));
                    const newMuteValue = (booleanYes && !booleanNo);
                    if(newMuteValue == current.muteOnViolation) return output.send(client.embed.invalid('Mute on violation is already set to **' + String(!!newMuteValue) + '**', 'Already set'));
                    target = 'muteOnViolation';
                    escape.push(newMuteValue);
                    break;
                case 'decay' :
                    const num = Number(args[1]);
                    if(isNaN(num) || !isFinite(num) || num <= 0) return output.send(client.embed.invalid('Decay time must be a number larger than 0', 'Invalid arguments'));
                    if(num == current.muteDecayTime) return output.send(client.embed.invalid('Decay time is already set to **'+num+'**', 'Invalid arguments'));
                    target = 'muteDecayTime';
                    escape.push(num);
                    break;
                case 'prefix' :
                    const newPrefix = String(args[1]).trim();
                    if(newPrefix == current.prefix) return output.send(client.embed.invalid('Prefix is already set to **'+newPrefix+'**', 'Invalid arguments'));
                    if(!newPrefix || newPrefix.length > 3 || !newPrefix.length) return output.send(client.embed.invalid('Prefix must be at least 1 character long and may not exceed 3 characters!', 'Invalid arguments'));
                    target = 'prefix';
                    escape.push(newPrefix);
                    break;
                default :
                    return output.send(client.embed.invalid('Setting to change must either be **mute**, **decay**, or **prefix**', 'Invalid arguments'));
            };

            client.sql('UPDATE `settings` SET `'+target+'` = ? WHERE `guildId` = "'+gid+'";', escape).then(() => {
                client.guildInfo[gid].settings[target] = escape[0];
                output.send(client.embed.success('Successfully updated the **' + p2n[target] + '** setting!', 'Successfully updated settings'));
            }).catch(handler);
        } else output.send(client.embed.invalid('Invalid amount of arguments', 'Invalid arguments', this, gid));
    }
}