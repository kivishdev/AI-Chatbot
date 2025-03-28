// Toggle the hamburger menu dropdown
document.getElementById('hamburger-menu').addEventListener('click', () => {
    const dropdownMenu = document.getElementById('dropdown-menu');
    const menuButton = document.getElementById('hamburger-menu');
    dropdownMenu.style.display = dropdownMenu.style.display === 'block' ? 'none' : 'block';
    dropdownMenu.style.top = `${menuButton.offsetTop + menuButton.offsetHeight}px`;
});

// Event Listeners for Gemini submission
const submitButton = document.getElementById('gemini-submit');
const inputField = document.getElementById('gemini-input');

submitButton.addEventListener('click', handleSubmit);
inputField.addEventListener('keypress', function(event) {
    if (event.key === 'Enter') {
        event.preventDefault();  // Prevent the default action (form submission)
        handleSubmit();
    }
});

// Handle voice input
const voiceButton = document.getElementById('voice-input');
voiceButton.addEventListener('click', startVoiceRecognition);

function startVoiceRecognition() {
    const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.lang = 'en-US';

    // Show visual indicator for recording
    voiceButton.classList.add('recording');
    voiceButton.innerHTML = '<i class="fas fa-stop"></i>'; // Change icon to stop icon

    recognition.start();

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        inputField.value = transcript;
        handleSubmit();
    };

    recognition.onspeechend = () => {
        // Hide visual indicator when recording stops
        voiceButton.classList.remove('recording');
        voiceButton.innerHTML = '<i class="fas fa-microphone"></i>'; // Change icon back to microphone
        recognition.stop();
    };

    recognition.onerror = (event) => {
        console.error('Voice recognition error:', event.error);
        alert('Voice recognition error: ' + event.error);
        // Hide visual indicator when an error occurs
        voiceButton.classList.remove('recording');
        voiceButton.innerHTML = '<i class="fas fa-microphone"></i>'; // Change icon back to microphone
    };
}

async function handleSubmit() {
    const prompt = inputField.value.trim();
    const chatDisplayArea = document.getElementById('chat-display-area');

    if (prompt) {
        const userMessageBox = document.createElement('div');
        userMessageBox.className = 'message-box-container';
        userMessageBox.innerHTML = `
            <div class="message-box user">
                <p>${prompt}</p>
                <a href="https://www.google.com/search?q=${encodeURIComponent(prompt)}" target="_blank">
                    <img src="google-logo.png" alt="Google Search" class="google-search-icon">
                </a>
            </div>`;
        chatDisplayArea.appendChild(userMessageBox);

        inputField.value = ''; // Clear input field after submitting

        const loadingIndicator = document.createElement('div');
        loadingIndicator.className = 'message-box-container';
        loadingIndicator.innerHTML = `<div class="message-box bot"><p>Gemini is typing...</p></div>`;
        chatDisplayArea.appendChild(loadingIndicator);

        const response = await fetchGeminiResponse(prompt);
        chatDisplayArea.removeChild(loadingIndicator);

        const botMessageBox = document.createElement('div');
        botMessageBox.className = 'message-box-container';
        botMessageBox.innerHTML = `
            <div class="message-box bot"><p></p></div>
            <i class="fas fa-volume-up read-aloud-icon"></i>`;
        chatDisplayArea.appendChild(botMessageBox);

        // Add event listener for read-aloud icon
        botMessageBox.querySelector('.read-aloud-icon').addEventListener('click', () => {
            const utterance = new SpeechSynthesisUtterance(response);
            speechSynthesis.speak(utterance);
        });

        // Slow response appearance
        let index = 0;
        const interval = setInterval(() => {
            if (index < response.length) {
                botMessageBox.querySelector('.message-box p').innerHTML += response[index];
                index++;
            } else {
                clearInterval(interval);
            }
        }, 50); // Adjust speed as needed

        storeInHistory(prompt, response);
        storeInServer(prompt, response);
        
        // Scroll to bottom when new message is added
        window.scrollToBottom();
    } else {
        alert('Enter a prompt!');
    }
}

