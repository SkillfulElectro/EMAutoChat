// js/extraction.js
function startExtraction() {
    if (!window.appState.currentOutputAreaSelector) {
       setStatusMessage('Please select an output area first.', true);
       return;
   }
   const currentIntervalValue = parseInt(window.elements.intervalInput.value, 10);
   if (isNaN(currentIntervalValue) || currentIntervalValue < 1) {
       setStatusMessage('Invalid interval value.', true);
       return;
   }
   const intervalMs = currentIntervalValue * 1000;
   window.elements.extractedOutputArea.value = 'Starting...';
   window.appState.currentIntervalValue = currentIntervalValue;

   chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs.length === 0 || !tabs[0].id) {
           setStatusMessage("Error: Could not find active tab for extraction.", true);
           window.elements.extractedOutputArea.value = 'Error: Tab not found.';
           return;
       }
       const tabId = tabs[0].id;
        chrome.scripting.executeScript({
           target: { tabId: tabId },
           files: ['content.js']
       }).then(() => {
           chrome.tabs.sendMessage(tabId, {
               type: 'startExtraction',
               selector: window.appState.currentOutputAreaSelector,
               interval: intervalMs
           }, (response) => {
                if (chrome.runtime.lastError) {
                    setStatusMessage(`Error starting extraction: ${chrome.runtime.lastError.message}`, true);
                    window.elements.extractedOutputArea.value = 'Error starting extraction.';
                    console.error("Start extraction error:", chrome.runtime.lastError);
                } else if (response && response.status === 'started') {
                    window.appState.isExtracting = true;
                    chrome.storage.local.set({ isExtracting: true, intervalValue: window.appState.currentIntervalValue });
                    updateUI();
                    setStatusMessage('Extraction started.');
                    window.elements.extractedOutputArea.value = 'Waiting for first extraction...';
                } else {
                    setStatusMessage('Failed to start extraction.', true);
                    window.elements.extractedOutputArea.value = 'Failed to start extraction.';
                }
           });
        }).catch(err => {
            setStatusMessage(`Error injecting script for extraction: ${err.message}`, true);
            window.elements.extractedOutputArea.value = 'Error injecting script.';
            console.error("Inject script error for extraction:", err);
        });
    });
}

function stopExtraction() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs.length === 0 || !tabs[0].id) {
           console.error("Could not find active tab to stop extraction.");
           window.appState.isExtracting = false;
           chrome.storage.local.set({ isExtracting: false });
           updateUI();
           setStatusMessage('Extraction stopped (tab not found).');
           return;
       }
       const tabId = tabs[0].id;
        chrome.tabs.sendMessage(tabId, { type: 'stopExtraction' }, (response) => {
             if (chrome.runtime.lastError) {
                console.warn("Error sending stop message:", chrome.runtime.lastError.message);
            }
            window.appState.isExtracting = false;
            chrome.storage.local.set({ isExtracting: false });
            updateUI();
            setStatusMessage('Extraction stopped.');
        });
    });
}