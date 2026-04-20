import { Telegraf, Markup, Scenes, session } from 'telegraf';
import fs from 'fs';
import 'dotenv/config';
// Load initial data
const PRICES_PATH = './prices.json';
let SERVICES_DATA = JSON.parse(fs.readFileSync(PRICES_PATH, 'utf8'));
import { CONFIG } from './api.js';

const token = process.env.BOT_TOKEN;
const adminId = process.env.ADMIN_CHAT_ID;

if (!token) {
  console.error('BOT_TOKEN is missing in .env file');
  process.exit(1);
}

const bot = new Telegraf(token);

// Middleware for simple state management
const userState = {};

bot.start((ctx) => {
  ctx.reply(
    `👋 Сайн байна уу, ${ctx.from.first_name}!\n\nSMM Panel-ийн туслах бот болон ажиллахад бэлэн байна. Та доорх цэснээс сонголтоо хийнэ үү.`,
    Markup.keyboard([
      ['📱 Үйлчилгээ үзэх', '🛒 Захиалга өгөх'],
      ['💬 Тусламж', '💳 Дансны мэдээлэл']
    ]).resize()
  );
});

bot.hears('📱 Үйлчилгээ үзэх', (ctx) => {
  let message = '📊 *Боломжит үйлчилгээнүүд:*\n\n';
  
  for (const [platform, services] of Object.entries(SERVICES_DATA)) {
    message += `*${platform.toUpperCase()}*\n`;
    services.forEach(s => {
      const priceMNT = (s.rate * CONFIG.MARKUP_MULTIPLIER * CONFIG.EXCHANGE_RATE).toLocaleString();
      message += `• ${s.name}: ${priceMNT}₮ / 1000\n`;
    });
    message += '\n';
  }
  
  ctx.replyWithMarkdown(message);
});

// Admin Commands
bot.command('prices', (ctx) => {
  if (ctx.from.id.toString() !== adminId) return;
  
  let msg = '📊 *Одоогийн үнийн жагсаалт (Admin):*\n\n';
  SERVICES_DATA.instagram.forEach(s => {
    msg += `🆔 ID: \`${s.id}\` | ${s.name}\n💰 Rate: \`${s.rate}\` USD\n\n`;
  });
  msg += 'Шинэ үнэ тохируулах: `/setprice [ID] [RATE]`\nЖишээ: `/setprice 1 2.80`';
  ctx.replyWithMarkdown(msg);
});

bot.command('setprice', (ctx) => {
  if (ctx.from.id.toString() !== adminId) return;

  const args = ctx.message.text.split(' ');
  if (args.length !== 3) {
    return ctx.reply('❌ Буруу формат. Жишээ: /setprice 1 2.80');
  }

  const id = parseInt(args[1]);
  const rate = parseFloat(args[2]);

  if (isNaN(id) || isNaN(rate)) {
    return ctx.reply('❌ Тоо оруулна уу.');
  }

  const service = SERVICES_DATA.instagram.find(s => s.id === id);
  if (!service) {
    return ctx.reply('❌ Ийм ID-тай үйлчилгээ олдсонгүй.');
  }

  service.rate = rate;
  fs.writeFileSync(PRICES_PATH, JSON.stringify(SERVICES_DATA, null, 2));
  
  ctx.reply(`✅ Амжилттай! "${service.name}" үйлчилгээний шинэ үнэ: ${rate} USD`);
});

bot.hears('💳 Дансны мэдээлэл', (ctx) => {
  const { BANK, ACCOUNT, RECEIVER } = CONFIG.BANK_DETAILS;
  ctx.reply(
    `💳 *Төлбөр төлөх дансны мэдээлэл:*\n\n` +
    `🏦 Банк: ${BANK}\n` +
    `🔢 Данс: ${ACCOUNT}\n` +
    `👤 Хүлээн авагч: ${RECEIVER}\n\n` +
    `⚠️ Гүйлгээний утга дээр захиалга өгөх үед гарч ирэх ID-г бичээрэй.`,
    { parse_mode: 'Markdown' }
  );
});

