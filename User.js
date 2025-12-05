const mongoose = require('mongoose');

// Define the schema for a single tool (Axe or Pickaxe)
const ToolSchema = new mongoose.Schema({
    id: { type: String, required: true },
    name: { type: String, required: true },
    multiplier: { type: Number, required: true },
    price: { type: Number, default: 0 },
    emoji: { type: String, default: '⛏️' }
}, { _id: false }); // Prevents creating unnecessary IDs for sub-documents

// Define the main User Schema
const UserSchema = new mongoose.Schema({
    // Discord User ID is the primary key and must be unique
    userId: { type: String, required: true, unique: true },

    balance: { type: Number, default: 0 },

    // Inventory is a map (object) where keys are item names and values are quantities
    inventory: { 
        type: Map, 
        of: Number, 
        default: {} 
    },

    // Tools use the sub-schema defined above
    tool_axe: { type: ToolSchema, required: true },
    tool_pickaxe: { type: ToolSchema, required: true },

    // Cooldowns and stats
    lastChop: { type: Number, default: 0 },
    lastMine: { type: Number, default: 0 },
    timesChopped: { type: Number, default: 0 },
    timesMined: { type: Number, default: 0 }
});

module.exports = mongoose.model('User', UserSchema);