require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 5000;

// Initialize Gemini
const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.post("/analyze-answer", async (req, res) => {
    try {
        const model = ai.getGenerativeModel({ model: "gemini-pro" });
        
        // 1. Get messages from frontend
        const rawMessages = req.body.messages;

        if (!rawMessages || rawMessages.length === 0) {
            return res.status(400).json({ error: "No messages provided" });
        }

        // --- HELPER FUNCTION: EXTRACT TEXT ---
        // Handles your specific structure where content is ["text", {details}]
        const extractText = (content) => {
            if (Array.isArray(content)) {
                // If it's an array, the text is at index 0
                return content[0];
            }
            // If it's just a string, return it as is
            return content;
        };

        // 2. Prepare History for Gemini (Exclude the last message)
        let history = [];
        if (rawMessages.length > 1) {
            const previousMessages = rawMessages.slice(0, -1);
            
            history = previousMessages.map(msg => ({
                // Map "assistant" (Frontend) to "model" (Gemini)
                role: msg.role === "assistant" ? "model" : "user",
                parts: [{ text: extractText(msg.content) }]
            }));
        }
        while (history.length > 0 && history[0].role === "model") {
            history.shift(); // Removes the first item
        }
        // 3. Get the latest user message
        const lastMessage = rawMessages[rawMessages.length - 1];
        const currentPrompt = extractText(lastMessage.content);

        // 4. Start Chat
        const chat = model.startChat({
            history: history,
        });

        // 5. Generate Response
        const result = await chat.sendMessage(currentPrompt);
        const response = result.response;
        const aiText = response.text();

        // 6. Send Response in the EXACT format your Frontend expects
        // Your frontend code does: result.choices[0].message
        res.json({
            choices: [
                {
                    message: {
                        role: "assistant",
                        content: aiText
                    }
                }
            ]
        });

    } catch (err) {
        console.error("Chat Error:", err);
        res.status(500).json({ error: "Failed to process chat" });
    }
});

app.listen(PORT, () => {
    console.log(`Chatbot Server listening on port ${PORT}`);
});