const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const statusDiv = document.getElementById('status');
const usernameSpan = document.getElementById('username');

// Get user info and display it when the window loads
window.electronAPI.getUser().then(user => {
    if (user) {
        usernameSpan.textContent = user.username;
    }
});

// Event listener for the "Start Tracking" button
startBtn.addEventListener('click', () => {
    window.electronAPI.startTracking();
    statusDiv.textContent = 'Active';
    startBtn.disabled = true;
    stopBtn.disabled = false;
});

// Event listener for the "Stop Tracking" button
stopBtn.addEventListener('click', () => {
    window.electronAPI.stopTracking();
    statusDiv.textContent = 'Idle';
    startBtn.disabled = false;
    stopBtn.disabled = true;
});

// Listen for status changes (like idle/active) from the main process
window.electronAPI.onUserStatusChange((status) => {
    console.log(`DEBUG: Received status update from main process: ${status}`);
    statusDiv.textContent = status;

    // Automatically disable the "Start" button when the user is idle
    if (status === 'Idle') {
        startBtn.disabled = true;
    } else if (status === 'Active' && stopBtn.disabled) { 
        // Re-enable the "Start" button only if tracking is actually stopped
        startBtn.disabled = false;
    }
});