const { app, BrowserWindow, ipcMain, net, powerMonitor } = require('electron');
const path = require('path');
const activeWin = require('active-win');

// --- SETTINGS ---
const DEBUG = true;

// --- GLOBAL VARIABLES ---
let loginWindow;
let appWindow;
let idleWindow;
let trackingInterval = null;
let idleInterval = null;
let loggedInUser = null;
let isIdle = false;

let appSettings = {
    trackingInterval: 15000,
    idleTimeout: 300000
};

/**
 * Stops all running timers to prevent errors when the app closes.
 */
function cleanup() {
    if (trackingInterval) clearInterval(trackingInterval);
    if (idleInterval) clearInterval(idleInterval);
    trackingInterval = null;
    idleInterval = null;
    if (DEBUG) console.log('All timers cleaned up.');
}

/**
 * Creates the initial login window.
 */
function createLoginWindow() {
    loginWindow = new BrowserWindow({
        width: 500,
        height: 600,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js')
        }
    });
    loginWindow.loadFile('index.html');
}

/**
 * Creates the main application window after login.
 */
function createAppWindow() {
    appWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js')
        }
    });
    appWindow.loadFile('app.html');
}

/**
 * Creates the transparent idle overlay window.
 */
function createIdleWindow() {
    idleWindow = new BrowserWindow({
        fullscreen: true,
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        skipTaskbar: true,
        focusable: false,
    });
    idleWindow.loadFile('idle.html');
    idleWindow.hide();
}


/**
 * Watches for user idle/active state.
 * @param {object} user - The currently logged-in user object.
 */
function startIdleWatcher(user) {
    if (!user) {
        if (DEBUG) console.error('CRITICAL: startIdleWatcher was called without a user object.');
        return;
    }

    createIdleWindow();
    const idleThresholdSeconds = appSettings.idleTimeout / 1000;

    idleInterval = setInterval(() => {
        const idleTime = powerMonitor.getSystemIdleTime();
        if (idleTime >= idleThresholdSeconds && !isIdle) {
            isIdle = true;
            if (DEBUG) console.log(`User is now idle.`);
            stopTracking();
            if (appWindow) appWindow.webContents.send('user-status-change', 'Idle');
            if (idleWindow) idleWindow.show();
            
            if (DEBUG) console.log('DEBUG: Sending idle log for user ID:', user.id);
            const postData = new URLSearchParams({
                user_id: user.id,
                application_name: 'System',
                window_title: 'User Idle',
                is_idle: 1
            });
            const request = net.request({
                method: 'POST',
                url: 'http://localhost/FocusFlow/public/api/track.php',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            });
            request.on('response', (response) => {
                let body = '';
                response.on('data', (chunk) => { body += chunk; });
                response.on('end', () => {
                    if (DEBUG) console.log('DEBUG: Idle log API Response:', body);
                });
            });
            request.write(postData.toString());
            request.end();

        } else if (idleTime < idleThresholdSeconds && isIdle) {
            isIdle = false;
            if (DEBUG) console.log('User is active again.');
            if (appWindow) appWindow.webContents.send('user-status-change', 'Active');
            if (idleWindow) idleWindow.hide();
            startTracking();
        }
    }, 5000);
}

/**
 * App lifecycle events.
 */
app.whenReady().then(createLoginWindow);

app.on('window-all-closed', () => {
    cleanup(); // Stop all timers before quitting
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

/**
 * Handles login attempt from the UI.
 */
ipcMain.on('login-attempt', (event, { username, password }) => {
    const postData = new URLSearchParams({ username, password });
    const request = net.request({
        method: 'POST',
        url: 'http://localhost/FocusFlow/public/login.php',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    request.on('response', (response) => {
        let body = '';
        response.on('data', (chunk) => { body += chunk; });
        response.on('end', () => {
            const apiResponse = JSON.parse(body);
            if (apiResponse.status === 'success') {
                loggedInUser = { id: apiResponse.user_id, username: apiResponse.username };
                if (DEBUG) console.log('Login successful, user stored:', loggedInUser);
                
                const settingsRequest = net.request('http://localhost/FocusFlow/public/api/get_settings.php');
                settingsRequest.on('response', (res) => {
                    let settingsBody = '';
                    res.on('data', (chunk) => { settingsBody += chunk; });
                    res.on('end', () => {
                        const serverSettings = JSON.parse(settingsBody);
                        
                        if (apiResponse.tracking_interval) {
                            appSettings.trackingInterval = parseInt(apiResponse.tracking_interval, 10) * 1000;
                        } else {
                            appSettings.trackingInterval = parseInt(serverSettings.tracking_interval_seconds, 10) * 1000;
                        }

                        if (apiResponse.idle_timeout) {
                            appSettings.idleTimeout = parseInt(apiResponse.idle_timeout, 10) * 1000;
                        } else {
                            appSettings.idleTimeout = parseInt(serverSettings.idle_timeout_seconds, 10) * 1000;
                        }
                        
                        if (DEBUG) console.log('Final settings for this session:', appSettings);
                        
                        createAppWindow();
                        loginWindow.close();
                        
                        startIdleWatcher(loggedInUser);
                    });
                });
                settingsRequest.end();
            }
            event.sender.send('login-response', apiResponse);
        });
    });
    request.write(postData.toString());
    request.end();
});

/**
 * Starts the activity tracking loop.
 */
const startTracking = () => {
    if (trackingInterval || isIdle) {
        if (DEBUG) console.log('DEBUG: Tracking start command ignored. Reason:', { isRunning: !!trackingInterval, isIdle });
        return;
    }
    
    if (DEBUG) console.log(`DEBUG: Tracking started. Interval: ${appSettings.trackingInterval / 1000} seconds.`);
    trackingInterval = setInterval(async () => {
        if (DEBUG) console.log('DEBUG: Tracking interval fired.');
        try {
            if (isIdle || !loggedInUser) {
                if (DEBUG) console.log('DEBUG: Skipping tracking due to idle state or no user.');
                return;
            }
            const win = await activeWin();
            if (DEBUG) console.log('DEBUG: activeWin result:', win ? win.owner.name : 'No active window');
            if (win) {
                const postData = new URLSearchParams({
                    user_id: loggedInUser.id,
                    application_name: win.owner.name,
                    window_title: win.title,
                    is_idle: 0
                });
                if (DEBUG) console.log('DEBUG: Preparing to send data:', postData.toString());
                const request = net.request({
                    method: 'POST',
                    url: 'http://localhost/FocusFlow/public/api/track.php',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
                });
                request.on('response', (response) => {
                    let body = '';
                    response.on('data', (chunk) => { body += chunk; });
                    response.on('end', () => {
                        if (DEBUG) console.log('DEBUG: API Response:', body);
                    });
                });
                request.on('error', (error) => {
                    console.error('DEBUG: API Request Error:', error.message);
                });
                request.write(postData.toString());
                request.end();
            }
        } catch (error) {
            console.error('DEBUG: Critical error in tracking loop:', error);
        }
    }, appSettings.trackingInterval);
};

/**
 * Stops the activity tracking loop.
 */
const stopTracking = () => {
    if (trackingInterval) {
        clearInterval(trackingInterval);
        trackingInterval = null;
        if (DEBUG) console.log('Tracking stopped.');
    }
};

// Listen for commands from the UI
ipcMain.on('start-tracking', startTracking);
ipcMain.on('stop-tracking', stopTracking);
ipcMain.handle('get-user', () => loggedInUser);