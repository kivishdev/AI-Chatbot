// DOM Elements
const hamburgerMenu = document.getElementById('hamburger-menu');
const dropdownMenu = document.getElementById('dropdown-menu');
const submitButton = document.getElementById('gemini-submit');
const inputField = document.getElementById('gemini-input');
const voiceButton = document.getElementById('voice-input');
const chatDisplayArea = document.getElementById('chat-display-area');
const clearChatButton = document.getElementById('clear-chat');
const statusIndicator = document.getElementById('status-indicator');
const toggleSidebarBtn = document.getElementById('toggle-sidebar');
const sidebar = document.querySelector('.sidebar');
const newChatBtn = document.getElementById('new-chat');
const attachFileBtn = document.getElementById('attach-file');

let conversationHistory = []; // ✅ In-session memory array

// Auto-resize textarea
const autoResizeTextarea = () => {
    inputField.style.height = 'auto';
    inputField.style.height = (inputField.scrollHeight) + 'px';
    if (inputField.scrollHeight > 150) {
        inputField.style.overflowY = 'auto';
    } else {
        inputField.style.overflowY = 'hidden';
    }
};
inputField.addEventListener('input', autoResizeTextarea);

// Load marked.min.js and Prism.js
const script = document.createElement('script');
script.src = 'marked.min.js';
document.head.appendChild(script);

const prismScript = document.createElement('script');
prismScript.src = 'prism.min.js';
document.head.appendChild(prismScript);

const prismCSS = document.createElement('link');
prismCSS.rel = 'stylesheet';
prismCSS.href = 'prism.min.css';
document.head.appendChild(prismCSS);

// Toggle hamburger menu dropdown
hamburgerMenu.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdownMenu.style.display = dropdownMenu.style.display === 'block' ? 'none' : 'block';
});
document.addEventListener('click', () => {
    dropdownMenu.style.display = 'none';
});

// Toggle sidebar
toggleSidebarBtn.addEventListener('click', () => {
    sidebar.classList.toggle('open');
});

// New chat
newChatBtn.addEventListener('click', () => {
    conversationHistory = []; // ✅ Reset memory
    clearChat();
    inputField.focus();
});

// Attach file placeholder
attachFileBtn.addEventListener('click', () => {
    addBotMessage("File attachment functionality will be implemented soon!");
});

// Submission handlers
submitButton.addEventListener('click', handleSubmit);
inputField.addEventListener('keypress', function(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        handleSubmit();
    }
});

// Clear chat button
clearChatButton.addEventListener('click', clearChat);

// Voice input
voiceButton.addEventListener('click', startVoiceRecognition);

// Welcome message
if (chatDisplayArea.children.length === 0) {
    displayWelcomeMessage();
}

// Submit logic
async function handleSubmit() {
    const prompt = inputField.value.trim();
    
    if (prompt) {
        addUserMessage(prompt);
        inputField.value = '';
        inputField.style.height = 'auto';

        const typingIndicator = showTypingIndicator();

        try {
            updateStatus('typing', 'Daksha AI is typing...');
            const response = await fetchGeminiResponse(prompt);
            chatDisplayArea.removeChild(typingIndicator);
            addBotMessage(response);
            storeInHistory(prompt, response);
        } catch (error) {
            chatDisplayArea.removeChild(typingIndicator);
            addBotMessage('Sorry, I encountered an error. Please try again later.');
            updateStatus('error', 'Connection error');
            console.error('Error during fetch:', error.message);
        } finally {
            setTimeout(() => {
                updateStatus('ready', 'Daksha AI is ready');
            }, 1000);
        }

        scrollToBottom();
    }
}

function displayWelcomeMessage() {
    chatDisplayArea.innerHTML = `
        <div class="welcome-message">
            <img src="Designer.png" alt="Daksha AI" class="welcome-logo">
            <h3>Welcome to Daksha AI</h3>
            <p>Ask me anything! I can help with information, creative ideas, and more.</p>
        </div>
    `;
}

