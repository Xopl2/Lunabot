//env enctryption
require('dotenv').config();

//discord.js import
const { Client, GatewayIntentBits, Events, PermissionFlagsBits } = require('discord.js');

// 1. Utility Imports
const { safeReply } = require('./utils');

// 2. Database Imports
const mongoose = require('mongoose');
const User = require('./User');

// 3. Define Connection Function
async function connectDB() {
    try {
        // Use the URI stored in your .env file
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ MongoDB connected successfully!');
    } catch (error) {
        console.error('❌ MongoDB connection error:', error);
    }
}

//ai import
const { GoogleGenAI } = require('@google/genai');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        // Removed GatewayIntentBits.GuildVoiceStates and GatewayIntentBits.GuildMembers 
        // as they are no longer strictly needed without music.
    ]
});

// 4. log the bot in
client.on('clientReady', () => { 
    console.log(`Logged in as ${client.user.tag}`);
});

//gemini ai client
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const clientGemini = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

// Define wood types and their sell prices (UPDATED 8 TIERS)
const WOOD_TYPES = [
    { name: "Oak", emoji: "🌳", rarity: 0.4635, price: 5 },      // 46.35% (Changed from 0.4500)
    { name: "Willow", emoji: "🌿", rarity: 0.3000, price: 10 },    // 30.00% common
    { name: "Birch", emoji: "🌲", rarity: 0.1000, price: 25 },     // 10.00% uncommon
    { name: "Redwood", emoji: "🍁", rarity: 0.0800, price: 50 },    // 8.00% rare
    { name: "Mahogany", emoji: "🪵", rarity: 0.0390, price: 100 },  // 3.90% rare
    { name: "Ancient Log", emoji: "🪓", rarity: 0.0100, price: 500 }, // 1.00% ultra rare
    { name: "Ghost log", emoji: "👻", rarity: 0.0050, price: 2000 }, // 0.50% ultra rare
    { name: "Petrified Log", emoji: "💎", rarity: 0.0025, price: 5000 } // 0.25% legendary 
];

// Define mining drops and their sell prices (7 TIERS)
const MINE_DROPS = [
    { name: "Chunk of Stone", emoji: "🪨", rarity: 0.4845, price: 5 },     // 48.70% (Fills the rest)
    { name: "Chunk of Coal", emoji: "⚫", rarity: 0.2000, price: 10 },      // 20.00% Common
    { name: "Chunk of Copper", emoji: "🟠", rarity: 0.1500, price: 15 },     // 15.00% Uncommon
    { name: "Chunk of Iron", emoji: "🔩", rarity: 0.1500, price: 30 },     // 15.00% Uncommon
    { name: "Chunk of Gold", emoji: "🟡", rarity: 0.0100 , price: 100 },      // 1.00% Rare
    { name: "Chunk of Cobalt", emoji: "🔵", rarity: 0.005, price: 500 },   // 0.5% Ultra Rare
    { name: "Chunk of Adamantite", emoji: "💎", rarity: 0.0005, price: 10000 } // 0.05% Legendary
];

// Define the forged bars (UNSELLABLE)
const FORGED_BARS = [
    { name: "Gold Bar", emoji: "🪙" },
    { name: "Cobalt Bar", emoji: "💙" },
    { name: "Adamantite Bar", emoji: "💎" },
    { name: "Cupiron Bar", emoji: "🟤" }
];

// FORGE_RECIPES constant: Now uses a flexible 'ingredients' array for multiple inputs (including fuel)
const FORGE_RECIPES = [
    {
        id: "goldbar",
        ingredients: [
            { name: "Chunk of Gold", quantity: 5 },
            { name: "Chunk of Coal", quantity: 5 } // Coal is now an ingredient
        ],
        output: { name: "Gold Bar", quantity: 1 }
    },
    {
        id: "cobaltbar",
        ingredients: [
            { name: "Chunk of Cobalt", quantity: 5 },
            { name: "Chunk of Coal", quantity: 5 }
        ],
        output: { name: "Cobalt Bar", quantity: 1 }
    },
    {
        id: "adamantitebar",
        ingredients: [
            { name: "Chunk of Adamantite", quantity: 5 },
            { name: "Chunk of Coal", quantity: 5 }
        ],
        output: { name: "Adamantite Bar", quantity: 1 }
    },
    {
        id: "cupironbar",
        ingredients: [
            { name: "Chunk of Copper", quantity: 10 },
            { name: "Chunk of Iron", quantity: 10 },
            { name: "Chunk of Coal", quantity: 5 } 
        ],
        output: { name: "Cupiron Bar", quantity: 1 }
    }
];

//craftable tools
const RECIPES = {

    // --- TIER 5 ---
    "cupiron pickaxe": { 
        materials: new Map([
            ["cupiron bar", 5],
            ["Mahogany", 10]
        ]),
        tier: 5,
        type: "tool"
    },
    "cupiron axe": {
        materials: new Map([
            ["cupiron bar", 5],
            ["Mahogany", 10]
        ]),
        tier: 5,
        type: "tool"
    },

    // --- TIER 6 ---
    "fancy pickaxe": {
        materials: new Map([
            ["gold bar", 5],
            ["ancient log", 10]
        ]),
        tier: 6,
        type: "tool"
    },
    "fancy axe": {
        materials: new Map([
            ["gold bar", 5],
            ["ancient log", 10]
        ]),
        tier: 6,
        type: "tool"
    },

    // --- TIER 7 ---
    "undead pickaxe": {
        materials: new Map([
            ["cobalt bar", 5],
            ["ghost log", 10]
        ]),
        tier: 7,
        type: "tool"
    },
    "undead axe": {
        materials: new Map([
            ["cobalt bar", 5],
            ["ghost log", 10]
        ]),
        tier: 7,
        type: "tool"
    },

    // --- TIER 8 ---
    "adamantite pickaxe": {
        materials: new Map([
            ["adamantite bar", 5],
            ["petrified log", 10]
        ]),
        tier: 8,
        type: "tool"
    },
    "adamantite axe": {
        materials: new Map([
            ["adamantite bar", 5],
            ["petrified log", 10]
        ]),
        tier: 8,
        type: "tool"
    },
};

// Combine all sellable items for universal lookup
const ALL_SELLABLE_ITEMS = [...WOOD_TYPES, ...MINE_DROPS];

