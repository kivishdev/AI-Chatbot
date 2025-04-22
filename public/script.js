// DOM Elements
const hamburgerMenu = document.getElementById('hamburger-menu');
const dropdownMenu = document.getElementById('dropdown-menu');
const submitButton = document.getElementById('gemini-submit');
const inputField = document.getElementById('gemini-input');
const voiceButton = document.getElementById('voice-input');
const chatDisplayArea = document.getElementById('chat-display-area');
const clearChatButton = document.getElementById('clear-chat');
const statusIndicator = document.getElementById('status-indicator');

// Load marked.min.js (assumed to be local)
const script = document.createElement('script');
script.src = 'marked.min.js';
document.head.appendChild(script);

// Load Prism.js for code highlighting
const prismScript = document.createElement('script');
prismScript.src = 'prism.min.js'; // Updated to local file in same directory
document.head.appendChild(prismScript);

const prismCSS = document.createElement('link');
prismCSS.rel = 'stylesheet';
prismCSS.href = 'prism.min.css'; // Updated to local file in same directory
document.head.appendChild(prismCSS);

// Toggle the hamburger menu dropdown
hamburgerMenu.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdownMenu.style.display = dropdownMenu.style.display === 'block' ? 'none' : 'block';
});

// Close dropdown when clicking outside
document.addEventListener('click', () => {
    dropdownMenu.style.display = 'none';
});

// Event Listeners for submission
submitButton.addEventListener('click', handleSubmit);
inputField.addEventListener('keypress', function(event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        handleSubmit();
    }
});

// Clear chat button
clearChatButton.addEventListener('click', clearChat);

// Handle voice input
voiceButton.addEventListener('click', startVoiceRecognition);

// Initialize with welcome message if chat is empty
if (chatDisplayArea.children.length === 0) {
    displayWelcomeMessage();
}

// Handle form submission
async function handleSubmit() {
    const prompt = inputField.value.trim();
    
    if (prompt) {
        // Add user message to chat
        addUserMessage(prompt);
        inputField.value = '';
        
        // Show typing indicator
        const typingIndicator = showTypingIndicator();
        
        try {
            // Update status
            updateStatus('typing', 'Daksha AI is typing...');
            console.log('Fetching response for prompt:', prompt);
            
            // Get response from Gemini
            const response = await fetchGeminiResponse(prompt);
            console.log('Response received:', response);
            
            // Remove typing indicator
            chatDisplayArea.removeChild(typingIndicator);
            
            // Add bot response to chat
            addBotMessage(response);
            storeInHistory(prompt, response);
        } catch (error) {
            // Remove typing indicator
            chatDisplayArea.removeChild(typingIndicator);
            
            // Show error message
            addBotMessage('Sorry, I encountered an error. Please try again later.');
            
            // Update status to error
            updateStatus('error', 'Connection error');
            console.error('Error during fetch:', error.message);
        } finally {
            // Reset status to ready regardless of success or failure
            updateStatus('ready', 'Daksha AI is ready');
            console.log('Status reset to ready');
        }
        
        // Scroll to bottom
        scrollToBottom();
    }
}

// Display welcome message
function displayWelcomeMessage() {
    chatDisplayArea.innerHTML = `
        <div class="welcome-message">
            <img src="Designer.png" alt="Daksha AI" class="welcome-logo">
            <h3>Welcome to Daksha AI</h3>
            <p>Ask me anything! I can help with information, creative ideas, and more.</p>
        </div>
    `;
}

// Clear chat function
function clearChat() {
    chatDisplayArea.innerHTML = '';
    displayWelcomeMessage();
    // Optional: Clear local chat history if needed
    // localStorage.removeItem('currentChat');
}

// Add user message to chat
function addUserMessage(message) {
    const messageBox = document.createElement('div');
    messageBox.className = 'message-box-container';
    messageBox.innerHTML = `
        <div class="message-box user">
            <p>${message}</p>
            <a href="https://www.google.com/search?q=${encodeURIComponent(message)}" target="_blank" aria-label="Search on Google">
                <img src="google-logo.png" alt="Google Search" class="google-search-icon">
            </a>
        </div>
    `;
    chatDisplayArea.appendChild(messageBox);
    scrollToBottom();
}

// Add bot message to chat
function addBotMessage(message) {
    const messageBox = document.createElement('div');
    messageBox.className = 'message-box-container';
    messageBox.innerHTML = `
        <div class="message-box bot">
            <div class="message-content"></div>
        </div>
        <div class="message-actions">
            <i class="fas fa-volume-up read-aloud-icon" title="Read aloud"></i>
            <i class="fas fa-copy copy-icon" title="Copy text"></i>
        </div>
    `;
    chatDisplayArea.appendChild(messageBox);
    
    // Add event listeners for actions
    const readAloudIcon = messageBox.querySelector('.read-aloud-icon');
    const copyIcon = messageBox.querySelector('.copy-icon');
    const messageContent = messageBox.querySelector('.message-content');
    
    // Parse markdown and render
    const parsedMessage = marked.parse(message || '', {
        breaks: true, // Convert newlines to <br>
        gfm: true // Enable GitHub Flavored Markdown
    });
    messageContent.innerHTML = parsedMessage || message; // Fallback to plain text if parsing fails
    
    // Highlight code blocks with Prism.js
    Prism.highlightAllUnder(messageContent);
    
    // Read aloud functionality
    readAloudIcon.addEventListener('click', () => {
        const utterance = new SpeechSynthesisUtterance(messageContent.textContent || message);
        speechSynthesis.speak(utterance);
    });
    
    // Copy to clipboard functionality (copy rendered content)
    copyIcon.addEventListener('click', () => {
        const textToCopy = messageContent.textContent.trim();
        if (textToCopy) {
            navigator.clipboard.writeText(textToCopy).then(() => {
                copyIcon.classList.replace('fa-copy', 'fa-check');
                setTimeout(() => {
                    copyIcon.classList.replace('fa-check', 'fa-copy');
                }, 2000);
            }).catch(err => {
                console.error('Failed to copy text:', err);
                addBotMessage('Failed to copy text to clipboard due to an internal error.');
            });
        } else {
            console.warn('No content to copy');
            addBotMessage('No content available to copy.');
        }
    });
    
    scrollToBottom();
}

