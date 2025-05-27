// DOM Elements
const sidebar = document.getElementById('sidebar');
const toggleSidebarBtn = document.getElementById('toggle-sidebar');
const sidebarClose = document.getElementById('sidebar-close');
const newChatBtn = document.getElementById('new-chat');
const settingsBtn = document.getElementById('settings-btn');
const themeToggle = document.getElementById('theme-toggle');
const clearChatBtn = document.getElementById('clear-chat');
const exportChatBtn = document.getElementById('export-chat');
const copyChatBtn = document.getElementById('copy-chat');
const menuBtn = document.getElementById('menu-btn');
const dropdownMenu = document.getElementById('dropdown-menu');
const chatArea = document.getElementById('chat-area');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const voiceInputBtn = document.getElementById('voice-input');
const settingsModal = document.getElementById('settings-modal');
const closeSettingsBtn = document.getElementById('close-settings');
const statusIndicator = document.getElementById('status-indicator');
const charCount = document.getElementById('char-count');
const notificationContainer = document.getElementById('notification-container');
const recentChatsContainer = document.getElementById('recent-chats');

// State Management
let conversationHistory = [];
let currentChatId = null;
let currentTheme = localStorage.getItem('theme') || 'light';
let settings = JSON.parse(localStorage.getItem('settings')) || {
    fontSize: 'medium',
    autoScroll: true,
    soundEffects: false,
    voiceLanguage: 'en-US'
};
let chatHistory = JSON.parse(localStorage.getItem('chatHistory')) || {};

// FIXED Voice Manager Class
class VoiceManager {
    constructor() {
        this.recognition = null;
        this.isListening = false;
        this.lastTranscript = '';
        this.finalTranscript = '';
        this.initializeRecognition();
    }

    initializeRecognition() {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            this.recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
            this.recognition.continuous = false;
            this.recognition.interimResults = true;
            this.recognition.maxAlternatives = 1;
            this.recognition.lang = settings.voiceLanguage || 'en-US';

            this.recognition.onstart = () => {
                console.log('🎤 Voice recognition started');
                this.isListening = true;
                this.lastTranscript = '';
                this.finalTranscript = '';
                this.updateVoiceButton(true);
                updateStatus('typing', 'Listening...');
                Utils.showNotification('🎤 Voice recording started', 'info');
            };

            this.recognition.onresult = (event) => {
                console.log('📝 Voice recognition result event:', event);
                
                let finalTranscript = '';
                let interimTranscript = '';
                
                // Process all results from the current event
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const result = event.results[i];
                    const transcript = result.transcript.trim();
                    
                    console.log(`Result ${i}: "${transcript}" (final: ${result.isFinal})`);
                    
                    if (result.isFinal) {
                        finalTranscript += transcript + ' ';
                    } else {
                        interimTranscript += transcript + ' ';
                    }
                }
                
                // Update interim results display
                if (interimTranscript.trim()) {
                    userInput.placeholder = `Listening... "${interimTranscript.trim()}"`;
                }
                
                // Handle final results
                if (finalTranscript.trim()) {
                    this.finalTranscript = finalTranscript.trim();
                    console.log('✅ Final transcript captured:', this.finalTranscript);
                    
                    // Process immediately when we get final results
                    this.processVoiceInput(this.finalTranscript);
                }
            };

            this.recognition.onerror = (event) => {
                console.error('❌ Speech recognition error:', event.error);
                this.stopListening();
                
                let errorMessage = 'Voice recognition failed. Please try again.';
                switch(event.error) {
                    case 'not-allowed':
                        errorMessage = 'Microphone access denied. Please allow microphone permission.';
                        break;
                    case 'no-speech':
                        errorMessage = 'No speech detected. Please speak clearly and try again.';
                        break;
                    case 'network':
                        errorMessage = 'Network error. Please check your connection.';
                        break;
                    case 'audio-capture':
                        errorMessage = 'Audio capture failed. Please check your microphone.';
                        break;
                    case 'aborted':
                        errorMessage = 'Voice recognition was stopped.';
                        break;
                }
                
                Utils.showNotification(errorMessage, 'error');
            };

