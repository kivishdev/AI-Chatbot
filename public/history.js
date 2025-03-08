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
        // Iterate over the history and display each entry
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

// Clear History function
const clearHistory = () => {
    // Remove the history data from localStorage
    localStorage.removeItem('history');

    // Reload the history container
    loadHistory();  // Reload the history after clearing
};

// Load the history when the page loads
window.onload = loadHistory;
