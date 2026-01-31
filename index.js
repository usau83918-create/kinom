const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs').promises;
const path = require('path');

// ================== KONFIGURATSIYA ==================
const BOT_TOKEN = `8540792652:AAHTqikJgOKWiqlpnGHv9uWS9tPhhQv0Igw`;
const CHANNEL_USERNAME = `@UzKinoPremiera`;
const CHANNEL_ID = -1003707805152;
const ADMIN_ID = 7542365426;
const PRIVATE_CHANNEL_ID = -1003415052995;

// 🆓 BEPUL AI VARIANT - OpenRouter (Google Gemini Flash - BEPUL!)
const OPENROUTER_API_KEY = ''; // https://openrouter.ai/keys dan oling

if (!BOT_TOKEN || !CHANNEL_ID || !ADMIN_ID) {
    
    process.exit(1);
}

const bot = new TelegramBot(BOT_TOKEN, {
    polling: {
        interval: 300,
        autoStart: true,
        params: { timeout: 10 }
    }
});

// ================== FAYLLAR ==================
const MOVIES_FILE = path.join(__dirname, 'movies.json');
const SURVEY_FILE = path.join(__dirname, 'surveys.json');
const RESPONSES_FILE = path.join(__dirname, 'survey_responses.json');

async function loadMovies() {
    try {
        const data = await fs.readFile(MOVIES_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return {};
    }
}

async function saveMovies(movies) {
    try {
        await fs.writeFile(MOVIES_FILE, JSON.stringify(movies, null, 2), 'utf8');
        return true;
    } catch (error) {
        return false;
    }
}

async function loadSurveys() {
    try {
        const data = await fs.readFile(SURVEY_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return { active: null, history: [] };
    }
}

async function saveSurveys(surveys) {
    try {
        await fs.writeFile(SURVEY_FILE, JSON.stringify(surveys, null, 2), 'utf8');
        return true;
    } catch (error) {
        return false;
    }
}

async function loadResponses() {
    try {
        const data = await fs.readFile(RESPONSES_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return [];
    }
}

async function saveResponses(responses) {
    try {
        await fs.writeFile(RESPONSES_FILE, JSON.stringify(responses, null, 2), 'utf8');
        return true;
    } catch (error) {
        return false;
    }
}

// ================== GLOBAL VARIABLES ==================
let movies = {};
let surveys = { active: null, history: [] };
let responses = [];
const tempData = {};

(async () => {
    movies = await loadMovies();
    surveys = await loadSurveys();
    responses = await loadResponses();
})();

// ================== 🆓 BEPUL AI (OpenRouter - Google Gemini Flash) ==================
async function callFreeAI(prompt) {
    // Agar API key bo'lmasa, offline ishlaydi
    if (!OPENROUTER_API_KEY || OPENROUTER_API_KEY === 'YOUR_OPENROUTER_API_KEY') {
        
        return null;
    }

    try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                'HTTP-Referer': 'https://t.me/UzKinoPremiera',
                'X-Title': 'Uzbek Kino Bot'
            },
            body: JSON.stringify({
                model: 'google/gemini-flash-1.5', // 🆓 BEPUL!
                messages: [{
                    role: 'user',
                    content: prompt
                }]
            })
        });

        const data = await response.json();
        
        if (data.choices && data.choices[0] && data.choices[0].message) {
            return data.choices[0].message.content;
        }
        
        return null;
    } catch (error) {
        
        return null;
    }
}

