// content.js
let selectingElement = false;
let selectionType = null;
let originalOutline = null;
let lastHoveredElement = null;
let extractionIntervalId = null;

function getCssSelector(el) {
    if (!(el instanceof Element)) return;
    const path = [];
    while (el.nodeType === Node.ELEMENT_NODE) {
        let selector = el.nodeName.toLowerCase();
        if (el.id) {
            selector += '#' + CSS.escape(el.id);
            path.unshift(selector);
            break;
        } else {
            let sib = el, nth = 1;
            while (sib = sib.previousElementSibling) {
                if (sib.nodeName.toLowerCase() == selector) nth++;
            }
            if (nth != 1) selector += `:nth-of-type(${nth})`;
        }
        path.unshift(selector);
        el = el.parentNode;
    }
    return path.join(' > ');
}

function startElementSelection(type, sendResponse) {
    if (selectingElement) {
        stopElementSelection();
    }
    selectingElement = true;
    selectionType = type;
    document.addEventListener('mouseover', handleMouseOver);
    document.addEventListener('mouseout', handleMouseOut);
    document.addEventListener('click', handleClick, true);
    document.addEventListener('keydown', handleEscapeKey, true);
    alert(`Element selection active for ${type}. Click the desired element or press ESC to cancel.`);
    sendResponse({ status: 'selection active' });
}

function stopElementSelection() {
    selectingElement = false;
    if (lastHoveredElement) {
         lastHoveredElement.style.outline = originalOutline || '';
    }
    lastHoveredElement = null;
    originalOutline = null;
    document.removeEventListener('mouseover', handleMouseOver);
    document.removeEventListener('mouseout', handleMouseOut);
    document.removeEventListener('click', handleClick, true);
    document.removeEventListener('keydown', handleEscapeKey, true);
}

function handleEscapeKey(event) {
    if (selectingElement && event.key === "Escape") {
        const cancelledType = selectionType;
        stopElementSelection();
        alert('Selection cancelled.');
         chrome.runtime.sendMessage({ type: 'selectionCancelled', elementType: cancelledType });
    }
}

function handleMouseOver(event) {
    if (!selectingElement) return;
    if (event.target === document.body || (lastHoveredElement && lastHoveredElement === event.target)) {
        return;
    }
    if (lastHoveredElement) {
        lastHoveredElement.style.outline = originalOutline || '';
    }
    lastHoveredElement = event.target;
    originalOutline = lastHoveredElement.style.outline;
    lastHoveredElement.style.outline = '2px solid red';
}

function handleMouseOut(event) {
     if (!selectingElement) return;
     if (lastHoveredElement && event.target === lastHoveredElement) {
         lastHoveredElement.style.outline = originalOutline || '';
         lastHoveredElement = null;
         originalOutline = null;
     }
}

function handleClick(event) {
    if (!selectingElement) return;
    event.preventDefault();
    event.stopPropagation();

    const selectedElement = event.target;
    const selector = getCssSelector(selectedElement);
    const currentSelectionType = selectionType;

    stopElementSelection();

    if (selector) {
        let storageKey = '';
        if (currentSelectionType === 'textbox') storageKey = 'textboxSelector';
        else if (currentSelectionType === 'sendButton') storageKey = 'sendButtonSelector';
        else if (currentSelectionType === 'outputArea') storageKey = 'outputAreaSelector';

        if (storageKey) {
             chrome.storage.local.set({ [storageKey]: selector }, () => {
                if (chrome.runtime.lastError) {
                     console.error("Error saving selector to storage:", chrome.runtime.lastError);
                     alert(`Error saving ${currentSelectionType} selector.`);
                } else {
                     console.log(`${currentSelectionType} selector saved: ${selector}`);
                     let readableType = currentSelectionType.replace(/([A-Z])/g, ' $1');
                     readableType = readableType.charAt(0).toUpperCase() + readableType.slice(1);
                     alert(`${readableType} selected successfully!`);
                     chrome.runtime.sendMessage({ type: 'selectionComplete', elementType: currentSelectionType });
                }
            });
        } else {
             alert(`Unknown element type: ${currentSelectionType}`);
             chrome.runtime.sendMessage({ type: 'selectionError', elementType: currentSelectionType, error: 'Unknown element type.' });
        }
    } else {
         let readableType = currentSelectionType.replace(/([A-Z])/g, ' $1');
         readableType = readableType.charAt(0).toUpperCase() + readableType.slice(1);
         alert(`Could not generate selector for the clicked ${readableType}. Please try again.`);
         chrome.runtime.sendMessage({ type: 'selectionError', elementType: currentSelectionType, error: 'Could not generate selector.' });
    }
}

