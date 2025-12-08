/**
 * Safely sends a reply to a message, catching Discord API errors like Missing Permissions.
 * @param {Message} message The original Discord message object.
 * @param {string} content The content of the reply.
 */
async function safeReply(message, content) {
    try {
        await message.reply(content);
    } catch (error) {
        // Code 50013: Missing Permissions
        if (error.code === 50013) {
            console.error(`[PERMISSION ERROR] Bot cannot reply to message in channel ${message.channel.id} (Guild: ${message.guild?.id})`);
        } else {
            console.error('An unexpected error occurred during message reply:', error);
        }
    }
}

module.exports = { safeReply };