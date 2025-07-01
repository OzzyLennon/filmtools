// assets/js/utils.js

export const sunIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`;
export const moonIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`;

let audioCtx;
export function playBeep() {
    if (!audioCtx) {
        audioCtx = new(window.AudioContext || window.webkitAudioContext)();
    }
    const osc = audioCtx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, audioCtx.currentTime);
    osc.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.2);
}


export function cleanNumericInput(e) {
    const input = e.target;
    const selectionStart = input.selectionStart;
    const selectionEnd = input.selectionEnd;
    const originalLength = input.value.length;

    const cleanedValue = input.value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');

    if (input.value !== cleanedValue) {
        input.value = cleanedValue;
        const newLength = input.value.length;
        const diff = newLength - originalLength;
        input.setSelectionRange(selectionStart + diff, selectionEnd + diff);
    }
}


export function formatTime(s, translations, units = true) {
    const langData = translations;
    if (isNaN(s) || s === null || s < 0 || !isFinite(s)) {
        return units ? "N/A" : "00:00";
    }
    const t = Math.round(s);
    if (!units) {
        const m = String(Math.floor(t / 60)).padStart(2, '0');
        const sec = String(t % 60).padStart(2, '0');
        return `${m}:${sec}`;
    }
    if (t < 60) {
        return `${t.toFixed(t > 10 ? 0 : 1)} ${langData.timeUnitSec}`;
    }
    const m = Math.floor(t / 60);
    const sec = t % 60;
    return `${m} ${langData.timeUnitMin} ${sec.toFixed(0)} ${langData.timeUnitSec}`;
}

export function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}