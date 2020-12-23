Array.prototype.random = function() {
    return this[(Math.random() * this.length) | 0];
}

const emptyStringChannels = [
    '#general',
    '#r9k',
    '#signal',
    '#welcome',
    '#hideout',
    '#spam',
    '#bot-commands'
]

class CommandListing {
    constructor(opts) {
        this.info = opts;
        this.combinations = [];
        this.el = this.createHtmlStructure(opts);

        this.emptyString = 'Message ' + emptyStringChannels.random();
        this.writtenText = this.emptyString;
        this.testBarString = '';
        this.previousTestBarString = '';
        this.animationTimer = 0;
        this.state = 'write';
    }

    updateTextBar() {
        switch(this.state) {
            case 'write' :
                this.text.style.color = '#dcddde';
                if(!this.testBarString) this.generateTestBarString();
                let char = this.testBarString.charAt(this.animationTimer++);
                if(this.writtenText == this.emptyString) this.writtenText = char;
                else this.writtenText += char;
                if(this.animationTimer == this.testBarString.length) {
                    this.animationTimer = 0;
                    this.state = 'wait';
                }
                break;
            case 'wait' :
                this.animationTimer++;
                if(this.animationTimer >= 12) {
                    this.animationTimer = 0;
                    if(this.writtenText == this.emptyString) this.state = 'write';
                    else this.state = 'erase';
                }
                break;
            case 'erase' :
                if(!this.writtenText) {
                    this.writtenText = this.emptyString;
                    this.previousTestBarString = this.testBarString;
                    this.testBarString = '';
                    this.text.style.color = '#72767d';
                    this.state = 'wait';
                    break;
                }
                this.writtenText = this.writtenText.substring(0, this.writtenText.length - 1);
                break;
        }
        this.text.innerHTML = this.writtenText;
    }

    generateTestBarString() {
        function solve(arr) {
            const item = arr.random();
            if(typeof item == 'string') return item;
            else return solve(item);
        }
        let str = '&' + (Math.random() > 0.5 ? this.info.name : this.info.aliases.random());
        const item = this.info.examples.random();
        if(typeof item == 'string') str += ' ' + item;
        else if(item)
         for(let i = 0; i < item.length; ++i) {
            if(typeof item[i] == 'string') str += ' ' + item[i];
            else str += ' ' + solve(item[i]);
        }
        if(str == this.previousTestBarString) return this.generateTestBarString();
        this.testBarString = str;
    }

    createHtmlStructure(opts) {
        const $ = t => window.document.createElement(t);

        const div = $('div'),
            title = $('h2'),
            aliases = $('p'),
            description = $('p'),
            textbox = $('div'),
            button = $('div'),
            codeButton = $('div'),
            text = $('span');

        div.classList.add('command');
        div.id = '_' + opts.name
        aliases.innerHTML = opts.aliases.join(', ');
        description.innerHTML = opts.description;
        title.innerHTML = opts.name;
        title.onclick = () => window.location.hash = opts.name;
        aliases.classList.add('aliases');
        textbox.classList.add('textbox');
        button.classList.add('button');
        codeButton.classList.add('source');
        codeButton.onclick = () => window.location.href = 'https://github.com/Caltrop256/signal-discord-r9k-bot/blob/main/bot/commands/'+opts.name+'.js'
        text.classList.add('text');

        codeButton.innerHTML = '<svg height="512" viewBox="0 0 512 512" width="512" xmlns="http://www.w3.org/2000/svg"><path d="m448 182.059v-98.059c0-46.317-37.682-84-84-84h-44c-13.255 0-24 10.745-24 24s10.745 24 24 24h44c19.851 0 36 16.149 36 36v108c0 6.365 2.529 12.47 7.029 16.971l47.03 47.029-47.029 47.029c-4.501 4.501-7.03 10.606-7.03 16.971v108c0 19.851-16.149 36-36 36h-44c-13.255 0-24 10.745-24 24s10.745 24 24 24h44c46.318 0 84-37.683 84-84v-98.059l56.971-56.971c9.373-9.373 9.373-24.568 0-33.941z"/><path d="m64 428c0 46.317 37.682 84 84 84h44c13.255 0 24-10.745 24-24s-10.745-24-24-24h-44c-19.851 0-36-16.149-36-36v-108c0-6.365-2.529-12.47-7.029-16.971l-47.03-47.029 47.029-47.029c4.501-4.501 7.03-10.606 7.03-16.971v-108c0-19.851 16.149-36 36-36h44c13.255 0 24-10.745 24-24s-10.745-24-24-24h-44c-46.318 0-84 37.683-84 84v98.059l-56.971 56.97c-9.373 9.373-9.373 24.568 0 33.941l56.971 56.971z"/></svg>';
        button.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M12 2.00098C6.486 2.00098 2 6.48698 2 12.001C2 17.515 6.486 22.001 12 22.001C17.514 22.001 22 17.515 22 12.001C22 6.48698 17.514 2.00098 12 2.00098ZM17 13.001H13V17.001H11V13.001H7V11.001H11V7.00098H13V11.001H17V13.001Z"></path></svg>';

        textbox.appendChild(button);
        textbox.appendChild(text);
        div.appendChild(title);
        div.appendChild(codeButton);
        div.appendChild($('br'));
        div.appendChild(aliases);
        div.appendChild(description);
        div.appendChild(textbox);

        if(opts.perms) {
            const perms = $('p');
            perms.innerHTML = opts.perms;
            perms.classList.add('perms');
            div.appendChild(perms);
        }

        this.text = text;

        return div;
    }
}

