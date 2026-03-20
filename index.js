const { Client } = require('discord.js-selfbot-v13');
const config = require('./config.json');

const client = new Client({
  checkUpdate: false,
});

const dmHistory = new Map();

client.on('ready', async () => {
  console.log(`${client.user.username} olarak giriş yapıldı!`);

  if (config.autoMessages && config.autoMessages.length > 0) {
    config.autoMessages.forEach((msgConfig) => {
      const intervalMs = msgConfig.timeAsMinutes * 60 * 1000;
      
      setInterval(async () => {
        try {
          const channel = client.channels.cache.get(msgConfig.channelId);
          if (channel) {
            await channel.sendTyping();
            await new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * 1000) + 1000));
            await channel.send(msgConfig.text);
            console.log(`[BAŞARILI] Mesaj gönderildi. (Sunucu: ${msgConfig.serverId} | Kanal: ${msgConfig.channelId})`);
          } else {
            console.log(`[HATA] Kanal bulunamadı. Lütfen selfbotun bu kanalı görebildiğinden emin olun: ${msgConfig.channelId} (Sunucu: ${msgConfig.serverId})`);
          }
        } catch (err) {
          console.log(`[HATA] Mesaj gönderilemedi (Kanal: ${msgConfig.channelId}): ${err.message}`);
        }
      }, intervalMs);

      console.log(`[AKTİF] Sunucu: ${msgConfig.serverId} | Kanal: ${msgConfig.channelId} | Süre: ${msgConfig.timeAsMinutes} dk | Zamanlayıcı başlatıldı.`);
    });
  } else {
    console.log("Config dosyasında hiç otomatik mesaj ayarı bulunamadı.");
  }
});

client.on('messageCreate', async (message) => {
  if (message.author.id === client.user.id) return;

  if (!message.guild || message.channel.type === "DM") {
    const userId = message.author.id;
    
    const pastReplies = dmHistory.get(userId) || 0;

    if (pastReplies === 0) {
      try {
        await message.channel.sendTyping();
        await new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * 1000) + 1000));
        await message.reply({ content: config.dmReplies[0] });
        dmHistory.set(userId, 1);
        console.log(`[DM] ${message.author.username} kullanıcısına BİRİNCİ otomatik yanıt gönderildi.`);
      } catch (err) {
        console.log(`[DM HATA] BİRİNCİ mesaj gönderilemedi: ${err.message}`);
      }
    } else if (pastReplies === 1) {
      try {
        await message.channel.sendTyping();
        await new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * 1000) + 1000));
        await message.reply({ content: config.dmReplies[1] });
        dmHistory.set(userId, 2);
        console.log(`[DM] ${message.author.username} kullanıcısına İKİNCİ(ve son) otomatik yanıt gönderildi.`);
      } catch (err) {
        console.log(`[DM HATA] İKİNCİ mesaj gönderilemedi: ${err.message}`);
      }
    }
  }
});

client.login(config.token).catch((err) => {
  console.log("Token hatalı veya discord bağlanılamadı!");
  console.error(err);
});