// ================== SO'ROVNOMA SAVOLLARI (AI yoki STANDART) ==================
async function generateSurveyQuestion() {
    // Avval AI dan so'rashga harakat
    const aiPrompt = `Siz kino kanali uchun so'rovnoma tuzasiz. 
    
Foydalanuvchilardan quyidagi mavzularda savollar bering:
- Qanday kinolar yoqadi?
- Qaysi janr ko'proq qiziqadi?
- Kanal rivojlanishi uchun tavsiyalar
- Nimalarni o'zgartirish kerak?
- Qanday kino tavsiya qilasiz?

Savol O'ZBEK TILIDA bo'lishi kerak va qisqa (1-2 gap) bo'lsin.
Emoji ishlatib, samimiy va do'stona ohangda yozing.
Faqat BITTA savol bering, boshqa hech narsa yozma.`;

    const aiResponse = await callFreeAI(aiPrompt);
    
    if (aiResponse) {
        return aiResponse.trim();
    }
    
    // Agar AI ishlamasa, STANDART SAVOLLAR
    const standardQuestions = [
        "🎬 Qaysi janr kinolarini ko'proq ko'rgingiz keladi?\n(Komediya, Jangari, Romantik, Horror, Drama...)",
        "📊 Kanalga qanday kinolar qo'shilishini xohlaysiz?",
        "💡 Kanalimizda nimalarni o'zgartirish yoki yaxshilash kerakligini o'ylaysiz?",
        "🎯 Sizga eng yoqqan kino qaysi edi? Nega aynan shu kino?",
        "🌟 Agar siz kanal egasi bo'lsangiz, birinchi navbatda nimalar qilardingiz?",
        "🎪 Qanday kino festivali yoki tanlov o'tkazsak qiziq bo'lardi?",
        "🔥 Hozir eng ko'p qaysi kinoni ko'rishni xohlaysiz?",
        "⭐ Kanalda qanday yangi bo'limlar bo'lishini istaysiz?",
        "🎞️ O'zbek tilidagi dublyaj bormi yoki subtitr yetarlimi?",
        "📺 Seriallar ham qo'shilishini istaysizmi? Qaysi seriallarni?",
        "🏆 Yiliga bir marta \"Eng yaxshi kino\" tanlovini o'tkazsak, ishtirok etasizmi?",
        "🎁 Qanday konkurslar o'tkazsak yaxshi bo'lardi?"
    ];
    
    // Tasodifiy savol tanlash
    const randomIndex = Math.floor(Math.random() * standardQuestions.length);
    return standardQuestions[randomIndex];
}

// ================== AI BILAN JAVOBLARNI TAHLIL QILISH ==================
async function analyzeResponses(responsesList) {
    if (responsesList.length === 0) {
        return "❌ Hali javoblar yo'q";
    }

    const allResponses = responsesList.map(r => r.response).join('\n---\n');
    
    const aiPrompt = `Quyida kino kanali so'rovnomasiga berilgan javoblar bor. 
    
Javoblarni tahlil qilib, qisqacha xulosalar chiqaring:
- Eng ko'p qaysi janr talab qilingan?
- Qanday tavsiyalar berilgan?
- Umumiy tendensiya nima?

JAVOBLAR:
${allResponses}

O'ZBEK TILIDA qisqa (5-7 gap) xulosalar bering. Emoji ishlatib, tushunarli yozing.`;

    const aiAnalysis = await callFreeAI(aiPrompt);
    
    if (aiAnalysis) {
        return aiAnalysis;
    }
    
    // Agar AI ishlamasa, ODDIY STATISTIKA
    let summary = `📊 *STATISTIKA*\n\n`;
    summary += `📈 Jami javoblar: ${responsesList.length} ta\n\n`;
    summary += `💬 *So'nggi javoblar:*\n`;
    
    const recentResponses = responsesList.slice(-5);
    recentResponses.forEach((r, i) => {
        const shortResponse = r.response.length > 100 
            ? r.response.substring(0, 100) + '...' 
            : r.response;
        summary += `${i + 1}. ${shortResponse}\n\n`;
    });
    
    return summary;
}

// ================== SO'ROVNOMA YUBORISH ==================
async function sendSurveyToUser(userId, chatId, question) {
    try {
        await bot.sendMessage(
            chatId,
            `📊 *SO'ROVNOMA*\n\n${question}\n\n💬 Javobingizni yozing (anonim)`,
            {
                parse_mode: 'Markdown',
                reply_markup: {
                    force_reply: true
                }
            }
        );
        
        tempData[userId] = {
            step: 'awaiting_survey_response',
            question: question
        };
    } catch (error) {
        console.error('So\'rovnoma yuborishda xato:', error);
    }
}

