// Cached DOM elements
const $ = id => document.getElementById(id);
const hamburgerMenu = $('hamburger-menu');
const dropdownMenu = $('dropdown-menu');
const submitButton = $('gemini-submit');
const inputField = $('gemini-input');
const voiceButton = $('voice-input');
const chatDisplayArea = $('chat-display-area');
const clearChatButton = $('clear-chat');
const statusIndicator = $('status-indicator');
const toggleSidebarBtn = $('toggle-sidebar');
const sidebar = document.querySelector('.sidebar');
const newChatBtn = $('new-chat');
const attachFileBtn = $('attach-file');

let conversationHistory = [];
const MAX_HISTORY = 30; // Reduced limit

// Auto-resize textarea (throttled)
let resizeTimer;
const autoResize = () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
        inputField.style.height = 'auto';
        inputField.style.height = inputField.scrollHeight + 'px';
    }, 50);
};
inputField.addEventListener('input', autoResize);

// Lazy load libraries
let libsLoaded = false;
const loadLibs = async () => {
    if (libsLoaded) return;
    libsLoaded = true;
    
    const loadScript = src => new Promise(resolve => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        document.head.appendChild(script);
    });
    
    await Promise.all([
        loadScript('marked.min.js'),
        loadScript('prism.min.js')
    ]);
    
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = 'prism.min.css';
    document.head.appendChild(css);
};

// Single event handler with delegation
document.addEventListener('click', e => {
    const t = e.target;
    
    if (t === hamburgerMenu) {
        e.stopPropagation();
        dropdownMenu.style.display = dropdownMenu.style.display === 'block' ? 'none' : 'block';
    } else if (t === toggleSidebarBtn) {
        sidebar.classList.toggle('open');
    } else if (t === newChatBtn) {
        conversationHistory = [];
        clearChat();
        inputField.focus();
    } else if (t === attachFileBtn) {
        addBotMessage("File attachment functionality will be implemented soon!");
    } else if (t === submitButton) {
        handleSubmit();
    } else if (t === clearChatButton) {
        clearChat();
    } else if (t === voiceButton || t.closest('#voice-input')) {
        startVoiceRecognition();
    } else if (t.classList.contains('copy-icon')) {
        const content = t.closest('.message-box-container').querySelector('.message-content');
        navigator.clipboard.writeText(content.textContent).then(() => {
            t.className = t.className.replace('fa-copy', 'fa-check');
            setTimeout(() => t.className = t.className.replace('fa-check', 'fa-copy'), 2000);
        });
    } else if (t.classList.contains('read-aloud-icon')) {
        const content = t.closest('.message-box-container').querySelector('.message-content');
        speechSynthesis.speak(new SpeechSynthesisUtterance(content.textContent));
    } else if (t.classList.contains('prompt')) {
        inputField.value = t.textContent;
        handleSubmit();
    } else {
        dropdownMenu.style.display = 'none';
        if (window.innerWidth <= 900 && sidebar.classList.contains('open') && 
            !sidebar.contains(t) && !toggleSidebarBtn.contains(t)) {
            sidebar.classList.remove('open');
        }
    }
});

// Keyboard events
document.addEventListener('keydown', e => {
    if (e.target === inputField && e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
    } else if (e.key === '/' && document.activeElement !== inputField) {
        e.preventDefault();
        inputField.focus();
    }
});

// Submission handler
async function handleSubmit() {
    const prompt = inputField.value.trim();
    if (!prompt) return;
    
    addUserMessage(prompt);
    inputField.value = '';
    inputField.style.height = 'auto';
    
    const typing = showTyping();
    updateStatus('typing', 'Daksha AI is typing...');
    
    try {
        const response = await fetchGeminiResponse(prompt);
        chatDisplayArea.removeChild(typing);
        addBotMessage(response);
        storeHistory(prompt, response);
    } catch (error) {
        chatDisplayArea.removeChild(typing);
        addBotMessage('Sorry, I encountered an error. Please try again.');
        console.error('Error:', error);
    }
    
    updateStatus('ready', 'Daksha AI is ready');
    scrollToBottom();
}

