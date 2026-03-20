// main.js - Render.com için özel
const fs = require('fs');
const { Client, GatewayIntentBits, ActivityType, WebhookClient } = require('discord.js');
const express = require('express');
const chalk = require('chalk');

// Konfigürasyonu yükle
let config = {};
try {
    config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
} catch (e) {
    console.log(chalk.yellow('[!] config.json bulunamadı, varsayılan ayarlar kullanılacak'));
    config = {
        Mobile_Status: true,
        Status_Texts: ["J4J Bot", "Herkese yardım"],
        Status_Emojis: ["🤖", "🔥"],
        Webhook: "",
        Invite_Guild_ID: "",
        Status: "online",
        Delay: 30,
        Guild_ID: "",
        J4J_Channel_Names: ["j4j", "join"],
        Channel_Messages: ["Join my server!"],
        DM_Messages: ["Merhaba!"],
        Done_Messages: ["Teşekkürler!"],
        WebServer: true
    };
}

// Token'ı ortam değişkeninden al
const token = process.env.TOKEN;
if (!token) {
    console.error(chalk.red('[!] TOKEN ortam değişkeni ayarlanmamış!'));
    console.log(chalk.yellow('Render Dashboard -> Environment Variables -> TOKEN ekleyin'));
    process.exit(1);
}

// Webhook (opsiyonel)
let webhookClient = null;
if (config.Webhook && config.Webhook !== "") {
    try {
        webhookClient = new WebhookClient({ url: config.Webhook });
    } catch(e) {}
}

// Log fonksiyonları
function logSuccess(msg) {
    console.log(chalk.green(`[+] ${msg}`));
    if (webhookClient) webhookClient.send({ content: `[+] ${msg}` }).catch(() => {});
}
function logError(msg) {
    console.log(chalk.red(`[!] ${msg}`));
    if (webhookClient) webhookClient.send({ content: `[!] ${msg}` }).catch(() => {});
}
function logInfo(msg) {
    console.log(chalk.cyan(`[i] ${msg}`));
}

// Client oluştur
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.GuildMembers
    ]
});

const dmCooldown = new Map();

client.once('ready', async () => {
    logSuccess(`${client.user.tag} giriş yaptı! (Render.com)`);

    // Mobile status spoof
    if (config.Mobile_Status) {
        try {
            const ws = client.ws;
            if (ws && ws.connection && ws.connection.identify) {
                const originalIdentify = ws.connection.identify;
                ws.connection.identify = function(payload) {
                    payload.d.properties.$os = "Discord iOS";
                    payload.d.properties.$browser = "Discord iOS";
                    payload.d.properties.$device = "iOS";
                    return originalIdentify.call(this, payload);
                };
            }
        } catch (e) {}
    }

    // Status rotasyonu
    let statusIndex = 0;
    setInterval(() => {
        if (config.Status_Texts && config.Status_Texts.length) {
            const text = config.Status_Texts[statusIndex % config.Status_Texts.length];
            const emoji = config.Status_Emojis?.[statusIndex % config.Status_Emojis?.length] || "🤖";
            const status = config.Status === 'online' ? 'online' :
                           config.Status === 'idle' ? 'idle' :
                           config.Status === 'dnd' ? 'dnd' : 'online';
            client.user.setPresence({
                activities: [{ name: `${emoji} ${text}`, type: ActivityType.Custom }],
                status: status
            });
            statusIndex++;
        }
    }, 15000);

    // Kanal mesajları
    const sendChannelMessages = async () => {
        if (!config.Guild_ID || config.Guild_ID === "") return;
        const guild = client.guilds.cache.get(config.Guild_ID);
        if (!guild) return;

        for (const channel of guild.channels.cache.values()) {
            if (channel.isTextBased() && config.J4J_Channel_Names?.some(name => channel.name.includes(name))) {
                try {
                    const msg = config.Channel_Messages[Math.floor(Math.random() * config.Channel_Messages.length)];
                    await channel.sendTyping();
                    await new Promise(r => setTimeout(r, 9000));
                    await channel.send(msg);
                    logSuccess(`${channel.name}: "${msg}"`);
                } catch (err) {}
            }
        }
    };

    setInterval(() => {
        sendChannelMessages().catch(() => {});
    }, (config.Delay || 30) * 1000);

    sendChannelMessages().catch(() => {});
    logInfo('Tüm görevler başlatıldı.');
});

// DM mesajları
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (message.guild) return;
    if (message.author.id === client.user.id) return;
    if (dmCooldown.has(message.author.id)) return;

    dmCooldown.set(message.author.id, true);
    setTimeout(() => dmCooldown.delete(message.author.id), 5 * 60 * 1000);

    try {
        await message.channel.sendTyping();
        await new Promise(r => setTimeout(r, 7000));
        const firstMsg = config.DM_Messages?.[Math.floor(Math.random() * config.DM_Messages?.length)] || "Merhaba!";
        await message.channel.send(firstMsg);
        await new Promise(r => setTimeout(r, 14000));
        const doneMsg = config.Done_Messages?.[Math.floor(Math.random() * config.Done_Messages?.length)] || "Teşekkürler!";
        await message.channel.send(doneMsg);
        logSuccess(`DM yanıtı -> ${message.author.tag}`);
    } catch (err) {}
});

// Sunucu katılım log
client.on('guildMemberAdd', async (member) => {
    if (member.guild.id === config.Invite_Guild_ID && config.Invite_Guild_ID !== "") {
        logSuccess(`${member.user.tag} sunucuya katıldı!`);
    }
});

// Web sunucusu (Render için zorunlu)
if (config.WebServer !== false) {
    const app = express();
    app.get('/', (req, res) => res.send('J4J Bot is running!'));
    const port = process.env.PORT || 8080;
    app.listen(port, '0.0.0.0', () => {
        logInfo(`Web sunucusu çalışıyor: http://localhost:${port}`);
    });
}

// Giriş yap
client.login(token).catch(err => {
    logError(`Giriş hatası: ${err.message}`);
    process.exit(1);
});
