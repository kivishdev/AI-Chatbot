import dotenv from "dotenv";
import express from "express";
import fs from "node:fs";
import mime from "mime-types";
import path from "node:path";
import cors from "cors";
import helmet from "helmet";
import { fileURLToPath } from "node:url";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { GoogleGenAI } from "@google/genai";
import crypto from "crypto";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(cors());
app.use(helmet());
app.use(express.json({ limit: "5mb" }));
app.use(express.static(path.join(__dirname, "public")));

// Set secure HTTP headers
app.use((req, res, next) => {
  // Prevent clickjacking attacks
  res.setHeader("X-Frame-Options", "DENY");
  // Enable XSS protection in browsers
  res.setHeader("Content-Security-Policy",
    "default-src 'self'; " +
    "script-src 'self'; " +
    "style-src 'self'; " +
    "img-src 'self'; " +
    "object-src 'none';"
  );
  // Prevent MIME type sniffing
  res.setHeader("X-Content-Type-Options", "nosniff");
  // Content Security Policy
  res.setHeader("Content-Security-Policy", "default-src 'self'; img-src 'self' data:;");
  next();
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "image.html"));
});

// API Key check
if (!process.env.GEMINI_API_KEY) {
  console.error("Missing GEMINI_API_KEY in .env");
  process.exit(1);
}

// AI Clients
const textAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const imageAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ===================================
// 🧠 TEXT CHATBOT ENDPOINT (FIXED format)
// ===================================
app.post("/api/gemini", async (req, res) => {
  const { history } = req.body;
  if (!Array.isArray(history) || history.length === 0) {
    return res.status(400).json({ error: "Invalid or empty history array." });
  }

  // ✅ Fix: convert {role, content} → {role, parts: [{text}]}
  const messages = history.map(msg => ({
    role: msg.role,
    parts: [{ text: msg.content }]
  }));

  try {
    const response = await textAI.models.generateContent({
      model: "gemini-2.5-flash-preview-05-20",
      contents: messages,
      tools: [{ googleSearch: { force: true } }],
    });

    const outputText = response.text || "No response generated";
    const groundingMetadata = response.candidates?.[0]?.groundingMetadata || {};

    const timestamp = new Date().toISOString();
    console.log("====== Gemini Chat Response ======");
    console.log(`🕒 Timestamp: ${timestamp}`);
    console.log(`🧠 History: ${JSON.stringify(messages, null, 2)}`);
    console.log(`💬 Response: ${outputText}`);
    console.log(`🔎 Grounding Metadata:`, JSON.stringify(groundingMetadata, null, 2));
    console.log("===================================");

    res.json({
      response: outputText,
      grounding: {
        sources: groundingMetadata.groundingChunks || [],
        searchSuggestions: groundingMetadata.searchEntryPoint?.renderedContent || "",
      },
    });
  } catch (err) {
    console.error("Text generation error:", err.message);
    res.status(500).json({ error: "Failed to generate content", details: err.message });
  }
});

// Store interaction (optional fallback)
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

// Suggested Prompts
app.get("/api/suggested-prompts", async (req, res) => {
  const prompt = "Give me some suggested prompts for a chatbot.";

  try {
    const response = await textAI.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
    });

    const outputText = response.text || "";
    const suggestedPrompts = outputText.split("\n").filter((p) => p.trim().length > 0);
    res.json({ prompts: suggestedPrompts });
  } catch (err) {
    console.error("Suggested prompt error:", err.message);
    res.status(500).json({ error: "Failed to fetch suggested prompts" });
  }
});

// ===================================
// 🎨 IMAGE GENERATION (Unchanged)
// ===================================
const imageModel = imageAI.getGenerativeModel({
  model: "gemini-2.0-flash-exp-image-generation",
});
const imageGenConfig = {
  temperature: 1,
  topP: 0.95,
  topK: 40,
  maxOutputTokens: 8192,
  responseModalities: ["image", "text"],
  responseMimeType: "text/plain",
};

app.post("/generate", async (req, res) => {
  const { prompt, image } = req.body;

  try {
    let result;

    if (image && image.data && image.mimeType) {
      console.log("🎨 Editing image with prompt:", prompt);
      const contents = [{
        role: "user",
        parts: [
          { text: prompt },
          {
            inlineData: {
              data: image.data,
              mimeType: image.mimeType,
            },
          },
        ],
      }];

      result = await imageModel.generateContent({
        contents,
        generationConfig: imageGenConfig,
      });
    } else {
      console.log("✨ Generating image from prompt:", prompt);
      result = await imageModel.generateContent({
        contents: [{
          role: "user",
          parts: [{ text: prompt }],
        }],
        generationConfig: imageGenConfig,
      });
    }

    const images = [];
    let descriptionText = "";

    const response = await result.response;
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        images.push({
          mimeType: part.inlineData.mimeType,
          base64: part.inlineData.data,
        });
      } else if (part.text) {
        descriptionText += part.text + "\n";
      }
    }

    console.log("📝 Image Description:\n", descriptionText.trim());

    res.json({
      success: true,
      images,
      description: descriptionText.trim(),
    });
  } catch (err) {
    console.error("Image generation error:", err.message);
    res.status(500).json({
      success: false,
      message: "Image generation failed.",
      error: err.message,
    });
  }
});

// ===================================
// 🔚 Fallback
// ===================================
app.use((req, res) => {
  res.status(404).send("<h1>404 - Page Not Found</h1>");
});

app.listen(PORT, () => {
  console.log(`🚀 Unified Server running at http://localhost:${PORT}`);
});
