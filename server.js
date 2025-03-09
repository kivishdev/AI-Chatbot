const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for all routes
app.use(cors()); // <-- Add this line

// Check if the API key is set in the .env file
if (!process.env.API_KEY) {
  console.error('API key is missing. Please set it in the .env file.');
  process.exit(1);
}

// Enable CORS for all routes
app.use(cors()); // <-- Add this line

// Initialize Google Generative AI
const genAI = new GoogleGenerativeAI(process.env.API_KEY);
const model = genAI.getGenerativeModel({ model: process.env.GENERATIVE_MODEL || 'gemini-1.5-flash' });

// Serve static files (HTML, CSS, JS) from the "public" folder
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json()); // Add middleware to parse JSON

// API Endpoint: Generate content using Gemini API
app.get('/api/gemini', async (req, res) => {
  const { prompt, language } = req.query;
  console.log('Received Prompt:', prompt); // Log the received prompt for debugging

  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  try {
    // Set the language for the model
    if (language) {
      model.setLanguage(language);
    }

    const result = await model.generateContent(prompt);
    const outputText = result.response.text();
    console.log('Generated Response:', outputText); // Log the generated response

    const timestamp = new Date().toISOString();
    const formattedOutput = `[${timestamp}] Prompt: "${prompt}"\nResponse: ${outputText}\n`;

    // Log the output to a file
    fs.appendFileSync('output_log.txt', `${formattedOutput}\n`);

    // Save interaction to server storage
    const interaction = { prompt, response: outputText, language: language || 'en-US' };
    const interactions = JSON.parse(fs.readFileSync('interactions.json', 'utf-8') || '[]');
    interactions.push(interaction);
    fs.writeFileSync('interactions.json', JSON.stringify(interactions));

    // Send the response back to the client
    res.json({ response: outputText });
  } catch (err) {
    console.error('Error generating content:', err.message);
    res.status(500).json({ error: 'Failed to generate content' });
  }
});

// API Endpoint: Store interaction
app.post('/api/store-interaction', (req, res) => {
  const { prompt, response, language } = req.body;
  const interaction = { prompt, response, language: language || 'en-US' };

  try {
    // Read existing interactions
    const interactions = JSON.parse(fs.readFileSync('interactions.json', 'utf-8') || '[]');

    // Append the new interaction
    interactions.push(interaction);
    fs.writeFileSync('interactions.json', JSON.stringify(interactions));

    res.status(200).json({ message: 'Interaction stored' });
  } catch (err) {
    console.error('Error storing interaction:', err.message);
    res.status(500).json({ error: 'Failed to store interaction' });
  }
});

// API Endpoint: Fetch suggested prompts from Gemini
app.get('/api/suggested-prompts', async (req, res) => {
  const prompt = "Give me some suggested prompts for a chatbot.";
  console.log('Fetching Suggested Prompts'); // Log for debugging

  try {
    const result = await model.generateContent(prompt);
    const outputText = result.response.text();
    const suggestedPrompts = outputText.split('\n').filter(p => p.trim().length > 0);
    res.json({ prompts: suggestedPrompts });
  } catch (err) {
    console.error('Error fetching suggested prompts:', err.message);
    res.status(500).json({ error: 'Failed to fetch suggested prompts' });
  }
});

// Default fallback for invalid routes
app.use((req, res) => {
  res.status(404).send('<h1>404 - Page Not Found</h1><p>The page you are looking for does not exist.</p>');
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
