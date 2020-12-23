module.exports = {
    name: 'eval',
    aliases: ['ev'],
    args: '',
    perms: ['DEV'],


    run: async function(handler, msg, args, output) {
        try {
            const code = args.join(" ");
            let evaled = eval(code);

            if (typeof evaled !== "string")
                evaled = require("util").inspect(evaled);
            if(evaled.length >= 1000 && !(await client.misc.confirm(output, msg.member.id, `The result is **${evaled.length} characters** long, are you sure you wanna output it?`, 'Confirm output'))) return;
            output.send(evaled, {
                code: "xl",
                split: true
            });
        } catch (err) {
            output.send(`\`ERROR\`\n\`\`\`xl\n${(err)}\n\`\`\``);
        }
    }
}