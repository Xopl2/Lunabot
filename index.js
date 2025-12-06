//env enctryption
require('dotenv').config();

//discord.js import
const { Client, GatewayIntentBits, Events, PermissionFlagsBits } = require('discord.js');

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

// Define wood types and their sell prices (UPDATED 7 TIERS)
const WOOD_TYPES = [
    { name: "Oak", emoji: "🌳", rarity: 0.5000, price: 5 },      // 50.00% Common
    { name: "Willow", emoji: "🌿", rarity: 0.3000, price: 10 },    // 30.00% Common
    { name: "Birch", emoji: "🌲", rarity: 0.1000, price: 25 },     // 10.00% Uncommon
    { name: "Redwood", emoji: "🍁", rarity: 0.0800, price: 50 },    // 8.00% Uncommon
    { name: "Mahogany", emoji: "🪵", rarity: 0.0190, price: 100 },  // 1.90% Rare
    { name: "Ancient Log", emoji: "🪓", rarity: 0.0007, price: 500 }, // 0.09% Ultra Rare
    { name: "Ghost log", emoji: "👻", rarity: 0.0002, price: 2000 }, // 0.02% Super Rare
    { name: "Petrified Log", emoji: "💎", rarity: 0.0001, price: 5000 } // 0.01% Legendary
];

