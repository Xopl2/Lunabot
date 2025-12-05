//env enctryption
require('dotenv').config();

//discord.js import
const { Client, GatewayIntentBits, Events, PermissionFlagsBits } = require('discord.js');

//file system import 
const fs = require('fs');

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

client.on(Events.ClientReady, () => {
    console.log(`Logged in as ${client.user.tag}`);
});

//gemini ai client
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const clientGemini = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

//economy file config
const ECONOMY_FILE = './economy.json';

// Define wood types and their sell prices (UPDATED 7 TIERS)
const WOOD_TYPES = [
    { name: "Oak", emoji: "🌳", rarity: 0.5000, price: 5 },      // 50.00% Common
    { name: "Willow", emoji: "🌿", rarity: 0.3000, price: 10 },    // 30.00% Common
    { name: "Birch", emoji: "🌲", rarity: 0.1000, price: 25 },     // 10.00% Uncommon
    { name: "Redwood", emoji: "🍁", rarity: 0.0800, price: 50 },    // 8.00% Uncommon
    { name: "Mahogany", emoji: "🪵", rarity: 0.0190, price: 100 },  // 1.90% Rare
    { name: "Ancient Log", emoji: "🪓", rarity: 0.0007, price: 250 }, // 0.09% Ultra Rare
    { name: "Ghost log", emoji: "👻", rarity: 0.0002, price: 250 }, // 0.02% Super Rare
    { name: "Petrified Log", emoji: "💎", rarity: 0.0001, price: 5000 } // 0.01% Legendary
];

