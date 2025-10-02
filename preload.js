const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    // Functions for login
    login: (username, password) => ipcRenderer.send('login-attempt', { username, password }),
    onLoginResponse: (callback) => ipcRenderer.on('login-response', (_event, response) => callback(response)),

    // Functions for tracking control
    startTracking: () => ipcRenderer.send('start-tracking'),
    stopTracking: () => ipcRenderer.send('stop-tracking'),

    // Function to get user data after login
    getUser: () => ipcRenderer.invoke('get-user'),

    // Function to receive idle/active status updates
    onUserStatusChange: (callback) => ipcRenderer.on('user-status-change', (_event, status) => callback(status))
});