const AXE_TIERS = [
    // --- BASIC (BUYABLE) Tiers 1-4 ---
    { id: "starter_axe", name: "Starter Axe", multiplier: 1, price: 0, emoji: "🪓", tier: 1, extraRolls: 0 }, 
    { id: "copper_axe", name: "Copper Axe", multiplier: 2, price: 500, emoji: "🪓🟠", tier: 2, extraRolls: 0 },
    { id: "iron_axe", name: "Iron Axe", multiplier: 3, price: 2000, emoji: "🪓🔩", tier: 3, extraRolls: 0 },
    { id: "steel_axe", name: "Steel Axe", multiplier: 5, price: 5000, emoji: "🪓⚙️", tier: 4, extraRolls: 0 },

    // --- ADVANCED (CRAFTABLE) Tiers 5-8 (New Logic: 5x Multiplier, 1 Extra Roll) ---
    { id: "axe_t5", name: "Cupiron Axe", multiplier: 5, emoji: "🪓💎", tier: 5, extraRolls: 1 },
    { id: "axe_t6", name: "Fancy Axe", multiplier: 7, emoji: "🪓✨", tier: 6, extraRolls: 1 }, 
    { id: "axe_t7", name: "Undead Axe", multiplier: 7, emoji: "🪓💀", tier: 7, extraRolls: 2 }, 
    { id: "axe_t8", name: "Adamantite Axe", multiplier: 10, emoji: "🪓🌌", tier: 8, extraRolls: 3 }
];

const PICKAXE_TIERS = [
    // --- BASIC (BUYABLE) Tiers 1-4 ---
    { id: "starter_pick", name: "Starter Pickaxe", multiplier: 1, price: 0, emoji: "⛏️", tier: 1, extraRolls: 0 }, 
    { id: "copper_pick", name: "Copper Pickaxe", multiplier: 2, price: 1000, emoji: "⛏️🟠", tier: 2, extraRolls: 0 },
    { id: "iron_pick", name: "Iron Pickaxe", multiplier: 3, price: 2500, emoji: "⛏️🔩", tier: 3, extraRolls: 0 },
    { id: "steel_pick", name: "Steel Pickaxe", multiplier: 5, price: 5000, emoji: "⛏️⚙️", tier: 4, extraRolls: 0 },

    // --- ADVANCED (CRAFTABLE) Tiers 5-8 (New Logic: 5x Multiplier, 1 Extra Roll) ---
    { id: "pick_t5", name: "Cupiron Pickaxe", multiplier: 5, emoji: "⛏️💎", tier: 5, extraRolls: 1 },
    { id: "pick_t6", name: "Fancy Pickaxe", multiplier: 7, emoji: "⛏️✨", tier: 6, extraRolls: 1 }, 
    { id: "pick_t7", name: "Undead Pickaxe", multiplier: 7, emoji: "⛏️💀", tier: 7, extraRolls: 2 },
    { id: "pick_t8", name: "Adamantite Pickaxe", multiplier: 10, emoji: "⛏️🌌", tier: 8, extraRolls: 3 } 
];

// index.js (Add this function)

async function getOrCreateUser(userId) {
    let userData = await User.findOne({ userId: userId });

    if (!userData) {
        // Create new user with starter tools if not found
        userData = new User({
            userId: userId,
            balance: 0,
            inventory: {},
            tool_axe: AXE_TIERS[0], 
            tool_pickaxe: PICKAXE_TIERS[0], 
        });
        await userData.save();
    } 
    
    // Mongoose handles defaults, so the old deep cleanup is mostly unnecessary,
    // but you can add quick checks here if needed for existing JSON data migration.

    return userData;
}