// ================== BARCHA FOYDALANUVCHILARGA SO'ROVNOMA ==================
async function broadcastSurvey() {
    const question = await generateSurveyQuestion();
    
    surveys.active = {
        question: question,
        started_at: new Date().toISOString(),
        responses_count: 0
    };
    
    await saveSurveys(surveys);
    
    console.log('📊 Yangi so\'rovnoma boshlandi:', question);
    
    return question;
}

// ================== MOVIE CAPTION ==================
function createMovieCaption(movieInfo, channelUsername) {
    const caption = `
🎬 *${movieInfo.name}*

━━━━━━━━━━━━━━━━━━━━━
📅 *Yil:* ${movieInfo.chiqarilgan_yili}
🎭 *Janr:* ${movieInfo.janr}
${movieInfo.country ? `🌍 *Davlat:* ${movieInfo.country}\n` : ''}🔢 *Kod:* \`${movieInfo.cod}\`
━━━━━━━━━━━━━━━━━━━━━

📢 *Kanal:* ${channelUsername}

💡 *Yangi kinolarni birinchi bo'lib ko'ring!*
`.trim();

    return caption;
}

// ================== A'ZOLIKNI TEKSHIRISH ==================
async function isUserMember(userId) {
    try {
        const chat = await bot.getChatMember(CHANNEL_ID, userId);
        const status = chat.status;
        return status !== 'left' && status !== 'kicked';
    } catch (error) {
        return false;
    }
}

// ================== WELCOME ==================
async function sendWelcome(chatId, userId, firstName) {
    try {
        const isMember = await isUserMember(userId);

        if (isMember) {
            await bot.sendMessage(
                chatId,
                `👋 *Salom, ${firstName}!*

✅ Siz kanalga *a'zosiz*

🎬 Kino olish uchun:
— Kino kodini yuboring (masalan: *1*)
— Yoki *📋 Kinolar* tugmasini bosing

📊 Kunlik so'rovnomalarda qatnashing!`,
                {
                    parse_mode: 'Markdown',
                    reply_markup: {
                        keyboard: [['📋 Kinolar'], ['📊 So\'rovnoma']],
                        resize_keyboard: true
                    }
                }
            );
        } else {
            const channelLink = CHANNEL_USERNAME.startsWith('http')
                ? CHANNEL_USERNAME
                : `https://t.me/${CHANNEL_USERNAME.replace('@', '')}`;

            await bot.sendMessage(
                chatId,
                `👋 *Salom, ${firstName}!*

❌ Kino olish uchun kanalga a'zo bo'lishingiz shart 👇

📢 Kanal: [👉 BU YERGA BOSING](${channelLink})

A'zo bo'lgach, pastdagi *✅ Tekshirish* tugmasini bosing`,
                {
                    parse_mode: 'Markdown',
                    reply_markup: {
                        keyboard: [['✅ Tekshirish']],
                        resize_keyboard: true
                    }
                }
            );
        }
    } catch (error) {
        await bot.sendMessage(chatId, 'Xatolik yuz berdi. Qaytadan /start bosing');
    }
}

// ================== /START ==================
bot.onText(/\/start/, async (msg) => {
    await sendWelcome(msg.chat.id, msg.from.id, msg.from.first_name);
});

// ================== /SURVEY (ADMIN) ==================
bot.onText(/\/survey/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    if (userId !== ADMIN_ID) {
        await bot.sendMessage(chatId, '❌ Bu komanda faqat admin uchun!');
        return;
    }

    const loadingMsg = await bot.sendMessage(chatId, '⏳ So\'rovnoma tayyorlanmoqda...');

    const question = await broadcastSurvey();

    await bot.deleteMessage(chatId, loadingMsg.message_id);
    await bot.sendMessage(
        chatId,
        `✅ Yangi so'rovnoma boshlandi:\n\n📝 ${question}\n\n💡 Foydalanuvchilar "📊 So'rovnoma" tugmasi orqali javob berishlari mumkin`,
        { parse_mode: 'Markdown' }
    );
});

