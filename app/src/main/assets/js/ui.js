    // assets/js/ui.js
    // import anime from 'https://cdnjs.cloudflare.com/ajax/libs/animejs/3.2.1/anime.es.js'; // <--- 删除这一行
    import { formatTime, playBeep } from './utils.js';

    export function showMessage(area, type, titleKey, content, finalTime, appData, startTimer) {
    area.innerHTML = '';
    const langData = appData.translations[appData.currentLanguage];
    let title = titleKey ? (langData[titleKey]?.title || langData[titleKey]) : '';
    let cardHtml = '';
    const cardId = `card-${Date.now()}`;
    const cardClasses = type === 'error' ? 'error-message p-4 text-center' : 'card p-5 text-center';

    if (type === 'result' && area.id === 'message-area') {
        cardHtml = `<div id="${cardId}" class="${cardClasses}" style="opacity:0"><p class="text-lg result-label">${title}</p><p id="animated-result" class="text-4xl result-text mb-4">0</p><button id="start-timer-btn" type="button" data-time="${finalTime}" class="text-white w-full font-bold rounded-lg text-lg px-5 py-3 text-center mt-4 btn-ripple" style="background-color: var(--success-color);">${langData.btnStartTimer}</button></div>`;
    } else if (type === 'result') {
        cardHtml = `<div id="${cardId}" class="${cardClasses}" style="opacity:0">${content}</div>`;
    } else {
        const messageContent = langData[titleKey]?.content || content || '';
        cardHtml = `<div id="${cardId}" class="${cardClasses}" style="opacity:0"><p class="font-bold">${title}</p><p>${messageContent}</p></div>`;
    }

    area.innerHTML = cardHtml;
    const cardElement = document.getElementById(cardId);
    anime({ targets: cardElement, opacity: [0, 1], translateY: [20, 0], scale: [0.95, 1], duration: 500, easing: 'easeOutCubic' });

    const animatedResultEl = document.getElementById('animated-result');
    if (animatedResultEl && isFinite(finalTime) && finalTime > 0) {
        const animationParams = { value: 0 };
        anime({
            targets: animationParams,
            value: finalTime,
            duration: 1200,
            easing: 'easeOutQuint',
            update: function() {
                animatedResultEl.innerHTML = formatTime(animationParams.value, langData);
            },
            complete: function() {
                animatedResultEl.innerHTML = formatTime(finalTime, langData);
            }
        });
    } else if (animatedResultEl) {
        animatedResultEl.innerHTML = content;
    }

    const startTimerBtn = document.getElementById('start-timer-btn');
    if (startTimerBtn) {
        startTimerBtn.addEventListener('click', e => startTimer(parseFloat(e.target.dataset.time)));
    }
}

export function startTimer(totalSeconds, dom, appData) {
    if (!isFinite(totalSeconds) || totalSeconds < 0) return;
    if (window.Android && typeof window.Android.keepScreenOn === 'function') {
        window.Android.keepScreenOn(true);
    }

    dom.mainContent.classList.add('hidden');
    dom.timer.card.classList.remove('hidden', 'finished');
    document.body.classList.remove('flashing');

    const progressRing = dom.timer.progressRing;
    const radius = progressRing.r.baseVal.value;
    const circumference = 2 * Math.PI * radius;
    progressRing.style.strokeDasharray = `${circumference} ${circumference}`;
    progressRing.style.strokeDashoffset = circumference;

    const setProgress = (percent) => {
        const offset = circumference - percent / 100 * circumference;
        progressRing.style.strokeDashoffset = offset;
    };

    let remaining = Math.round(totalSeconds);
    setProgress(100);
    dom.timer.display.textContent = formatTime(remaining, null, false);

    if (appData.timerInterval) clearInterval(appData.timerInterval);
    if (appData.alarmInterval) clearInterval(appData.alarmInterval);

    appData.timerInterval = setInterval(() => {
        remaining--;
        const percent = (remaining / totalSeconds) * 100;
        setProgress(percent);
        const formattedTime = formatTime(remaining, null, false);
        dom.timer.display.textContent = formattedTime;
        document.title = `(${formattedTime}) ${appData.originalTitle}`;

        if (remaining <= 0) {
            clearInterval(appData.timerInterval);
            const langData = appData.translations[appData.currentLanguage];
            dom.timer.display.textContent = langData.timerComplete;
            document.title = `✅ ${langData.timerComplete}`;
            dom.timer.card.classList.add('finished');
            progressRing.style.strokeDashoffset = 0;
            appData.alarmInterval = setInterval(() => {
                playBeep();
                document.body.classList.toggle('flashing');
            }, 1000);
        }
    }, 1000);
}

export function stopTimer(dom, appData) {
    if (window.Android && typeof window.Android.keepScreenOn === 'function') {
        window.Android.keepScreenOn(false);
    }
    clearInterval(appData.timerInterval);
    clearInterval(appData.alarmInterval);
    appData.timerInterval = null;
    appData.alarmInterval = null;
    document.body.classList.remove('flashing');
    dom.timer.card.classList.add('hidden');
    dom.mainContent.classList.remove('hidden');
    dom.tabs.reciprocity.click();
    document.title = appData.originalTitle;
}


export function createQuickChips(containerId, targetInputId, values, dom, prefix = '', suffix = '') {
    const container = dom.flash[containerId] || document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';
    values.forEach(val => {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'quick-select-chip';
        chip.textContent = `${prefix}${val}${suffix}`;
        chip.dataset.value = val;
        chip.dataset.targetInput = targetInputId;
        container.appendChild(chip);
    });
}

export function syncChipsToInput(inputId, containerId, dom) {
    const inputEl = dom.dof[inputId] || dom.flash[inputId];
    const container = dom.flash[containerId] || document.getElementById(containerId);
    if (!inputEl || !container) return;
    const chips = container.querySelectorAll('.quick-select-chip');
    const updateChips = () => {
        const currentValue = parseFloat(inputEl.value);
        chips.forEach(chip => {
            chip.classList.toggle('active', parseFloat(chip.dataset.value) === currentValue);
        });
    };
    inputEl.addEventListener('input', updateChips);
    setTimeout(updateChips, 0);
}


export function updateFlashUI(mode, dom) {
    dom.flash.apertureGroup.classList.toggle('hidden', mode === 'aperture');
    dom.flash.distanceGroup.classList.toggle('hidden', mode === 'distance');
    dom.flash.powerGroup.classList.toggle('hidden', mode === 'power');
    dom.flash.messageArea.innerHTML = '';
}