// Show typing indicator
function showTypingIndicator() {
    const typingIndicator = document.createElement('div');
    typingIndicator.className = 'typing-indicator';
    typingIndicator.innerHTML = `
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
    `;
    chatDisplayArea.appendChild(typingIndicator);
    scrollToBottom();
    return typingIndicator;
}

// Update status indicator
function updateStatus(status, text) {
    statusIndicator.className = `status-indicator ${status}`;
    statusIndicator.querySelector('.status-text').textContent = text;
}

// Voice recognition
async function startVoiceRecognition() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        alert('Your browser does not support speech recognition. Please use Chrome or Edge.');
        return;
    }

    try {
        // Request microphone permission
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop()); // Stop the stream after permission is granted

        const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
        recognition.lang = 'en-US';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        // Visual feedback
        voiceButton.classList.add('recording');
        voiceButton.innerHTML = '<i class="fas fa-stop"></i>';
        updateStatus('typing', 'Listening...');

        recognition.start();

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            inputField.value = transcript;
            handleSubmit();
        };

        recognition.onspeechend = () => {
            recognition.stop();
            voiceButton.classList.remove('recording');
            voiceButton.innerHTML = '<i class="fas fa-microphone"></i>';
        };

        recognition.onerror = (event) => {
            console.error('Voice recognition error:', event.error);
            voiceButton.classList.remove('recording');
            voiceButton.innerHTML = '<i class="fas fa-microphone"></i>';
            updateStatus('error', 'Voice input failed');
            setTimeout(() => updateStatus('ready', 'Daksha AI is ready'), 3000);
        };
    } catch (error) {
        console.error('Microphone permission denied or error:', error.message);
        addBotMessage('Microphone access denied. Please allow microphone permission to use voice input.');
        updateStatus('error', 'Permission denied');
        setTimeout(() => updateStatus('ready', 'Daksha AI is ready'), 3000);
    }
}

// Fetch Gemini Response
async function fetchGeminiResponse(prompt) {
    try {
        const response = await fetch(`/api/gemini?prompt=${encodeURIComponent(prompt)}`);
        if (!response.ok) {
            throw new Error('Failed to fetch Gemini response');
        }
        const data = await response.json();
        return data.response || 'I couldn\'t generate a response. Please try again.';
    } catch (error) {
        console.error('Error:', error.message);
        throw error;
    }
}

// Fetch Suggested Prompts
async function fetchSuggestedPrompts() {
    try {
        const response = await fetch('/api/suggested-prompts');
        if (!response.ok) {
            throw new Error('Failed to fetch suggested prompts');
        }
        const data = await response.json();
        const suggestedPromptsContainer = document.querySelector('.suggested-prompts');

        data.prompts.forEach(prompt => {
            const promptElement = document.createElement('div');
            promptElement.className = 'prompt';
            promptElement.textContent = prompt;
            promptElement.addEventListener('click', () => {
                inputField.value = prompt;
                handleSubmit();
            });
            suggestedPromptsContainer.appendChild(promptElement);
        });
    } catch (error) {
        console.error('Error:', error.message);
        // Fallback prompts
        const fallbackPrompts = [
            "What's the weather like today?",
            "Tell me a fun fact",
            "Explain quantum computing simply",
            "Suggest a good book to read"
        ];
        
        const suggestedPromptsContainer = document.querySelector('.suggested-prompts');
        fallbackPrompts.forEach(prompt => {
            const promptElement = document.createElement('div');
            promptElement.className = 'prompt';
            promptElement.textContent = prompt;
            promptElement.addEventListener('click', () => {
                inputField.value = prompt;
                handleSubmit();
            });
            suggestedPromptsContainer.appendChild(promptElement);
        });
    }
}

// Store in history
function storeInHistory(prompt, response) {
    let history = JSON.parse(localStorage.getItem('history')) || [];
    history.push({ prompt, response, timestamp: new Date().toISOString() });
    localStorage.setItem('history', JSON.stringify(history));
}

// Scroll to bottom of chat
function scrollToBottom() {
    chatDisplayArea.scrollTop = chatDisplayArea.scrollHeight;
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    fetchSuggestedPrompts();
    
    // Focus input field on load
    inputField.focus();
    
    // Add status text element if not present
    if (!document.querySelector('.status-text')) {
        const statusText = document.createElement('span');
        statusText.className = 'status-text';
        statusText.textContent = 'Daksha AI is ready';
        statusIndicator.appendChild(statusText);
    }
});

// Keyboard shortcut for focusing input
document.addEventListener('keydown', (e) => {
    if (e.key === '/' && document.activeElement !== inputField) {
        e.preventDefault();
        inputField.focus();
    }
});