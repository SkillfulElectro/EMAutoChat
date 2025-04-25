// js/connection.js
function handleUrlChange(event) {
    window.appState.serverUrl = event.target.value.trim();
    chrome.storage.local.set({ serverUrl: window.appState.serverUrl });
}

function handleConnectServerClick() {
    const { serverUrl, currentOutputAreaSelector, isConnectedToServer } = window.appState;

    setStatusMessage('');

    if (isConnectedToServer) {
        chrome.runtime.sendMessage({
            type: 'disconnectServer'
        }, (response) => {
            if(chrome.runtime.lastError) {
                 console.error("Error sending disconnect message:", chrome.runtime.lastError);
                 setStatusMessage(`Disconnect Error: ${chrome.runtime.lastError.message}`, true);
            } else if (response && response.status === 'disconnecting') {
                setStatusMessage("Disconnecting...");
            } else {
                 setStatusMessage("Failed to request disconnect.", true);
            }
        });
    } else {
        if (!currentOutputAreaSelector) {
            setStatusMessage('Please select an Output Area first.', true);
            return;
        }
        if (!serverUrl) {
            setStatusMessage('Please enter a Server URL.', true);
            return;
        }

        if (!serverUrl.startsWith('ws://') && !serverUrl.startsWith('wss://')) {
             setStatusMessage(`URL must start with ws:// or wss://`, true);
             return;
         }
         try {
             new URL(serverUrl);
         } catch (e) {
             setStatusMessage('Invalid Server URL format.', true);
             return;
         }

        setStatusMessage("Connecting...");
        updateConnectionStatusUI('connecting');

        chrome.runtime.sendMessage({
            type: 'connectServer',
            url: serverUrl,
            protocol: 'websocket'
        }, (response) => {
             if (chrome.runtime.lastError) {
                const errorMsg = `Extension Comms Error: ${chrome.runtime.lastError.message}`;
                console.error("Error sending connect message:", chrome.runtime.lastError);
                setStatusMessage(errorMsg, true);
                updateConnectionStatusUI('error', errorMsg);
             } else if(response && response.status === 'connecting') {
                console.log("Background script is attempting WebSocket connection...");
             } else if (response && response.error) {
                 setStatusMessage(`Connection failed: ${response.error}`, true);
                 updateConnectionStatusUI('error', response.error);
             } else {
                setStatusMessage("Failed to request connection (unexpected response).", true);
                updateConnectionStatusUI('error', "Unknown connection error");
             }
        });

        if (!window.appState.isExtracting && currentOutputAreaSelector) {
            startExtraction();
        }
    }
}

function updateConnectionStatusUI(status, detailMessage = '') {
    const { connectionStatus, connectServerBtn } = window.elements;
    connectionStatus.classList.remove('status-connected', 'status-connecting', 'status-error', 'status-disconnected');
    connectServerBtn.classList.remove('connected');
    connectServerBtn.style.backgroundColor = '';
    connectServerBtn.style.borderColor = '';
    connectServerBtn.style.color = '';

    switch(status) {
        case 'connected':
            connectionStatus.textContent = `Status: Connected`;
            connectionStatus.classList.add('status-connected');
            connectServerBtn.textContent = 'Disconnect';
            connectServerBtn.style.backgroundColor = 'var(--danger-color)';
            connectServerBtn.style.borderColor = 'var(--danger-color)';
            connectServerBtn.style.color = 'white';
            connectServerBtn.classList.add('connected');
            connectServerBtn.disabled = false;
            window.appState.isConnectedToServer = true;
            break;
        case 'connecting':
            connectionStatus.textContent = 'Status: Connecting...';
            connectionStatus.classList.add('status-connecting');
            connectServerBtn.textContent = 'Connecting...';
            connectServerBtn.disabled = true;
            window.appState.isConnectedToServer = false;
            break;
        case 'error':
            const errorDisplay = detailMessage ? `Error - ${detailMessage}` : 'Error - Connection Failed';
            connectionStatus.textContent = `Status: ${errorDisplay}`;
            connectionStatus.classList.add('status-error');
            connectServerBtn.textContent = 'Connect';
            connectServerBtn.disabled = false;
            window.appState.isConnectedToServer = false;
            break;
        case 'disconnected':
        default:
            const disconnectDisplay = detailMessage ? `Disconnected - ${detailMessage}` : 'Disconnected';
            connectionStatus.textContent = `Status: ${disconnectDisplay}`.trim();
            connectionStatus.classList.add('status-disconnected');
            connectServerBtn.textContent = 'Connect';
            connectServerBtn.disabled = false;
            window.appState.isConnectedToServer = false;
            break;
    }
}