            this.recognition.onend = () => {
                console.log('🔚 Voice recognition ended');
                
                // If we have captured speech but haven't processed it yet
                if (this.finalTranscript && this.isListening) {
                    console.log('Processing final transcript on end:', this.finalTranscript);
                    this.processVoiceInput(this.finalTranscript);
                } else if (this.isListening) {
                    // No speech was captured
                    this.stopListening();
                    Utils.showNotification('No speech detected. Please try again.', 'warning');
                }
            };
        }
    }

    processVoiceInput(transcript) {
        console.log('🔄 Processing voice input:', transcript);
        
        if (!transcript || !transcript.trim()) {
            console.warn('⚠️ Empty transcript received');
            this.stopListening();
            Utils.showNotification('No speech detected. Please try again.', 'warning');
            return;
        }
        
        const cleanTranscript = transcript.trim();
        console.log('📝 Setting user input to:', cleanTranscript);
        
        // Stop listening first
        this.stopListening();
        
        // Set the input value with validation
        if (this.setUserInput(cleanTranscript)) {
            Utils.showNotification('✅ Voice input captured successfully', 'success');
            
            // Submit the message after a brief delay
            setTimeout(() => {
                console.log('🚀 Submitting voice input:', userInput.value);
                if (userInput.value && userInput.value.trim()) {
                    handleSubmit();
                } else {
                    console.error('❌ User input is empty after setting transcript');
                    Utils.showNotification('Failed to process voice input. Please try typing instead.', 'error');
                }
            }, 300);
        } else {
            Utils.showNotification('Failed to set voice input. Please try again.', 'error');
        }
    }

    async startListening() {
        if (!this.recognition) {
            Utils.showNotification('Speech recognition not supported in this browser', 'error');
            return;
        }

        try {
            // Request microphone permission
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream.getTracks().forEach(track => track.stop());
            
            // Clear previous transcripts
            this.lastTranscript = '';
            this.finalTranscript = '';
            
            // Set language from settings
            this.recognition.lang = settings.voiceLanguage || 'en-US';
            
            console.log('🎯 Starting voice recognition with language:', this.recognition.lang);
            this.recognition.start();
            
        } catch (error) {
            console.error('🚫 Microphone access error:', error);
            Utils.showNotification('Microphone access denied. Please allow microphone permission and try again.', 'error');
        }
    }

    stopListening() {
        if (this.recognition && this.isListening) {
            console.log('⏹️ Stopping voice recognition');
            this.recognition.stop();
        }
        
        this.isListening = false;
        this.updateVoiceButton(false);
        userInput.placeholder = 'Type your message...';
        updateStatus('ready', 'Ready');
    }

    toggleListening() {
        console.log('🔄 Toggle listening, currently listening:', this.isListening);
        if (this.isListening) {
            this.stopListening();
        } else {
            this.startListening();
        }
    }

    updateVoiceButton(isRecording) {
        if (!voiceInputBtn) return;
        
        if (isRecording) {
            voiceInputBtn.classList.add('recording');
            voiceInputBtn.innerHTML = '<i class="fas fa-stop"></i>';
            voiceInputBtn.title = 'Stop Recording';
        } else {
            voiceInputBtn.classList.remove('recording');
            voiceInputBtn.innerHTML = '<i class="fas fa-microphone"></i>';
            voiceInputBtn.title = 'Voice Input (Ctrl+M)';
        }
    }

    setUserInput(text) {
        console.log('📝 setUserInput called with:', text);
        
        if (!userInput) {
            console.error('❌ userInput element not found');
            return false;
        }
        
        if (!text || typeof text !== 'string' || !text.trim()) {
            console.warn('⚠️ Invalid text provided to setUserInput:', text);
            return false;
        }
        
        const cleanText = text.trim();
        
        // Set the value
        userInput.value = cleanText;
        
        // Trigger events to ensure UI updates
        userInput.dispatchEvent(new Event('input', { bubbles: true }));
        userInput.dispatchEvent(new Event('change', { bubbles: true }));
        
        // Update UI
        autoResize();
        updateCharacterCount();
        
        // Focus the input
        userInput.focus();
        
        console.log('✅ User input set successfully to:', userInput.value);
        return true;
    }

    updateLanguage(language) {
        if (this.recognition) {
            this.recognition.lang = language;
            console.log('🌐 Voice recognition language updated to:', language);
        }
    }

    getStatus() {
        return {
            isListening: this.isListening,
            lastTranscript: this.lastTranscript,
            finalTranscript: this.finalTranscript,
            recognitionAvailable: !!this.recognition,
            currentLanguage: this.recognition?.lang
        };
    }
}

