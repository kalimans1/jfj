const { Client } = require('discord.js-selfbot-v13');
const fs = require('fs');

const client = new Client({ checkUpdate: false });

// TOKEN
const TOKEN = process.env.TOKEN ;

const MESSAGE = '# TRADİNG/BUYİNG DRAGONFLY DM ME';
const INVITE = 'https://discord.gg/WkXs2q2SeN';

// hedef kanallar
const TARGET_CHANNELS =
  '1365731632534917141'
];

const DELETE_DELAY = 40 * 60 * 1000;

const EMOJIS = ['🔥','😈','💎','👀','⚡','🚀','🧠'];

const log = {
  ok: (m) => console.log('[OK]', m),
  err: (m) => console.log('[ERR]', m),
  warn: (m) => console.log('[WARN]', m),
  info: (m) => console.log('[INFO]', m),
};

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const randEmoji = () => EMOJIS[Math.floor(Math.random() * EMOJIS.length)];

// 4-9 dakika random delay
const randomDelay = () => {
  const min = 4 * 60 * 1000;
  const max = 9 * 60 * 1000;
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

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

  const channels = [];

  for (const id of TARGET_CHANNELS) {
    const ch = client.channels.cache.get(id);
    if (!ch) {
      log.err(`Kanal bulunamadı → ${id}`);
      continue;
    }
    channels.push(ch);
  }

  log.info(`${channels.length} hedef kanal yüklendi`);

  const sendLoop = async () => {
    for (const channel of channels) {
      try {

        const delay = Math.floor(Math.random() * 1000) + 2000;
        await sleep(delay);

        const msg = await sendWithTimeout(
          channel,
          `${MESSAGE} ${randEmoji()}`
        );

        log.ok(`Gönderildi → ${channel.id}`);

        setTimeout(() => msg.delete().catch(() => {}), DELETE_DELAY);

      } catch (e) {
        log.err(`Fail → ${channel.id}`);
      }
    }
  };

  const loop = async () => {
    await sendLoop();
    const delay = randomDelay();
    log.info(`Sonraki mesaj ${Math.round(delay/60000)} dakika sonra`);
    setTimeout(loop, delay);
  };

  loop();
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

setInterval(() => {}, 1000);
client.login(TOKEN);