// API call
async function fetchGeminiResponse(prompt) {
    conversationHistory.push({ role: 'user', content: prompt });
    
    const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ history: conversationHistory })
    });
    
    if (!response.ok) throw new Error('API failed');
    
    const data = await response.json();
    const result = data.response || 'No response generated';
    
    conversationHistory.push({ role: 'model', content: result });
    
    // Trim history
    if (conversationHistory.length > MAX_HISTORY) {
        conversationHistory = conversationHistory.slice(-MAX_HISTORY);
    }
    
    return result;
}

// UI functions
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
    conversationHistory = [];
    chatDisplayArea.innerHTML = '';
    displayWelcomeMessage();
}

function addUserMessage(message) {
    const div = document.createElement('div');
    div.className = 'message-box-container';
    div.innerHTML = `
        <div class="message-box user">
            <p>${message}</p>
            <a href="https://www.google.com/search?q=${encodeURIComponent(message)}" target="_blank">
                <img src="google-logo.png" alt="Google Search" class="google-search-icon">
            </a>
        </div>
    `;
    chatDisplayArea.appendChild(div);
}

async function addBotMessage(message) {
    await loadLibs();
    
    const div = document.createElement('div');
    div.className = 'message-box-container';
    div.innerHTML = `
        <div class="message-box bot">
            <div class="message-content"></div>
        </div>
        <div class="message-actions">
            <i class="fas fa-volume-up read-aloud-icon" title="Read aloud"></i>
            <i class="fas fa-copy copy-icon" title="Copy text"></i>
        </div>
    `;
    
    const content = div.querySelector('.message-content');
    content.innerHTML = marked?.parse ? marked.parse(message) : message;
    
    if (window.Prism) Prism.highlightAllUnder(content);
    
    chatDisplayArea.appendChild(div);
}

function showTyping() {
    const div = document.createElement('div');
    div.className = 'typing-indicator';
    div.innerHTML = '<div class="typing-dot"></div>'.repeat(3);
    chatDisplayArea.appendChild(div);
    return div;
}

function updateStatus(status, text) {
    statusIndicator.className = `status-indicator ${status}`;
    let statusText = statusIndicator.querySelector('.status-text');
    if (!statusText) {
        statusText = document.createElement('span');
        statusText.className = 'status-text';
        statusIndicator.appendChild(statusText);
    }
    statusText.textContent = text;
}

function scrollToBottom() {
    chatDisplayArea.scrollTop = chatDisplayArea.scrollHeight;
}

// Voice recognition
async function startVoiceRecognition() {
    if (!('webkitSpeechRecognition' in window)) {
        alert('Speech recognition not supported');
        return;
    }
    
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop());
        
        const recognition = new webkitSpeechRecognition();
        recognition.lang = 'en-US';
        
        voiceButton.innerHTML = '<i class="fas fa-stop"></i>';
        updateStatus('typing', 'Listening...');
        
        recognition.onresult = e => {
            inputField.value = e.results[0][0].transcript;
            handleSubmit();
        };
        
        recognition.onspeechend = () => {
            recognition.stop();
            voiceButton.innerHTML = '<i class="fas fa-microphone"></i>';
        };
        
        recognition.start();
    } catch (error) {
        addBotMessage('Microphone access denied.');
    }
}

// Suggested prompts
async function fetchSuggestedPrompts() {
    const fallback = [
        "What's the weather like today?",
        "Tell me a fun fact",
        "Explain quantum computing simply",
        "How does AI work?"
    ];
    
    let prompts = fallback;
    try {
        const response = await fetch('/api/suggested-prompts');
        if (response.ok) {
            const data = await response.json();
            prompts = data.prompts || fallback;
        }
    } catch {}
    
    const container = document.querySelector('.suggested-prompts');
    if (container) {
        container.innerHTML = prompts.map(p => `<div class="prompt">${p}</div>`).join('');
    }
}

// Local storage (limited)
function storeHistory(prompt, response) {
    try {
        let history = JSON.parse(localStorage.getItem('history') || '[]');
        history.push({ prompt, response, timestamp: Date.now() });
        if (history.length > 50) history = history.slice(-25);
        localStorage.setItem('history', JSON.stringify(history));
    } catch {}
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    fetchSuggestedPrompts();
    inputField.focus();
    updateStatus('ready', 'Daksha AI is ready');
    if (!chatDisplayArea.children.length) displayWelcomeMessage();
});