// Initialize Voice Manager
const voiceManager = new VoiceManager();

// Enhanced Utility Functions
class Utils {
    static generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    static formatTimestamp(date = new Date()) {
        return new Intl.DateTimeFormat('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        }).format(date);
    }

    static truncateText(text, maxLength = 50) {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength).trim() + '...';
    }

    static showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : 
                         type === 'error' ? 'exclamation-circle' : 
                         type === 'warning' ? 'exclamation-triangle' : 'info-circle'}"></i>
            <span>${message}</span>
        `;
        
        notificationContainer.appendChild(notification);
        
        setTimeout(() => notification.classList.add('show'), 100);
        
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentNode) {
                    notificationContainer.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    static async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (error) {
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            document.body.appendChild(textArea);
            textArea.select();
            
            try {
                document.execCommand('copy');
                document.body.removeChild(textArea);
                return true;
            } catch (err) {
                document.body.removeChild(textArea);
                return false;
            }
        }
    }

    static downloadFile(content, filename, contentType = 'text/plain') {
        const blob = new Blob([content], { type: contentType });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
    }

    static formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    static escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    static throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
}

// Enhanced Chat Management
class ChatManager {
    constructor() {
        this.currentChatId = null;
        this.loadRecentChats();
    }

    createNewChat() {
        const chatId = Utils.generateId();
        const chat = {
            id: chatId,
            title: 'New Conversation',
            messages: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        chatHistory[chatId] = chat;
        this.currentChatId = chatId;
        this.saveChats();
        return chatId;
    }

    saveMessage(role, content) {
        if (!this.currentChatId) {
            this.createNewChat();
        }

        const message = {
            id: Utils.generateId(),
            role,
            content,
            timestamp: new Date().toISOString()
        };

        chatHistory[this.currentChatId].messages.push(message);
        chatHistory[this.currentChatId].updatedAt = new Date().toISOString();

        // Auto-generate title from first user message
        if (role === 'user' && chatHistory[this.currentChatId].messages.length === 1) {
            const title = Utils.truncateText(content, 30);
            chatHistory[this.currentChatId].title = title;
        }

        this.saveChats();
        this.loadRecentChats();
    }

    saveChats() {
        localStorage.setItem('chatHistory', JSON.stringify(chatHistory));
    }

    loadRecentChats() {
        if (!recentChatsContainer) return;

        const sortedChats = Object.values(chatHistory)
            .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
            .slice(0, 5);

        recentChatsContainer.innerHTML = '';

        if (sortedChats.length === 0) {
            const emptyState = document.createElement('div');
            emptyState.className = 'empty-state';
            emptyState.innerHTML = `
                <p style="color: var(--text-light); font-size: var(--font-sm); text-align: center; padding: var(--space-md);">
                    No recent conversations
                </p>
            `;
            recentChatsContainer.appendChild(emptyState);
            return;
        }

        sortedChats.forEach(chat => {
            const chatItem = document.createElement('div');
            chatItem.className = 'recent-chat-item';
            
            const chatContent = document.createElement('div');
            chatContent.className = 'chat-content';
            chatContent.textContent = chat.title;
            chatContent.title = chat.title;
            
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-chat-btn';
            deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
            deleteBtn.title = 'Delete conversation';
            
            chatContent.addEventListener('click', () => {
                this.loadChat(chat.id);
                if (window.innerWidth <= 768) {
                    sidebar.classList.remove('open');
                }
            });
            
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteChat(chat.id);
            });

            chatItem.appendChild(chatContent);
            chatItem.appendChild(deleteBtn);
            recentChatsContainer.appendChild(chatItem);
        });
    }

    loadChat(chatId) {
        if (chatHistory[chatId]) {
            this.currentChatId = chatId;
            const chat = chatHistory[chatId];
            
            chatArea.innerHTML = '';
            conversationHistory = [];

            chat.messages.forEach(message => {
                if (message.role === 'user') {
                    addMessage(message.content, true, false);
                    conversationHistory.push({ role: 'user', content: message.content });
                } else {
                    addMessage(message.content, false, false);
                    conversationHistory.push({ role: 'model', content: message.content });
                }
            });

            scrollToBottom();
        }
    }

    deleteChat(chatId) {
        if (!chatHistory[chatId]) return;
        
        const chatTitle = chatHistory[chatId].title;
        
        if (confirm(`Are you sure you want to delete "${chatTitle}"?`)) {
            delete chatHistory[chatId];
            this.saveChats();
            this.loadRecentChats();
            
            if (this.currentChatId === chatId) {
                this.currentChatId = null;
                conversationHistory = [];
                clearChat();
            }
            
            Utils.showNotification('Conversation deleted successfully', 'success');
        }
    }

    exportChat(format = 'txt') {
        if (!this.currentChatId || !chatHistory[this.currentChatId]) {
            Utils.showNotification('No chat to export', 'error');
            return;
        }

        const chat = chatHistory[this.currentChatId];
        let content = '';
        let filename = '';
        let contentType = '';

        if (format === 'txt') {
            content = `Chat Export - ${chat.title}\nDate: ${new Date(chat.createdAt).toLocaleString()}\n\n`;
            
            chat.messages.forEach(message => {
                const role = message.role === 'user' ? 'You' : 'Daksha AI';
                const time = new Date(message.timestamp).toLocaleTimeString();
                content += `[${time}] ${role}: ${message.content}\n\n`;
            });
            
            filename = `daksha-chat-${chat.id}.txt`;
            contentType = 'text/plain';
        } else if (format === 'json') {
            content = JSON.stringify(chat, null, 2);
            filename = `daksha-chat-${chat.id}.json`;
            contentType = 'application/json';
        }

        Utils.downloadFile(content, filename, contentType);
        Utils.showNotification('Chat exported successfully', 'success');
    }

    async copyChat() {
        if (!this.currentChatId || !chatHistory[this.currentChatId]) {
            Utils.showNotification('No chat to copy', 'error');
            return;
        }

        const chat = chatHistory[this.currentChatId];
        let content = `Chat - ${chat.title}\n\n`;
        
        chat.messages.forEach(message => {
            const role = message.role === 'user' ? 'You' : 'Daksha AI';
            content += `${role}: ${message.content}\n\n`;
        });

        const success = await Utils.copyToClipboard(content);
        if (success) {
            Utils.showNotification('Chat copied to clipboard', 'success');
        } else {
            Utils.showNotification('Failed to copy chat', 'error');
        }
    }

    getChatStats() {
        const totalChats = Object.keys(chatHistory).length;
        const totalMessages = Object.values(chatHistory).reduce((sum, chat) => sum + chat.messages.length, 0);
        return { totalChats, totalMessages };
    }
}

// Initialize Chat Manager
const chatManager = new ChatManager();

// Enhanced Theme Management
function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const icon = themeToggle?.querySelector('i');
    const text = themeToggle?.querySelector('span');
    
    if (theme === 'dark') {
        if (icon) icon.className = 'fas fa-sun';
        if (text) text.textContent = 'Light Mode';
    } else {
        if (icon) icon.className = 'fas fa-moon';
        if (text) text.textContent = 'Dark Mode';
    }
    
    localStorage.setItem('theme', theme);
}

function toggleTheme() {
    currentTheme = currentTheme === 'light' ? 'dark' : 'light';
    applyTheme(currentTheme);
    Utils.showNotification(`Switched to ${currentTheme} mode`, 'success');
}

// Enhanced Settings Management
function applySettings() {
    const fontSizeSelect = document.getElementById('font-size');
    const autoScrollCheck = document.getElementById('auto-scroll');
    const soundEffectsCheck = document.getElementById('sound-effects');
    const voiceLanguageSelect = document.getElementById('voice-language');
    
    if (fontSizeSelect) fontSizeSelect.value = settings.fontSize;
    if (autoScrollCheck) autoScrollCheck.checked = settings.autoScroll;
    if (soundEffectsCheck) soundEffectsCheck.checked = settings.soundEffects;
    if (voiceLanguageSelect) voiceLanguageSelect.value = settings.voiceLanguage;
    
    // Apply font size
    const sizes = { small: '14px', medium: '16px', large: '18px' };
    document.documentElement.style.fontSize = sizes[settings.fontSize];
    
    // Update voice language
    if (voiceManager) {
        voiceManager.updateLanguage(settings.voiceLanguage);
    }
}

function saveSettings() {
    localStorage.setItem('settings', JSON.stringify(settings));
}

// Enhanced Status Management
function updateStatus(status, text) {
    if (statusIndicator) {
        statusIndicator.className = `status-indicator ${status}`;
        const statusText = statusIndicator.querySelector('.status-text');
        if (statusText) {
            statusText.textContent = text;
        }
    }
}

// Auto-resize textarea
function autoResize() {
    if (userInput) {
        userInput.style.height = 'auto';
        userInput.style.height = userInput.scrollHeight + 'px';
    }
}

// Character counter
function updateCharacterCount() {
    const count = userInput?.value.length || 0;
    if (charCount) {
        charCount.textContent = `${count}/4000`;
        charCount.style.color = count > 3500 ? 'var(--error)' : 'var(--text-light)';
    }
}

// Enhanced message rendering with Google icon for user messages
function addMessage(content, isUser = false, saveToHistory = true) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isUser ? 'user' : 'bot'}`;
    
    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    
    if (isUser) {
        const textSpan = document.createElement('span');
        textSpan.textContent = content;
        
        const googleIcon = document.createElement('i');
        googleIcon.className = 'fab fa-google google-icon';
        googleIcon.title = 'Search on Google';
        googleIcon.style.cursor = 'pointer';
        googleIcon.style.marginLeft = '8px';
        googleIcon.style.opacity = '0.7';
        googleIcon.style.transition = 'opacity 0.2s ease';
        
        googleIcon.addEventListener('mouseenter', () => {
            googleIcon.style.opacity = '1';
        });
        
        googleIcon.addEventListener('mouseleave', () => {
            googleIcon.style.opacity = '0.7';
        });
        
        googleIcon.addEventListener('click', (e) => {
            e.stopPropagation();
            const query = encodeURIComponent(content);
            window.open(`https://www.google.com/search?q=${query}`, '_blank');
            Utils.showNotification('Opened Google search in new tab', 'info');
        });
        
        messageContent.appendChild(textSpan);
        messageContent.appendChild(googleIcon);
    } else {
        if (typeof marked !== 'undefined') {
            marked.setOptions({
                highlight: function(code, lang) {
                    if (typeof Prism !== 'undefined' && lang && Prism.languages[lang]) {
                        try {
                            return Prism.highlight(code, Prism.languages[lang], lang);
                        } catch (e) {
                            console.warn('Prism highlighting failed:', e);
                        }
                    }
                    return code;
                },
                breaks: true,
                gfm: true
            });
            
            messageContent.innerHTML = marked.parse(content);
            
            setTimeout(() => {
                if (typeof Prism !== 'undefined') {
                    Prism.highlightAllUnder(messageContent);
                }
            }, 50);
        } else {
            messageContent.innerHTML = content.replace(/\n/g, '<br>');
        }
    }
    
    messageDiv.appendChild(messageContent);
    
    const welcomeMessage = chatArea?.querySelector('.welcome-message');
    if (welcomeMessage) {
        welcomeMessage.remove();
    }
    
    chatArea?.appendChild(messageDiv);
    
    if (saveToHistory) {
        chatManager.saveMessage(isUser ? 'user' : 'assistant', content);
    }
    
    if (settings.autoScroll) {
        scrollToBottom();
    }
}