function simulateKeyCombination(targetElement, combinationString) {
    const parts = combinationString.toUpperCase().split('+').map(part => part.trim());
    const modifiers = { ctrlKey: false, altKey: false, shiftKey: false, metaKey: false };
    let mainKey = null;
    let mainCode = null;

    for (const part of parts) {
        if (part === 'CTRL') modifiers.ctrlKey = true;
        else if (part === 'ALT') modifiers.altKey = true;
        else if (part === 'SHIFT') modifiers.shiftKey = true;
        else if (part === 'META' || part === 'CMD' || part === 'WINDOWS') modifiers.metaKey = true;
        else {
             mainKey = part;
        }
    }

    if (!mainKey) {
        throw new Error("No main key specified in combination: " + combinationString);
    }

    const upperMainKey = mainKey.toUpperCase();
    if (upperMainKey.length === 1 && upperMainKey >= 'A' && upperMainKey <= 'Z'){
         mainCode = `Key${upperMainKey}`;
    } else if (upperMainKey === 'ENTER') {
        mainKey = 'Enter';
        mainCode = 'Enter';
    } else if (upperMainKey === 'TAB') {
        mainKey = 'Tab';
        mainCode = 'Tab';
    } else if (upperMainKey === 'ESC' || upperMainKey === 'ESCAPE') {
        mainKey = 'Escape';
        mainCode = 'Escape';
    } else if (upperMainKey === 'SPACE') {
         mainKey = ' ';
         mainCode = 'Space';
    } else if (upperMainKey.length === 1 && upperMainKey >= '0' && upperMainKey <= '9') {
        mainCode = `Digit${upperMainKey}`;
    }
    else {
         mainCode = mainKey;
    }


    const commonProps = {
        bubbles: true,
        cancelable: true,
        ctrlKey: modifiers.ctrlKey,
        altKey: modifiers.altKey,
        shiftKey: modifiers.shiftKey,
        metaKey: modifiers.metaKey,
    };

    try {
        const keyDownEvent = new KeyboardEvent('keydown', { ...commonProps, key: mainKey, code: mainCode });
        targetElement.dispatchEvent(keyDownEvent);

        const keyPressEvent = new KeyboardEvent('keypress', { ...commonProps, key: mainKey, code: mainCode });
        targetElement.dispatchEvent(keyPressEvent);

        const keyUpEvent = new KeyboardEvent('keyup', { ...commonProps, key: mainKey, code: mainCode });
        targetElement.dispatchEvent(keyUpEvent);

        console.log(`Simulated keys: ${combinationString} (key: ${mainKey}, code: ${mainCode}, modifiers: ${JSON.stringify(modifiers)})`);

    } catch (e) {
        console.error(`Error dispatching key events for ${combinationString}:`, e);
        throw e;
    }
}


chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'startSelection') {
        startElementSelection(request.elementType, sendResponse);
        return true;
    } else if (request.type === 'sendMessage' || request.type === 'serverDataReceived') {
        const message = request.message || request.data;
        if (!message) {
            console.warn("Content script received empty message/data.");
            sendResponse({ error: "Empty message received"});
            return false;
        }

        if(request.type === 'serverDataReceived') {
            chrome.storage.local.get(['textboxSelector', 'sendActionType', 'sendButtonSelector', 'keyCombinationString'], (config) => {
                 if (!config.textboxSelector) {
                     console.error("Cannot process server message: Textbox selector not configured.");
                     sendResponse({ error: "Textbox selector not configured." });
                     return;
                 }
                 processMessageAndAction(config.textboxSelector, message, config.sendActionType || 'button', config.sendButtonSelector, config.keyCombinationString, sendResponse);
            });
            return true;
        } else {
             processMessageAndAction(request.textboxSelector, message, request.actionType, request.buttonSelector, request.keyCombination, sendResponse);
            return true;
        }

    } else if (request.type === 'startExtraction') {
         if (extractionIntervalId) {
             clearInterval(extractionIntervalId);
             extractionIntervalId = null;
         }
         const { selector, interval } = request;
         const performExtraction = () => {
             const outputArea = document.querySelector(selector);
             if (outputArea) {
                  const rawText = outputArea.innerText || '';
                  const textArray = rawText.split('\n')
                                          .map(line => line.trim())
                                          .filter(line => line.length > 0);
                  chrome.runtime.sendMessage({ type: 'extractedTextUpdate', data: { messages: textArray } });
             } else {
                  console.warn('Output area element not found for extraction.');
                  clearInterval(extractionIntervalId);
                  extractionIntervalId = null;
                   chrome.runtime.sendMessage({ type: 'extractionStopped', reason: 'Element not found' });
             }
         };
         performExtraction();
         extractionIntervalId = setInterval(performExtraction, interval);
         sendResponse({ status: 'started' });
         return true;
    } else if (request.type === 'stopExtraction') {
        if (extractionIntervalId) {
            clearInterval(extractionIntervalId);
            extractionIntervalId = null;
             sendResponse({ status: 'stopped' });
        } else {
             sendResponse({ status: 'already stopped'});
        }
        return true;
    }
});

function processMessageAndAction(textboxSelector, message, actionType, buttonSelector, keyCombination, sendResponse) {
      try {
            const textbox = document.querySelector(textboxSelector);
            if (!textbox) {
                sendResponse({ error: `Textbox element not found with selector: ${textboxSelector}` });
                return;
            }

            textbox.focus();

            const isContentEditable = textbox.isContentEditable;
            if (isContentEditable) {
                 textbox.textContent = message;
            } else {
                 textbox.value = message;
            }

            const inputEvent = new Event('input', { bubbles: true });
            textbox.dispatchEvent(inputEvent);
            const changeEvent = new Event('change', { bubbles: true });
            textbox.dispatchEvent(changeEvent);

             setTimeout(() => {
                try {
                    if (actionType === 'button') {
                        if (!buttonSelector) throw new Error("Button selector missing for button action type.");
                        const button = document.querySelector(buttonSelector);
                        if (!button) throw new Error(`Button element not found with selector: ${buttonSelector}`);
                        button.click();
                        sendResponse({ status: 'success' });
                    }
                    else if (actionType === 'keyCombination') {
                        if (!keyCombination) throw new Error("Key combination missing for keyCombination action type.");
                        simulateKeyCombination(textbox, keyCombination);
                        sendResponse({ status: 'success' });
                    } else {
                         throw new Error(`Unknown action type: ${actionType}`);
                    }

                } catch (actionError) {
                     console.error("Error during action execution:", actionError);
                     sendResponse({ error: `Action failed: ${actionError.message}` });
                }
             }, 50);

        } catch (error) {
            console.error("Error setting up send message:", error);
            sendResponse({ error: error.message });
        }
}