function clearChat() {
    conversationHistory = []; // ✅ Reset memory
    chatDisplayArea.innerHTML = '';
    displayWelcomeMessage();
}

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

    const readAloudIcon = messageBox.querySelector('.read-aloud-icon');
    const copyIcon = messageBox.querySelector('.copy-icon');
    const messageContent = messageBox.querySelector('.message-content');

    const parsedMessage = marked.parse(message || '', {
        breaks: true,
        gfm: true
    });
    messageContent.innerHTML = parsedMessage || message;

    Prism.highlightAllUnder(messageContent);

    readAloudIcon.addEventListener('click', () => {
        const utterance = new SpeechSynthesisUtterance(messageContent.textContent || message);
        speechSynthesis.speak(utterance);
    });

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

function updateStatus(status, text) {
    statusIndicator.className = `status-indicator ${status}`;
    statusIndicator.querySelector('.status-text').textContent = text;
}

async function startVoiceRecognition() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        alert('Your browser does not support speech recognition. Please use Chrome or Edge.');
        return;
    }

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop());

        const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
        recognition.lang = 'en-US';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

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
        console.error('Microphone error:', error.message);
        addBotMessage('Microphone access denied. Please allow microphone permission.');
        updateStatus('error', 'Permission denied');
        setTimeout(() => updateStatus('ready', 'Daksha AI is ready'), 3000);
    }
}

// ✅ Updated to use conversationHistory[] and POST
async function fetchGeminiResponse(prompt) {
    conversationHistory.push({ role: 'user', content: prompt });

    try {
        const response = await fetch('/api/gemini', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ history: conversationHistory })
        });

        if (!response.ok) throw new Error('Failed to fetch Gemini response');
        const data = await response.json();
        const result = data.response || 'I couldn\'t generate a response. Please try again.';

        conversationHistory.push({ role: 'model', content: result });
        return result;
    } catch (error) {
        console.error('Error:', error.message);
        throw error;
    }
}

async function fetchSuggestedPrompts() {
    try {
        const response = await fetch('/api/suggested-prompts');
        if (!response.ok) throw new Error('Failed to fetch prompts');

        const data = await response.json();
        const container = document.querySelector('.suggested-prompts');
        container.innerHTML = '';

        data.prompts.forEach(prompt => {
            const el = document.createElement('div');
            el.className = 'prompt';
            el.textContent = prompt;
            el.addEventListener('click', () => {
                inputField.value = prompt;
                handleSubmit();
            });
            container.appendChild(el);
        });
    } catch {
        const fallback = [
            "What's the weather like today?",
            "Tell me a fun fact",
            "Explain quantum computing simply",
            "Suggest a good book to read",
            "How does AI work?",
            "Write a short story"
        ];
        const container = document.querySelector('.suggested-prompts');
        container.innerHTML = '';
        fallback.forEach(prompt => {
            const el = document.createElement('div');
            el.className = 'prompt';
            el.textContent = prompt;
            el.addEventListener('click', () => {
                inputField.value = prompt;
                handleSubmit();
            });
            container.appendChild(el);
        });
    }
}

function scrollToBottom() {
    chatDisplayArea.scrollTop = chatDisplayArea.scrollHeight;
}

function storeInHistory(prompt, response) {
    let history = JSON.parse(localStorage.getItem('history')) || [];
    const timestamp = new Date().toISOString();
    history.push({ prompt, response, timestamp });
    localStorage.setItem('history', JSON.stringify(history));
}

document.addEventListener('DOMContentLoaded', () => {
    fetchSuggestedPrompts();
    inputField.focus();

    if (!document.querySelector('.status-text')) {
        const statusText = document.createElement('span');
        statusText.className = 'status-text';
        statusText.textContent = 'Daksha AI is ready';
        statusIndicator.appendChild(statusText);
    }
});

// Mobile: auto-collapse sidebar when clicking outside
document.addEventListener('click', function(e) {
    if (window.innerWidth <= 900 && sidebar.classList.contains('open')) {
        if (!sidebar.contains(e.target) && !toggleSidebarBtn.contains(e.target)) {
            sidebar.classList.remove('open');
        }
    }
});

// Keyboard shortcut
document.addEventListener('keydown', (e) => {
    if (e.key === '/' && document.activeElement !== inputField) {
        e.preventDefault();
        inputField.focus();
    }
});