// Show typing indicator
function showTypingIndicator() {
    const typingDiv = document.createElement('div');
    typingDiv.className = 'typing-indicator';
    typingDiv.innerHTML = `
        <div class="typing-dots">
            <span></span><span></span><span></span>
        </div>
    `;
    chatArea?.appendChild(typingDiv);
    if (settings.autoScroll) {
        scrollToBottom();
    }
    return typingDiv;
}

// Enhanced API call to backend
async function sendMessage(message) {
    conversationHistory.push({ role: 'user', content: message });
    
    try {
        const response = await fetch('/api/gemini', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ history: conversationHistory })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        const result = data.response || 'Sorry, I couldn\'t generate a response.';
        
        conversationHistory.push({ role: 'model', content: result });
        return result;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// FIXED: Enhanced form submission with better validation
async function handleSubmit() {
    const message = userInput?.value?.trim();
    
    console.log('🚀 handleSubmit called with message:', message);
    
    if (!message) {
        console.warn('⚠️ Empty message in handleSubmit');
        Utils.showNotification('Please enter a message', 'warning');
        userInput?.focus();
        return;
    }
    
    if (message.length > 4000) {
        Utils.showNotification('Message too long. Maximum 4000 characters allowed.', 'error');
        return;
    }
    
    console.log('✅ Submitting message:', message);
    
    addMessage(message, true);
    userInput.value = '';
    autoResize();
    updateCharacterCount();
    
    updateStatus('typing', 'Daksha AI is typing...');
    const typingIndicator = showTypingIndicator();
    
    try {
        const response = await sendMessage(message);
        if (typingIndicator && typingIndicator.parentNode) {
            chatArea?.removeChild(typingIndicator);
        }
        addMessage(response);
        updateStatus('ready', 'Ready');
    } catch (error) {
        if (typingIndicator && typingIndicator.parentNode) {
            chatArea?.removeChild(typingIndicator);
        }
        addMessage('Sorry, I encountered an error. Please try again later.');
        updateStatus('error', 'Error');
        Utils.showNotification('Failed to get response. Please try again.', 'error');
    }
}

// Clear chat
function clearChat() {
    conversationHistory = [];
    chatManager.currentChatId = null;
    
    if (chatArea) {
        chatArea.innerHTML = `
            <div class="welcome-message">
                <div class="welcome-icon">
                    <img src="designer.png" alt="Daksha AI" class="welcome-logo" />
                </div>
                <h2>Welcome to Daksha AI</h2>
                <p>Your intelligent assistant powered by advanced AI. Ask me anything!</p>
                
                <div class="quick-suggestions">
                    <button class="suggestion-btn" data-prompt="Explain quantum computing in simple terms">
                        <i class="fas fa-atom"></i>
                        Quantum Computing
                    </button>
                    <button class="suggestion-btn" data-prompt="Write a Python function to sort an array">
                        <i class="fab fa-python"></i>
                        Code Helper
                    </button>
                    <button class="suggestion-btn" data-prompt="Plan a weekend trip">
                        <i class="fas fa-map"></i>
                        Trip Planning
                    </button>
                </div>
            </div>
        `;
    }
    
    bindSuggestionEvents();
    Utils.showNotification('Chat cleared', 'info');
}

// Bind suggestion events
function bindSuggestionEvents() {
    document.querySelectorAll('.suggestion-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const prompt = btn.getAttribute('data-prompt');
            if (prompt && userInput) {
                userInput.value = prompt;
                handleSubmit();
            }
        });
    });
}