// Define mining drops and their sell prices (7 TIERS)
const MINE_DROPS = [
    { name: "Chunk of Stone", emoji: "🪨", rarity: 0.7870, price: 5 },     // 78.70% (Fills the rest)
    { name: "Chunk of Coal", emoji: "⚫", rarity: 0.1000, price: 10 },      // 10.00% Common
    { name: "Chunk of Copper", emoji: "🟠", rarity: 0.0500, price: 15 },     // 5.00% Uncommon
    { name: "Chunk of Iron", emoji: "🔩", rarity: 0.0500, price: 30 },     // 5.00% Uncommon
    { name: "Chunk of Gold", emoji: "🟡", rarity: 0.0100 , price: 100 },      // 1.00% Rare
    { name: "Chunk of Cobalt", emoji: "🔵", rarity: 0.0025, price: 500 },   // 0.25% Ultra Rare
    { name: "Chunk of Adamantite", emoji: "💎", rarity: 0.0005, price: 1000 } // 0.05% Legendary
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
    "cupiron pick": {
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
    "fancy pick": {
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
    "undead pick": {
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
    "adamantite pick": {
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
    { id: "starter_axe", name: "Starter Axe", multiplier: 1, price: 0, emoji: "🪓", tier: 1 }, 
    { id: "copper_axe", name: "Copper Axe", multiplier: 2, price: 500, emoji: "🪓🟠", tier: 2 },
    { id: "iron_axe", name: "Iron Axe", multiplier: 3, price: 2000, emoji: "🪓🔩", tier: 3 },
    { id: "steel_axe", name: "Steel Axe", multiplier: 5, price: 5000, emoji: "🪓⚙️", tier: 4 },

    // --- ADVANCED (CRAFTABLE) Tiers 5-8 ---
    { id: "axe_t5", name: "cupiron axe", multiplier: 7, emoji: "🪓💎", tier: 5 },
    { id: "axe_t6", name: "fancy axe", multiplier: 9, emoji: "🪓✨", tier: 6 },
    { id: "axe_t7", name: "undead axe", multiplier: 12, emoji: "🪓💀", tier: 7 },
    { id: "axe_t8", name: "adamantite axe", multiplier: 15, emoji: "🪓🌌", tier: 8 }
];

const PICKAXE_TIERS = [
    // --- BASIC (BUYABLE) Tiers 1-4 ---
    { id: "starter_pick", name: "Starter Pick", multiplier: 1, price: 0, emoji: "⛏️", tier: 1 }, 
    { id: "copper_pick", name: "Copper Pickaxe", multiplier: 2, price: 1000, emoji: "⛏️🟠", tier: 2 },
    { id: "iron_pick", name: "Iron Pickaxe", multiplier: 3, price: 2500, emoji: "⛏️🔩", tier: 3 },
    { id: "steel_pick", name: "Steel Pickaxe", multiplier: 5, price: 5000, emoji: "⛏️⚙️", tier: 4 },

    // --- ADVANCED (CRAFTABLE) Tiers 5-8 ---
    { id: "pick_t5", name: "cupiron pick", multiplier: 7, emoji: "⛏️💎", tier: 5 },
    { id: "pick_t6", name: "fancy pick", multiplier: 9, emoji: "⛏️✨", tier: 6 },
    { id: "pick_t7", name: "undead pick", multiplier: 12, emoji: "⛏️💀", tier: 7 },
    { id: "pick_t8", name: "adamantite pick", multiplier: 15, emoji: "⛏️🌌", tier: 8 }
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
        message.reply('Pong!');      
    }

    // Gucci Lobster responder with 1% chance
    const targetUserId = '471040517082447882';
    if (message.author.id === targetUserId) {
        if (Math.random() < 0.1) { // 1% chance
           message.channel.send(`<@${targetUserId}> 🍊🐔`);
        }

        // 2. 1 in 50 Chance (2% or < 0.02) for GIF
        if (Math.random() < 0.02) { 
           message.channel.send("https://tenor.com/view/chicken-wings-wings-food-chicken-wing-gif-26532274");
        }
    }

    // Poop command
    if (message.content === '!poop') {
        message.reply('💩');
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

        message.reply(`Indigo Ike's debt to Gucci_Lobster has compounded to $${formattedDebt} 💸 over ${diffDays} days at 2.5% daily interest.`);
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
                return message.reply(`❌ I couldn't answer that, nya. The response may have been blocked by safety filters.`);
            }
            
            if (responseText.length > 2000) {
                const truncatedResponse = responseText.substring(0, 1950) + '\n\n... (Response Truncated to fit Discord limit)';
                message.reply(truncatedResponse);
            } else {
                message.reply(responseText);
            }

        } catch (err) {
            console.error('--- GEMINI API / NETWORK ERROR ---');
            console.error(err);
            
            let userMessage = '❌ Something went wrong with the AI response, meow!';
            if (err.message && (err.message.includes('timeout') || err.message.includes('socket hang up'))) {
                userMessage = '⚠️ The AI took too long to respond and the request timed out. Please try a shorter query, nya.';
            }
            message.reply(userMessage);
        }
    }

    // lunastrat <map> <side> command
    if (message.content.toLowerCase().startsWith('lunastrat')) {
        const args = message.content.slice('lunastrat'.length).trim().split(/\s+/);

        if (args.length !== 2) {
            return message.reply("❌ Usage: `lunastrat <map_name> <side>`. Example: `lunastrat inferno ct`");
        }

        const map = args[0].toLowerCase();
        const side = args[1].toLowerCase();

        // Input Validation
        const validSides = ['t', 'ct', 'terrorist', 'counter-terrorist'];
        const validMaps = ['mirage', 'inferno', 'nuke', 'vertigo', 'ancient', 'overpass', 'anubis', 'dust2', 'train'];

        if (!validMaps.includes(map)) {
            return message.reply(`❌ Invalid map. Try one of the current competitive maps: **${validMaps.join(', ')}**, nya.`);
        }

        if (!validSides.includes(side)) {
            return message.reply("❌ Invalid side. Must be **T**, **CT**, **Terrorist**, or **Counter-Terrorist**, meow.");
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
                return message.reply("❌ The strategy server failed to load, nya. Try again.");
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
            message.reply(`\`\`\`markdown\n${finalOutput}\n\`\`\``);

        } catch (err) {
            console.error('--- GEMINI STRAT GENERATOR ERROR ---', err);
            message.reply(`❌ Strategizing failed due to an API error, nya. Check the console.`);
        }
    }

    // --- ECONOMY COMMANDS ---

        // !lunachop command
        if (message.content === '!lunachop') {
            const userData = await getOrCreateUser(message.author.id);

            // Cooldown check (1 second)
            const cooldown = 1000;
            const now = Date.now();
            if (now - userData.lastChop < cooldown) {
                const timeRemaining = ((userData.lastChop + cooldown - now) / 1000).toFixed(1);
                return message.reply(`Slow down, meow! You need to wait **${timeRemaining}s** before chopping again!`);
            }
            userData.lastChop = now; // Set new cooldown time

            userData.timesChopped += 1;

            // Use the index for the current axe tier
            const axeInfo = userData.tool_axe || AXE_TIERS[0];
            const multiplier = axeInfo.multiplier;
            const axeDisplayName = axeInfo.name;

            // Logic to determine which wood type is found
            const roll = Math.random();
            let cumulativeRarity = 0;
            let foundWood = null;

            for (const wood of WOOD_TYPES) {
                cumulativeRarity += wood.rarity;
                if (roll <= cumulativeRarity) {
                    foundWood = wood;
                    break;
                }
            }

            if (!foundWood) {
            foundWood = WOOD_TYPES[0]; // Default to Oak if no wood found
            }
     
            // Calculate final drops using the multiplier (always at least 1)
            const drops = multiplier; 

            // Get the item name
            const itemName = foundWood.name;

            // Calculate the new total count
            const currentCount = userData.inventory.get(itemName) || 0; // Use .get() to safely read from the Mongoose Map
            const newCount = currentCount + drops;

            // Add drops to the user's inventory using .set() to ensure Mongoose tracks the change
            userData.inventory.set(itemName, newCount);

            await userData.save();
 
            message.reply(`🪓 **${axeDisplayName}** chop! You found **${drops}x ${foundWood.name}** ${foundWood.emoji}!`);
    }

    // --- !lunamine Command ---
    if (message.content.toLowerCase() === '!lunamine') {
        const userData = await getOrCreateUser(message.author.id);

        // Cooldown check (1 seconds)
        const cooldown = 1000;
        const now = Date.now();
        if (now - userData.lastMine < cooldown) {
            const timeRemaining = ((userData.lastMine + cooldown - now) / 1000).toFixed(1);
            return message.reply(`Slow down, nya! You need to wait **${timeRemaining}s** before mining again!`);
        }
        userData.lastMine = now; // Set new cooldown time

        userData.timesMined += 1;
        
        // NEW: Safely retrieve the current pickaxe object from user data.
        const currentPickaxe = userData.tool_pickaxe || PICKAXE_TIERS[0];
        
        // 1. Determine the Drop (Rarity Logic)
        const roll = Math.random(); 
        let cumulativeRarity = 0;
        let selectedDrop = null;

        for (const drop of MINE_DROPS) {
            cumulativeRarity += drop.rarity;
            if (roll <= cumulativeRarity) {
                selectedDrop = drop;
                break; 
            }
        }

        if (!selectedDrop) {
            selectedDrop = MINE_DROPS[0]; 
        }

        // 2. Apply Multiplier for Quantity
        const amount = currentPickaxe.multiplier;
        
        // 3. Update the User's Inventory (THE FIX IS HERE)
        const itemName = selectedDrop.name;
        
        // Get the current count safely using .get() or || 0
        const currentCount = userData.inventory.get(itemName) || 0; 
        
        // Use .set() to update the Mongoose Map and ensure the change is tracked
        userData.inventory.set(itemName, currentCount + amount); // <-- CRITICAL FIX APPLIED

        // 4. Save the data
        await userData.save();

        // 5. Send the confirmation message
        message.reply(`⛏️ **${currentPickaxe.name}** mine! You found **${amount}x** ${selectedDrop.name} ${selectedDrop.emoji}!`);
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
            return message.reply(`🎒 Your inventory is empty! Use \`!lunachop\` or \`!lunamine\` to gather items.`);
        }

        const invText = invEntries.join('\n');
        
        // Final Output: Wrapped in Markdown Code Block
        const finalOutput = `🎒 ${message.author.username}'s Inventory
    ---
    ${invText}`;

        message.reply(`\`\`\`markdown\n${finalOutput}\n\`\`\``);
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
            return message.reply('🤷 You have no items to sell!');
        }

        // Update user's balance
        userData.balance += totalRevenue;
        await userData.save();

        const soldText = soldItems.join('\n');
        message.reply(`💰 **SOLD ALL!** You earned **$${totalRevenue}**.\n\nItems Sold:\n${soldText}\n\nNew Balance: **$${userData.balance.toLocaleString()}**`);
    }

    // !sell <item> command (Sells a specific stack of ANY item)
    if (message.content.toLowerCase().startsWith('!sell ')) {
        const itemToSellInput = message.content.slice(6).trim().toLowerCase(); // Extract the item name
        
        if (!itemToSellInput) {
            return message.reply('Please specify the item you want to sell (e.g., `!sell oak` or `!sell gold`).');
        }

        const userData = await getOrCreateUser(message.author.id);

        // 1. Find the item in the ALL_SELLABLE_ITEMS list (FIXED LOOKUP is correct)
        const itemFound = ALL_SELLABLE_ITEMS.find(item => 
            // If the full item name includes the user's input (best for multi-word items)
            item.name.toLowerCase().includes(itemToSellInput)
        );
        
        if (!itemFound) {
            return message.reply(`❌ I don't recognize the item **${itemToSellInput}**. Use \`!inv\` to check your inventory, nya.`);
        }

        // 2. Check inventory count
        const itemName = itemFound.name;
        // FIX: Use .get() to safely read from the Mongoose Map
        const count = userData.inventory.get(itemName) || 0; 

        if (count === 0) {
            return message.reply(`🤷 You do not have any **${itemName}** to sell.`);
        }

        // 3. Calculate Revenue, Update Balance, and Clear Inventory
        const revenue = count * itemFound.price;
        userData.balance += revenue;
        
        // This was already correct, ensuring the inventory entry is removed
        userData.inventory.delete(itemName); // Use itemName here

        await userData.save();

        message.reply(`💰 Sold **${count}x ${itemName}** ${itemFound.emoji} for **$${revenue}**! New Balance: **$${userData.balance.toLocaleString()}**.`);
    }

   // !leaderboard command
    if (message.content === '!leaderboard') {
        // 1. Query the User model: Database handles sorting and limiting
        const sortedUsers = await User.find({ balance: { $gt: 0 } })
            .sort({ balance: -1 }) // Sort descending by balance
            .limit(10) // Limit to the top 10
            .select('userId balance'); // Only retrieve ID and balance

        if (sortedUsers.length === 0) {
            return message.reply('The leaderboard is empty! Get to work, nya!');
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

        message.reply(`\`\`\`markdown\n${finalOutput}\n\`\`\``);
    }

    // !stats command
    if (message.content === '!stats') {
        const userData = await getOrCreateUser(message.author.id);
        
        // --- FIX 1: Ensure Starter Tools are defined if DB field is null/undefined ---
        // You MUST define these static objects globally or retrieve them from AXE_TIERS/PICKAXE_TIERS lists
        // (Assuming AXE_TIERS and PICKAXE_TIERS are available in this scope)
        const starterAxe = AXE_TIERS.find(t => t.id === 'starter_axe');
        const starterPick = PICKAXE_TIERS.find(t => t.id === 'starter_pick');

        // Use nullish coalescing (??) to ensure we always have an object.
        const currentAxe = userData.tool_axe ?? starterAxe;
        const currentPick = userData.tool_pick ?? starterPick; 
        
        // 1. Get Leaderboard Rank by querying MongoDB
        const higherRankCount = await User.countDocuments({ balance: { $gt: userData.balance } });
        const userRank = higherRankCount + 1;
        const rankDisplay = (userData.balance > 0 || userRank === 1) ? `#${userRank}` : 'N/A';
        
        // 2. Build the Message
        
        // Use fixed-width formatting for clean alignment in the code block.
        const statsMessage = 
        `📊 ${message.author.username}'s Stats 
    ---
    💰 Balance:         $${userData.balance.toLocaleString()}
    🏆 Leaderboard Rank: ${rankDisplay}

    ⚒️ Tool Status
    Axe:    ${currentAxe.name} (${currentAxe.multiplier}x)
    Pickaxe: ${currentPick.name} (${currentPick.multiplier}x)

    📈 Lifetime Activity
    Times Chopped: ${userData.timesChopped}
    Times Mined:   ${userData.timesMined}`;

        // FINAL FIX: Wrap the entire output in a Markdown Code Block
        message.reply(`\`\`\`markdown\n${statsMessage}\n\`\`\``);
    }

   // !shop command (Refactored for Basic/Advanced Display)
    if (message.content.toLowerCase() === '!shop') {
        const userData = await getOrCreateUser(message.author.id);

        const starterAxe = AXE_TIERS.find(t => t.id === 'starter_axe');
        const starterPick = PICKAXE_TIERS.find(t => t.id === 'starter_pick');

        // CRITICAL FIX: Ensure the equipped data always has the full 'tier' property
        const equippedAxeData = AXE_TIERS.find(t => t.id === userData.tool_axe?.id) || starterAxe;
        const equippedPickData = PICKAXE_TIERS.find(t => t.id === userData.tool_pick?.id) || starterPick;
        
        // Helper function to generate shop text for a tool list
        const generateShopSection = (toolList, currentTool, title, buyable = true) => {
            let sectionText = `\n--- ${title} ---\n`; 
            
            toolList.forEach((tool) => {
                // Compare IDs from the list (tool.id) to the reliable equipped ID (currentTool.id)
                const isEquipped = tool.id === currentTool.id;
                let status = '';
                
                if (isEquipped) {
                    status = '✅ **EQUIPPED**';
                } else if (buyable && tool.price !== undefined) {
                    // Logic for Basic (Buyable) tools:
                    const isNextPurchasable = tool.tier === currentTool.tier + 1;
                    
                    if (isNextPurchasable) { 
                        status = `💰 **$${tool.price.toLocaleString()}** - Use \`!buy ${tool.name}\``;
                    } else if (tool.tier < currentTool.tier) {
                        status = '✅ **OWNED**';
                    } else if (tool.tier > currentTool.tier) {
                        status = '🔒 **LOCKED**';
                    }
                } else if (!buyable && RECIPES[tool.name]) {
                    // Logic for Advanced (Craftable) tools:
                    const recipe = RECIPES[tool.name];
                    const ingredientsList = Array.from(recipe.materials).map(([item, quantity]) => `${quantity}x ${item}`).join(' + ');
                    
                    if (isEquipped) {
                        status = '✅ **EQUIPPED**';
                    } else {
                        status = `⚒️ **Requires:** ${ingredientsList} - Use \`!craft ${tool.name}\``;
                    }
                } else {
                    status = '🔒 **LOCKED/ADVANCED**';
                }

                sectionText += `${tool.emoji} **[T${tool.tier}] ${tool.name}** | ${tool.multiplier}x Drops | ${status}\n`;
            });
            return sectionText;
        };


        // ----------------------------------------------------
        // --- AXE SHOP SECTIONS ---
        // ----------------------------------------------------
        
        const basicAxes = AXE_TIERS.filter(t => t.tier <= 4);
        const advancedAxes = AXE_TIERS.filter(t => t.tier >= 5);
        
        let shopText = '';
        shopText += generateShopSection(basicAxes, equippedAxeData, '🌲 Basic Axes (Buyable)', true); // Use fixed object
        shopText += generateShopSection(advancedAxes, equippedAxeData, '🔥 Advanced Axes (Craftable)', false); // Use fixed object

        // ----------------------------------------------------
        // --- PICKAXE SHOP SECTIONS --- 
        // ----------------------------------------------------

        const basicPicks = PICKAXE_TIERS.filter(t => t.tier <= 4);
        const advancedPicks = PICKAXE_TIERS.filter(t => t.tier >= 5);
        
        shopText += generateShopSection(basicPicks, equippedPickData, '⛏️ Basic Pickaxes (Buyable)', true); // Use fixed object
        shopText += generateShopSection(advancedPicks, equippedPickData, '💎 Advanced Pickaxes (Craftable)', false); // Use fixed object

        
        // FINAL FIX: Wrap the entire output in a Code Block (```)
        message.reply(`\`\`\`markdown\n${shopText}\`\`\``);
    }

    // !buy <tool_id> command (FIXED for consistent ID-based tracking)
    if (message.content.toLowerCase().startsWith('!buy ')) {
        const userInputId = message.content.slice(5).trim().toLowerCase();
        
        const userData = await getOrCreateUser(message.author.id);
        
        let itemToBuy, itemType, currentToolId, itemTiers;

        // 1. Determine tool type and find the item to buy
        itemToBuy = AXE_TIERS.find(a => a.id === userInputId);
        if (itemToBuy) {
            itemType = 'Axe';
            itemTiers = AXE_TIERS;
            currentToolId = userData.tool_axe.id; // Get the currently equipped ID
        } else {
            itemToBuy = PICKAXE_TIERS.find(p => p.id === userInputId);
            if (itemToBuy) {
                itemType = 'Pickaxe';
                itemTiers = PICKAXE_TIERS;
                currentToolId = userData.tool_pickaxe.id; // Get the currently equipped ID
            }
        }
        
        if (!itemToBuy) {
            return message.reply('❌ Invalid item ID. Use `!shop` to see available items.');
        }

        // 2. Check for progression (must be the next tier up)
        const currentItemIndex = itemTiers.findIndex(i => i.id === currentToolId);
        const itemIndex = itemTiers.findIndex(i => i.id === userInputId);
        
        if (itemIndex === currentItemIndex) {
            return message.reply(`✅ You already own and are equipped with the **${itemToBuy.name}**!`);
        }
        if (itemIndex < currentItemIndex) {
            return message.reply(`✅ You already own a better ${itemType}, the **${itemTiers[currentItemIndex].name}**!`);
        }
        if (itemIndex > currentItemIndex + 1) {
            const requiredItem = itemTiers[currentItemIndex + 1];
            return message.reply(`🔒 You must first purchase the **${requiredItem.name}** before you can buy the **${itemToBuy.name}**.`);
        }

        // 3. Check balance
        if (userData.balance < itemToBuy.price) {
            return message.reply(`💵 You need **$${itemToBuy.price}** to buy the **${itemToBuy.name}**, but you only have **$${userData.balance}**.`);
        }

        // 4. SUCCESS: Deduct money and update tool (Using the modern ID structure)
        userData.balance -= itemToBuy.price;
        
        const newToolData = {
            id: itemToBuy.id,
            name: itemToBuy.name,
            multiplier: itemToBuy.multiplier
        };
        
        if (itemType === 'Axe') {
            userData.tool_axe = newToolData;
        } else if (itemType === 'Pickaxe') {
            userData.tool_pickaxe = newToolData;
        }

        await userData.save();

        message.reply(`🥳 **PURCHASE SUCCESSFUL!** You bought the **${itemToBuy.name}**! Your drops are now **${itemToBuy.multiplier}x**. Current Balance: **$${userData.balance}**.`);
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
            
            return message.reply(`\`\`\`markdown\n${output}\n\`\`\``);
        }

        const recipeInput = args; 
        const userData = await getOrCreateUser(message.author.id);

        // 1. Find the recipe
        const recipe = FORGE_RECIPES.find(r => r.id === recipeInput);
        
        if (!recipe) {
            return message.reply(`❌ Invalid forge recipe ID. Use \`!forge\` to see available recipes, nya.`);
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
            
            return message.reply(`\`\`\`markdown\n${output}\n\`\`\``);
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
        message.reply(`✅ **FORGED SUCCESS!** Used ${summaryText} to create **${outputQuantity}x ${outputItemName}** ${outputEmoji}! Nya!`);
    }

    // !craft <tool_name> command (NEW COMMAND FOR ADVANCED TOOLS)
    if (message.content.toLowerCase().startsWith('!craft')) {
        const args = message.content.slice('!craft'.length).trim().toLowerCase(); 
        const toolName = args; 
        
        // Display available recipes if no argument is provided
        if (!args) {
            // Find all tool recipes (T5-T8 tools should be defined in RECIPES)
            const toolRecipes = Object.keys(RECIPES).filter(name => RECIPES[name].type === 'tool' && RECIPES[name].tier >= 5);
            
            let recipeList = toolRecipes.map(name => {
                const recipe = RECIPES[name];
                const ingredientsList = Array.from(recipe.materials).map(([item, quantity]) => `${quantity}x ${item}`).join(' + ');
                const outputTool = AXE_TIERS.find(t => t.name === name) || PICKAXE_TIERS.find(t => t.name === name);
                const outputEmoji = outputTool ? outputTool.emoji : '⚒️';
                
                // FIX: Add 4 spaces manually to push the entire recipe line over.
                // This is the attempt to correct the starting alignment.
                return `    T${recipe.tier} ${outputEmoji} ${name}: Requires ${ingredientsList}`;
            }).join('\n');
            
            // FIX 1: Wrap the recipe list in a Markdown Code Block
            const output = `🛠️ Advanced Crafting Bench 🛠️
    ---
    Available tools (use !craft <tool_name>):
    ${recipeList}`;
            
            return message.reply(`\`\`\`markdown\n${output}\n\`\`\``);
        }

        // 1. Find the recipe
        const recipe = RECIPES[toolName];
        
        // Ensure it is a tool recipe (T5+) and not a bar recipe
        if (!recipe || recipe.type !== 'tool' || recipe.tier < 5) {
            return message.reply(`❌ That item cannot be crafted here. Use \`!craft\` for advanced tools, or \`!forge\` for bars.`);
        }

        const userData = await getOrCreateUser(message.author.id);
        const requiredIngredients = recipe.materials;
        
        // 2. Check ALL required materials
        let missingMaterials = [];
        for (const [ingredientName, quantity] of requiredIngredients) {
            const currentCount = userData.inventory.get(ingredientName) || 0;
            if (currentCount < quantity) {
                // Remove bolding for cleaner look inside the code block
                missingMaterials.push(`${quantity}x ${ingredientName} (have ${currentCount})`);
            }
        }
        
        if (missingMaterials.length > 0) {
            // FIX 2: Wrap the missing materials message in a Markdown Code Block
            const output = `📉 Missing materials to craft the ${toolName}:
    ---
    ${missingMaterials.join('\n')}`;
            
            return message.reply(`\`\`\`markdown\n${output}\n\`\`\``);
        }

        // 3. SUCCESS: Deduct materials and award the tool
        
        let deductionSummary = [];
        for (const [ingredientName, quantity] of requiredIngredients) {
            const currentCount = userData.inventory.get(ingredientName);
            const newCount = currentCount - quantity;
            
            // Crucial Zero-Cleanup Logic
            if (newCount <= 0) {
                userData.inventory.delete(ingredientName);
            } else {
                userData.inventory.set(ingredientName, newCount);
            }
            
            deductionSummary.push(`${quantity}x ${ingredientName}`);
        }
        
        // 4. Update the user's tool inventory/equipment
        const toolTierData = AXE_TIERS.find(t => t.name === toolName) || PICKAXE_TIERS.find(t => t.name === toolName);

        if (toolTierData) {
            const toolType = toolTierData.name.includes('pick') ? 'tool_pick' : 'tool_axe';
            userData[toolType] = { id: toolTierData.id, name: toolTierData.name };
            
            await userData.save();
            
            const outputEmoji = toolTierData.emoji;
            // The success message uses standard markdown
            message.reply(`✅ **CRAFTING SUCCESS!** Used ${deductionSummary.join(' + ')} to craft and equip the **${toolName}** ${outputEmoji}! Nya!`);
        } else {
            message.reply(`⚠️ Crafting successful, but couldn't equip the tool.`);
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
            return message.reply("Please specify a valid amount to wager (e.g., `!coinflip 1000 tails`).");
        }
        
        if (wager > userData.balance) {
            return message.reply(`You only have **$${userData.balance}**! You ca...`); // This is where your code stopped
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
        message.reply(replyText);
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

