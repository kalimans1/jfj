const { Client } = require('discord.js-selfbot-v13');
const fs = require('fs');
require('dotenv').config();

const client = new Client({ checkUpdate: false });

// .env'den alınacak değişkenler
const TOKEN = process.env.TOKEN;
const INVITE = process.env.INVITE;
const MESSAGE = process.env.MESSAGE || '';

// KANAL ID'LERİ (virgülle ayır)
// Örnek: TARGET_CHANNELS=123456789,987654321,555555555
const TARGET_CHANNELS = process.env.TARGET_CHANNELS ? process.env.TARGET_CHANNELS.split(',') : [];

const FAILED_FILE = './failed.json';
const RETRY_AFTER = 24 * 60 * 60 * 1000; // 24 saat
const DELETE_DELAY = 40 * 60 * 1000; // 40 dakika

const EMOJIS = ['🔥','😈','💎','👀','⚡','🚀','🧠'];

const log = {
  ok: (m) => console.log('[✅]', m),
  err: (m) => console.log('[❌]', m),
  info: (m) => console.log('[ℹ️]', m),
};

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const randEmoji = () => EMOJIS[Math.floor(Math.random() * EMOJIS.length)];

// failed.json işlemleri
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
  log.info(`Hedef kanal sayısı: ${TARGET_CHANNELS.length}`);

  if (TARGET_CHANNELS.length === 0) {
    log.err('HATA: TARGET_CHANNELS boş! .env dosyasına kanal IDleri ekle');
    return;
  }

  for (const channelId of TARGET_CHANNELS) {
    const channel = client.channels.cache.get(channelId.trim());
    
    if (!channel) {
      log.err(`Kanal bulunamadı: ${channelId}`);
      continue;
    }

    if (channel.type !== 'GUILD_TEXT') {
      log.err(`Kanal metin kanalı değil: ${channelId}`);
      continue;
    }

    if (isFailed(channelId)) {
      log.info(`Kanal cooldown'da: ${channelId}`);
      continue;
    }

    if (!channel.permissionsFor(client.user)?.has('SEND_MESSAGES')) {
      log.err(`Mesaj izni yok: ${channelId}`);
      markFailed(channelId);
      continue;
    }

    try {
      const delay = Math.floor(Math.random() * 1000) + 2000;
      await sleep(delay);

      const msg = await sendWithTimeout(
        channel,
        `${MESSAGE} ${randEmoji()}`
      );

      log.ok(`Mesaj gönderildi → ${channel.guild.name} / ${channel.name}`);

      // 40 dakika sonra sil
      setTimeout(() => msg.delete().catch(() => {}), DELETE_DELAY);

    } catch (e) {
      log.err(`Hata: ${channelId} - ${e.message}`);
      markFailed(channelId);
      fs.writeFileSync(FAILED_FILE, JSON.stringify(failed, null, 2));
    }
  }

  log.info('Tüm kanallar tamamlandı!');
});

client.on('messageCreate', async (msg) => {
  if (msg.channel.type !== 'DM') return;
  if (msg.author.id === client.user.id) return;

  // DM'de daha önce invite gönderilmiş mi kontrol et
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

// Token yoksa hata ver
if (!TOKEN) {
  log.err('TOKEN bulunamadı! .env dosyasını kontrol et');
  process.exit(1);
}

if (!INVITE) {
  log.err('INVITE bulunamadı! .env dosyasını kontrol et');
  process.exit(1);
}

client.login(TOKEN);
