# Signal

## An Easy to use R9K Bot

Signal attempts to improve a Discord Channel's *signal*-to-noise ratio by applying [Randall Munroe's R9K moderation system](https://blog.xkcd.com/2008/01/14/robot9000-and-xkcd-signal-attacking-noise-in-chat/)!

 
 ### Table of Contents:
 
* [Introduction](#Introduction)
* [Implementation Details](#Implementation-Details)
* * [Text](#Text)
* * * [Regular Text](#Regular-Text)
* * * [Emojis](#Emojis)
* * * [Mentions](#Mentions)
* * [Attachments](#Attachments)
* * [Embeds](#Embeds)
* * [Mixed Content](#Mixed-Content)
* * [Mutes](#Mutes)
* [Building](#Building)
* [License](#License)

### Introduction
Signal works by checking every new message in a given amount of channels against all previously sent channels.
If the new message is deemed as not unique enough it will be deleted, and the sender of the message will be temporarily
muted from the channel. The mute time is determined by the amount of recent violations.

The goal of this system is to promote slower and more thought-out conversation amongst members. Short or repetitive filler
messages will quickly get used up, forcing members to participate in more verbose and constructive conversation.
During testing the bot was often praised for creating channels that offer consistently solid discussion and enjoyable casual
conversation, without the need for excessive moderator intervention.

### Implementation-Details
Since there are no official specifications for how an R9K moderation system should operate and due to some of Discord's own quirks
this R9K implementation might differ from others. You will find a description of how the bot behaves below:

#### Text
Anything that isn't an attachment, an embed, or a system message is considered text.

##### Regular-Text
The bot only tries to compare the most important aspect of the text content, which is why it completely ignores 
secondary characteristics such as case and punctuation. `Yeah, I got it`, `yeah, i got it`, and `Yeah i got it`
are all technically unique messages, however, permitting tiny insignificant changes between messages goes against
the spirit of R9K, which is why the bot will treat them as if they were the same message.

Some R9K implementations resolve this by only focusing on Latin characters and ignoring all others, however, this has
the very noticeable drawback of making the bot unusable for members whose language uses a different alphabet or writing system.
Signal allows all characters by default but filters out a set list of punctuation and miscellaneous symbols, this allows for use
of diacritics, non-Latin symbols, and other important characters as long as they aren't in the punctuation list.

Additionally, all white space characters are replaced with a single space character (`U+0020`). For example: two new lines in a row will simply become a single space character.

##### Emojis
Discord encodes all custom server emoji in the following format: `<:emoji_name:emoji_id>`. This gives Discord Users with Nitro
the opportunity to upload the same emoji to multiple Guilds, thereby theoretically allowing them to send non-unique messages, as the id is different. To combat this, the bot will only consider the names of emojis. Before comparison begins they are formated as `:emoji_name:` instead.

No special formatting or consideration is given for Unicode emojis.

##### Mentions
No special formatting is applied to role-, channel-, or member-mentions.

#### Attachments
An attachment is any kind of file uploaded alongside a user's message. The bot uses metadata such as the file-size, file-name,
width and height (for images), and more to determine the uniqueness of an attachment. It is important to note that the bot only
considers metadata and not the actual contents of a file. This is done to preserve resources, as members can upload files of up to
100 megabytes in size, downloading every single file would seriously weigh down on the performance of the bot.

#### Embeds
Embeds are special messages which only bots and modified-clients are able to send, to ensure compatibilities with other bots these are taken into account as well.

#### Mixed-Content
A message can consist of multiple of the above elements at once, for example, a message containing both text and an image-attachment. In these cases the bot will check if either of the two is unique, the message only gets flagged as a violation if **all** elements in it are a repetition of previous content.

The following table visualizes in which cases a message would get deleted:

||unique Attachment|violating Attachment|
|---|---|---|
|**unique Text**|No|No
|**violating Text**|No|Yes

This rule holds true even when the message contains multiple attachments or embeds, only a single element must be unique.

#### Mutes

Once the bot has deleted a violating message it will temporarily mute the author of that message. The time of the mute depends
on the user's `streak`. Every time a user gets muted their `streak` increases by 1, then the mute time (in seconds) is calculated using the
following formula: `pow(2, streak)`. This means that the time muted doubles on each consecutive violation:
|Streak|Time|
|---|---|
|1|2 seconds|
|2|4 seconds|
|3|8 seconds|
|4|16 seconds|
|5|32 seconds|
|6|1 minute and 4 seconds|
|etc|etc|

If a member goes a set amount of time without getting muted their `streak` decreases by 1. The exact amount of time they have 
to wait can be configured using the settings command: `&settings decay 1.5`, the default is 6 hours.

Automatic mutes can be turned off using the settings command: `&settings mute no`.

Mutes may also be issued by a moderator with manage messages permissions by using the `&mute` command. Manual mutes behave exactly
as if the bot had detected a violation.

### Building

Clone the repository:

 `$ git clone https://github.com/Caltrop256/signal-discord-r9k-bot`
 
 Move into the bot's directory:
 
 `$ cd signal-discord-r9k-bot/bot`
 
 Install dependencies:
 
 `$ npm install`
 
 Rename `config.example.json` to `config.json` and fill out all fields.
 

### License
The Signal project is licensed under the [GNU General Public License v3.0](https://github.com/Caltrop256/signal-discord-r9k-bot/blob/main/LICENSE). You may copy, distribute and modify the software as long as you track changes/dates in source files. Any modifications to this project must be made available under the GPL along with build & install instructions.