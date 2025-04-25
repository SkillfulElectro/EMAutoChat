// js/key_combination.js
function handleKeyCombinationFocus() {
    const { keyCombinationInput } = window.elements;
    keyCombinationInput.value = '';
    keyCombinationInput.placeholder = "Press desired key combination...";
}

function handleKeyCombinationBlur() {
    const { keyCombinationInput } = window.elements;
    if (!keyCombinationInput.value && window.appState.currentKeyCombination) {
         keyCombinationInput.value = window.appState.currentKeyCombination;
    }
    keyCombinationInput.placeholder = "Click here, then press keys...";
}

function handleKeyCombinationKeyDown(event) {
    event.preventDefault();
    const { keyCombinationInput, sendActionInfo } = window.elements;

    const key = event.key;
    if (['Control', 'Shift', 'Alt', 'Meta'].includes(key)) return;

    let combinationString = '';
    if (event.ctrlKey) combinationString += 'Ctrl+';
    if (event.altKey) combinationString += 'Alt+';
    if (event.shiftKey) combinationString += 'Shift+';
    if (event.metaKey) combinationString += 'Meta+';

    if (key === ' ') {
        combinationString += 'Space';
    } else {
         combinationString += (key.length === 1 && key.match(/[a-z]/i)) ? key.toUpperCase() : key;
    }

    keyCombinationInput.value = combinationString;
    window.appState.currentKeyCombination = combinationString;

    chrome.storage.local.set({ keyCombinationString: combinationString }, () => {
         if (chrome.runtime.lastError) {
             console.error("Error saving key combination:", chrome.runtime.lastError);
             setStatusMessage('Error saving key combo.', true);
         } else {
             sendActionInfo.textContent = `Mode: Key Combination. Keys: ${combinationString}`;
             sendActionInfo.title = `Key combination: ${combinationString}`;
             setStatusMessage('Key combination captured.');
         }
    });
}