// Define mining drops and their sell prices (7 TIERS)
const MINE_DROPS = [
    { name: "Chunk of Stone", emoji: "🪨", rarity: 0.7870, price: 1 },     // 78.70% (Fills the rest)
    { name: "Chunk of Coal", emoji: "⚫", rarity: 0.1000, price: 5 },      // 10.00% Common
    { name: "Chunk of Copper", emoji: "🟠", rarity: 0.0500, price: 15 },     // 5.00% Uncommon
    { name: "Chunk of Iron", emoji: "🔩", rarity: 0.0500, price: 30 },     // 5.00% Uncommon
    { name: "Chunk of Gold", emoji: "🟡", rarity: 0.0100 , price: 75 },      // 1.00% Rare
    { name: "Chunk of Cobalt", emoji: "🔵", rarity: 0.0025, price: 200 },   // 0.25% Ultra Rare
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

// Combine all sellable items for universal lookup
const ALL_SELLABLE_ITEMS = [...WOOD_TYPES, ...MINE_DROPS];

// Define Axe Tiers (Starter, Copper, Iron, Steel)
const AXE_TIERS = [
    { id: "starter_axe", name: "Starter Axe", multiplier: 1, price: 0, emoji: "🪓" }, 
    { id: "copper_axe", name: "Copper Axe", multiplier: 2, price: 500, emoji: "🪓🟠" },
    { id: "iron_axe", name: "Iron Axe", multiplier: 3, price: 2000, emoji: "🪓🔩" },
    { id: "steel_axe", name: "Steel Axe", multiplier: 5, price: 5000, emoji: "🪓⚙️" }
]

// Define Pickaxe Tiers (Starter, Copper, Iron, Steel)
const PICKAXE_TIERS = [
    { id: "starter_pick", name: "Starter Pick", multiplier: 1, price: 0, emoji: "⛏️" }, 
    { id: "copper_pick", name: "Copper Pickaxe", multiplier: 2, price: 1000, emoji: "⛏️🟠" },
    { id: "iron_pick", name: "Iron Pickaxe", multiplier: 3, price: 2500, emoji: "⛏️🔩" },
    { id: "steel_pick", name: "Steel Pickaxe", multiplier: 5, price: 5000, emoji: "⛏️⚙️" }
];

// Helper function to load all user data from the JSON file
function loadEconomyData() {
    try {
        if (fs.existsSync(ECONOMY_FILE)) {
            const data = fs.readFileSync(ECONOMY_FILE);
            return JSON.parse(data);
        }
    } catch (err) {
        console.error("Error loading economy data:", err);
    }
    // Return a default structure if file doesn't exist or loading fails
    return { users: {} };
}

// Helper function to save all user data to the JSON file
function saveEconomyData(data) {
    try {
        fs.writeFileSync(ECONOMY_FILE, JSON.stringify(data, null, 4));
    } catch (err) {
        console.error("Error saving economy data:", err);
    }
}

// Helper function to ensure a user exists in the data structure and performs deep data cleaning
function ensureUserExists(userId, data) {
    if (!data.users[userId]) {
        // Initialize new users (Perfectly fine as is)
        data.users[userId] = {
            balance: 0,
            inventory: {},
            tool_axe: AXE_TIERS[0],
            tool_pickaxe: PICKAXE_TIERS[0],
            lastChop: 0, 
            lastMine: 0, 
            timesChopped: 0, 
            timesMined: 0,
        };
    }
    
    const userData = data.users[userId];
    const STARTER_AXE = AXE_TIERS[0];
    const STARTER_PICKAXE = PICKAXE_TIERS[0];

    // 1. BASIC FIELD CHECK: Ensure top-level fields exist for older users
    if (userData.tool_axe === undefined) {
        userData.tool_axe = STARTER_AXE;
    }
    if (userData.tool_pickaxe === undefined) {
        userData.tool_pickaxe = STARTER_PICKAXE;
    }
    if (userData.timesChopped === undefined) {
        userData.timesChopped = 0;
    }
    if (userData.timesMined === undefined) {
        userData.timesMined = 0;
    }

    // 2. DEEP CLEANUP: Find the full constant definition and merge missing properties (like 'emoji')

    // AXE DEEP CLEAN
    const currentAxeConstant = AXE_TIERS.find(t => t.id === userData.tool_axe.id);
    if (currentAxeConstant) {
        // Check every key in the constant (e.g., 'id', 'name', 'multiplier', 'price', 'emoji')
        Object.keys(currentAxeConstant).forEach(key => {
            // If the key is missing from the user's saved data, copy it from the constant
            if (userData.tool_axe[key] === undefined) {
                userData.tool_axe[key] = currentAxeConstant[key];
            }
        });
    }

    // PICKAXE DEEP CLEAN
    const currentPickaxeConstant = PICKAXE_TIERS.find(t => t.id === userData.tool_pickaxe.id);
    if (currentPickaxeConstant) {
        Object.keys(currentPickaxeConstant).forEach(key => {
            if (userData.tool_pickaxe[key] === undefined) {
                userData.tool_pickaxe[key] = currentPickaxeConstant[key];
            }
        });
    }

    // 3. OBSOLETE FIELD CLEANUP (Keep these)
    delete userData.currentAxe;
    delete userData.currentAxeIndex;
    delete userData.currentPickaxe;
    delete userData.currentPickaxeIndex;
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

    // --- Hey AI command (FINAL VERSION with 50-Message Memory & Self-Reply) ---
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

    // --- ECONOMY COMMANDS ---

    // !lunachop command
    if (message.content === '!lunachop') {
        const data = loadEconomyData();
        ensureUserExists(message.author.id, data);
        const userData = data.users[message.author.id];

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

        // Add drops to the user's inventory
        userData.inventory[foundWood.name] = (userData.inventory[foundWood.name] || 0) + drops;

        saveEconomyData(data);
        
        message.reply(`🪓 **${axeDisplayName}** chop! You found **${drops}x ${foundWood.name}** ${foundWood.emoji}!`);
    }

    // --- !lunamine Command ---
    if (message.content.toLowerCase() === '!lunamine') {
        const userId = message.author.id;
        const data = loadEconomyData();
        ensureUserExists(userId, data);
        const userData = data.users[userId];

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
        // Fall back to the Starter Pickaxe (index 0) if the object is missing.
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
        // Now safely read from the 'currentPickaxe' object
        const amount = currentPickaxe.multiplier;
        
        // 3. Update the User's Inventory
        const itemName = selectedDrop.name;
        userData.inventory[itemName] = (userData.inventory[itemName] || 0) + amount;

        // 4. Save the data
        saveEconomyData(data);

        // 5. Send the confirmation message
        message.reply(`⛏️ **${currentPickaxe.name}** mine! You found **${amount}x** ${selectedDrop.name} ${selectedDrop.emoji}!`);
    }

    // !inv command (Fixed for all items)
    if (message.content === '!inv') {
        const data = loadEconomyData();
        ensureUserExists(message.author.id, data);
        const inventory = data.users[message.author.id].inventory;

        const ALL_ITEMS_FOR_INV = [...ALL_SELLABLE_ITEMS, ...FORGED_BARS]; 

        const invEntries = Object.entries(inventory)
            .filter(([name, count]) => count > 0)
            .map(([name, count]) => {
                // Lookup in combined list
                const item = ALL_ITEMS_FOR_INV.find(i => i.name === name);
                const emoji = item ? item.emoji : '❓';
                return `${emoji} **${name}**: ${count}`;
            });

        if (invEntries.length === 0) {
            return message.reply(`🎒 Your inventory is empty! Use \`!lunachop\` or \`!lunamine\` to gather items.`);
        }

        const invText = invEntries.join('\n');
        message.reply(`🎒 **${message.author.username}'s Inventory**\n---\n${invText}`);
    }

    // !sellall command (Fixed for all items)
    if (message.content === '!sellall') {
        const data = loadEconomyData();
        ensureUserExists(message.author.id, data);
        const userData = data.users[message.author.id];
        let totalRevenue = 0;
        let soldItems = [];
        
        // Use the new combined list for selling
        const ALL_SELLABLE_ITEMS = [...WOOD_TYPES, ...MINE_DROPS];
        
        for (const item of ALL_SELLABLE_ITEMS) {
            const count = userData.inventory[item.name] || 0;
            if (count > 0) {
                const revenue = count * item.price;
                totalRevenue += revenue;
                soldItems.push(`${item.emoji} ${item.name} (${count}) for $${revenue}`);
                
                // Clear the inventory count
                userData.inventory[item.name] = 0;
            }
        }

        if (totalRevenue === 0) {
            return message.reply('🤷 You have no items to sell!');
        }

        // Update user's balance
        userData.balance += totalRevenue;
        saveEconomyData(data);

        const soldText = soldItems.join('\n');
        message.reply(`💰 **SOLD ALL!** You earned **$${totalRevenue}**.\n\nItems Sold:\n${soldText}\n\nNew Balance: **$${userData.balance}**`);
    }

    // !sell <item> command (Sells a specific stack of ANY item)
    if (message.content.toLowerCase().startsWith('!sell ')) {
        const itemToSellInput = message.content.slice(6).trim().toLowerCase(); // Extract the item name
        
        if (!itemToSellInput) {
            return message.reply('Please specify the item you want to sell (e.g., `!sell oak` or `!sell gold`).');
        }

        const data = loadEconomyData();
        ensureUserExists(message.author.id, data);
        const userData = data.users[message.author.id];

        // 1. Find the item in the ALL_SELLABLE_ITEMS list (FIXED LOOKUP)
        // This allows for partial or single-word matches like 'stone' matching 'Chunk of Stone'.
        const itemFound = ALL_SELLABLE_ITEMS.find(item => 
            // If the full item name includes the user's input (best for multi-word items)
            item.name.toLowerCase().includes(itemToSellInput)
        );
        
        if (!itemFound) {
            return message.reply(`❌ I don't recognize the item **${itemToSellInput}**. Use \`!inv\` to check your inventory, nya.`);
        }

        // 2. Check inventory count
        const itemName = itemFound.name;
        const count = userData.inventory[itemName] || 0;

        if (count === 0) {
            return message.reply(`🤷 You do not have any **${itemName}** to sell.`);
        }

        // 3. Calculate Revenue, Update Balance, and Clear Inventory
        const revenue = count * itemFound.price;
        userData.balance += revenue;
        userData.inventory[itemName] = 0; // Clear the stock

        saveEconomyData(data);

        message.reply(`💰 Sold **${count}x ${itemName}** ${itemFound.emoji} for **$${revenue}**! New Balance: **$${userData.balance}**.`);
    }

    // !bal command
    if (message.content === '!bal') {
        const data = loadEconomyData();
        ensureUserExists(message.author.id, data);
        const balance = data.users[message.author.id].balance;

        message.reply(`💵 Your current balance is **$${balance}**.`);
    }

    // !leaderboard command
    if (message.content === '!leaderboard') {
        const data = loadEconomyData();
        
        // Convert users object to an array for sorting and filtering
        const sortedUsers = Object.entries(data.users)
            .map(([id, user]) => ({
                id,
                balance: user.balance
            }))
            .filter(user => user.balance > 0) // Only show users with money
            .sort((a, b) => b.balance - a.balance) // Sort by balance descending
            .slice(0, 10); // Take the top 10

        if (sortedUsers.length === 0) {
            return message.reply('The leaderboard is empty! Get to work!');
        }

        const leaderboardText = sortedUsers.map((user, index) => {
            const rank = index + 1;
            const rankEmoji = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '🔹';
            
            // Try to find the username from the cache, fallback to the ID
            const username = client.users.cache.get(user.id)?.username || `User ID: ${user.id}`;
            
            return `${rankEmoji} **#${rank}** - ${username}: **$${user.balance}**`;
        }).join('\n');

        message.reply(`🏆 **Top 10 Degens by Wealth**\n---\n${leaderboardText}`);
    }

    // !stats command
    if (message.content === '!stats') {
        const data = loadEconomyData();
        ensureUserExists(message.author.id, data);
        const userData = data.users[message.author.id];
        
        // 1. Get Leaderboard Rank
        const sortedUsers = Object.entries(data.users)
            .map(([id, user]) => ({
                id,
                balance: user.balance
            }))
            .filter(user => user.balance > 0)
            .sort((a, b) => b.balance - a.balance);
            
        const userRank = sortedUsers.findIndex(u => u.id === message.author.id) + 1;
        const rankDisplay = userRank > 0 ? `#${userRank}` : 'N/A';
        
        // 2. Build the Message (Ensuring no leading whitespace in the literal)
        // ... inside !stats command ...
    
        const statsMessage = 
        `📊 **${message.author.username}'s Stats** ---\n` +
        `**💰 Balance:** **$${userData.balance}**\n` +
        `**🏆 Leaderboard Rank:** ${rankDisplay}\n\n` +
        `**⛏️ Tool Status**\n` +
        `Axe: ${userData.tool_axe.emoji} **${userData.tool_axe.name}** (${userData.tool_axe.multiplier}x)\n` +
        `Pickaxe: ${userData.tool_pickaxe.emoji} **${userData.tool_pickaxe.name}** (${userData.tool_pickaxe.multiplier}x)\n\n` +
        `**📈 Lifetime Activity**\n` +
        `Times Chopped: **${userData.timesChopped}**\n` +
        `Times Mined: **${userData.timesMined}**`;

        message.reply(statsMessage);
    
    }

   // !shop command (Refactored for both Axes and Pickaxes)
    if (message.content.toLowerCase() === '!shop') {
        const data = loadEconomyData();
        ensureUserExists(message.author.id, data);
        const userData = data.users[message.author.id];
        
        let shopText = '🌲 **Upgrades Shop** ⛏️\n---\n';
        
        // --- AXE SHOP SECTION ---
        // Find the index of the currently equipped axe based on its ID
        const currentAxeIndex = AXE_TIERS.findIndex(t => t.id === userData.tool_axe.id); 
        
        let nextAxe = AXE_TIERS[currentAxeIndex + 1];
        
        shopText += '**Axes**\n';
        AXE_TIERS.forEach((axe, index) => {
            let status = '';
            if (index < currentAxeIndex) {
                status = '✅ OWNED';
            } else if (index === currentAxeIndex) {
                status = '✅ EQUIPPED';
            } else if (index === currentAxeIndex + 1) {
                status = `💰 $${axe.price}`;
            } else if (index > currentAxeIndex + 1) {
                 status = '🔒 LOCKED';
            } else {
                status = '✅ OWNED'; // Fallback for Starter tool
            }
            // Include emoji in the display
            shopText += `${axe.emoji} **[${axe.id}] ${axe.name}** | ${axe.multiplier}x Drops | Status: ${status}\n`;
        });

        // --- PICKAXE SHOP SECTION ---
        shopText += '\n**Pickaxes**\n';
        // Find the index of the currently equipped pickaxe based on its ID
        const currentPickaxeIndex = PICKAXE_TIERS.findIndex(t => t.id === userData.tool_pickaxe.id);
        
        let nextPickaxe = PICKAXE_TIERS[currentPickaxeIndex + 1];

        PICKAXE_TIERS.forEach((pick, index) => {
            let status = '';
            if (index < currentPickaxeIndex) {
                status = '✅ OWNED';
            } else if (index === currentPickaxeIndex) {
                status = '✅ EQUIPPED';
            } else if (index === currentPickaxeIndex + 1) {
                status = `💰 $${pick.price}`;
            } else if (index > currentPickaxeIndex + 1) {
                status = '🔒 LOCKED';
            } else {
                status = '✅ OWNED'; // Fallback for Starter tool
            }
            // Include emoji in the display
            shopText += `${pick.emoji} **[${pick.id}] ${pick.name}** | ${pick.multiplier}x Drops | Status: ${status}\n`;
        });
        
        // Determine which ID to show for the next example buy command
        const nextBuyId = (nextAxe || nextPickaxe)?.id || AXE_TIERS[1].id;
        
        // Final message
        shopText += `\nTo purchase an upgrade, use \`!buy <item_id>\` (e.g., \`!buy ${nextBuyId}\`)`;

        message.reply(shopText);
    }

    // !buy <tool_id> command (FIXED for consistent ID-based tracking)
    if (message.content.toLowerCase().startsWith('!buy ')) {
        const userInputId = message.content.slice(5).trim().toLowerCase();
        
        const data = loadEconomyData();
        ensureUserExists(message.author.id, data);
        const userData = data.users[message.author.id];
        
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

        saveEconomyData(data);

        message.reply(`🥳 **PURCHASE SUCCESSFUL!** You bought the **${itemToBuy.name}**! Your drops are now **${itemToBuy.multiplier}x**. Current Balance: **$${userData.balance}**.`);
    }

    // !forge <recipe_id> command (REWRITTEN for multiple ingredients)
    if (message.content.toLowerCase().startsWith('!forge')) {
        const args = message.content.slice('!forge'.length).trim().toLowerCase(); 
        
        // 0. Display Recipe List
        if (!args) {
            let recipeList = FORGE_RECIPES.map(r => {
                const ingredientsList = r.ingredients.map(i => `${i.quantity}x ${i.name}`).join(' + ');
                return `**${r.id}**: ${ingredientsList}`; // List now shows all ingredients
            }).join('\n');
            return message.reply(`🔥 **LUNA'S FORGE** 🔥\n---\nTo forge, use \`!forge <recipe_id>\`. Available recipes:\n${recipeList}`);
        }

        const recipeInput = args; 
        
        const data = loadEconomyData();
        ensureUserExists(message.author.id, data);
        const userData = data.users[message.author.id];

        // 1. Find the recipe
        const recipe = FORGE_RECIPES.find(r => r.id === recipeInput);
        
        if (!recipe) {
            return message.reply(`❌ Invalid forge recipe ID. Use \`!forge\` to see available recipes, nya.`);
        }

        const outputItemName = recipe.output.name;
        const outputQuantity = recipe.output.quantity;
        const requiredIngredients = recipe.ingredients; // New flexible ingredient array
        
        // 2. Check ALL required materials
        let missingMaterials = [];
        for (const ingredient of requiredIngredients) {
            const currentCount = userData.inventory[ingredient.name] || 0;
            if (currentCount < ingredient.quantity) {
                missingMaterials.push(`**${ingredient.quantity}x ${ingredient.name}** (have ${currentCount})`);
            }
        }
        
        if (missingMaterials.length > 0) {
            return message.reply(`📉 You are missing some materials to fire the forge:\n${missingMaterials.join('\n')}`);
        }

        // 3. SUCCESS: Deduct materials and forge item
        
        let deductionSummary = [];
        for (const ingredient of requiredIngredients) {
            // Deduct the materials
            userData.inventory[ingredient.name] -= ingredient.quantity;
            deductionSummary.push(`${ingredient.quantity}x ${ingredient.name}`);
        }
        
        // Add the forged bar to inventory
        userData.inventory[outputItemName] = (userData.inventory[outputItemName] || 0) + outputQuantity;
        
        saveEconomyData(data);

        // Find the emoji for the response
        const outputEmoji = FORGED_BARS.find(b => b.name === outputItemName)?.emoji || '✨';
        const summaryText = deductionSummary.join(' + ');

        message.reply(`✅ **FORGED SUCCESS!** Used ${summaryText} to create **${outputQuantity}x ${outputItemName}** ${outputEmoji}!`);
    }

    // --- !coinflip <wager> [side] Command ---
    if (message.content.toLowerCase().startsWith('!coinflip')) {
        const data = loadEconomyData();
        ensureUserExists(message.author.id, data);
        const userData = data.users[message.author.id];
        
        const args = message.content.split(/\s+/);
        const wagerInput = args[1];
        let chosenSide = args[2] ? args[2].toLowerCase() : null; // Optional side choice

        // 1. Validate Wager
        const wager = parseInt(wagerInput);
        if (isNaN(wager) || wager <= 0) {
            return message.reply("Please specify a valid amount to wager (e.g., `!coinflip 1000 tails`).");
        }
        
        if (wager > userData.balance) {
            return message.reply(`You only have **$${userData.balance}**! You can't wager **$${wager}**.`);
        }
        
        // 2. Validate Side Choice (Default to a random side if none chosen)
        const validSides = ['heads', 'tails'];
        if (!chosenSide || !validSides.includes(chosenSide)) {
            // Default to a random side if the user didn't specify or specified invalid input
            chosenSide = Math.random() < 0.5 ? 'heads' : 'tails';
        }

        // 3. Determine Flip Result
        const flipResult = Math.random() < 0.5 ? 'heads' : 'tails';
        const flipEmoji = flipResult === 'heads' ? '👑' : '🪙';
        
        let messageText;
        
        // 4. Calculate Payout
        if (flipResult === chosenSide) {
            // WIN
            const winnings = wager;
            userData.balance += winnings;
            
            messageText = `🎉 **${message.author.username}** chose **${chosenSide.toUpperCase()}** and the coin landed on **${flipResult.toUpperCase()}**! ${flipEmoji}\n**You win $${winnings}!** Your new balance is **$${userData.balance}**.`;
        } else {
            // LOSS
            userData.balance -= wager;
            
            messageText = `💔 **${message.author.username}** chose **${chosenSide.toUpperCase()}** but the coin landed on **${flipResult.toUpperCase()}**! ${flipEmoji}\n**You lost $${wager}.** Your new balance is **$${userData.balance}**.`;
        }

        // 5. Save and Reply
        saveEconomyData(data);
        message.reply(messageText);
    }

});

// Log in
client.login(process.env.DISCORD_TOKEN);

