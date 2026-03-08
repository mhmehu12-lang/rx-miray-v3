const axios = require("axios");

module.exports.config = {
  name: "bot",
  version: "3.1.0",
  hasPermssion: 0,
  credits: "rX Abdullah",
  description: "Maria AI chat with session memory per user & plain intro",
  commandCategory: "noprefix",
  usages: "bot",
  cooldowns: 3
};

// Invisible marker to identify Maria replies
const marker = "\u700B";
function withMarker(text) {
  return text + marker;
}

// Sessions memory per user UID
const sessions = {};

// AI API endpoint (Vercel hosted)
const AI_API = "https://mari-llm.vercel.app/api/ai";

// Plain unique intro messages
const introMessages = [
  "Hello there! I’m Maria LLM, your friendly AI assistant. How can I assist you today? 🙂",
  "Hey! Maria here 🤖. Ready to chat and help you out. What’s on your mind?",
  "Hi! I’m Maria LLM – smart, helpful, and always curious. How can I make your day easier?"
];

module.exports.handleEvent = async function({ api, event, Users }) {
  const { threadID, messageID, body, senderID, messageReply } = event;
  if (!body) return;

  const name = await Users.getNameUser(senderID);

  // STEP 1: First "bot" message → plain intro
  if (body.trim().toLowerCase() === "bot") {
    // Initialize session for this user UID
    sessions[senderID] = { history: "", allowAI: true };

    // Pick random intro
    const intro = introMessages[Math.floor(Math.random() * introMessages.length)];

    const firstMessage = `${intro}\nHi ${name}!`;

    try {
      await api.sendTypingIndicatorV2(true, threadID);
      await new Promise(r => setTimeout(r, 1500));
      await api.sendTypingIndicatorV2(false, threadID);
    } catch {}

    return api.sendMessage(withMarker(firstMessage), threadID, messageID);
  }

  // STEP 2: Normal AI reply when user replies to Maria
  if (
    messageReply &&
    messageReply.senderID === api.getCurrentUserID() &&
    messageReply.body?.includes(marker) &&
    sessions[senderID]
  ) {
    const userMsg = body.trim();
    if (!userMsg) return;

    // Add ⏳ loading react
    api.setMessageReaction("⏳", messageID, () => {}, true);

    // If user asks about creator
    const creatorKeywords = ["tera creator", "developer kaun"];
    if (creatorKeywords.some(k => userMsg.toLowerCase().includes(k))) {
      api.setMessageReaction("✅", messageID, () => {}, true);
      return api.sendMessage(
        withMarker("👑 My creator rX Abdullah unhone muje banaya hai"),
        threadID,
        messageID
      );
    }

    // Add to session memory
    sessions[senderID].history += `User: ${userMsg}\nMaria: `;

    try {
      await api.sendTypingIndicatorV2(true, threadID);
      await new Promise(r => setTimeout(r, 1500));
      await api.sendTypingIndicatorV2(false, threadID);
    } catch {}

    try {
      // Call AI API (GET request)
      const resp = await axios.get(`${AI_API}?msg=${encodeURIComponent(userMsg)}`);

      let reply = resp.data.reply || "🙂 I didn't understand.";

      // Replace OpenAI mentions → rX Abdullah
      reply = reply.replace(/openai/gi, "rX Abdullah");

      // Save reply to session memory
      sessions[senderID].history += reply + "\n";

      api.setMessageReaction("✅", messageID, () => {}, true);

      return api.sendMessage(withMarker(reply), threadID, messageID);

    } catch (err) {
      api.setMessageReaction("❌", messageID, () => {}, true);
      console.log(err);
      return api.sendMessage("❌ AI API error.", threadID, messageID);
    }
  }
};

module.exports.run = () => {};
