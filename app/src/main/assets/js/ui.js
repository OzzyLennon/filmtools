// assets/js/ui.js
// import anime from 'https://cdnjs.cloudflare.com/ajax/libs/animejs/3.2.1/anime.es.js'; // <--- 删除这一行
import { formatTime, playBeep, triggerHaptic } from './utils.js';

export function showMessage(area, type, titleKey, content, finalTime, appData, startTimer) {
    area.hidden = false;
    area.innerHTML = '';
    const langData = appData.translations[appData.currentLanguage] || {};
    let title = titleKey ? (langData[titleKey]?.title || langData[titleKey]) : '';
    let cardHtml = '';
    const cardId = `card-${Date.now()}`;
    const cardClasses = type === 'error' ? 'error-message p-4 text-center' : 'card p-5 text-center';

    let actualContentHtml = '';
    if (type === 'result' && area.id === 'message-area') {
        actualContentHtml = `<p class="text-lg result-label">${title}</p><p id="animated-result" class="text-4xl result-text mb-4">0</p><button id="start-timer-btn" type="button" data-time="${finalTime}" class="btn-ripple btn-success btn-full mt-4">${langData.btnStartTimer || 'Start Timer'}</button>`;
    } else if (type === 'result') {
        actualContentHtml = content;
    }

    if (type === 'result') {
        let meteringTitle = appData.currentLanguage === 'en' ? 'CALCULATING...' : '计算中...';
        if (area.id === 'message-area') {
            meteringTitle = appData.currentLanguage === 'en' ? 'METERING...' : '测光中...';
        }
        cardHtml = `
            <div id="${cardId}" class="${cardClasses}" style="opacity:0;">
                <div id="${cardId}-metering" class="flex flex-col items-center justify-center py-6">
                    <div class="text-xs font-bold text-[var(--accent-secondary)] tracking-widest mb-3 flex items-center">
                        <svg class="w-4 h-4 mr-1 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/></svg>
                        ${meteringTitle}
                    </div>
                    <div id="${cardId}-random-num" class="font-mono text-2xl text-[var(--text-primary)] opacity-50">--</div>
                </div>
                <div id="${cardId}-content" style="display: none; opacity: 0;">
                    ${actualContentHtml}
                </div>
            </div>`;
    } else {
        const messageContent = langData[titleKey]?.content || content || '';
        cardHtml = `<div id="${cardId}" class="${cardClasses}" style="opacity:0"><p class="font-bold">${title}</p><p>${messageContent}</p></div>`;
    }

    area.innerHTML = cardHtml;
    const cardElement = document.getElementById(cardId);

    // Spring physics entry
    anime({ targets: cardElement, opacity: [0, 1], translateY: [20, 0], scale: [0.95, 1], duration: 800, easing: 'spring(1, 80, 10, 0)' });

    if (type === 'result') {
        const meteringEl = document.getElementById(`${cardId}-metering`);
        const randomNumEl = document.getElementById(`${cardId}-random-num`);
        const contentEl = document.getElementById(`${cardId}-content`);

        let hapticCount = 0;
        const meteringInterval = setInterval(() => {
            if (randomNumEl) randomNumEl.textContent = (Math.random() * 99).toFixed(1);
            if (hapticCount % 2 === 0) triggerHaptic(10);
            hapticCount++;
        }, 50);

        setTimeout(() => {
            clearInterval(meteringInterval);
            triggerHaptic(30);

            anime({
                targets: meteringEl, opacity: 0, scale: 0.9, duration: 200, easing: 'easeInQuad',
                complete: () => {
                    meteringEl.style.display = 'none';
                    contentEl.style.display = 'block';
                    anime({
                        targets: contentEl, opacity: [0, 1], translateY: [10, 0], duration: 400, easing: 'easeOutCubic',
                        complete: () => bindResultActions(finalTime, langData, content)
                    });
                }
            });
        }, 400);
    }

    function bindResultActions(finalTimeVal, langDataObj, rawContent) {
        const animatedResultEl = document.getElementById('animated-result');
        if (animatedResultEl && isFinite(finalTimeVal) && finalTimeVal > 0) {
            const animationParams = { value: 0 };
            anime({
                targets: animationParams,
                value: finalTimeVal,
                duration: 1200,
                easing: 'easeOutQuint',
                update: function () {
                    animatedResultEl.innerHTML = formatTime(animationParams.value, langDataObj);
                },
                complete: function () {
                    animatedResultEl.innerHTML = formatTime(finalTimeVal, langDataObj);
                }
            });
        } else if (animatedResultEl) {
            animatedResultEl.innerHTML = rawContent;
        }

        const startTimerBtn = document.getElementById('start-timer-btn');
        if (startTimerBtn) {
            startTimerBtn.addEventListener('click', e => startTimer(parseFloat(e.target.dataset.time)));
        }
    }
}

