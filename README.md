# EMAutoChat Chrome Extension

## Description

EMAutoChat is a Chrome extension designed to automate interactions with chat interfaces on web pages. It allows users to connect to a WebSocket server, select specific elements on a page (like a chat input box, send button, and output area), and then automatically:

1.  **Send messages:** Receive messages from the WebSocket server and input them into the selected chat textbox, then trigger the send action (either by clicking a button or simulating a key combination).
2.  **Extract text:** Periodically extract text content from a selected output area on the page and send it back to the background script (presumably for processing or forwarding via WebSocket, although the forwarding part isn't explicitly shown in the provided popup logic).

## Features

*   **WebSocket Integration:** Connects to a specified WebSocket server (ws:// or wss://) to receive commands/messages.
*   **Element Selection:** Allows users to visually select the chat input textbox, the send button, and the chat output area on any webpage using CSS selectors.
*   **Flexible Send Actions:** Supports sending messages either by programmatically clicking the selected send button or by simulating a configurable key combination (e.g., Ctrl+Enter).
*   **Text Extraction:** Can periodically scrape text content from the selected output area at a configurable interval.
*   **Manual Sending:** Provides an interface to manually type and send messages through the configured elements.
*   **Status Monitoring:** Displays the current WebSocket connection status and any errors in the popup.
*   **Configuration Persistence:** Saves selected element selectors and connection details using `chrome.storage.local`.


## Setup & Configuration

1.  **Install the Extension:** Load the extension into Chrome (e.g., via "Load unpacked" in `chrome://extensions/`).
2.  **Open the Popup:** Click the EMAutoChat extension icon in your browser toolbar.
3.  **Select Elements:**
    *   Navigate to the web page containing the chat interface you want to automate.
    *   In the popup, click "Select Textbox Element" and then click the chat input field on the page.
    *   Choose the send method (Click Button or Key Combination).
    *   If using "Click Button", click "Select Send Button Element" and then click the send button on the page.
    *   If using "Key Combination", click the input field below the radio button in the popup and press the desired key combination (e.g., Enter, Ctrl+Enter).
    *   Click "Select Output Area" and then click the element on the page where chat messages appear.
4.  **Configure Extraction (Optional):** Set the desired "Extraction Interval" in seconds.
5.  **Connect to WebSocket:** Enter the full WebSocket server URL (e.g., `ws://localhost:8080`) and click "Connect".

## Usage

*   **Automatic Sending:** Once connected to the WebSocket server and elements are selected, the extension will listen for messages from the server. When a message is received, it will be automatically typed into the selected textbox and sent using the configured method.
*   **Text Extraction:** If the output area is selected, click "Start Extraction". The extension will read the text content from the selected area at the specified interval and display it (as a JSON array of lines) in the "Extracted Content" box in the popup and send to websocket server if connected . Click "Stop Extraction" to halt the process .
*   **Manual Sending:** Type a message into the "Message" text area in the popup and click "Send Message" to send it using the configured textbox and send method.