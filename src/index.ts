import { Client, GatewayIntentBits, Message } from "discord.js";
import dotenv from "dotenv";
import { shopItems } from "./data/shop";
import type { ShopItem } from "./data/shop";
import {
  getCookies,
  setCookies,
  getInventory,
  setInventoryItem,
  getLastClaim,
  setLastClaim,
  getTopCookies,
} from "./data/db";
import fs from "fs/promises"; // Only if needed for shutdown
import path from "path"; // Only if needed for shutdown

// Load environment variables from .env file
dotenv.config();

// Bot token from environment variable
const TOKEN: string = process.env.TOKEN || "";

// Data file paths
const DATA_DIR = "./data";
const COOKIES_FILE = path.join(DATA_DIR, "cookies.json");
const INVENTORIES_FILE = path.join(DATA_DIR, "inventories.json");
const DAILY_CLAIMS_FILE = path.join(DATA_DIR, "daily_claims.json");

// Create a new client instance
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// When the client is ready, run this code
client.once("ready", async () => {
  console.log(
    `🍪 Cookie Clicker Bot is ready! Logged in as ${client.user?.tag}`
  );

  // Start auto-clicker intervals
  startAutoClickers();
});

// Function to start auto-clicker intervals
function startAutoClickers() {
  const allUserIds = new Set<string>();
  // Gather all userIds from cookies and inventories
  // (Assume cookies table is authoritative for user list)
  for (const { userId } of getTopCookies(1000)) {
    allUserIds.add(userId);
  }
  setInterval(() => {
    const now = Date.now();
    for (const userId of allUserIds) {
      const userInventory = getInventory(userId);

      // Check each auto-clicker type
      for (const itemId in userInventory) {
        const item = shopItems[itemId];
        if (item && item.type === "autoclicker" && userInventory[itemId] > 0) {
          // Initialize user cookies if they don't exist
          if (getCookies(userId) === undefined) {
            setCookies(userId, 0);
          }

          // Simple auto-clicker: give cookies based on item count
          // This is a simplified version - each item gives cookies every interval
          const cookiesFromItem = item.value * userInventory[itemId];
          setCookies(userId, getCookies(userId) + cookiesFromItem);
        }
      }
    }
  }, 10000); // Check every 10 seconds
}

// Function to calculate total click bonus for a user
function getClickBonus(userId: string): number {
  let bonus = 0;
  const userInventory = getInventory(userId);
  for (const itemId in userInventory) {
    const item = shopItems[itemId];
    if (item && item.type === "multiplier" && userInventory[itemId] > 0) {
      bonus += item.value * userInventory[itemId];
    }
  }
  return bonus;
}

