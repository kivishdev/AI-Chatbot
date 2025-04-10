// Merged server.js for Chatbot + Image Generation
import dotenv from "dotenv";
import express from "express";
import fs from "node:fs";
import mime from "mime-types";
import path from "node:path";
import cors from "cors";
import { fileURLToPath } from "node:url";
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import { GoogleGenAI } from "@google/genai";

// Setup
dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(cors());
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());

// Validate API key
if (!process.env.GEMINI_API_KEY) {
  console.error("API key is missing. Please set GEMINI_API_KEY in the .env file.");
  process.exit(1);
}

// Initialize AI instances
const textAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const imageAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// =============================
// 📍 Text Chatbot Endpoints
// =============================

app.get("/api/gemini", async (req, res) => {
  const { prompt, language } = req.query;
  console.log("Received Prompt:", prompt);

  if (!prompt) return res.status(400).json({ error: "Prompt is required" });

  try {
    const response = await textAI.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
      tools: [{ googleSearch: { force: true } }]
    });

    const outputText = response.text || "No response generated";
    const groundingMetadata = response.candidates?.[0]?.groundingMetadata || {};

    const timestamp = new Date().toISOString();
    const formattedOutput = `[${timestamp}] Prompt: "${prompt}"\nResponse: ${outputText}\nGrounding: ${JSON.stringify(groundingMetadata)}\n`;
    fs.appendFileSync("output_log.txt", formattedOutput);

    let interactions = [];
    try {
      interactions = JSON.parse(fs.readFileSync("interactions.json", "utf-8") || "[]");
    } catch (err) {
      console.warn("Failed to read interactions.json:", err.message);
    }
    interactions.push({ prompt, response: outputText, language: language || "en-US" });
    fs.writeFileSync("interactions.json", JSON.stringify(interactions, null, 2));

    res.json({
      response: outputText,
      grounding: {
        sources: groundingMetadata.groundingChunks || [],
        searchSuggestions: groundingMetadata.searchEntryPoint?.renderedContent || ""
      }
    });
  } catch (err) {
    console.error("Text generation error:", err.message);
    res.status(500).json({ error: "Failed to generate content", details: err.message });
  }
});

app.post("/api/store-interaction", (req, res) => {
  const { prompt, response, language } = req.body;
  const interaction = { prompt, response, language: language || "en-US" };

  try {
    const interactions = JSON.parse(fs.readFileSync("interactions.json", "utf-8") || "[]");
    interactions.push(interaction);
    fs.writeFileSync("interactions.json", JSON.stringify(interactions, null, 2));
    res.status(200).json({ message: "Interaction stored" });
  } catch (err) {
    console.error("Store interaction error:", err.message);
    res.status(500).json({ error: "Failed to store interaction" });
  }
});

app.get("/api/suggested-prompts", async (req, res) => {
  const prompt = "Give me some suggested prompts for a chatbot.";

  try {
    const response = await textAI.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt
    });

    const outputText = response.text || "";
    const suggestedPrompts = outputText.split("\n").filter(p => p.trim().length > 0);
    res.json({ prompts: suggestedPrompts });
  } catch (err) {
    console.error("Suggested prompt error:", err.message);
    res.status(500).json({ error: "Failed to fetch suggested prompts" });
  }
});

// =============================
// 🎨 Image Generation Endpoint
// =============================

const imageModel = imageAI.getGenerativeModel({
  model: "gemini-2.0-flash-exp-image-generation"
});
const generationConfig = {
  temperature: 1,
  topP: 0.95,
  topK: 40,
  maxOutputTokens: 8192,
  responseModalities: ["image", "text"],
  responseMimeType: "text/plain"
};

app.post("/generate", async (req, res) => {
  const { prompt } = req.body;
  try {
    const chat = imageModel.startChat({ generationConfig, history: [] });
    const result = await chat.sendMessage(prompt);

    const images = [];
    for (const candidate of result.response.candidates) {
      for (const part of candidate.content.parts) {
        if (part.inlineData) {
          images.push({
            mimeType: part.inlineData.mimeType,
            base64: part.inlineData.data
          });
        }
      }
    }

    res.json({ success: true, images });
  } catch (err) {
    console.error("Image generation error:", err.message);
    if (err.message.includes("overloaded")) {
      res.status(503).json({ success: false, message: "Model overloaded. Please try again later." });
    } else {
      res.status(500).json({ success: false, message: "Image generation failed." });
    }
  }
});

// =============================
// 🌐 Fallback Route
// =============================

app.use((req, res) => {
  res.status(404).send("<h1>404 - Page Not Found</h1><p>The page you are looking for does not exist.</p>");
});

// =============================
// 🚀 Start Server
// =============================

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
