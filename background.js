// background.js
let websocket = null;
let websocketUrl = '';
let connectionStatus = 'disconnected';
let lastError = '';
let serverUrl = '';

function updatePopupStatus(status, message = '') {
    connectionStatus = status;
    lastError = (status === 'error' || status === 'disconnected') ? message : '';
    console.log(`Background status update: ${status} - ${message}`);
    chrome.storage.local.set({ connectionStatusDetail: status, lastError: lastError });
    chrome.runtime.sendMessage({ type: 'connectionStatusUpdate', status: status, message: message }).catch(err => {
         if (err.message.includes("Could not establish connection") || err.message.includes("Receiving end does not exist")) {
         } else {
            console.error("Error sending status update to popup:", err);
         }
    });
}

function connectWebSocket(url) {
    if (websocket && websocket.readyState !== WebSocket.CLOSED) {
        console.warn("WebSocket already open or connecting.");
        return;
    }
    websocketUrl = url;
    updatePopupStatus('connecting', `Attempting WebSocket connection to ${url}`);
    try {
        if (!url || (!url.startsWith('ws://') && !url.startsWith('wss://'))) {
            throw new Error("Invalid WebSocket URL format. Must start with ws:// or wss://");
        }
        websocket = new WebSocket(url);

        websocket.onopen = () => {
            console.log("WebSocket Connected to", url);
            updatePopupStatus('connected', `WebSocket connected to ${url}`);
        };

        websocket.onmessage = (event) => {
            console.log("WebSocket Message Received:", event.data);
             chrome.runtime.sendMessage({ type: 'serverDataReceived', data: event.data }).catch(err => {
                  if (!err.message.includes("Receiving end does not exist")) {
                     console.error("Error sending WS data to popup:", err);
                  }
                   chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                     if (tabs.length > 0 && tabs[0].id) {
                       chrome.tabs.sendMessage(tabs[0].id, { type: 'serverDataReceived', data: event.data })
                         .catch(contentErr => console.error("Error sending WS data directly to content script:", contentErr));
                     }
                   });
             });
        };

        websocket.onerror = (event) => {
            console.error("WebSocket Error Event:", event);
            const errorMessage = "WebSocket connection error occurred.";
            updatePopupStatus('error', errorMessage);
             if (websocket) { try { websocket.close(); } catch(e){} }
             websocket = null;
        };

        websocket.onclose = (event) => {
            console.log("WebSocket Disconnected:", event.code, event.reason, `Was Clean: ${event.wasClean}`);
            const wasConnecting = (connectionStatus === 'connecting');
            websocket = null;
            let closeReason = event.reason || `Code: ${event.code}`;
            let finalStatus = 'disconnected';

            if (!event.wasClean && connectionStatus !== 'error') {
                 finalStatus = 'error';
                 closeReason = `Connection closed unexpectedly. ${closeReason}`;
            } else if (wasConnecting) {
                 finalStatus = 'error';
                 closeReason = `Connection failed. ${closeReason}`;
            } else if (event.code === 1000 || event.code === 1001 || event.code === 1005) {
                 finalStatus = 'disconnected';
                 closeReason = event.reason || `Disconnected normally. Code: ${event.code}`;
             } else if (connectionStatus !== 'error') {
                 finalStatus = 'error';
                 closeReason = `Connection closed with error. ${closeReason}`;
             } else {
                 closeReason = lastError || `Connection closed after error. ${closeReason}`;
             }

            updatePopupStatus(finalStatus, closeReason);
        };
    } catch (e) {
        console.error("Error initiating WebSocket connection:", e);
        updatePopupStatus('error', `Failed to initiate connection: ${e.message}`);
        websocket = null;
    }
}

function disconnectWebSocket() {
    if (websocket) {
        websocket.onclose = null;
        websocket.onerror = null;
        try {
             websocket.close(1000, "User requested disconnect");
        } catch (e) { console.warn("Error closing websocket:", e)}
        websocket = null;
        console.log("WebSocket disconnect requested.");
        updatePopupStatus('disconnected', "Disconnected by user.");
    } else {
        updatePopupStatus('disconnected');
    }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'connectServer') {
        serverUrl = request.url;
        lastError = '';
        chrome.storage.local.set({ serverUrl: serverUrl, serverProtocol: 'websocket' });

        let urlError = null;
        try {
            new URL(serverUrl);
            if (!serverUrl.startsWith('ws://') && !serverUrl.startsWith('wss://')) {
                 urlError = "WebSocket URL must start with ws:// or wss://";
            }
        } catch(e) {
            urlError = `Invalid URL format: ${e.message}`;
        }

        if(urlError) {
            updatePopupStatus('error', urlError);
            sendResponse({ error: urlError });
            return false;
        }

        connectWebSocket(serverUrl);
        sendResponse({ status: 'connecting' });
        return true;

    } else if (request.type === 'disconnectServer') {
        lastError = '';
        disconnectWebSocket();
        sendResponse({ status: 'disconnecting' });
        return false;

    } else if (request.type === 'sendDataToServer') {
         if (websocket && websocket.readyState === WebSocket.OPEN) {
             try {
                 websocket.send(JSON.stringify(request.data));
                 sendResponse({ status: 'sent' });
             } catch(e) {
                  const errorMsg = `WebSocket send error: ${e.message}`;
                  console.error("Error sending data via WebSocket:", e);
                  sendResponse({ error: errorMsg });
                  updatePopupStatus('error', errorMsg);
                  disconnectWebSocket();
             }
         } else {
              const errorMsg = (websocket && websocket.readyState === WebSocket.CONNECTING) ? 'WebSocket is still connecting' : 'WebSocket not connected';
              console.warn(errorMsg + ", cannot send data.");
              sendResponse({ error: errorMsg });
         }
         return false;

    } else if (request.type === 'getInitialStatus') {
        sendResponse({ status: connectionStatus, message: lastError });
        return false;
    }
});

chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension Installed/Updated');
  chrome.storage.local.remove(['connectionStatusDetail', 'serverUrl', 'serverProtocol', 'lastError']);
   connectionStatus = 'disconnected';
   lastError = '';
   if(websocket) { try {websocket.close();} catch(e){} websocket = null; }
});

chrome.runtime.onStartup.addListener(() => {
  console.log('Browser Started');
   chrome.storage.local.remove(['connectionStatusDetail', 'lastError']);
   connectionStatus = 'disconnected';
   lastError = '';
   if (websocket) { try {websocket.close();} catch(e){} websocket = null; }
});

console.log("Background script loaded.");