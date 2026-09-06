"use strict";

const { addLog, getLogs } = require("./logger");
const mineflayer = require("mineflayer");
const config = require("./settings.json");
const express = require("express");

const app = express();
const PORT = process.env.PORT || 5000;

let bot = null;
let botState = { connected: false, startTime: Date.now() };

// --- LEAN WEB DASHBOARD ---
app.get('/', (req, res) => res.send("Bot Running - RAM Optimized"));
app.get('/health', (req, res) => res.json({ 
    status: botState.connected ? "online" : "offline",
    mem: process.memoryUsage().heapUsed / 1024 / 1024 
}));
app.listen(PORT, "0.0.0.0");

// --- MEMORY PURGE LOGIC ---
function purgeMemory() {
    if (bot) {
        bot.entities = {}; // Clear stored mobs/items
    }
    if (global.gc) {
        global.gc(); // Force Node.js to clean up trash
    }
}

function createBot() {
    if (bot) { bot.end(); bot = null; }

    addLog(`[System] Connecting to ${config.server.ip}...`);

    bot = mineflayer.createBot({
        host: config.server.ip,
        username: config["bot-account"].username,
        version: config.server.version,
        auth: config["bot-account"].type,
        viewDistance: 'tiny' // CRITICAL: Loads fewer chunks
    });

    // Disable physics to save CPU and RAM
    bot.physicsEnabled = false; 

    bot.once("spawn", () => {
        botState.connected = true;
        addLog("[Bot] Spawned successfully!");
        
        // Auto-Auth
        if (config.utils["auto-auth"].enabled) {
            bot.chat(`/login ${config.utils["auto-auth"].password}`);
        }

        // Memory cleanup every 60s
        setInterval(purgeMemory, 60000);
        
        // Simple AFK Action (Swing arm)
        setInterval(() => {
            if(botState.connected) bot.swingArm('right');
        }, 30000);
    });

    bot.on("end", (reason) => {
        botState.connected = false;
        addLog(`[Bot] Disconnected: ${reason}. Reconnecting in 10s...`);
        setTimeout(createBot, 10000);
    });

    bot.on("error", (err) => addLog(`[Error] ${err.message}`));
}

createBot();
