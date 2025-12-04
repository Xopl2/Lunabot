const { REST, Routes, SlashCommandBuilder } = require('discord.js');

// Create your slash commands
const commands = [
    new SlashCommandBuilder()
        .setName('poop')
        .setDescription('Displays a poop emoji 💩')
        .toJSON()
];

// Your bot token
const token = 'MTA3OTY2OTQ3Mjg3MDI4NTMyNA.GWRMB_.G_GkZoF63RudoCuaQbJ_hMKOySA6Pql0nW9P7A';

// Your bot application ID
const clientId = '1079669472870285324';

// Optional: Guild ID for testing (replace with your server's ID for instant update)
const guildId = '1235771125313831034';

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
    try {
        console.log('Started refreshing application (/) commands.');

        // For **testing in a single server**, use guild commands:
        await rest.put(
            Routes.applicationGuildCommands(clientId, guildId),
            { body: commands }
        );

        // If you want global commands (propagates slowly), use:
        // await rest.put(
        //     Routes.applicationCommands(clientId),
        //     { body: commands }
        // );

        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }
})();