// Scroll to bottom
function scrollToBottom() {
    if (chatArea && settings.autoScroll) {
        chatArea.scrollTop = chatArea.scrollHeight;
    }
}

// Enhanced mobile sidebar management
function setupSidebarCloseOnOutsideClick() {
    const handleOutsideClick = (e) => {
        if (window.innerWidth <= 768 && sidebar?.classList.contains('open')) {
            if (!sidebar.contains(e.target) && !toggleSidebarBtn?.contains(e.target)) {
                sidebar.classList.remove('open');
            }
        }
    };

    document.addEventListener('click', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);

    sidebarClose?.addEventListener('click', () => {
        sidebar?.classList.remove('open');
    });

    sidebarClose?.addEventListener('touchstart', (e) => {
        e.preventDefault();
        sidebar?.classList.remove('open');
    });
}

// Enhanced keyboard shortcuts
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Focus input with '/'
        if (e.key === '/' && document.activeElement !== userInput) {
            e.preventDefault();
            userInput?.focus();
        }
        
        // New chat with Ctrl+N
        if (e.ctrlKey && e.key === 'n') {
            e.preventDefault();
            newChatBtn?.click();
        }
        
        // Toggle sidebar with Ctrl+B
        if (e.ctrlKey && e.key === 'b') {
            e.preventDefault();
            toggleSidebarBtn?.click();
        }
        
        // Settings with Ctrl+,
        if (e.ctrlKey && e.key === ',') {
            e.preventDefault();
            settingsBtn?.click();
        }
        
        // Voice input with Ctrl+M
        if (e.ctrlKey && e.key === 'm') {
            e.preventDefault();
            voiceInputBtn?.click();
        }
        
        // Toggle theme with Ctrl+T
        if (e.ctrlKey && e.key === 't') {
            e.preventDefault();
            themeToggle?.click();
        }
        
        // Export chat with Ctrl+E
        if (e.ctrlKey && e.key === 'e') {
            e.preventDefault();
            exportChatBtn?.click();
        }
        
        // Clear chat with Ctrl+L
        if (e.ctrlKey && e.key === 'l') {
            e.preventDefault();
            clearChatBtn?.click();
        }
    });
}

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
    applyTheme(currentTheme);
    applySettings();
    setupSidebarCloseOnOutsideClick();
    setupKeyboardShortcuts();
    bindSuggestionEvents();
    
    userInput?.focus();
    
    if (Object.keys(chatHistory).length === 0) {
        chatManager.createNewChat();
    }
    
    if (typeof Prism !== 'undefined') {
        Prism.manual = true;
    }
    
    // Show welcome notification
    setTimeout(() => {
        Utils.showNotification('Welcome to Daksha AI! 🤖', 'success');
    }, 1000);
});

