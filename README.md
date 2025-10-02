# FocusFlow - Desktop Agent

The FocusFlow Desktop Agent is a cross-platform application built with Electron that runs in the background on an employee's computer. It securely logs in, fetches configuration settings, and automatically tracks application usage, sending the data to the FocusFlow web server.



---

## ✨ Features

- **Secure Login**: Authenticates against the web application's backend.
- **Dynamic Configuration**:
    - Fetches global tracking interval and idle timeout settings from the server upon login.
    - Uses user-specific settings if they have been configured by a manager.
- **Automatic Activity Tracking**:
    - Periodically detects the active application and window title.
    - Sends the data to the web API at the configured interval.
- **Idle Detection**:
    - Uses the computer's system idle time to detect when the user is inactive.
    - Pauses tracking during idle periods to avoid unnecessary data logging.
    - Sends a special "idle event" to the server for accurate reporting.
- **Visual Feedback**:
    - Displays a large, transparent "IDLE" message overlay on the screen when the user is idle.
    - Shows the current tracking status ("Active" or "Idle") in the main app window.

---

## 🛠️ Technology Stack

- **Framework**: Electron.js
- **Core**: Node.js
- **Key Packages**:
    - `active-win`: To get the active window information.
    - `electron-power-monitor`: For reliable system idle time detection.

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (which includes npm) installed.
- The FocusFlow Web Application must be running on a local server (e.g., XAMPP).

### Installation & Setup

1.  **Clone the Repository**:
    ```bash
    git clone https://github.com/adityaa2506/focusflow-agent/
    ```

2.  **Install Dependencies**: Navigate to the `focusflow-agent` directory in your terminal and run:
    ```bash
    npm install
    ```

3.  **Configure API Endpoints**:
    - Open `main.js` in a code editor.
    - Verify that the URLs for the API endpoints are correct for your local server setup (e.g., `http://localhost/FocusFlow/public/...`). You will find these inside the `ipcMain.on('login-attempt', ...)` and `startTracking` functions.

4.  **Run the Application**:
    ```bash
    npm start
    ```

This will launch the desktop agent, presenting you with the login screen.
