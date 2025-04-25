// js/popup_init.js
window.elements = {
    selectTextboxBtn: document.getElementById('selectTextboxBtn'),
    textboxInfo: document.getElementById('textboxInfo'),
    modeSelectButton: document.getElementById('modeSelectButton'),
    modeKeyCombination: document.getElementById('modeKeyCombination'),
    selectSendBtn: document.getElementById('selectSendBtn'),
    keyCombinationInput: document.getElementById('keyCombinationInput'),
    sendActionInfo: document.getElementById('sendActionInfo'),
    messageInput: document.getElementById('messageInput'),
    sendMessageBtn: document.getElementById('sendMessageBtn'),
    statusMessage: document.getElementById('statusMessage'),
    intervalInput: document.getElementById('intervalInput'),
    selectOutputAreaBtn: document.getElementById('selectOutputAreaBtn'),
    outputAreaInfo: document.getElementById('outputAreaInfo'),
    toggleExtractionBtn: document.getElementById('toggleExtractionBtn'),
    extractedOutputArea: document.getElementById('extractedOutputArea'),
    serverUrlInput: document.getElementById('serverUrlInput'),
    connectServerBtn: document.getElementById('connectServerBtn'),
    connectionStatus: document.getElementById('connectionStatus')
};

window.appState = {
    currentTextboxSelector: null,
    currentSendActionType: 'button',
    currentSendButtonSelector: null,
    currentKeyCombination: '',
    currentOutputAreaSelector: null,
    currentIntervalValue: 5,
    isExtracting: false,
    serverUrl: '',
    serverProtocol: 'websocket',
    isConnectedToServer: false
};

function initializeEventListeners() {
    const {
        selectTextboxBtn, modeSelectButton, modeKeyCombination,
        selectSendBtn, keyCombinationInput, sendMessageBtn, intervalInput,
        selectOutputAreaBtn, toggleExtractionBtn,
        serverUrlInput, connectServerBtn
    } = window.elements;

    selectTextboxBtn.addEventListener('click', () => startSelection('textbox'));
    selectSendBtn.addEventListener('click', () => startSelection('sendButton'));
    selectOutputAreaBtn.addEventListener('click', () => startSelection('outputArea'));

    modeSelectButton.addEventListener('change', handleSendActionChange);
    modeKeyCombination.addEventListener('change', handleSendActionChange);

    keyCombinationInput.addEventListener('focus', handleKeyCombinationFocus);
    keyCombinationInput.addEventListener('blur', handleKeyCombinationBlur);
    keyCombinationInput.addEventListener('keydown', handleKeyCombinationKeyDown);

    intervalInput.addEventListener('change', handleIntervalChange);

    toggleExtractionBtn.addEventListener('click', () => {
        chrome.storage.local.get(['connectionStatusDetail'], (result) => {
             const currentConnStatus = result.connectionStatusDetail || 'disconnected';
             if (window.appState.isExtracting && currentConnStatus !== 'connected' && currentConnStatus !== 'connecting') {
                 stopExtraction();
             } else if (!window.appState.isExtracting) {
                  startExtraction();
             } else {
                 setStatusMessage("Extraction controlled by server connection.", true);
             }
        });
    });

    sendMessageBtn.addEventListener('click', handleSendMessage);

    serverUrlInput.addEventListener('input', handleUrlChange);
    connectServerBtn.addEventListener('click', handleConnectServerClick);
}

function initializeChromeListeners() {
    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace === 'local') {
        let shouldUpdate = false;
        const relevantKeys = [
            'textboxSelector', 'sendActionType', 'sendButtonSelector', 'keyCombinationString',
            'outputAreaSelector', 'intervalValue', 'isExtracting',
            'serverUrl', 'connectionStatusDetail', 'lastError'
            ];
        for (let key in changes) {
            if (relevantKeys.includes(key)) {
                shouldUpdate = true;
                break;
            }
        }
        if (shouldUpdate) {
            console.log('Storage changed, updating UI.');
             if (document.activeElement !== window.elements.keyCombinationInput || !changes.keyCombinationString) {
                 updateUI();
             }
        }
      }
    });

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.type === 'selectionComplete' || request.type === 'selectionCancelled' || request.type === 'selectionError') {
            updateUI();
            let readableType = request.elementType.replace(/([A-Z])/g, ' $1');
            readableType = readableType.charAt(0).toUpperCase() + readableType.slice(1);
            if(request.type === 'selectionError'){
                 setStatusMessage(`Selection Error: ${request.error || 'Unknown error'}`, true);
            } else if (request.type === 'selectionCancelled'){
                 setStatusMessage(`${readableType} selection Cancelled.`);
            } else {
                 setStatusMessage(`${readableType} selection complete.`);
            }
        } else if (request.type === 'extractedTextUpdate') {
            const formattedJson = JSON.stringify(request.data || { messages: [] }, null, 2);
            window.elements.extractedOutputArea.value = formattedJson;
            setStatusMessage('Output area text updated.');

            chrome.storage.local.get(['connectionStatusDetail'], (result) => {
                 const currentConnStatus = result.connectionStatusDetail || 'disconnected';
                 if (currentConnStatus === 'connected') {
                     chrome.runtime.sendMessage({
                         type: 'sendDataToServer',
                         data: request.data
                     }, (response) => {
                         if(chrome.runtime.lastError) {
                             console.error("Error sending extracted data to background:", chrome.runtime.lastError);
                         } else if (response && response.status === 'sent') {
                              console.log("Extracted data sent to background for server dispatch.");
                         } else if (response && response.error) {
                              console.error("Background error sending data to server:", response.error);
                              setStatusMessage(`Server Send Error: ${response.error}`, true);
                         }
                     });
                 }
            });

        } else if (request.type === 'extractionStopped') {
             window.appState.isExtracting = false;
             chrome.storage.local.set({ isExtracting: false });
             updateUI();
             setStatusMessage(`Extraction stopped: ${request.reason}`);
             window.elements.extractedOutputArea.value = `Extraction stopped: ${request.reason}`;
        } else if (request.type === 'connectionStatusUpdate') {
            console.log("Received connection status update:", request.status, request.message);
            window.appState.isConnectedToServer = (request.status === 'connected');
            updateConnectionStatusUI(request.status, request.message || '');
            if(request.message && request.status !== 'error' && request.status !== 'disconnected') {
                setStatusMessage(request.message, false);
            }
            chrome.storage.local.set({ connectionStatusDetail: request.status, lastError: (request.status === 'error' || request.status === 'disconnected') ? request.message : '' });
        } else if (request.type === 'serverDataReceived') {
            console.log("Received data from server via background:", request.data);
            sendMessageToChat(request.data);
        }
    });
}

function requestInitialStatus() {
    chrome.runtime.sendMessage({ type: 'getInitialStatus' }, (response) => {
        let initialStatus = 'disconnected';
        let initialMessage = '';
        if (chrome.runtime.lastError) {
            console.warn("Could not get initial status from background:", chrome.runtime.lastError.message);
            initialMessage = "Background script unavailable";
        } else if (response && response.status) {
             console.log("Initial status received:", response.status, response.message);
             initialStatus = response.status;
             initialMessage = response.message || '';
        } else {
            console.warn("Invalid initial status response from background.");
             initialMessage = "Unknown status";
        }
         window.appState.isConnectedToServer = (initialStatus === 'connected');
         chrome.storage.local.set({ connectionStatusDetail: initialStatus, lastError: initialMessage }, () => {
            updateUI();
         });
    });
}

document.addEventListener('DOMContentLoaded', () => {
    initializeEventListeners();
    initializeChromeListeners();
    requestInitialStatus();
});