// Event Listeners
toggleSidebarBtn?.addEventListener('click', () => {
    sidebar?.classList.toggle('open');
});

newChatBtn?.addEventListener('click', () => {
    chatManager.createNewChat();
    clearChat();
    userInput?.focus();
    if (window.innerWidth <= 768) {
        sidebar?.classList.remove('open');
    }
});

clearChatBtn?.addEventListener('click', () => {
    if (confirm('Are you sure you want to clear this chat?')) {
        clearChat();
    }
});

themeToggle?.addEventListener('click', toggleTheme);

settingsBtn?.addEventListener('click', () => {
    if (settingsModal) {
        settingsModal.style.display = 'flex';
    }
    if (window.innerWidth <= 768) {
        sidebar?.classList.remove('open');
    }
});

closeSettingsBtn?.addEventListener('click', () => {
    if (settingsModal) {
        settingsModal.style.display = 'none';
    }
});

exportChatBtn?.addEventListener('click', () => {
    chatManager.exportChat('txt');
});

copyChatBtn?.addEventListener('click', () => {
    chatManager.copyChat();
});

menuBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (dropdownMenu) {
        dropdownMenu.style.display = dropdownMenu.style.display === 'block' ? 'none' : 'block';
    }
});

sendBtn?.addEventListener('click', handleSubmit);