const channels = [
    'general',
    'signal-bot',
    'my-favourite-channel',
    '559034526362501131',
    ...emptyStringChannels
]

const members = [
    'Caltrop#0001',
    'CheeseBoye',
    '@Clod',
    '214298654863917059',
    'seanie',
    'sarah',
    'Wumpus',
    'xXShadowWarriorXx'
]

const commands = [
    {
        name: 'channels',
        aliases: ['ch', 'channel', 'network', 'networks'],
        description: 'Allows you to add or remove channels from the network. Use this to establish which channels the bot should be active in! Manage Guild permissions are required to run this command.',
        examples: [
            '',
            [['add', 'a', 'connect', 'c', 'remove', 'r', 'disconnect', 'd'], channels]
        ],
        perms: 'Manage Guild'
    },
    {
        name: 'check',
        aliases: ['availability', 'available', 'used', 'alreadyused', 'words'],
        description: 'Checks if a word or phrase has already been used in the Guild you are in. Additionally, it also tells you in how many guilds the phrase has been said!',
        examples: [
            'has this been used?',
            'how about this',
            'r9k',
            'hello world!',
            'hey',
            'yeah',
            'What the fuck did you just fucking say about me, you little bitch?'
        ]
    },
    {
        name: 'clear',
        aliases: ['clr', 'reset'],
        description: 'Running this command will completely reset your guild\'s dataset! All previously banned words will become available again. It is highly recommended to make a backup using the <a href="#download">download</a> command before clearing your dataset!',
        examples: [],
        perms: 'Manage Guild'
    },
    {
        name: 'download',
        aliases: ['dl', 'backup'],
        description: 'Creates a copy of your dataset in the form of a .r9k file. You can later upload this file using the <a href="#upload">upload</a> command to restore your dataset!',
        examples: [],
        perms: 'Manage Messages'
    }, 
    {
        name: 'help',
        aliases: ['commands', 'cmds'],
        description: 'Displays a list of all commands and links to this page! Please note that the bot will default to running this command when no other command is specified.',
        examples: []
    },
    {
        name: 'invite',
        aliases: ['inv'],
        description: 'Provides you with a Discord-Invite Link, which allows you to add this bot to your own Guilds!',
        examples: []
    }, 
    {
        name: 'mute',
        aliases: ['warn', 'addviolation', 'addv'],
        description: 'Allows you to manually issue a violation to someone. Muting somebody will temporarily ban them from any channels specified with the <a href="#channels">channels</a> command, as if the user had sent a non-unique message.',
        examples: members,
        perms: 'Manage Messages'
    },
    {
        name: 'ping',
        aliases: ['latency', 'pong', 'lat', 'status'],
        description: 'Displays the bot\'s ping and other miscellaneous information.',
        examples: []
    },
    {
        name: 'setstreak',
        aliases: ['changestreak', 'setnonce', 'changenonce'],
        description: 'The streak is the amount of times a user has violated the repititon rule within 6 hours. Using this command you can adjust the streak for yourself or optionally for someone else.',
        examples: [
            [Array.from({length: 23}, (_, i) => String(i)), ['', members]]
        ],
        perms: 'Manage Messages'
    },
    {
        name: 'settings',
        aliases: ['sets', 'perferences', 'prefs', 'options', 'opts'],
        description: 'Allows you to adjust or change some of the functionality of the bot, such as the command-prefix, mute decay time, or if the bot should automatically mute on violation at all.',
        examples: [
            '',
            ['mute', ['yes', 'y', 'on', 'true', '1', 'do', 'no', 'n', 'off', 'false', '0', 'dont', 'don\'t']],
            ['decay', ['6', '1', '3', '12', '24', '1.5', '4.2', '100']],
            ['prefix', ['$', '?', '>>', '!', '&']]
        ],
        perms: 'Manage Guild'
    },
    {
        name: 'streak',
        aliases: ['nonce', 'getstreak', 'viewstreak'],
        description: 'Displays your or another member\'s current streak and shows you how long their next mute would be!',
        examples: [
            '',
            [members]
        ]
    },
    {
        name: 'unmute',
        aliases: ['pardon'],
        description: 'Removes a previously applied mute from a user.',
        examples: members,
        perms: 'Manage Messages'
    },
    {
        name: 'upload',
        aliases: ['uploadbackup'],
        description: 'Attach a .r9k file obtained from running the <a href="#download">download</a> command to return to the previous dataset.',
        examples: [],
        perms: 'Manage Guild'
    }
];

const commandListings = commands.map(c => new CommandListing(c));

const list = window.document.getElementById('list');
for(let i = 0; i < commandListings.length; ++i) {
    list.appendChild(commandListings[i].el);
}

setInterval(function() {
    for(let i = 0; i < commandListings.length; ++i) {
        commandListings[i].updateTextBar();
    }
}, 55);

function handleHash() {
    const hash = window.location.hash.substring(1);
    if(!hash) return;
    const el = window.document.getElementById('_' + hash);
    if(el) el.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
    });
}
window.addEventListener('wheel', () => window.location.hash = '');
window.addEventListener('hashchange', handleHash);
window.setTimeout(handleHash, 10);