// Fetch Gemini Response
const fetchGeminiResponse = async (prompt) => {
    try {
        const response = await fetch(`/api/gemini?prompt=${encodeURIComponent(prompt)}`);
        if (!response.ok) {
            throw new Error('Failed to fetch Gemini response');
        }
        const data = await response.json();
        return data.response || 'No response available.';
    } catch (error) {
        console.error('Error:', error.message);
        return 'Sorry, Daksha is not connected. Please try again later.';
    }
};

// Fetch Suggested Prompts from Gemini
const fetchSuggestedPrompts = async () => {
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
    }
};

// Initialize Suggested Prompts
fetchSuggestedPrompts();

// Store the prompt and response in the localStorage history
const storeInHistory = (prompt, response) => {
    let history = JSON.parse(localStorage.getItem('history')) || [];
    history.push({ prompt: prompt, response: response });

    localStorage.setItem('history', JSON.stringify(history));
};

// Store the prompt and response on the server
const storeInServer = async (prompt, response) => {
    try {
        const interaction = { prompt, response };
        await fetch('/api/store-interaction', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(interaction)
        });
    } catch (error) {
        console.error('Error storing interaction:', error.message);
    }
};

// Function to load history and display it on the History page
const loadHistory = () => {
    const historyContainer = document.getElementById('history-container');
    const history = JSON.parse(localStorage.getItem('history')) || [];

    historyContainer.innerHTML = '';

    if (history.length === 0) {
        historyContainer.innerHTML = '<p>No prompts and responses found.</p>';
    } else {
        history.forEach((entry, index) => {
            const logEntry = document.createElement('div');
            logEntry.classList.add('log-entry');
            logEntry.innerHTML = `
                <h3>Log ${index + 1}</h3>
                <p><strong>Prompt:</strong> ${entry.prompt}</p>
                <p><strong>Response:</strong> ${entry.response}</p>
            `;
            historyContainer.appendChild(logEntry);
        });
    }
};

// Function to clear the history
const clearHistory = () => {
    localStorage.removeItem('history');
    loadHistory(); 
};

if (window.location.pathname.includes('history.html')) {
    loadHistory();
}

// Function to capture screenshot
const captureScreenshot = async () => {
    const element = document.body;
    html2canvas(element).then((canvas) => {
        // Convert the canvas to an image and download it
        const link = document.createElement('a');
        link.href = canvas.toDataURL('image/png');
        link.download = 'screenshot.png';
        link.click();
    });
};

// Add keyboard shortcut for screenshot
document.addEventListener('keydown', (event) => {
    if (event.ctrlKey && event.key === 's') {
        event.preventDefault();
        captureScreenshot();
    }
});

// Handle mobile keyboard appearance
document.addEventListener('DOMContentLoaded', function() {
  const inputField = document.getElementById('gemini-input');
  const chatDisplay = document.getElementById('chat-display-area');
  const inputBar = document.querySelector('.input-bar');
  
  // Check if it's a mobile device
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  if (isMobile) {
    // When input is focused (keyboard appears)
    inputField.addEventListener('focus', function() {
      chatDisplay.classList.add('keyboard-active');
      inputBar.classList.add('keyboard-active');
      
      // Scroll to bottom when keyboard appears
      setTimeout(() => {
        chatDisplay.scrollTop = chatDisplay.scrollHeight;
      }, 100);
    });
    
    // When input loses focus (keyboard disappears)
    inputField.addEventListener('blur', function() {
      chatDisplay.classList.remove('keyboard-active');
      inputBar.classList.remove('keyboard-active');
    });
    
    // iOS specific handling
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (isIOS) {
      // Scroll window to input on focus (iOS specific fix)
      inputField.addEventListener('focus', function() {
        setTimeout(function() {
          window.scrollTo(0, document.body.scrollHeight);
        }, 300);
      });
    }
    
    // Visual feedback when sending messages
    document.getElementById('gemini-submit').addEventListener('click', function() {
      if (inputField.value.trim() !== '') {
        // Add a subtle animation
        this.classList.add('sending');
        setTimeout(() => {
          this.classList.remove('sending');
        }, 300);
      }
    });
  }
  
  // Always scroll to bottom when new messages arrive
  // This function should be called whenever a new message is added
  function scrollToBottom() {
    chatDisplay.scrollTop = chatDisplay.scrollHeight;
  }
  
  // Expose this function globally so it can be called from your chat logic
  window.scrollToBottom = scrollToBottom;
});