userInput?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
    }
});

userInput?.addEventListener('input', () => {
    autoResize();
    updateCharacterCount();
});

// FIXED: Voice Input Event Listener
voiceInputBtn?.addEventListener('click', () => {
    console.log('🎤 Voice button clicked');
    voiceManager.toggleListening();
});

// Settings event listeners
document.getElementById('font-size')?.addEventListener('change', (e) => {
    settings.fontSize = e.target.value;
    applySettings();
    saveSettings();
    Utils.showNotification(`Font size changed to ${e.target.value}`, 'success');
});

document.getElementById('auto-scroll')?.addEventListener('change', (e) => {
    settings.autoScroll = e.target.checked;
    saveSettings();
    Utils.showNotification(`Auto-scroll ${e.target.checked ? 'enabled' : 'disabled'}`, 'success');
});

document.getElementById('sound-effects')?.addEventListener('change', (e) => {
    settings.soundEffects = e.target.checked;
    saveSettings();
    Utils.showNotification(`Sound effects ${e.target.checked ? 'enabled' : 'disabled'}`, 'success');
});

document.getElementById('voice-language')?.addEventListener('change', (e) => {
    settings.voiceLanguage = e.target.value;
    applySettings();
    saveSettings();
    Utils.showNotification(`Voice language changed to ${e.target.options[e.target.selectedIndex].text}`, 'success');
});

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
    if (dropdownMenu && !menuBtn?.contains(e.target)) {
        dropdownMenu.style.display = 'none';
    }
});

