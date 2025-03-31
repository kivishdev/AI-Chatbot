const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const { GoogleGenAI } = require('@google/genai');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS and static file serving
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Validate API key
if (!process.env.API_KEY) {
    console.error('API key is missing. Please set it in the .env file.');
    process.exit(1);
}

// Initialize Google Generative AI with Gemini 2.0 Flash
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// API Endpoint: Generate content with Google Search grounding
app.get('/api/gemini', async (req, res) => {
    const { prompt, language } = req.query;
    console.log('Received Prompt:', prompt);

    if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required' });
    }

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.0-flash',
            contents: prompt,
            tools: [{ googleSearch: { force: true } }] // Explicitly enable grounding
        });

        const outputText = response.text || 'No response generated';
        const groundingMetadata = response.candidates?.[0]?.groundingMetadata || {};
        console.log('Generated Response:', outputText);
        console.log('Grounding Metadata:', groundingMetadata);

        // Log interaction with grounding details
        const timestamp = new Date().toISOString();
        const formattedOutput = `[${timestamp}] Prompt: "${prompt}"\nResponse: ${outputText}\nGrounding: ${JSON.stringify(groundingMetadata)}\n`;
        fs.appendFileSync('output_log.txt', formattedOutput);

        // Save to interactions.json
        let interactions = [];
        try {
            interactions = JSON.parse(fs.readFileSync('interactions.json', 'utf-8') || '[]');
        } catch (err) {
            console.warn('Failed to read interactions.json, starting fresh:', err.message);
        }
        interactions.push({ prompt, response: outputText, language: language || 'en-US' });
        fs.writeFileSync('interactions.json', JSON.stringify(interactions, null, 2));

        // Send response with grounding metadata
        res.json({
            response: outputText,
            grounding: {
                sources: groundingMetadata.groundingChunks || [],
                searchSuggestions: groundingMetadata.searchEntryPoint?.renderedContent || ''
            }
        });
    } catch (err) {
        console.error('Error generating content:', err.message, err.stack);
        res.status(500).json({
            error: 'Failed to generate content',
            details: err.message
        });
    }
});

// API Endpoint: Store interaction
app.post('/api/store-interaction', (req, res) => {
    const { prompt, response, language } = req.body;
    const interaction = { prompt, response, language: language || 'en-US' };

    try {
        const interactions = JSON.parse(fs.readFileSync('interactions.json', 'utf-8') || '[]');
        interactions.push(interaction);
        fs.writeFileSync('interactions.json', JSON.stringify(interactions, null, 2));
        res.status(200).json({ message: 'Interaction stored' });
    } catch (err) {
        console.error('Error storing interaction:', err.message);
        res.status(500).json({ error: 'Failed to store interaction' });
    }
});

// API Endpoint: Fetch suggested prompts
app.get('/api/suggested-prompts', async (req, res) => {
    const prompt = "Give me some suggested prompts for a chatbot.";
    console.log('Fetching Suggested Prompts');

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.0-flash',
            contents: prompt,
        });

        const outputText = response.text || '';
        const suggestedPrompts = outputText.split('\n').filter(p => p.trim().length > 0);
        res.json({ prompts: suggestedPrompts });
    } catch (err) {
        console.error('Error fetching suggested prompts:', err.message);
        res.status(500).json({ error: 'Failed to fetch suggested prompts' });
    }
});

// 404 Fallback
app.use((req, res) => {
    res.status(404).send('<h1>404 - Page Not Found</h1><p>The page you are looking for does not exist.</p>');
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});