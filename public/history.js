// Function to load history and display it on the History page
const loadHistory = () => {
    const historyContainer = document.getElementById('history-container');
    const history = JSON.parse(localStorage.getItem('history')) || [];

    // Clear existing content
    historyContainer.innerHTML = '';

    // If no history, show a message
    if (history.length === 0) {
        historyContainer.innerHTML = '<p>No prompts and responses found.</p>';
    } else {
        history.forEach((entry, index) => {
            const logEntry = document.createElement('div');
            logEntry.classList.add('log-entry');

            // Use safe text insertion to avoid XSS
            logEntry.innerHTML = `<h3>Log ${index + 1}</h3>`;

            const prompt = document.createElement('p');
            prompt.innerHTML = `<strong>Prompt:</strong> `;
            prompt.appendChild(document.createTextNode(entry.prompt));

            const response = document.createElement('p');
            response.innerHTML = `<strong>Response:</strong> `;
            response.appendChild(document.createTextNode(entry.response));

            logEntry.appendChild(prompt);
            logEntry.appendChild(response);

            historyContainer.appendChild(logEntry);
        });
    }
};

// Clear History function
const clearHistory = () => {
    localStorage.removeItem('history');
    alert('History cleared successfully!');
    loadHistory();
};

// Initialize everything when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', function () {
    loadHistory();

    const clearBtn = document.getElementById('clearHistoryBtn');
    if (clearBtn) {
        clearBtn.addEventListener('click', clearHistory);
    }
});
