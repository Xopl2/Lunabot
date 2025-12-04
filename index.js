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
    { name: "Ancient Log", emoji: "🪓", rarity: 0.0009, price: 250 }, // 0.09% Ultra Rare
    { name: "Petrified Log", emoji: "💎", rarity: 0.0001, price: 5000 } // 0.01% Legendary
];

// Define Axe Upgrades and their multipliers
const AXE_UPGRADES = [
    { id: 'Iron Axe', name: 'Iron Axe', price: 500, multiplier: 2, required: 'Starter' },
    { id: 'Steel Axe', name: 'Steel Axe', price: 2000, multiplier: 3, required: 'Iron Axe' },
    { id: 'Diamond Axe', name: 'Diamond Axe', price: 5000, multiplier: 5, required: 'Steel Axe' }
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

// Helper function to ensure a user exists in the data structure
function ensureUserExists(userId, data) {
    if (!data.users[userId]) {
        data.users[userId] = {
            balance: 0,
            inventory: {},
            currentAxe: 'Starter' // Default starting axe
        };
    }
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
        if (Math.random() < 0.01) { // 1% chance
           message.channel.send(`<@${targetUserId}> 🍊🐔`);
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
        const rawPrompt = message.content.slice(7).trim();

        // 2. Define the Neko Girl Persona and System Instruction
        const systemInstruction = "You are a cheerful Neko girl (cat-girl) named Luna. You must respond to all user requests in character, ending all responses with a meow, cat sound, or a cheerful, Neko-like exclamation (e.g., 'Nya~', 'Meow!', 'Purr...'). Keep responses concise. Respond in under 1950 characters.";
        
        // --- IMPORTANT: Get the bot's own ID for filtering ---
        const lunaBotId = message.client.user.id; 

        try {
            await message.channel.sendTyping();

            // --- FETCH MESSAGE HISTORY (The Memory Logic) ---
            const messages = await message.channel.messages.fetch({ limit: 100 });

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

                // Check 4: Exclude previous 'hey ai' prompts
                if (m.content.toLowerCase().startsWith('hey ai')) return false;
                
                //exclude a few types of links
                const contentLower = m.content.toLowerCase();
                if (contentLower.includes('http://') || contentLower.includes('https://') || contentLower.includes('www.')) return false;
                
                return true;
            });

            // Map the history into the Gemini API 'contents' format: [{ role, parts: [{ text }] }]
            const conversationHistory = history.reverse().map(m => {
                // If the author is Luna's ID, the role must be 'model'.
                // This tells the AI: "This is what YOU said before."
                const role = (m.author.id === lunaBotId) ? 'model' : 'user';
                
                // Format the text to include the author's username for clarity
                // Note: Luna's own username will appear here, which is helpful for context
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

        // 1. Get the current axe type, defaulting to 'Starter' for old users
        const currentAxeType = userData.currentAxe ?? 'Starter'; 

        // Determine multiplier
        const axeInfo = AXE_UPGRADES.find(a => a.name === currentAxeType) || { multiplier: 1 };
        const multiplier = axeInfo.multiplier;

        // 2. Determine the display name for the chat
        const axeDisplayName = (currentAxeType === 'Starter') ? 'Basic Axe' : currentAxeType;

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
            foundWood = WOOD_TYPES[0];
        }
        
        // Calculate final drops using the multiplier (always at least 1)
        const drops = Math.max(1, multiplier); 

        // Add drops to the user's inventory
        userData.inventory[foundWood.name] = (userData.inventory[foundWood.name] || 0) + drops;

        saveEconomyData(data);
        
        // 3. Use the new display name
        message.reply(`🪓 **${axeDisplayName}** chop! You found **${drops}x ${foundWood.name}** ${foundWood.emoji}!`);
    }

    // !inv command
    if (message.content === '!inv') {
        const data = loadEconomyData();
        ensureUserExists(message.author.id, data);
        const inventory = data.users[message.author.id].inventory;

        const invEntries = Object.entries(inventory)
            .filter(([name, count]) => count > 0)
            .map(([name, count]) => {
                const wood = WOOD_TYPES.find(w => w.name === name);
                const emoji = wood ? wood.emoji : '❓';
                return `${emoji} **${name}**: ${count}`;
            });

        if (invEntries.length === 0) {
            return message.reply(`🎒 Your inventory is empty! Use \`!lunachop\` to gather wood.`);
        }

        const invText = invEntries.join('\n');
        message.reply(`🎒 **${message.author.username}'s Inventory**\n---\n${invText}`);
    }

    // !sellall command
    if (message.content === '!sellall') {
        const data = loadEconomyData();
        ensureUserExists(message.author.id, data);
        const userData = data.users[message.author.id];
        let totalRevenue = 0;
        let soldItems = [];
        
        // Loop through all wood types and check inventory
        for (const wood of WOOD_TYPES) {
            const count = userData.inventory[wood.name] || 0;
            if (count > 0) {
                const revenue = count * wood.price;
                totalRevenue += revenue;
                soldItems.push(`${wood.emoji} ${wood.name} (${count}) for $${revenue}`);
                
                // Clear the inventory count
                userData.inventory[wood.name] = 0;
            }
        }

        if (totalRevenue === 0) {
            return message.reply('🤷 You have no wood to sell!');
        }

        // Update user's balance
        userData.balance += totalRevenue;
        saveEconomyData(data);

        const soldText = soldItems.join('\n');
        message.reply(`💰 **SOLD!** You earned **$${totalRevenue}**.\n\nItems Sold:\n${soldText}\n\nNew Balance: **$${userData.balance}**`);
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
            return message.reply('The leaderboard is empty! Get chopping!');
        }

        const leaderboardText = sortedUsers.map((user, index) => {
            const rank = index + 1;
            const rankEmoji = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '🔹';
            
            // Try to find the username from the cache, fallback to the ID
            const username = client.users.cache.get(user.id)?.username || `User ID: ${user.id}`;
            
            return `${rankEmoji} **#${rank}** - ${username}: **$${user.balance}**`;
        }).join('\n');

        message.reply(`🏆 **Top 10 Lumberjacks by Wealth**\n---\n${leaderboardText}`);
    }

    // !shop command
    if (message.content === '!shop') {
        const data = loadEconomyData();
        ensureUserExists(message.author.id, data);
        const currentAxe = data.users[message.author.id].currentAxe;

        let shopText = 'Axe Upgrades Shop:\n---\n';
        let availableUpgrade = null;

        for (const axe of AXE_UPGRADES) {
            const isBought = axe.name === currentAxe || AXE_UPGRADES.findIndex(a => a.name === currentAxe) >= AXE_UPGRADES.findIndex(a => a.name === axe.required);
            
            // Find the next available upgrade
            if (axe.required === currentAxe || (axe.required === 'Starter' && currentAxe === 'Starter')) {
                availableUpgrade = axe;
            }

            const status = (axe.name === currentAxe) ? '✅ EQUIPPED' : 
                        (availableUpgrade && axe.id === availableUpgrade.id) ? `💰 $${axe.price}` : 
                        '🔒 LOCKED';
            
            shopText += `**[${axe.id}] ${axe.name}** | ${axe.multiplier}x Drops | Status: ${status}\n`;
        }

        shopText += `\nTo purchase the next available axe, use \`!buy ${availableUpgrade ? availableUpgrade.id : '...'} \``;

        message.reply(shopText);
    }

    // !buy <item> command
    if (message.content.toLowerCase().startsWith('!buy ')) {
        const userInputName = message.content.slice(5).trim();
        
        const data = loadEconomyData();
        ensureUserExists(message.author.id, data);
        const userData = data.users[message.author.id];
        
        const itemToBuy = AXE_UPGRADES.find(a => a.id.toLowerCase() === userInputName.toLowerCase());

        if (!itemToBuy) {
            return message.reply('❌ Invalid item name. Use `!shop` to see available axes.');
        }

        // Check if the user already has this item (or a better one)
        if (userData.currentAxe === itemToBuy.name) {
            return message.reply(`✅ You already own the **${itemToBuy.name}**!`);
        }

        // If the required axe is 'Starter', this check is skipped, allowing the purchase.
        if (itemToBuy.required !== 'Starter' && itemToBuy.required !== userData.currentAxe) {
            return message.reply(`🔒 You must first purchase the **${itemToBuy.required}** before you can buy the **${itemToBuy.name}**.`);
        }

        // Check balance
        if (userData.balance < itemToBuy.price) {
            return message.reply(`💵 You need **$${itemToBuy.price}** to buy the **${itemToBuy.name}**, but you only have **$${userData.balance}**.`);
        }

        // SUCCESS: Deduct money and update axe
        userData.balance -= itemToBuy.price;
        userData.currentAxe = itemToBuy.name;
        saveEconomyData(data);

        message.reply(`🥳 **PURCHASE SUCCESSFUL!** You bought the **${itemToBuy.name}**! Your drops are now **${itemToBuy.multiplier}x**. Current Balance: **$${userData.balance}**.`);
    }
});

// Log in
client.login(process.env.DISCORD_TOKEN);