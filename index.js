require("dotenv").config();
const express = require("express");
const axios = require("axios");
const OpenAI = require("openai");

const app = express();
app.use(express.json());

const PAGE_ID = process.env.FB_PAGE_ID;
const ACCESS_TOKEN = process.env.FB_USER_ACCESS_TOKEN;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

// Fetch latest comments
async function checkCommentsAndReply() {
  const fields = "comments{message,id,from}";
  const url = `https://graph.facebook.com/v17.0/${PAGE_ID}/posts?fields=${fields}&access_token=${ACCESS_TOKEN}`;

  try {
    const res = await axios.get(url);
    const posts = res.data.data;

    for (const post of posts) {
      const comments = post.comments?.data || [];

      for (const comment of comments) {
        const message = comment.message;
        const commentId = comment.id;

        // Skip if already replied — optional (requires caching)
        console.log(`💬 Comment: ${message}`);

        // Generate reply using ChatGPT
        const response = await openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: [{ role: "user", content: message }],
        });

        const reply = response.choices[0].message.content;
        console.log(`🧠 Reply: ${reply}`);

        // Post reply back to the comment
        await axios.post(
          `https://graph.facebook.com/v17.0/${commentId}/comments`,
          { message: reply },
          { params: { access_token: ACCESS_TOKEN } }
        );

        console.log(`✅ Replied to comment ID: ${commentId}`);
      }
    }
  } catch (err) {
    console.error("❌ Error:", err.response?.data || err.message);
  }
}

// Run every 2 minutes
setInterval(checkCommentsAndReply, 2 * 60 * 1000);

// Server to keep the app alive (optional)
app.get("/", (req, res) => res.send("Bot is running."));
app.listen(3000, () => console.log("✅ Server running on port 3000"));
