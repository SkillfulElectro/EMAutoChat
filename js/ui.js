// js/ui.js
function updateUI() {
    chrome.storage.local.get([
        'textboxSelector', 'sendActionType', 'sendButtonSelector', 'keyCombinationString',
        'outputAreaSelector', 'intervalValue', 'isExtracting',
        'serverUrl', 'connectionStatusDetail', 'lastError'
    ], (result) => {
        window.appState.currentTextboxSelector = result.textboxSelector || null;
        const storedActionType = result.sendActionType;
        window.appState.currentSendActionType = (storedActionType === 'enter' || !storedActionType) ? 'button' : storedActionType;

        window.appState.currentSendButtonSelector = result.sendButtonSelector || null;
        window.appState.currentKeyCombination = result.keyCombinationString || '';
        window.appState.currentOutputAreaSelector = result.outputAreaSelector || null;
        window.appState.currentIntervalValue = result.intervalValue || 5;
        window.appState.isExtracting = result.isExtracting || false;

        window.appState.serverUrl = result.serverUrl || '';
        const connectionStatusDetail = result.connectionStatusDetail || 'disconnected';
        const lastErrorMessage = result.lastError || '';

        const {
            textboxInfo, selectSendBtn, keyCombinationInput, sendActionInfo,
            modeSelectButton, modeKeyCombination,
            outputAreaInfo, intervalInput, toggleExtractionBtn, extractedOutputArea,
            serverUrlInput
        } = window.elements;

        textboxInfo.textContent = window.appState.currentTextboxSelector ? `Selected: ${window.appState.currentTextboxSelector}` : 'Chat input textbox not selected.';
        textboxInfo.title = window.appState.currentTextboxSelector || 'Chat input textbox not selected.';

        selectSendBtn.classList.add('hidden');
        selectSendBtn.disabled = true;
        keyCombinationInput.classList.add('hidden');

        if (window.appState.currentSendActionType === 'button') {
            modeSelectButton.checked = true;
            selectSendBtn.classList.remove('hidden');
            selectSendBtn.disabled = false;
            sendActionInfo.textContent = `Method: Click Button. ${window.appState.currentSendButtonSelector ? `Selected: ${window.appState.currentSendButtonSelector}` : 'No button selected.'}`;
            sendActionInfo.title = window.appState.currentSendButtonSelector || 'No button selected.';
        } else if (window.appState.currentSendActionType === 'keyCombination') {
            modeKeyCombination.checked = true;
            keyCombinationInput.classList.remove('hidden');
            keyCombinationInput.value = window.appState.currentKeyCombination || '';
            keyCombinationInput.placeholder = "Click here, then press keys...";
            sendActionInfo.textContent = `Method: Key Combination. Keys: ${window.appState.currentKeyCombination || 'Not set'}`;
            sendActionInfo.title = `Key combination: ${window.appState.currentKeyCombination || 'Not set'}`;
        } else {
             modeSelectButton.checked = true;
             window.appState.currentSendActionType = 'button';
             chrome.storage.local.set({ sendActionType: 'button'});
             sendActionInfo.textContent = `Method: Click Button. ${window.appState.currentSendButtonSelector ? `Selected: ${window.appState.currentSendButtonSelector}` : 'No button selected.'}`;
             sendActionInfo.title = window.appState.currentSendButtonSelector || 'No button selected.';
        }

        outputAreaInfo.textContent = window.appState.currentOutputAreaSelector ? `Selected: ${window.appState.currentOutputAreaSelector}` : 'Output area not selected.';
        outputAreaInfo.title = window.appState.currentOutputAreaSelector || 'Output area not selected.';
        intervalInput.value = window.appState.currentIntervalValue;

        if (window.appState.isExtracting) {
            toggleExtractionBtn.textContent = 'Stop Extraction';
            toggleExtractionBtn.style.backgroundColor = 'var(--danger-color)';
            toggleExtractionBtn.style.color = 'white';
            toggleExtractionBtn.style.borderColor = 'var(--danger-color)';
        } else {
            toggleExtractionBtn.textContent = 'Start Extraction';
            toggleExtractionBtn.style.backgroundColor = '';
            toggleExtractionBtn.style.color = '';
            toggleExtractionBtn.style.borderColor = '';
             if (!document.activeElement || document.activeElement !== extractedOutputArea) {
                  if(!window.elements.extractedOutputArea.value.startsWith("Extraction stopped:")) {
                     if (connectionStatusDetail !== 'connected' && connectionStatusDetail !== 'connecting') {
                     }
                  }
             }
        }
        toggleExtractionBtn.disabled = !window.appState.currentOutputAreaSelector || connectionStatusDetail === 'connected' || connectionStatusDetail === 'connecting';

        serverUrlInput.value = window.appState.serverUrl;

        updateConnectionStatusUI(connectionStatusDetail, lastErrorMessage);

    });
}

function setStatusMessage(message, isError = false) {
    const { statusMessage } = window.elements;
    statusMessage.textContent = message;
    statusMessage.style.color = isError ? 'var(--danger-color)' : 'var(--text-muted-color)';
}