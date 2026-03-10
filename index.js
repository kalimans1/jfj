const { Client } = require('discord.js-selfbot-v13');
const fs = require('fs');
require('dotenv').config();

const client = new Client({ checkUpdate: false });

// TOKEN - .env'den alınıyor
const TOKEN = process.env.TOKEN;

const MESSAGE = process.env.MESSAGE || '';
const INVITE = process.env.INVITE;

const BLOCKED_GUILDS = process.env.BLOCKED_GUILDS ? process.env.BLOCKED_GUILDS.split(',') : [];

const FAILED_FILE = './failed.json';
const RETRY_AFTER = 24 * 60 * 60 * 1000; // ⏱️ 24 saat
const GLOBAL_COOLDOWN = 5 * 60 * 1000;
const DELETE_DELAY = 40 * 60 * 1000;

const EMOJIS = ['🔥','😈','💎','👀','⚡','🚀','🧠'];//random emojiler elleme 

const log = {
  ok: (m) => console.log('[OK]', m),
  err: (m) => console.log('[ERR]', m),
  warn: (m) => console.log('[WARN]', m),
  info: (m) => console.log('[INFO]', m),
};

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const randEmoji = () => EMOJIS[Math.floor(Math.random() * EMOJIS.length)];

// ===== failed.json (TTL'li) =====
// Format: { "<id>": <timestamp> }
let failed = {};
if (fs.existsSync(FAILED_FILE)) {
  try { failed = JSON.parse(fs.readFileSync(FAILED_FILE, 'utf8')); } catch {}
}

const now = Date.now();
for (const id of Object.keys(failed)) {
  if (now - failed[id] >= RETRY_AFTER) delete failed[id];
}

const isFailed = (id) => failed[id] && (Date.now() - failed[id] < RETRY_AFTER);
const markFailed = (id) => { failed[id] = Date.now(); };

const sendWithTimeout = (channel, content, timeout = 15000) => {
  return Promise.race([
    channel.send(content),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('SEND_TIMEOUT')), timeout)
    )
  ]);
};

client.on('ready', async () => {
  log.ok(`Giriş yapıldı: ${client.user.username}`);

  for (const guild of client.guilds.cache.values()) {
    if (BLOCKED_GUILDS.includes(guild.id)) continue;
    if (isFailed(guild.id)) continue;

    for (const channel of guild.channels.cache.values()) {
      if (channel.type !== 'GUILD_TEXT') continue;
      if (isFailed(channel.id)) continue;

      if (!channel.permissionsFor(client.user)?.has('SEND_MESSAGES')) {
        markFailed(channel.id); 
        continue;
      }

      try {
        const delay = Math.floor(Math.random() * 1000) + 2000;
        await sleep(delay);

        const msg = await sendWithTimeout(
          channel,
          `${MESSAGE} ${randEmoji()}`
        );

        log.ok(`Gönderildi → ${guild.name} / ${channel.name}`);

        setTimeout(() => msg.delete().catch(() => {}), DELETE_DELAY);

      } catch (e) {
        log.err(`Fail/Timeout → ${guild.id} / ${channel.id}`);

        markFailed(channel.id);

        if (e.message === 'SEND_TIMEOUT') {
          markFailed(guild.id);
        }

        fs.writeFileSync(FAILED_FILE, JSON.stringify(failed, null, 2));
        continue;
      }
    }
  }

  log.info('Tüm sunucular tamamlandı. Cooldown...');
  setTimeout(() => GLOBAL_COOLDOWN);
});

client.on('messageCreate', async (msg) => {
  if (msg.channel.type !== 'DM') return;
  if (msg.author.id === client.user.id) return;

  const history = await msg.channel.messages.fetch({ limit: 50 });
  if (history.some(m => m.content.includes(INVITE))) return;

  const delay = Math.floor(Math.random() * 1000) + 2000;
  await sleep(delay);

  await sendWithTimeout(
    msg.channel,
    `${INVITE} ${randEmoji()}`
  );

  log.ok(`DM cevaplandı → ${msg.author.username}`);
});

process.on('exit', () => {
  fs.writeFileSync(FAILED_FILE, JSON.stringify(failed, null, 2));
});

setInterval(() => {}, 1000);
client.login(TOKEN);