export function startTimer(totalSeconds, dom, appData) {
    if (!isFinite(totalSeconds) || totalSeconds < 0) return; // 添加了输入验证
    if (window.Android && typeof window.Android.keepScreenOn === 'function') {
        window.Android.keepScreenOn(true);
    }
    if (window.Android && typeof window.Android.startTimerService === 'function') {
        window.Android.startTimerService(Math.round(totalSeconds));
    }

    // ...

    if (appData.timerInterval) clearInterval(appData.timerInterval); // 清除旧计时器
    if (appData.alarmInterval) clearInterval(appData.alarmInterval); // 清除旧闹钟

    // Animate out main content
    anime({
        targets: dom.mainContent,
        opacity: [1, 0],
        scale: [1, 0.95],
        duration: 300,
        easing: 'easeInQuad',
        complete: () => {
            dom.mainContent.classList.add('hidden');

            // Show and animate in timer card
            dom.timer.card.classList.remove('hidden', 'finished');
            document.body.classList.remove('flashing');

            dom.timer.card.style.transform = ''; // Reset
            anime({
                targets: dom.timer.card,
                translateY: [100, 0],
                opacity: [0, 1],
                scale: [0.9, 1],
                duration: 800,
                easing: 'spring(1, 80, 10, 0)'
            });
        }
    });

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
                triggerHaptic(500);
                document.body.classList.toggle('flashing');
            }, 1000);

            // Note: We purposely DO NOT call window.Android.stopTimerService() here.
            // Let the Android TimerService handle its own completion and show a persistent notification.
        }
    }, 1000);
}

export function stopTimer(dom, appData) {
    if (window.Android && typeof window.Android.keepScreenOn === 'function') {
        window.Android.keepScreenOn(false);
    }
    if (window.Android && typeof window.Android.stopTimerService === 'function') {
        window.Android.stopTimerService();
    }
    clearInterval(appData.timerInterval);
    clearInterval(appData.alarmInterval);
    appData.timerInterval = null;
    appData.alarmInterval = null;
    document.body.classList.remove('flashing');

    // Animate out timer
    anime({
        targets: dom.timer.card,
        translateY: [0, 100],
        opacity: [1, 0],
        scale: [1, 0.9],
        duration: 300,
        easing: 'easeInQuad',
        complete: () => {
            dom.timer.card.classList.add('hidden');
            dom.timer.card.style.transform = ''; // Reset

            // Restore main content
            dom.mainContent.classList.remove('hidden');
            anime({
                targets: dom.mainContent,
                opacity: [0, 1],
                scale: [0.95, 1],
                duration: 600,
                easing: 'spring(1, 80, 10, 0)'
            });
            dom.tabs.reciprocity.click();
        }
    });

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
        chip.addEventListener('click', () => {
            triggerHaptic(10);
            anime({
                targets: chip,
                scale: [0.9, 1],
                duration: 300,
                easing: 'easeOutElastic(1, .5)'
            });
        });
        container.appendChild(chip);
    });
}

export function createDial(containerId, inputId, values, dom, prefix = '') {
    const container = document.getElementById(containerId);
    const inputEl = document.getElementById(inputId);
    if (!container || !inputEl) return;

    container.innerHTML = '';

    // Add spacer logic so the first and last items can scroll to the center.
    // CSS padding handles this now (`padding-left/right: 50%`) but we need to ensure the calculation works.

    const items = [];
    values.forEach(val => {
        const item = document.createElement('div');
        item.className = 'dial-item';

        let displayValue = val;
        let dataValue = val;

        if (typeof val === 'object' && val !== null) {
            displayValue = val.name || val.label || val.value;
            dataValue = val.value;
        }

        item.textContent = `${prefix}${displayValue}`;
        item.dataset.value = dataValue;

        // Click to snap
        item.addEventListener('click', () => {
            container.scrollTo({ left: item.offsetLeft - (container.clientWidth / 2) + (item.clientWidth / 2), behavior: 'smooth' });
        });

        container.appendChild(item);
        items.push(item);
    });

    // Observer for "active" item (which one is in the center)
    const updateActiveItem = () => {
        const containerCenter = container.scrollLeft + (container.clientWidth / 2);
        let closestItem = items[0];
        let minDistance = Infinity;

        items.forEach(item => {
            // center position of the item relative to scroll bounds
            const itemCenter = item.offsetLeft + (item.clientWidth / 2);
            const distance = Math.abs(itemCenter - containerCenter);

            if (distance < minDistance) {
                minDistance = distance;
                closestItem = item;
            }
        });

        items.forEach(i => i.classList.remove('active'));
        closestItem.classList.add('active');

        const newValue = closestItem.dataset.value;
        if (inputEl.value !== newValue) {
            inputEl.value = newValue;
            inputEl.dispatchEvent(new Event('input', { bubbles: true })); // Trigger saves
            triggerHaptic(5); // Very light tick feeling like a physical gear
        }
    };

    // Scroll listener with small debounce
    let isScrolling;
    container.addEventListener('scroll', () => {
        window.cancelAnimationFrame(isScrolling);
        isScrolling = window.requestAnimationFrame(updateActiveItem);
    }, { passive: true });

    // Initial positioning based on input value if set
    setTimeout(() => {
        setDialValue(containerId, inputId, inputEl.value || values[Math.floor(values.length / 2)]);
    }, 100);
}

export function setDialValue(containerId, inputId, value) {
    const container = document.getElementById(containerId);
    const inputEl = document.getElementById(inputId);
    if (!container || !inputEl) return;

    const items = Array.from(container.querySelectorAll('.dial-item'));
    const targetItem = items.find(i => i.dataset.value == value);

    if (targetItem) {
        // Scroll to center this item
        container.scrollTo({ left: targetItem.offsetLeft - (container.clientWidth / 2) + (targetItem.clientWidth / 2), behavior: 'auto' });
        inputEl.value = value;
    }
}


export function updateFlashUI(mode, dom) {
    dom.flash.apertureGroup.classList.toggle('hidden', mode === 'aperture');
    dom.flash.distanceGroup.classList.toggle('hidden', mode === 'distance');
    dom.flash.powerGroup.classList.toggle('hidden', mode === 'power');
    dom.flash.messageArea.innerHTML = '';
}