// ================== /RESULTS (ADMIN) ==================
bot.onText(/\/results/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    if (userId !== ADMIN_ID) {
        await bot.sendMessage(chatId, '❌ Bu komanda faqat admin uchun!');
        return;
    }

    if (!surveys.active) {
        await bot.sendMessage(chatId, '❌ Faol so\'rovnoma yo\'q. /survey bilan boshlang');
        return;
    }

    const loadingMsg = await bot.sendMessage(chatId, '⏳ Tahlil qilinmoqda...');

    const currentResponses = responses.filter(
        r => r.question === surveys.active.question
    );

    if (currentResponses.length === 0) {
        await bot.deleteMessage(chatId, loadingMsg.message_id);
        await bot.sendMessage(chatId, '📊 Hali javoblar yo\'q');
        return;
    }

    const analysis = await analyzeResponses(currentResponses);

    await bot.deleteMessage(chatId, loadingMsg.message_id);
    await bot.sendMessage(
        chatId,
        `📊 *SO'ROVNOMA NATIJALARI*\n\n📝 Savol: ${surveys.active.question}\n\n📈 Javoblar: ${currentResponses.length} ta\n\n${analysis}`,
        { parse_mode: 'Markdown' }
    );
});

// ================== /RESPONSES (ADMIN) ==================
bot.onText(/\/responses/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    if (userId !== ADMIN_ID) {
        await bot.sendMessage(chatId, '❌ Bu komanda faqat admin uchun!');
        return;
    }

    const currentResponses = responses.filter(
        r => surveys.active && r.question === surveys.active.question
    );

    if (currentResponses.length === 0) {
        await bot.sendMessage(chatId, '📊 Hali javoblar yo\'q');
        return;
    }

    let message = `📋 *SO'ROVNOMA JAVOБЛАРИ* (${currentResponses.length} ta)\n\n`;
    
    currentResponses.forEach((r, index) => {
        message += `${index + 1}. 💬 ${r.response}\n`;
        message += `   ⏰ ${new Date(r.timestamp).toLocaleString('uz-UZ')}\n\n`;
    });

    // Telegram 4096 belgi limitini hisobga olish
    if (message.length > 4000) {
        message = message.substring(0, 4000) + '\n\n... (ko\'proq javoblar bor)';
    }

    await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
});

// ================== /ADD ==================
bot.onText(/\/add/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    if (userId !== ADMIN_ID) {
        await bot.sendMessage(chatId, '❌ Bu komanda faqat admin uchun!');
        return;
    }

    tempData[userId] = {
        step: 'name',
        movie: {}
    };

    await bot.sendMessage(chatId, '🎬 *Kino nomini yuboring:*', {
        parse_mode: 'Markdown'
    });
});

// ================== /DELETE ==================
bot.onText(/\/delete (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const code = match[1].trim();

    if (userId !== ADMIN_ID) {
        await bot.sendMessage(chatId, '❌ Bu komanda faqat admin uchun!');
        return;
    }

    const loadingMsg = await bot.sendMessage(chatId, '⏳ O\'chirilmoqda...');

    if (movies[code]) {
        const movieTitle = movies[code].title;
        delete movies[code];
        const saved = await saveMovies(movies);

        await bot.deleteMessage(chatId, loadingMsg.message_id);

        if (saved) {
            await bot.sendMessage(
                chatId,
                `✅ Kino o'chirildi:\n🎬 ${movieTitle}\n🔢 Kod: ${code}`
            );
        } else {
            await bot.sendMessage(chatId, '❌ Saqlashda xatolik!');
        }
    } else {
        await bot.deleteMessage(chatId, loadingMsg.message_id);
        await bot.sendMessage(chatId, `❌ "${code}" kodi topilmadi!`);
    }
});

