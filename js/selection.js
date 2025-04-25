// js/selection.js
function startSelection(elementType) {
    setStatusMessage(`Initializing selection for ${elementType}...`);
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs.length === 0 || !tabs[0].id) {
            setStatusMessage("Error: Could not find active tab.", true);
            return;
        }
        const tabId = tabs[0].id;

        chrome.scripting.executeScript({
            target: { tabId: tabId },
            files: ['content.js']
        }).then(() => {
             chrome.tabs.sendMessage(tabId, { type: 'startSelection', elementType: elementType }, (response) => {
                if (chrome.runtime.lastError) {
                    setStatusMessage(`Error starting selection: ${chrome.runtime.lastError.message}. Try reloading page.`, true);
                    console.error("Start selection error:", chrome.runtime.lastError);
                } else if (response && response.status === 'selection active') {
                    setStatusMessage(`Selection active for ${elementType}. Click element or press ESC.`);
                    window.close();
                } else {
                    setStatusMessage("Failed to start selection mode.", true);
                }
            });
         }).catch(err => {
             setStatusMessage(`Error injecting script: ${err.message}. Try reloading page.`, true);
             console.error("Inject script error:", err);
        });
    });
}