// Listen for messages
client.on("messageCreate", (message: Message) => {
  // Ignore messages from bots
  if (message.author.bot) return;

  const content: string = message.content.toLowerCase().trim();
  const userId: string = message.author.id;

  // Handle !click command
  if (content === "!click") {
    // Generate random cookies between 1 and 5
    const baseCookies: number = Math.floor(Math.random() * 5) + 1;
    // Add click bonus from upgrades
    const bonus = getClickBonus(userId);
    const earnedCookies = baseCookies + bonus;
    // Initialize user cookies if they don't exist
    if (getCookies(userId) === undefined) {
      setCookies(userId, 0);
    }
    // Add earned cookies to user's total
    setCookies(userId, getCookies(userId) + earnedCookies);
    // Send response with bonus info if applicable
    if (bonus > 0) {
      message.reply(
        `You earned 🍪 **${earnedCookies}** cookies! (${baseCookies} base + ${bonus} from upgrades)\nTotal: **${getCookies(
          userId
        )}**`
      );
    } else {
      message.reply(
        `You earned 🍪 **${earnedCookies}** cookies! Total: **${getCookies(
          userId
        )}**`
      );
    }
  }

  // Handle !cookies command
  else if (content === "!cookies") {
    // Get user's current cookie count (default to 0 if not found)
    const userCookies: number = getCookies(userId) || 0;

    // Send response
    message.reply(`You have 🍪 **${userCookies}** cookies.`);
  }

  // Handle !leaderboard command
  else if (content === "!leaderboard") {
    // Get top 5 users with cookies
    const topUsers = getTopCookies(5);

    if (topUsers.length === 0) {
      message.reply(
        "No one has any cookies yet! Use `!click` to get started! 🍪"
      );
      return;
    }

    // Build leaderboard message
    let leaderboard = "🏆 **Cookie Leaderboard** 🏆\n\n";
    const medals = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣"];

    for (let i = 0; i < topUsers.length; i++) {
      const { userId: userIdEntry, amount: cookieCount } = topUsers[i];
      const user = client.users.cache.get(userIdEntry);
      const username = user ? user.displayName : "Unknown User";
      leaderboard += `${medals[i]} **${username}** - 🍪 ${cookieCount} cookies\n`;
    }

    message.reply(leaderboard);
  }

  // Handle !give command
  else if (content.startsWith("!give ")) {
    const args = message.content.trim().split(" ");

    // Check if command format is correct
    if (args.length !== 3) {
      message.reply("Usage: `!give @user {amount}`\nExample: `!give @john 10`");
      return;
    }

    const mentionedUser = message.mentions.users.first();
    const amountStr = args[2];

    if (!mentionedUser) {
      message.reply(
        "Please mention a user to give cookies to! Example: `!give @john 10`"
      );
      return;
    }

    if (mentionedUser.id === userId) {
      message.reply("You cannot give cookies to yourself! 🤷‍♂️");
      return;
    }

    if (mentionedUser.bot) {
      message.reply("You cannot give cookies to bots! 🤖");
      return;
    }

    const amount = parseInt(amountStr);

    if (isNaN(amount) || amount <= 0) {
      message.reply(
        "Please enter a valid positive number! Example: `!give @john 10`"
      );
      return;
    }

    // Check if user has enough cookies
    const userCookies = getCookies(userId) || 0;
    if (userCookies < amount) {
      message.reply(
        `You don't have enough cookies! You have 🍪 **${userCookies}** cookies, but tried to give **${amount}**.`
      );
      return;
    }

    // Initialize recipient's cookies if they don't exist
    if (getCookies(mentionedUser.id) === undefined) {
      setCookies(mentionedUser.id, 0);
    }

    // Transfer cookies
    setCookies(userId, getCookies(userId) - amount);
    setCookies(mentionedUser.id, getCookies(mentionedUser.id) + amount);

    message.reply(
      `🎁 You gave 🍪 **${amount}** cookies to **${
        mentionedUser.displayName
      }**!\nYour cookies: **${getCookies(
        userId
      )}** | Their cookies: **${getCookies(mentionedUser.id)}**`
    );
  }

  // Handle !daily command
  else if (content === "!daily") {
    const now = Date.now();
    const lastClaim = getLastClaim(userId);
    const timeSinceLastClaim = now - lastClaim;
    const twentyFourHours = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

    // Check if 24 hours have passed
    if (timeSinceLastClaim < twentyFourHours) {
      const timeRemaining = twentyFourHours - timeSinceLastClaim;
      const hoursRemaining = Math.floor(timeRemaining / (60 * 60 * 1000));
      const minutesRemaining = Math.floor(
        (timeRemaining % (60 * 60 * 1000)) / (60 * 1000)
      );

      message.reply(
        `⏰ You already claimed your daily bonus! Try again in **${hoursRemaining}h ${minutesRemaining}m**.`
      );
      return;
    }

    // Generate daily bonus (10-25 cookies)
    const dailyBonus = Math.floor(Math.random() * 16) + 10;

    // Initialize user cookies if they don't exist
    if (getCookies(userId) === undefined) {
      setCookies(userId, 0);
    }

    // Add daily bonus
    setCookies(userId, getCookies(userId) + dailyBonus);
    setLastClaim(userId, now);

    message.reply(
      `🎉 **Daily Bonus Claimed!** 🎉\nYou received 🍪 **${dailyBonus}** cookies!\nTotal cookies: **${getCookies(
        userId
      )}**`
    );
  }

  // Handle !shop command
  else if (content === "!shop") {
    let shopMessage = "🛒 **Cookie Shop** 🛒\n\n";

    shopMessage += "**📈 Click Multipliers:**\n";
    shopMessage += `🥄 **Wooden Spoon** - 🍪 50 cookies\n   ${shopItems.wooden_spoon.description}\n   Command: \`!buy wooden_spoon\`\n\n`;
    shopMessage += `🥄 **Silver Spatula** - 🍪 200 cookies\n   ${shopItems.silver_spatula.description}\n   Command: \`!buy silver_spatula\`\n\n`;
    shopMessage += `🥄 **Golden Whisk** - 🍪 1,000 cookies\n   ${shopItems.golden_whisk.description}\n   Command: \`!buy golden_whisk\`\n\n`;

    shopMessage += "**🤖 Auto-Clickers:**\n";
    shopMessage += `🐭 **Cookie Mouse** - 🍪 100 cookies\n   ${shopItems.cookie_mouse.description}\n   Command: \`!buy cookie_mouse\`\n\n`;
    shopMessage += `🤖 **Baking Bot** - 🍪 500 cookies\n   ${shopItems.baking_bot.description}\n   Command: \`!buy baking_bot\`\n\n`;
    shopMessage += `🏭 **Cookie Factory** - 🍪 2,500 cookies\n   ${shopItems.cookie_factory.description}\n   Command: \`!buy cookie_factory\`\n\n`;

    shopMessage += "💡 **Tips:**\n";
    shopMessage += "• Buy single: `!buy wooden_spoon`\n";
    shopMessage += "• Buy multiple: `!buy wooden_spoon 3`";

    message.reply(shopMessage);
  }

  // Handle !buy command
  else if (content.startsWith("!buy ")) {
    const args = message.content.trim().split(" ");

    if (args.length < 2 || args.length > 3) {
      message.reply(
        "Usage: `!buy <item_name>` or `!buy <item_name> <quantity>`\nExamples: `!buy wooden_spoon` or `!buy wooden_spoon 3`\nUse `!shop` to see available items!"
      );
      return;
    }

    const itemId = args[1].toLowerCase();
    let quantity = 1;
    if (args.length === 3) {
      quantity = parseInt(args[2]);
      if (isNaN(quantity) || quantity <= 0) {
        message.reply(
          "❌ Please enter a valid positive number for quantity!\nExample: `!buy wooden_spoon 3`"
        );
        return;
      }
      if (quantity > 100) {
        message.reply("❌ Maximum purchase quantity is 100 items at once!");
        return;
      }
    }

    const item = shopItems[itemId];

    if (!item) {
      message.reply("❌ Item not found! Use `!shop` to see available items.");
      return;
    }

    const userCookies = getCookies(userId) || 0;
    const totalCost = item.cost * quantity;

    if (userCookies < totalCost) {
      message.reply(
        `❌ Not enough cookies! You need 🍪 **${totalCost}** cookies (${item.cost} × ${quantity}) but only have **${userCookies}**.`
      );
      return;
    }

    // Deduct cookies and add items to inventory
    setCookies(userId, getCookies(userId) - totalCost);
    const currentQty = getInventory(userId)[itemId] ?? 0;
    setInventoryItem(userId, itemId, currentQty + quantity);

    if (quantity === 1) {
      message.reply(
        `✅ **Purchase Successful!** ✅\nYou bought: **${
          item.name
        }**\nCost: 🍪 **${
          item.cost
        }** cookies\nRemaining cookies: **${getCookies(userId)}**`
      );
    } else {
      message.reply(
        `✅ **Purchase Successful!** ✅\nYou bought: **${
          item.name
        }** x${quantity}\nTotal cost: 🍪 **${totalCost}** cookies (${
          item.cost
        } each)\nRemaining cookies: **${getCookies(userId)}**`
      );
    }
  }

  // Handle !inv command
  else if (content === "!inv" || content === "!inventory") {
    const userInventory = getInventory(userId);

    if (!userInventory || Object.keys(userInventory).length === 0) {
      message.reply(
        "📦 Your inventory is empty! Use `!shop` to see available items."
      );
      return;
    }

    let inventoryMessage = "📦 **Your Inventory** 📦\n\n";

    let hasMultipliers = false;
    let hasAutoClickers = false;

    // Show multipliers
    for (const itemId in userInventory) {
      const item = shopItems[itemId];
      if (item && item.type === "multiplier" && userInventory[itemId] > 0) {
        if (!hasMultipliers) {
          inventoryMessage += "**📈 Click Multipliers:**\n";
          hasMultipliers = true;
        }
        inventoryMessage += `• **${item.name}** x${userInventory[itemId]} - ${item.description}\n`;
      }
    }

    if (hasMultipliers) inventoryMessage += "\n";

    // Show auto-clickers
    for (const itemId in userInventory) {
      const item = shopItems[itemId];
      if (item && item.type === "autoclicker" && userInventory[itemId] > 0) {
        if (!hasAutoClickers) {
          inventoryMessage += "**🤖 Auto-Clickers:**\n";
          hasAutoClickers = true;
        }
        inventoryMessage += `• **${item.name}** x${userInventory[itemId]} - ${item.description}\n`;
      }
    }

    // Show current bonus
    const bonus = getClickBonus(userId);
    if (bonus > 0) {
      inventoryMessage += `\n🎯 **Current click bonus: +${bonus} cookies per click**`;
    }

    message.reply(inventoryMessage);
  }
});

// Login to Discord with your bot token
if (!TOKEN) {
  console.error("❌ Bot token not found! Please add TOKEN to your .env file");
  process.exit(1);
}

// Handle graceful shutdown
process.on("SIGINT", async () => {
  console.log("\n🛑 Shutting down bot...");
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("\n🛑 Shutting down bot...");
  process.exit(0);
});

client.login(TOKEN);