bot.hears('💬 Тусламж', (ctx) => {
  ctx.reply(
    `💡 *Хэрхэн захиалга өгөх вэ?*\n\n` +
    `1. "Захиалга өгөх" товчийг дарна.\n` +
    `2. Үйлчилгээгээ сонгоно.\n` +
    `3. Линк болон тоог оруулна.\n` +
    `4. Гарах үнийн дүнг өгөгдсөн данс руу шилжүүлнэ.\n` +
    `5. Гүйлгээний утга дээр гарч ирсэн ID-г бичнэ.\n\n` +
    `Хэрэв асуух зүйл байвал @chimdee\_s-тэй холбогдоно уу.`,
    { parse_mode: 'Markdown' }
  );
});

// Simple Order Wizard
bot.hears('🛒 Захиалга өгөх', (ctx) => {
  const buttons = [];
  SERVICES_DATA.instagram.forEach(s => {
    buttons.push([Markup.button.callback(s.name, `select_service_${s.id}`)]);
  });
  
  ctx.reply('Сонгоно уу:', Markup.inlineKeyboard(buttons));
});

bot.action(/select_service_(\d+)/, (ctx) => {
  const serviceId = parseInt(ctx.match[1]);
  const service = SERVICES_DATA.instagram.find(s => s.id === serviceId);
  
  userState[ctx.from.id] = { serviceId, serviceName: service.name, step: 'link', rate: service.rate };
  ctx.answerCbQuery();
  ctx.reply(`🔗 Захиалга хийх линкээ оруулна уу (жишээ: https://instagram.com/p/xxx/):`);
});

bot.on('text', async (ctx) => {
  const state = userState[ctx.from.id];
  if (!state) return;

  if (state.step === 'link') {
    state.link = ctx.message.text;
    state.step = 'quantity';
    ctx.reply('🔢 Захиалга өгөх тоогоо оруулна уу (хамгийн багадаа 100):');
    return;
  }

  if (state.step === 'quantity') {
    const quantity = parseInt(ctx.message.text);
    if (isNaN(quantity) || quantity < 100) {
      ctx.reply('❌ Буруу тоо байна. Хамгийн багадаа 100 гэж оруулна уу.');
      return;
    }

    state.quantity = quantity;
    const finalPrice = Math.round((state.rate / 1000) * quantity * CONFIG.MARKUP_MULTIPLIER * CONFIG.EXCHANGE_RATE);
    const orderId = Math.random().toString(36).substr(2, 6).toUpperCase();

    const summary = `✅ *Захиалгын мэдээлэл баталгаажлаа!*\n\n` +
                    `🆔 Захиалгын ID: *${orderId}*\n` +
                    `🔹 Үйлчилгээ: ${state.serviceName}\n` +
                    `🔹 Линк: ${state.link}\n` +
                    `🔹 Тоо: ${quantity}\n` +
                    `💰 Нийт үнэ: *${finalPrice.toLocaleString()}₮*\n\n` +
                    `💳 *Төлбөр төлөх заавар:*\n` +
                    `Төлбөрөө ${CONFIG.BANK_DETAILS.ACCOUNT} (${CONFIG.BANK_DETAILS.BANK}) тоот данс руу шилжүүлнэ үү.\n` +
                    `⚠️ Гүйлгээний утга дээр заавал *${orderId}* гэж бичээрэй!`;

    await ctx.replyWithMarkdown(summary);
    
    // Notify Admin
    if (adminId) {
      const adminMsg = `🆕 *ШИНЭ ЗАХИАЛГА ИРЛЭЭ (BOT)*\n\n` +
                       `👤 Хэрэглэгч: @${(ctx.from.username || ctx.from.first_name).replace(/_/g, '\\_')}\n` +
                       `🆔 ID: ${orderId}\n` +
                       `🔹 Үйлчилгээ: ${state.serviceName}\n` +
                       `🔹 Линк: ${state.link}\n` +
                       `🔹 Тоо: ${state.quantity}\n` +
                       `💰 Үнэ: ${finalPrice.toLocaleString()}₮`;
      
      bot.telegram.sendMessage(adminId, adminMsg, { parse_mode: 'Markdown' });
    }

    delete userState[ctx.from.id];
  }
});

// Middleware to log incoming messages for debugging
bot.use((ctx, next) => {
  console.log(`[Update] From: ${ctx.from?.username || ctx.from?.id} - Type: ${ctx.updateType}`);
  return next();
});

bot.launch()
  .then(() => console.log('✅ Bot successfully connected to Telegram'))
  .catch((err) => console.error('❌ Bot failed to start:', err));

console.log('Bot script is initializing...');

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