client.on('messageCreate', async message => {
    // Ignore messages from bots
    if (message.author.bot) return;

    // Ping command
    if (message.content === '!ping') {
        safeReply(message,'Pong!');      
    }

    // Gucci Lobster responder with 1% chance
    const targetUserId = '471040517082447882';
    if (message.author.id === targetUserId) {
        if (Math.random() < 0.01) { // 1% chance
           message.channel.send(`<@${targetUserId}> 🍊🐔`);
        }

        // 2. 1 in 500 Chance (0.2% or < 0.002) for GIF
        if (Math.random() < 0.002) { 
           message.channel.send("https://tenor.com/view/chicken-wings-wings-food-chicken-wing-gif-26532274");
        }
    }

    // Poop command
    if (message.content === '!poop') {
        safeReply(message,'💩');
    }

    // indigo ike debt command
    if (message.content === '!indigodebt') {
        const initialDebt = 23.25; // starting debt
        const dailyRate = 0.025; // 2.5% daily interest
        const startDate = new Date('2025-12-01'); // debt start date
        const today = new Date();

        // Calculate the number of full days since startDate
        const diffTime = today - startDate;
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        // Compound interest formula: A = P * (1 + r)^n
        // Using Math.pow(1 + dailyRate, diffDays)
        const totalDebt = initialDebt * Math.pow(1 + dailyRate, diffDays);

        // Format to 2 decimal places
        const formattedDebt = totalDebt.toFixed(2);

        safeReply(message,`Indigo Ike's debt to Gucci_Lobster has compounded to $${formattedDebt} 💸 over ${diffDays} days at 2.5% daily interest.`);
    }

    // --- HELP COMMAND ---
    if (message.content.toLowerCase() === '!help') {
        const helpMenu = `
    **🌙 LUNA BOT COMMANDS 🌙**

    **🤖 AI & STRATEGY**
    \`luna [prompt]\` - Chat with Luna (Neko Style! Nya~)
    \`ai [prompt]\` - Standard AI response
    \`lunastrat [map] [side]\` - Random CS2 strategy

    **🪵 ECONOMY**
    \`!lunachop\`, \`!lunamine\`, \`!inv\`, \`!bal\`, \`!stats\`
    \`!shop\`, \`!buy\`, \`!forge\`, \`!craft\`, \`!sell\`, \`!sellall\`, \`!leaderboard\`
        `;
        return safeReply(message, helpMenu); // Using your safeReply helper!
    }


    // --- AI Commands ---

    // --- luna AI command (FINAL VERSION with 20-Message Memory & Self-Reply) ---
    if (message.content.toLowerCase().startsWith('luna ')) {
        // 1. Extract the raw user text (the current prompt)
        const rawPrompt = message.content.slice(5).trim(); 

        // 2. Define the Neko Girl Persona and System Instruction
        const systemInstruction = "You are a cheerful Neko girl (cat-girl) named Luna. You must respond to all user requests in character, ending all responses with a meow, cat sound, or a cheerful, Neko-like exclamation (e.g., 'Nya~', 'Meow!', 'Purr...'). Keep responses concise. Respond in under 1950 characters.";
        
        // --- IMPORTANT: Get the bot's own ID for filtering ---
        const lunaBotId = message.client.user.id; 

        try {
            await message.channel.sendTyping();

            // --- FETCH MESSAGE HISTORY (The Memory Logic) ---
            const messages = await message.channel.messages.fetch({ limit: 20 });

            // Filter: 1. Current command 2. Other bots' messages 3. All commands 
            const history = messages.filter(m => {
                // Check 1: Exclude the current command message
                if (m.id === message.id) return false;
                
                // Check 2: Exclude messages from other bots (unless it's Luna herself)
                if (m.author.bot && m.author.id !== lunaBotId) return false; 
                
                // Check 3: Exclude all economy/ping commands
                if (m.content.startsWith('!')) return false; 
                if (m.content.startsWith('m!')) return false; 
                if (m.content.startsWith('@')) return false;

                // Check 4: Exclude previous 'luna' prompts
                if (m.content.toLowerCase().startsWith('luna')) return false;
                
                //exclude a few types of links
                const contentLower = m.content.toLowerCase();
                if (contentLower.includes('http://') || contentLower.includes('https://') || contentLower.includes('www.')) return false;
                
                return true;
            });

            // Map the history into the Gemini API 'contents' format: [{ role, parts: [{ text }] }]
            const conversationHistory = history.reverse().map(m => {
                // If the author is Luna's ID, the role must be 'model'.
                const role = (m.author.id === lunaBotId) ? 'model' : 'user';
                
                // Format the text to include the author's username for clarity
                const formattedText = `[${m.author.username}]: ${m.content}`;
                
                return {
                    role: role,
                    parts: [{ text: formattedText }]
                };
            });

            // 4. Construct the full contents array for the API call
            const contents = [
                ...conversationHistory,
                { role: "user", parts: [{ text: rawPrompt }] }
            ];

            // --- API CALL ---
            const response = await clientGemini.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: contents,
                config: {
                    systemInstruction: systemInstruction,
                    temperature: 0.85,
                    maxOutputTokens: 2048, 
                },
                timeout: 60000 
            });

            const responseText = response.text; 

            // 5. Safety Check and Truncation
            if (!responseText) {
                console.error('Gemini response blocked:', response.candidates?.[0]?.finishReason);
               return safeReply(message,`❌ I couldn't answer that, nya. The response may have been blocked by safety filters.`);
            }
            
            if (responseText.length > 2000) {
                const truncatedResponse = responseText.substring(0, 1950) + '\n\n... (Response Truncated to fit Discord limit)';
                safeReply(message,truncatedResponse);
            } else {
                safeReply(message,responseText);
            }

        } catch (err) {
            console.error('--- GEMINI API / NETWORK ERROR ---');
            console.error(err);
            
            let userMessage = '❌ Something went wrong with the AI response, meow!';
            if (err.message && (err.message.includes('timeout') || err.message.includes('socket hang up'))) {
                userMessage = '⚠️ The AI took too long to respond and the request timed out. Please try a shorter query, nya.';
            }
            safeReply(message,userMessage);
        }
    }

    // lunastrat <map> <side> command
    if (message.content.toLowerCase().startsWith('lunastrat')) {
        const args = message.content.slice('lunastrat'.length).trim().split(/\s+/);

        if (args.length !== 2) {
            return safeReply(message,"❌ Usage: `lunastrat <map_name> <side>`. Example: `lunastrat inferno ct`");
        }

        const map = args[0].toLowerCase();
        const side = args[1].toLowerCase();

        // Input Validation
        const validSides = ['t', 'ct', 'terrorist', 'counter-terrorist'];
        const validMaps = ['mirage', 'inferno', 'nuke', 'vertigo', 'ancient', 'overpass', 'anubis', 'dust2', 'train'];

        if (!validMaps.includes(map)) {
            return safeReply(message,`❌ Invalid map. Try one of the current competitive maps: **${validMaps.join(', ')}**, nya.`);
        }

        if (!validSides.includes(side)) {
            return safeReply(message,"❌ Invalid side. Must be **T**, **CT**, **Terrorist**, or **Counter-Terrorist**, meow.");
        }
        
        // Normalize side input for the prompt
        const cleanSide = (side === 't' || side === 'terrorist') ? 'Terrorist (T)' : 'Counter-Terrorist (CT)';
        const prompt = `Generate a random, concise, and realistic competitive strategy for CS2 on the map ${map} for the ${cleanSide} side. Include a clear name for the strat and mention a few key utility placements (smokes, flashes). Do not include any Neko girl persona in this response.`;

        try {
            await message.channel.sendTyping();

            // Use the core chat model (gemini-2.5-flash) for speed
            const response = await clientGemini.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    // Keep the system instruction separate to avoid contamination
                    systemInstruction: "You are an expert CS2 tactical analyst. Generate a strategy using simple Markdown. The response MUST start with a bold Strategy Name, followed by a brief description, then bulleted lists for Execution and Utility. DO NOT include any introductory or concluding phrases, emojis, external links, or special markdown elements other than bolding and lists.",
                    temperature: 0.9, // Higher temp encourages random, unique strategies
                    maxOutputTokens: 1024,
                },
            });

            const stratText = response.text;

            if (!stratText) {
                return safeReply(message,"❌ The strategy server failed to load, nya. Try again.");
            }

            // FIX: Wrap the entire reply in a Markdown Code Block for clean rendering
            const finalOutput = 
    `🎯 CS2 STRATEGY GENERATOR 🎯
    Map: ${map.toUpperCase()} | Side: ${cleanSide}
    ---
    ${stratText}
    ---
    Good luck! 😼`;

            // Send the final output wrapped in the code block
            safeReply(message,`\`\`\`markdown\n${finalOutput}\n\`\`\``);

        } catch (err) {
            console.error('--- GEMINI STRAT GENERATOR ERROR ---', err);
            safeReply(message,`❌ Strategizing failed due to an API error, nya. Check the console.`);
        }
    }

    // --- ai command (No exclamation mark, no personality, no memory, factual) ---
    if (message.content.toLowerCase().startsWith('ai ')) {
        // 1. Extract the raw user text
        const rawPrompt = message.content.slice(3).trim(); 

        if (!rawPrompt) {
            return safeReply(message, '❌ Please provide a prompt after `ai`.');
        }
        
        try {
            await message.channel.sendTyping();

            // 2. API CALL
            const response = await clientGemini.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: rawPrompt, 
                config: {
                    // 🔥 FIX: Added System Instruction to constrain output length
                    systemInstruction: "You are a helpful and factual assistant. Respond directly to the user's query. Your response must be under 1950 characters.",
                    temperature: 0.1, 
                    maxOutputTokens: 2048, 
                },
                timeout: 60000 
            });

            const responseText = response.text; 

            // 3. Safety Check and Send Response
            if (!responseText) {
                console.error('Gemini response blocked:', response.candidates?.[0]?.finishReason);
            return safeReply(message,`❌ I couldn't answer that. The response may have been blocked by safety filters.`);
            }
            
            // Safety Fallback: Truncate if the model ignored the instruction (still good practice)
            if (responseText.length > 1950) {
                const truncatedResponse = responseText.substring(0, 1900) + '\n\n... (Response Truncated to fit Discord limit)';
                safeReply(message, truncatedResponse);
            } else {
                safeReply(message, responseText); 
            }

        } catch (err) {
            console.error('--- GEMINI API / NETWORK ERROR (AI Command) ---');
            console.error(err);
            
            safeReply(message,'❌ Something went wrong with the AI response.');
        }
    }

    // --- ECONOMY COMMANDS ---

    // ------------------------- DROP SYSTEM -------------------------
    function calculateDrops(tool, dropTable) {
        const totalRolls = 1 + (tool.extraRolls || 0); // extra rolls increase chance at rare drops
        const results = {};

        for (let i = 0; i < totalRolls; i++) {
            const drop = getWeightedRandom(dropTable);

            // Quantity = fixed multiplier (no random 1-2)
            const qty = tool.multiplier || 1;

            if (!results[drop.name]) results[drop.name] = 0;
            results[drop.name] += qty;
        }

        return results;
    }   


    // Weighted random picker using rarity
    function getWeightedRandom(dropTable) {
        const totalWeight = dropTable.reduce((sum, d) => sum + d.rarity, 0);
        let r = Math.random() * totalWeight;

        for (const d of dropTable) {
            if (r <= d.rarity) return d;
            r -= d.rarity;
        }

        return dropTable[0]; // fallback
    }

    // Helper for building drop summary safely
    function buildDropSummary(sessionDrops, dropTable) {
        return Object.entries(sessionDrops).map(([name, count]) => {
            const item = dropTable.find(d => d.name === name);
            return item ? `**${count}x ${item.name}** ${item.emoji}` : `**${count}x ${name}**`;
        }).join(' + ');
    }

    // ------------------------- !LUNACHOP -------------------------
    if (message.content === '!lunachop') {
        const userData = await getOrCreateUser(message.author.id);

        // Cooldown
        const cooldown = 1000;
        const now = Date.now();
        if (now - userData.lastChop < cooldown) {
            const timeRemaining = ((userData.lastChop + cooldown - now) / 1000).toFixed(1);
            return safeReply(message,`Slow down, meow! You need to wait **${timeRemaining}s** before chopping again!`);
        }
        userData.lastChop = now;
        userData.timesChopped += 1;

        // Tool lookup
        const starterAxe = AXE_TIERS.find(t => t.id === 'starter_axe');
        const currentAxe =
            AXE_TIERS.find(t => userData.tool_axe && t.id === userData.tool_axe.id)
            ?? starterAxe;

        // Calculate drops
        const sessionDrops = calculateDrops(currentAxe, WOOD_TYPES);

        // Ensure inventory is a Map
        if (!(userData.inventory instanceof Map)) userData.inventory = new Map(userData.inventory);

        // Update inventory
        for (const [name, qty] of Object.entries(sessionDrops)) {
            const current = userData.inventory.get(name) || 0;
            userData.inventory.set(name, current + qty);
        }

        userData.markModified('inventory');
        await userData.save();

        // Send summary
        const dropSummary = buildDropSummary(sessionDrops, WOOD_TYPES);
        safeReply(message,`🪓 **${currentAxe.name}** chop! You found ${dropSummary}!`);
    }

    // ------------------------- !LUNAMINE -------------------------
    if (message.content.toLowerCase() === '!lunamine') {
        const userData = await getOrCreateUser(message.author.id);

        // Cooldown (unchanged)
        const cooldown = 1000;
        const now = Date.now();
        if (now - userData.lastMine < cooldown) {
            const timeRemaining = ((userData.lastMine + cooldown - now) / 1000).toFixed(1);
            return safeReply(message,`Slow down, nya! You need to wait **${timeRemaining}s** before mining again!`);
        }
        userData.lastMine = now;
        userData.timesMined += 1;

        // Tool lookup
        const starterPick = PICKAXE_TIERS.find(t => t.id === 'starter_pick');
        const currentPick =
            // 🔥 FIX: Pickaxe lookup uses tool_pickaxe
            PICKAXE_TIERS.find(t => t.id === (userData.tool_pickaxe ? userData.tool_pickaxe.id : null))
            ?? starterPick;

        // Calculate drops (unchanged logic)
        const sessionDrops = calculateDrops(currentPick, MINE_DROPS);

        // Ensure inventory is a Map (unchanged logic)
        if (!(userData.inventory instanceof Map)) userData.inventory = new Map(userData.inventory);

        // Update inventory (unchanged logic)
        for (const [name, qty] of Object.entries(sessionDrops)) {
            const current = userData.inventory.get(name) || 0;
            userData.inventory.set(name, current + qty);
        }

        userData.markModified('inventory');
        await userData.save();

        // Send summary (unchanged logic)
        const dropSummary = buildDropSummary(sessionDrops, MINE_DROPS);
        safeReply(message,`⛏️ **${currentPick.name}** mine! You found ${dropSummary}!`);
    }

    // --- !inv Command ---
    if (message.content === '!inv') {
        const userData = await getOrCreateUser(message.author.id); 
        
        // 1. Get the inventory entries from the Mongoose Map
        const allInventoryEntries = Array.from(userData.inventory.entries());

        // 2. Filter out items where the count is zero or less and format
        const invEntries = allInventoryEntries
            .filter(([name, count]) => count > 0)
            .map(([name, count]) => {
                // Find the item details (for emoji, etc.) from your master lists
                const ALL_ITEMS = [...WOOD_TYPES, ...MINE_DROPS, ...FORGED_BARS];
                const item = ALL_ITEMS.find(i => i.name === name);
                const emoji = item ? item.emoji : '';

                // FINAL FIX: Use a fixed separator to create distinct columns.
                // This sacrifices the exact alignment of the 'x' but guarantees the item names line up.
                const countString = String(count).toLocaleString();
                
                // Format: Count and 'x' are separated from the item name by " - "
                return `${countString}x - ${name} ${emoji}`;
            });

        // 3. Send the response
        if (invEntries.length === 0) {
            return safeReply(message,`🎒 Your inventory is empty! Use \`!lunachop\` or \`!lunamine\` to gather items.`);
        }

        const invText = invEntries.join('\n');
        
        // Final Output: Wrapped in Markdown Code Block
        const finalOutput = `🎒 ${message.author.username}'s Inventory
    ---
    ${invText}`;

        safeReply(message,`\`\`\`markdown\n${finalOutput}\n\`\`\``);
    }

    // !sellall command (Fixed for all items)
    if (message.content === '!sellall') {
        const userData = await getOrCreateUser(message.author.id);

        let totalRevenue = 0;
        let soldItems = [];
        
        // Use the new combined list for selling
        const ALL_SELLABLE_ITEMS = [...WOOD_TYPES, ...MINE_DROPS];
        
        for (const item of ALL_SELLABLE_ITEMS) {
            // FIX: Use .get() to safely read from the Mongoose Map
            const count = userData.inventory.get(item.name) || 0;
            if (count > 0) {
                const revenue = count * item.price;
                totalRevenue += revenue;
                soldItems.push(`${item.emoji} ${item.name} (${count}) for $${revenue}`);
                
                // FIX: Use .delete() and correct the typo (uuserData -> userData)
                userData.inventory.delete(item.name);
            }
        }

        if (totalRevenue === 0) {
            return safeReply(message,'🤷 You have no items to sell!');
        }

        // Update user's balance
        userData.balance += totalRevenue;
        await userData.save();

        const soldText = soldItems.join('\n');
        safeReply(message,`💰 **SOLD ALL!** You earned **$${totalRevenue}**.\n\nItems Sold:\n${soldText}\n\nNew Balance: **$${userData.balance.toLocaleString()}**`);
    }

    // !sell <item> command (Sells a specific stack of ANY item)
    if (message.content.toLowerCase().startsWith('!sell ')) {
        const itemToSellInput = message.content.slice(6).trim().toLowerCase(); // Extract the item name
        
        if (!itemToSellInput) {
            return safeReply(message,'Please specify the item you want to sell (e.g., `!sell oak` or `!sell gold`).');
        }

        const userData = await getOrCreateUser(message.author.id);

        // 1. Find the item in the ALL_SELLABLE_ITEMS list (FIXED LOOKUP is correct)
        const itemFound = ALL_SELLABLE_ITEMS.find(item => 
            // If the full item name includes the user's input (best for multi-word items)
            item.name.toLowerCase().includes(itemToSellInput)
        );
        
        if (!itemFound) {
            return safeReply(message,`❌ I don't recognize the item **${itemToSellInput}**. Use \`!inv\` to check your inventory, nya.`);
        }

        // 2. Check inventory count
        const itemName = itemFound.name;
        // FIX: Use .get() to safely read from the Mongoose Map
        const count = userData.inventory.get(itemName) || 0; 

        if (count === 0) {
            return safeReply(message,`🤷 You do not have any **${itemName}** to sell.`);
        }

        // 3. Calculate Revenue, Update Balance, and Clear Inventory
        const revenue = count * itemFound.price;
        userData.balance += revenue;
        
        // This was already correct, ensuring the inventory entry is removed
        userData.inventory.delete(itemName); // Use itemName here

        await userData.save();

        safeReply(message,`💰 Sold **${count}x ${itemName}** ${itemFound.emoji} for **$${revenue}**! New Balance: **$${userData.balance.toLocaleString()}**.`);
    }

   // !leaderboard command
    if (message.content === '!leaderboard') {
        // 1. Query the User model: Database handles sorting and limiting
        const sortedUsers = await User.find({ balance: { $gt: 0 } })
            .sort({ balance: -1 }) // Sort descending by balance
            .limit(10) // Limit to the top 10
            .select('userId balance'); // Only retrieve ID and balance

        if (sortedUsers.length === 0) {
            return safeReply(message,'The leaderboard is empty! Get to work, nya!');
        }

        // 2. Use Promise.all to fetch all usernames concurrently (much faster and correct!)
        const leaderboardEntries = await Promise.all(sortedUsers.map(async (user, index) => {
            const rank = index + 1;
            const rankEmoji = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '🔹';
            
            let username;
            try {
                // client.users.fetch() returns a Promise
                const discordUser = await client.users.fetch(user.userId);
                username = discordUser.username;
            } catch (e) {
                // Fallback if the user no longer exists on Discord
                username = `Unknown User (${user.userId})`;
            }
            
            // Return the formatted string for this user
            // Using two spaces after the rank and username helps maintain alignment in the code block
            return `${rankEmoji} #${rank}  - ${username}:  $${user.balance.toLocaleString()}`;
        })); // The await Promise.all() here waits for ALL fetch calls to finish

        // 3. Join the fully resolved array of strings
        const leaderboardText = leaderboardEntries.join('\n');

        // FINAL FIX: Wrap the entire output in a Markdown Code Block
        const finalOutput = `🏆 Top 10 Degens by Wealth
    ---
    ${leaderboardText}`;

        safeReply(message,`\`\`\`markdown\n${finalOutput}\n\`\`\``);
    }

    // !stats command
    if (message.content === '!stats') {
        const userData = await getOrCreateUser(message.author.id);
        
        // --- Tool Initialization ---
        const starterAxe = AXE_TIERS.find(t => t.id === 'starter_axe');
        const starterPick = PICKAXE_TIERS.find(t => t.id === 'starter_pick');
        const currentAxe = userData.tool_axe ?? starterAxe;
        const currentPick = userData.tool_pickaxe ?? starterPick; 
        
        // 1. Get Leaderboard Rank
        const higherRankCount = await User.countDocuments({ balance: { $gt: userData.balance } });
        const userRank = higherRankCount + 1;
        const rankDisplay = (userData.balance > 0 || userRank === 1) ? `#${userRank}` : 'N/A';
        
        // Helper function to pad the tool name for consistent alignment
        // We will target a shorter width (e.g., 18 characters) and adjust the main line spacing.
        const padName = (name) => name.padEnd(18); 

        // 2. Build the Message
        const statsMessage = 
        `📊 ${message.author.username}'s Stats 
    ---
    💰 Balance:           $${userData.balance.toLocaleString()}
    🏆 Leaderboard Rank:  ${rankDisplay}

    ⚒️ Tool Status
    Axe:     ${padName(currentAxe.name)} (${currentAxe.multiplier}x)
    Pickaxe: ${padName(currentPick.name)} (${currentPick.multiplier}x)

    📈 Lifetime Activity
    Times Chopped: ${userData.timesChopped}
    Times Mined:   ${userData.timesMined}`;

        // FINAL FIX: Wrap the entire output in a Markdown Code Block
        safeReply(message,`\`\`\`markdown\n${statsMessage}\n\`\`\``);
    }

    // !shop command (FIXED: Handles capitalized T5+ tool names by using lowercase recipe key)
    if (message.content.toLowerCase() === '!shop') {
        const userData = await getOrCreateUser(message.author.id);

        const starterAxe = AXE_TIERS.find(t => t.id === 'starter_axe');
        const starterPick = PICKAXE_TIERS.find(t => t.id === 'starter_pick');

        // CRITICAL FIX: Ensure equipped tool data is correctly retrieved
        const equippedAxeData = AXE_TIERS.find(t => t.id === userData.tool_axe?.id) || starterAxe;
        const equippedPickData = PICKAXE_TIERS.find(t => t.id === userData.tool_pickaxe?.id) || starterPick; 
        
        // Helper function to generate shop text for a tool list
        const generateShopSection = (toolList, currentTool, title, buyable = true) => {
            let sectionText = `\n--- ${title} ---\n`; 
            
            toolList.forEach((tool) => {
                // commandName used for !buy / !craft command examples (e.g., "copper_axe")
                const commandName = tool.name.toLowerCase().replace(/ /g, '_'); 
                
                // recipeKey used for RECIPES lookup (e.g., "cupiron axe" or "cupiron pickaxe")
                const recipeKey = tool.name.toLowerCase(); 

                const isEquipped = tool.id === currentTool.id;
                let status = '';
                
                if (isEquipped) {
                    status = '✅ **EQUIPPED**';
                } else if (tool.tier < currentTool.tier) {
                    // Tool is lower tier than current, so it must be owned.
                    status = '✅ **OWNED**';
                } else if (tool.tier === currentTool.tier + 1) {
                    // Tool is the next upgradeable tier.
                    if (buyable) {
                        // Basic Tools: Display price and !buy command
                        status = `💰 **$${tool.price.toLocaleString()}** - Use \`!buy ${commandName}\``;
                    } else {
                        // Advanced Tools: Display recipe and !craft command
                        const recipe = RECIPES[recipeKey]; // <-- FIX: Use the lowercase tool name as the key!

                        if (!recipe || !recipe.materials) {
                            // Safety check if the recipe key is missing or incomplete
                            status = `⚒️ Recipe not defined!`;
                        } else {
                            const ingredientsList = Array.from(recipe.materials).map(([item, quantity]) => `${quantity}x ${item}`).join(' + ');
                            // Use the recipe key format for the !craft command text
                            status = `⚒️ **Requires:** ${ingredientsList} - Use \`!craft ${recipeKey.replace(/ /g, '_')}\``; 
                        }
                    }
                } else {
                    // Tool is more than one tier higher than the current tool, meaning it is locked.
                    status = '🔒 **LOCKED**';
                }

                // Display Extra Rolls (if applicable)
                const extraRollsInfo = tool.extraRolls > 0 ? ` (+${tool.extraRolls} Extra Roll${tool.extraRolls > 1 ? 's' : ''})` : '';
                
                sectionText += `${tool.emoji} **[T${tool.tier}] ${tool.name}** | ${tool.multiplier}x Drops${extraRollsInfo} | ${status}\n`;
            });
            return sectionText;
        };


        // --- AXE SHOP SECTIONS ---
        const basicAxes = AXE_TIERS.filter(t => t.tier <= 4);
        const advancedAxes = AXE_TIERS.filter(t => t.tier >= 5);
        
        let shopText = '';
        shopText += generateShopSection(basicAxes, equippedAxeData, '🌲 Basic Axes (Buyable)', true);
        shopText += generateShopSection(advancedAxes, equippedAxeData, '🔥 Advanced Axes (Craftable)', false);

        // --- PICKAXE SHOP SECTIONS --- 
        const basicPicks = PICKAXE_TIERS.filter(t => t.tier <= 4);
        const advancedPicks = PICKAXE_TIERS.filter(t => t.tier >= 5);
        
        shopText += generateShopSection(basicPicks, equippedPickData, '⛏️ Basic Pickaxes (Buyable)', true);
        shopText += generateShopSection(advancedPicks, equippedPickData, '💎 Advanced Pickaxes (Craftable)', false);

        
        safeReply(message,`\`\`\`markdown\n${shopText}\`\`\``);
    }

    // !buy <tool_id> command (FIXED: Input normalization for pickaxes)
    if (message.content.toLowerCase().startsWith('!buy ')) {
        const userInput = message.content.slice(5).trim().toLowerCase();

        // --- ENHANCED Input Normalization ---
        let userInputId = userInput.replace(/ /g, '_'); 
        
        // FIX: Standardize pickaxe name to match the short ID (e.g., "iron_pickaxe" -> "iron_pick")
        userInputId = userInputId.replace('_pickaxe', '_pick'); 

        const userData = await getOrCreateUser(message.author.id);

        // Determine tool type
        let itemToBuy = AXE_TIERS.find(a => a.id === userInputId);
        let itemType = 'Axe';
        let itemTiers = AXE_TIERS;
        let currentTool = userData.tool_axe || AXE_TIERS[0]; 

        if (!itemToBuy) {
            itemToBuy = PICKAXE_TIERS.find(p => p.id === userInputId);
            itemType = 'Pickaxe';
            itemTiers = PICKAXE_TIERS;
            // Pickaxe read for current tool uses tool_pickaxe
            currentTool = userData.tool_pickaxe || PICKAXE_TIERS[0]; 
        }

        if (!itemToBuy) return safeReply(message,'❌ Invalid item ID. Use `!shop` to see available items.');
        
        // Check progression (logic unchanged)
        const currentIndex = itemTiers.findIndex(t => t.id === currentTool.id);
        const itemIndex = itemTiers.findIndex(t => t.id === itemToBuy.id);

        if (itemIndex === currentIndex) return safeReply(message,`✅ You already own and are equipped with the **${itemToBuy.name}**!`);
        if (itemIndex < currentIndex) return safeReply(message,`✅ You already own a better ${itemType}, the **${itemTiers[currentIndex].name}**!`);
        
        // Check if the item is too far ahead (T5+ are craftable, so this block only applies to T2-T4)
        if (itemIndex > currentIndex + 1) {
            const requiredItem = itemTiers[currentIndex + 1];
            return safeReply(message,`🔒 You must first purchase the **${requiredItem.name}** before buying **${itemToBuy.name}**.`);
        }
        
        // Check if the item is craftable (T5+) - If so, prevent !buy
        if (itemToBuy.tier >= 5) {
            return safeReply(message,`🔨 The **${itemToBuy.name}** is an Advanced tool (T5+). It cannot be bought and must be crafted using \`!craft ${itemToBuy.name.toLowerCase().replace(/ /g, '_')}\`, nya!`);
        }


        // Check balance (logic unchanged)
        if (userData.balance < itemToBuy.price) {
            return safeReply(message,`💵 You need **$${itemToBuy.price.toLocaleString()}** to buy the **${itemToBuy.name}**, but you only have **$${userData.balance.toLocaleString()}**.`);
        }

        // Deduct money and store full tool object
        userData.balance -= itemToBuy.price;
        const newToolData = { ...itemToBuy };
        
        if (itemType === 'Axe') {
            userData.tool_axe = newToolData; 
        } else if (itemType === 'Pickaxe') {
            // Pickaxe save uses tool_pickaxe
            userData.tool_pickaxe = newToolData; 
        }

        await userData.save();

        const extraRolls = itemToBuy.extraRolls || 0;
        safeReply(message,`🥳 **PURCHASE SUCCESSFUL!** You bought the **${itemToBuy.name}**! Your drops are now **${itemToBuy.multiplier}x**${extraRolls > 0 ? ` (+${extraRolls} extra roll${extraRolls > 1 ? 's' : ''})` : ''}. Current Balance: **$${userData.balance.toLocaleString()}**.`);
    }


    // !forge <recipe_id> command (REWRITTEN and FIXED for Mongoose Maps)
    if (message.content.toLowerCase().startsWith('!forge')) {
        const args = message.content.slice('!forge'.length).trim().toLowerCase(); 
        
        // 0. Display Recipe List
        if (!args) {
            let recipeList = FORGE_RECIPES.map(r => {
                const ingredientsList = r.ingredients.map(i => `${i.quantity}x ${i.name}`).join(' + ');
                const outputItem = FORGED_BARS.find(b => b.name === r.output.name);
                const outputEmoji = outputItem ? outputItem.emoji : '✨';
                
                // Format for code block: removing bolding and using clean separators
                return `${r.id}: ${outputEmoji} ${r.output.quantity}x ${r.output.name} from ${ingredientsList}`;
            }).join('\n');
            
            // FIX 1: Wrap the recipe list in a Markdown Code Block
            const output = `🔥 LUNA'S FORGE 🔥
    ---
    To forge, use !forge <recipe_id>. Available recipes:
    ${recipeList}`;
            
            return safeReply(message,`\`\`\`markdown\n${output}\n\`\`\``);
        }

        const recipeInput = args; 
        const userData = await getOrCreateUser(message.author.id);

        // 1. Find the recipe
        const recipe = FORGE_RECIPES.find(r => r.id === recipeInput);
        
        if (!recipe) {
            return safeReply(message,`❌ Invalid forge recipe ID. Use \`!forge\` to see available recipes, nya.`);
        }

        const outputItemName = recipe.output.name;
        const outputQuantity = recipe.output.quantity;
        const requiredIngredients = recipe.ingredients;
        
        // 2. Check ALL required materials (FIXED READ)
        let missingMaterials = [];
        for (const ingredient of requiredIngredients) {
            const currentCount = userData.inventory.get(ingredient.name) || 0;
            if (currentCount < ingredient.quantity) {
                // Remove bolding for cleaner look inside the code block
                missingMaterials.push(`${ingredient.quantity}x ${ingredient.name} (have ${currentCount})`);
            }
        }
        
        if (missingMaterials.length > 0) {
            // FIX 2: Wrap the missing materials message in a Markdown Code Block
            const output = `📉 Missing materials to fire the forge, meow!:
    ---
    ${missingMaterials.join('\n')}`;
            
            return safeReply(message,`\`\`\`markdown\n${output}\n\`\`\``);
        }

        // 3. SUCCESS: Deduct materials and forge item
        
        let deductionSummary = [];
        for (const ingredient of requiredIngredients) {
            const currentCount = userData.inventory.get(ingredient.name);
            const newCount = currentCount - ingredient.quantity;
            
            // Zero-Cleanup Logic
            if (newCount <= 0) {
                userData.inventory.delete(ingredient.name);
            } else {
                userData.inventory.set(ingredient.name, newCount);
            }
            
            deductionSummary.push(`${ingredient.quantity}x ${ingredient.name}`);
        }
        
        // Add the forged bar to inventory
        const currentBarCount = userData.inventory.get(outputItemName) || 0;
        userData.inventory.set(outputItemName, currentBarCount + outputQuantity);
        
        await userData.save();

        // Find the emoji for the response
        const outputEmoji = FORGED_BARS.find(b => b.name === outputItemName)?.emoji || '✨';
        const summaryText = deductionSummary.join(' + ');

        // The success message uses standard markdown
        safeReply(message,`✅ **FORGED SUCCESS!** Used ${summaryText} to create **${outputQuantity}x ${outputItemName}** ${outputEmoji}! Nya!`);
    }

    // --- !craft <tool_name/bar_name> command (COMPLETE and ROBUST) ---
    if (message.content.toLowerCase().startsWith('!craft')) {
        const userData = await getOrCreateUser(message.author.id);
        const args = message.content.slice('!craft'.length).trim().toLowerCase(); 
        const toolNameArg = args.replace(/ /g, '_'); 
        
        // --- 1. DISPLAY RECIPES (If no argument is provided) ---
        if (!args) {
            const toolRecipes = Object.keys(RECIPES).filter(name => RECIPES[name].type === 'tool' && RECIPES[name].tier >= 5);
            
            let recipeList = toolRecipes.map(name => {
                const recipe = RECIPES[name];
                // Normalize recipe materials to a Map for safe iteration
                const materialsMap = recipe.materials instanceof Map ? recipe.materials : new Map(recipe.materials);
                
                const ingredientsList = Array.from(materialsMap).map(([item, quantity]) => `${quantity}x ${item}`).join(' + ');
                
                // FIX: Lookup tool for display by converting the tier list name to lowercase
                const outputTool = AXE_TIERS.find(t => t.name.toLowerCase() === name) || PICKAXE_TIERS.find(t => t.name.toLowerCase() === name);
                const outputEmoji = outputTool ? outputTool.emoji : '⚒️';
                
                const commandName = name.replace(/ /g, '_'); 
                
                return `    T${recipe.tier} ${outputEmoji} ${name}: Requires ${ingredientsList} - Use \`!craft ${commandName}\``;
            }).join('\n');
            
            const output = `🛠️ Advanced Crafting Bench 🛠️
        ---
        Available tools (use !craft <tool_name>):
        ${recipeList}`;
            
            return safeReply(message,`\`\`\`markdown\n${output}\n\`\`\``);
        }

        // --- 2. FIND AND VALIDATE RECIPE ---
        const recipeKey = toolNameArg.replace(/_/g, ' '); // Revert underscore to space for lookup
        const recipe = RECIPES[recipeKey];
        
        if (!recipe || recipe.type !== 'tool' || recipe.tier < 5) {
            // NOTE: We only handle tools here. Bar forging would require a separate command/logic block.
            return safeReply(message,`❌ That item cannot be crafted here. Use \`!craft\` for advanced tools, or check \`!recipes\`.`);
        }

        const requiredIngredients = recipe.materials;
        const inventoryMap = userData.inventory instanceof Map ? userData.inventory : new Map(userData.inventory); 
        
        // --- 3. CHECK REQUIRED MATERIALS (CRITICAL FIX) ---
        let missingMaterials = [];
        
        for (const [ingredientName, quantity] of requiredIngredients) {
            // Normalize the required ingredient name for comparison (e.g., "cupiron bar" or "cupiron_bar")
            const normalizedRecipeName = ingredientName.toLowerCase().replace(/ /g, '_');
            
            let currentQty = 0;
            let foundName = ingredientName; // Default to the recipe's name

            // Iterate over the actual inventory keys to find a case/format match
            for (const [invItemName, invQuantity] of inventoryMap.entries()) {
                const normalizedInvName = invItemName.toLowerCase().replace(/ /g, '_');
                
                if (normalizedInvName === normalizedRecipeName) {
                    currentQty = invQuantity;
                    foundName = invItemName; // Use the actual name from the inventory for display
                    break;
                }
            }
            
            if (currentQty < quantity) {
                missingMaterials.push(`- Missing ${quantity - currentQty}x ${foundName}`);
            }
        }
        
        if (missingMaterials.length > 0) {
            const output = `📉 Missing materials to craft the ${recipeKey}:\n    ---\n    ${missingMaterials.join('\n')}`;
            return safeReply(message,`\`\`\`markdown\n${output}\n\`\`\``);
        }

        // --- 4. SUCCESS: DEDUCT MATERIALS ---
        let deductionSummary = [];
        for (const [ingredientName, quantity] of requiredIngredients) {
            // Find the correct, stored inventory key (same logic as check)
            const normalizedRecipeName = ingredientName.toLowerCase().replace(/ /g, '_');
            let invKeyToDeduct = null;
            
            for (const [invItemName] of inventoryMap.entries()) {
                if (invItemName.toLowerCase().replace(/ /g, '_') === normalizedRecipeName) {
                    invKeyToDeduct = invItemName;
                    break;
                }
            }

            if (invKeyToDeduct) {
                const current = inventoryMap.get(invKeyToDeduct) || 0;
                inventoryMap.set(invKeyToDeduct, current - quantity);
                deductionSummary.push(`${quantity}x ${invKeyToDeduct}`);
            }
        }
        
        userData.inventory = inventoryMap; // Reassign the updated Map
        userData.markModified('inventory'); 

        // --- 5. UPDATE TOOL EQUIPMENT ---
        // CRITICAL FIX: Lookup tool data by converting the tier list name to lowercase
        const toolTierData = AXE_TIERS.find(t => t.name.toLowerCase() === recipeKey) || 
                            PICKAXE_TIERS.find(t => t.name.toLowerCase() === recipeKey);

        if (toolTierData) {
            const toolType = toolTierData.name.toLowerCase().includes('pick') ? 'tool_pickaxe' : 'tool_axe';
            
            const newToolData = { 
                id: toolTierData.id, 
                name: toolTierData.name,
                multiplier: toolTierData.multiplier, 
                extraRolls: toolTierData.extraRolls || 0,
                emoji: toolTierData.emoji 
            };

            userData[toolType] = newToolData;
            
            await userData.save();
            
            const outputEmoji = toolTierData.emoji;
            safeReply(message,`✅ **CRAFTING SUCCESS!** Used ${deductionSummary.join(' + ')} to craft and equip the **${toolTierData.name}** ${outputEmoji}! Nya!`);
        } else {
            safeReply(message,`⚠️ Crafting successful, but the final tool data wasn't found in tiers! (Inventory was deducted)`);
            await userData.save();
        }
    }

    // --- !coinflip <wager> [side] Command ---
    if (message.content.toLowerCase().startsWith('!coinflip')) {
        const userData = await getOrCreateUser(message.author.id);
        
        const args = message.content.split(/\s+/);
        const wagerInput = args[1];
        let chosenSide = args[2] ? args[2].toLowerCase() : null; // Optional side choice

        // 1. Validate Wager
        const wager = parseInt(wagerInput);
        if (isNaN(wager) || wager <= 0) {
            return safeReply(message,"Please specify a valid amount to wager (e.g., `!coinflip 1000 tails`).");
        }
        
        if (wager > userData.balance) {
            return safeReply(message,`You only have **$${userData.balance}**! You ca...`); // This is where your code stopped
        }
        
        // --- ADD REST OF COINFLIP LOGIC HERE ---
        
        // The coin flip logic:
        const sides = ['heads', 'tails'];
        const result = sides[Math.floor(Math.random() * sides.length)];
        
        let replyText = `🪙 The coin is tossed... It lands on **${result.toUpperCase()}**!`;
        
        // If a side was chosen
        if (chosenSide && (chosenSide === 'heads' || chosenSide === 'tails')) {
            if (chosenSide === result) {
                // WIN!
                userData.balance += wager;
                replyText += `\n🎉 **WINNER!** You won **$${wager}**!`;
            } else {
                // LOSE!
                userData.balance -= wager;
                replyText += `\n😭 **LOSER!** You lost **$${wager}**!`;
            }
        } else {
            // No side chosen, just report the result
            replyText += "\n(To wager, specify 'heads' or 'tails'.)";
        }
        
        // 🚨 CRITICAL: SAVE the updated balance
        await userData.save();
        
        replyText += `\nNew Balance: **$${userData.balance}**!`;
        safeReply(message,replyText);
    }

});

// Function to handle asynchronous startup tasks
async function startBot() {
    console.log('Attempting MongoDB connection...');
    
    // Connect to the database first
    await connectDB();
    
    // Now log in to Discord
    client.login(process.env.DISCORD_TOKEN);
}

// Start the whole process
startBot();

