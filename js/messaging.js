// js/messaging.js
function handleSendMessage() {
    const { messageInput } = window.elements;
    const message = messageInput.value;
     if (!message) {
        setStatusMessage('Please enter a message to send.', true);
        return;
    }
    sendMessageToChat(message);
}

function sendMessageToChat(message) {
     if (!message) {
         console.warn("sendMessageToChat called with empty message.");
         return;
     }
     chrome.storage.local.get(['textboxSelector', 'sendActionType', 'sendButtonSelector', 'keyCombinationString'], (config) => {
        const textboxSelector = config.textboxSelector;
        const sendActionType = config.sendActionType || 'button';
        const sendButtonSelector = config.sendButtonSelector;
        const keyCombination = config.keyCombinationString;

        if (!textboxSelector) {
            console.error("Cannot send message to chat: Textbox selector not set.");
            return;
        }
        if (sendActionType === 'button' && !sendButtonSelector) {
            console.error("Cannot send message to chat: Button mode selected, but no button selector set.");
            return;
        }
         if (sendActionType === 'keyCombination' && !keyCombination) {
            console.error("Cannot send message to chat: Key Combination mode selected, but no keys are set.");
            return;
        }

        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
             if (tabs.length === 0 || !tabs[0].id) {
                console.error("Cannot send message to chat: Could not find active tab.");
                return;
            }
            const tabId = tabs[0].id;
             chrome.scripting.executeScript({
                target: { tabId: tabId },
                files: ['content.js']
            }).then(() => {
                chrome.tabs.sendMessage(tabId, {
                    type: 'sendMessage',
                    textboxSelector: textboxSelector,
                    message: message,
                    actionType: sendActionType,
                    buttonSelector: sendButtonSelector,
                    keyCombination: keyCombination
                }, (response) => {
                     if (chrome.runtime.lastError) {
                        console.error("Error sending message to content script:", chrome.runtime.lastError);
                    } else if (response && response.error) {
                        console.error("Content script error sending message:", response.error);
                    } else if (response && response.status === 'success') {
                        console.log("Message successfully sent to chat via content script.");
                    } else {
                         console.warn("Unknown response or failure sending message to content script.");
                    }
                });
            }).catch(err => {
                 console.error("Error injecting content script before sending message to chat:", err);
            });
        });
     });
}