// ================== /LIST ==================
bot.onText(/\/list/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    if (userId !== ADMIN_ID) {
        await bot.sendMessage(chatId, '❌ Bu komanda faqat admin uchun!');
        return;
    }

    const loadingMsg = await bot.sendMessage(chatId, '⏳ Yuklanmoqda...');

    if (Object.keys(movies).length === 0) {
        await bot.deleteMessage(chatId, loadingMsg.message_id);
        await bot.sendMessage(chatId, '📂 Bazada kinolar yo\'q');
        return;
    }

    let list = '📊 *BAZADAGI KINOLAR:*\n\n';
    for (const [code, movie] of Object.entries(movies)) {
        list += `*${code}* - ${movie.title}\n`;
        list += `   🎭 ${movie.genre} | 📅 ${movie.year}\n`;
        if (movie.country) list += `   🌍 ${movie.country}\n`;
        list += `   📹 Message ID: ${movie.message_id}\n\n`;
    }

    await bot.deleteMessage(chatId, loadingMsg.message_id);
    await bot.sendMessage(chatId, list, { parse_mode: 'Markdown' });
});

// ================== MESSAGE HANDLER ==================
bot.on('message', async (msg) => {
    if (!msg.text || msg.text.startsWith('/')) return;

    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const firstName = msg.from.first_name || 'Foydalanuvchi';
    const text = msg.text;

    try {
        // ================== SO'ROVNOMA JAVOBI ==================
        if (tempData[userId] && tempData[userId].step === 'awaiting_survey_response') {
            const question = tempData[userId].question;
            
            responses.push({
                question: question,
                response: text,
                timestamp: new Date().toISOString(),
                user_id: userId
            });
            
            await saveResponses(responses);
            
            if (surveys.active) {
                surveys.active.responses_count++;
                await saveSurveys(surveys);
            }
            
            delete tempData[userId];
            
            await bot.sendMessage(
                chatId,
                '✅ Javobingiz qabul qilindi! Rahmat 🙏\n\n💡 Fikrlaringiz kanalimizni yaxshilashga yordam beradi'
            );
            return;
        }

        // ================== ADMIN: KINO QO'SHISH ==================
        if (userId === ADMIN_ID && tempData[userId]) {
            const state = tempData[userId];
            const movie = state.movie;

            if (state.step === 'name') {
                movie.name = text;
                state.step = 'genre';
                await bot.sendMessage(chatId, '🎭 *Kino janrini yuboring:*', { 
                    parse_mode: 'Markdown' 
                });
                return;
            }

            if (state.step === 'genre') {
                movie.janr = text;
                state.step = 'year';
                await bot.sendMessage(chatId, '📅 *Chiqarilgan yilini yuboring:*', { 
                    parse_mode: 'Markdown' 
                });
                return;
            }

            if (state.step === 'year') {
                movie.chiqarilgan_yili = text;
                state.step = 'country';
                await bot.sendMessage(chatId, '🌍 *Davlatini yuboring:*', { 
                    parse_mode: 'Markdown' 
                });
                return;
            }

            if (state.step === 'country') {
                movie.country = text;
                state.step = 'code';
                await bot.sendMessage(chatId, '🔢 *Kino kodini yuboring:*', { 
                    parse_mode: 'Markdown' 
                });
                return;
            }

            if (state.step === 'code') {
                if (movies[text]) {
                    await bot.sendMessage(
                        chatId, 
                        `⚠️ "${text}" kodi allaqachon mavjud!\n🎬 ${movies[text].title}\n\nBoshqa kod tanlang yoki /delete ${text} bilan o'chiring`
                    );
                    return;
                }
                movie.cod = text;
                state.step = 'message_id';
                await bot.sendMessage(
                    chatId,
                    '📹 *Yopiq kanaldagi video message ID ni yuboring* (masalan: 5)',
                    { parse_mode: 'Markdown' }
                );
                return;
            }

            if (state.step === 'message_id') {
                const messageId = parseInt(text);
                if (isNaN(messageId)) {
                    await bot.sendMessage(chatId, '❌ Faqat raqam yuboring!');
                    return;
                }

                const loadingMsg = await bot.sendMessage(chatId, '⏳ Video olinmoqda...');

                try {
                    const forwarded = await bot.forwardMessage(
                        chatId,
                        PRIVATE_CHANNEL_ID,
                        messageId
       