// Close modal when clicking outside
settingsModal?.addEventListener('click', (e) => {
    if (e.target === settingsModal) {
        settingsModal.style.display = 'none';
    }
});

// Mobile optimizations
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        const viewport = document.querySelector('meta[name=viewport]');
        if (viewport && /iPhone|iPad|iPod/.test(navigator.userAgent)) {
            viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
        }
    });
}

// Handle viewport changes for mobile browsers
window.addEventListener('resize', Utils.throttle(() => {
    if (settings.autoScroll) {
        setTimeout(scrollToBottom, 100);
    }
    
    if (window.innerWidth > 768 && sidebar?.classList.contains('open')) {
        sidebar.classList.remove('open');
    }
}, 250));

// Prevent body scroll when sidebar is open on mobile
const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
            if (window.innerWidth <= 768) {
                if (sidebar?.classList.contains('open')) {
                    document.body.style.overflow = 'hidden';
                } else {
                    document.body.style.overflow = '';
                }
            }
        }
    });
});

if (sidebar) {
    observer.observe(sidebar, { attributes: true });
}

// Enhanced error handling
window.addEventListener('error', (e) => {
    console.error('Global error:', e.error);
    Utils.showNotification('An unexpected error occurred', 'error');
});

window.addEventListener('unhandledrejection', (e) => {
    console.error('Unhandled promise rejection:', e.reason);
    Utils.showNotification('A network error occurred', 'error');
});

// Online/Offline detection
window.addEventListener('online', () => {
    Utils.showNotification('Connection restored', 'success');
    updateStatus('ready', 'Ready');
});

window.addEventListener('offline', () => {
    Utils.showNotification('You are offline', 'warning');
    updateStatus('error', 'Offline');
});

// Performance monitoring
if ('performance' in window) {
    window.addEventListener('load', () => {
        setTimeout(() => {
            const perfData = performance.getEntriesByType('navigation')[0];
            console.log(`Page load time: ${perfData.loadEventEnd - perfData.loadEventStart}ms`);
        }, 0);
    });
}

// Export for potential external use
window.DakshaAI = {
    chatManager,
    voiceManager,
    Utils,
    settings,
    currentTheme,
    version: '2.0.1'
};

// Debug mode for development
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    window.DEBUG = true;
    console.log('🤖 Daksha AI Debug Mode Enabled');
    console.log('Available commands:', {
        'DakshaAI.chatManager': 'Chat management functions',
        'DakshaAI.voiceManager': 'Voice recognition functions',
        'DakshaAI.voiceManager.getStatus()': 'Check voice status',
        'DakshaAI.Utils': 'Utility functions',
        'DakshaAI.settings': 'Current settings',
        'DakshaAI.currentTheme': 'Current theme'
    });
}
