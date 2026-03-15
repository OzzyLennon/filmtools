// assets/js/main.js
import { setTheme, setLanguage } from './theme.js';
import { showMessage, startTimer, stopTimer, createDial, setDialValue, updateFlashUI } from './ui.js';
import { handleReciprocityCalculate, handleDofCalculate, handleFlashCalculate } from './calculator.js';
import { debouncedSaveState, loadState, confirmSaveCustomFilm, confirmDeleteFilm, openSaveModal, closeSaveModal, openDeleteModal, closeDeleteModal } from './state.js';
import { cleanNumericInput, triggerHaptic, playTick, resumeAudioContext } from './utils.js';

document.addEventListener('DOMContentLoaded', function () {
    // Resume audio context on any user interaction
    ['mousedown', 'touchstart', 'click'].forEach(evt => {
        document.addEventListener(evt, resumeAudioContext, { once: true, passive: true });
    });

    // --- GLOBAL STATE & APP DATA ---
    const appData = {
        translations: {},
        films: [],
        reciprocity: {},
        dof: {},
        flash: {},
        currentLanguage: 'zh',
        timerInterval: null,
        alarmInterval: null,
        tempPValue: 0,
        filmToDelete: null,
        originalTitle: document.title,
        isUpdatingFromSelect: false,
    };

    function createRipple(event) {
        const button = event.currentTarget;
        const circle = document.createElement("span");
        const diameter = Math.max(button.clientWidth, button.clientHeight);
        const radius = diameter / 2;

        // 获取按钮相对于视口的边界
        const rect = button.getBoundingClientRect();

        // 计算点击位置相对于按钮左上角的位置
        const rippleX = event.clientX - rect.left;
        const rippleY = event.clientY - rect.top;

        circle.style.width = circle.style.height = `${diameter}px`;
        circle.style.left = `${rippleX - radius}px`;
        circle.style.top = `${rippleY - radius}px`;
        circle.classList.add("ripple");

        // 检查按钮内部是否已经有一个 ripple 元素，有就先移除
        const ripple = button.getElementsByClassName("ripple")[0];
        if (ripple) {
            ripple.remove();
        }

        button.appendChild(circle);
    }

    // --- DOM ELEMENTS ---
    const dom = {
        mainContent: document.getElementById('main-content'),
        themeSwitcher: document.getElementById('theme-switcher'),
        langSwitcher: document.getElementById('lang-switcher'),
        globalTooltip: document.getElementById('global-tooltip'),
        tabs: {
            reciprocity: document.getElementById('tab-reciprocity'),
            dof: document.getElementById('tab-dof'),
            flash: document.getElementById('tab-flash'),
        },
        panelsContainer: document.getElementById('panels-container'),
        reciprocity: {
            filmSelect: document.getElementById('film-select'),
            deleteArea: document.getElementById('delete-film-area'),
            deleteBtn: document.getElementById('delete-film-btn'),
            customGroup: document.getElementById('custom-factor-group'),
            customInput: document.getElementById('custom-factor'),
            saveBtn: document.getElementById('save-custom-btn'),
            ndSelect: document.getElementById('nd-filter-select'),
            minInput: document.getElementById('metered-time-min'),
            secInput: document.getElementById('metered-time-sec'),
            calculateBtn: document.getElementById('calculate-btn'),
            messageArea: document.getElementById('message-area'),
            focalLengthInput: document.getElementById('focal-length'),
            bellowsExtensionInput: document.getElementById('bellows-extension'),
            shutterSpeedSelect: document.getElementById('shutter-speed-select'),
        },
        dof: {
            format: document.getElementById('dof-format'),
            focalLength: document.getElementById('dof-focal-length'),
            aperture: document.getElementById('dof-aperture'),
            distance: document.getElementById('dof-distance'),
            calculateBtn: document.getElementById('calculate-dof-btn'),
            messageArea: document.getElementById('dof-message-area'),
            apertureQuickSelect: document.getElementById('aperture-quick-select'),
        },
        flash: {
            gnInput: document.getElementById('flash-gn'),
            isoInput: document.getElementById('flash-iso'),
            powerSelect: document.getElementById('flash-power'),
            distanceInput: document.getElementById('flash-distance'),
            apertureInput: document.getElementById('flash-aperture'),
            calculateBtn: document.getElementById('calculate-flash-btn'),
            messageArea: document.getElementById('flash-message-area'),
            calcModeRadios: document.querySelectorAll('input[name="flash-mode"]'),
            modifierSelect: document.getElementById('flash-modifier'),
            apertureGroup: document.getElementById('flash-aperture-group'),
            distanceGroup: document.getElementById('flash-distance-group'),
            powerGroup: document.getElementById('flash-power-group'),
        },
        timer: {
            card: document.getElementById('timer-card'),
            display: document.getElementById('timer-display'),
            stopBtn: document.getElementById('stop-timer-btn'),
            progressRing: document.getElementById('progress-ring'),
        },
        modals: {
            save: document.getElementById('save-modal'),
            saveNameInput: document.getElementById('custom-film-name'),
            cancelSave: document.getElementById('cancel-save-btn'),
            confirmSave: document.getElementById('confirm-save-btn'),
            delete: document.getElementById('delete-modal'),
            deleteText: document.getElementById('delete-confirm-text'),
            cancelDelete: document.getElementById('cancel-delete-btn'),
            confirmDelete: document.getElementById('confirm-delete-btn'),
        }
    };

    // --- TOOLTIP FUNCTIONS ---
    const showTooltip = (trigger) => {
        const langData = appData.translations[appData.currentLanguage];
        const tooltipText = langData[trigger.dataset.tooltipKey];
        if (!tooltipText) return;
        dom.globalTooltip.textContent = tooltipText;
        const triggerRect = trigger.getBoundingClientRect();
        dom.globalTooltip.classList.add('visible');
        const top = triggerRect.top - dom.globalTooltip.offsetHeight - 8;
        const left = triggerRect.left + (triggerRect.width / 2) - (dom.globalTooltip.offsetWidth / 2);
        dom.globalTooltip.style.top = `${top}px`;
        dom.globalTooltip.style.left = `${left}px`;
    };

    const hideTooltip = () => {
        dom.globalTooltip.classList.remove('visible');
    };


    function populateGenericSelect(selectEl, data, textKey, valueKey) {
        if (!selectEl) return;
        const langData = appData.translations[appData.currentLanguage];
        selectEl.innerHTML = '';
        data.forEach(item => {
            const opt = document.createElement('option');
            opt.value = item[valueKey];
            opt.textContent = langData[item[textKey]] || item[textKey] || item.name;
            selectEl.appendChild(opt);
        });
    }

    function populateShutterSpeedSelect() {
        if (!dom.reciprocity.shutterSpeedSelect) return;
        const values = appData.reciprocity.shutterSpeeds.filter(s => s.name !== "placeholder");
        createDial('shutter-speed-dial', 'shutter-speed-select', values, dom);
    }

    function populateFilmSelect() {
        if (!dom.reciprocity.filmSelect) return;
        const customFilms = JSON.parse(localStorage.getItem('customFilms') || '[]') || [];
        const allFilms = [...appData.films, ...customFilms];
        const currentVal = dom.reciprocity.filmSelect.value;
        dom.reciprocity.filmSelect.innerHTML = '';
        const customTemplate = allFilms.find(f => f.id === 'custom');
        const sortedFilms = allFilms.filter(f => f.id !== 'custom').sort((a, b) => a.name.localeCompare(b.name, appData.currentLanguage === 'zh' ? 'zh-Hans-CN' : 'en-US'));

        [...sortedFilms, customTemplate].forEach(film => {
            if (!film) return;
            const option = document.createElement('option');
            option.value = film.id;
            const langData = appData.translations[appData.currentLanguage];
            option.textContent = film.id === "custom" ? langData.customFilmOption : film.name;
            dom.reciprocity.filmSelect.appendChild(option);
        });

        if (document.querySelector(`#film-select option[value="${currentVal}"]`)) {
            dom.reciprocity.filmSelect.value = currentVal;
        } else if (sortedFilms.length > 0) {
            dom.reciprocity.filmSelect.value = sortedFilms[0].id;
        } else if (customTemplate) {
            dom.reciprocity.filmSelect.value = customTemplate.id;
        }
    }

    function populateAllSelects() {
        populateFilmSelect();
        populateShutterSpeedSelect();
        populateGenericSelect(dom.reciprocity.ndSelect, appData.reciprocity.ndFilters, 'key', 'factor');
        populateGenericSelect(dom.dof.format, appData.dof.sensorFormats, 'key', 'coc');
        populateGenericSelect(dom.flash.modifierSelect, appData.flash.flashModifiers, 'key', 'loss');
        populateGenericSelect(dom.flash.powerSelect, appData.flash.flashPowers, 'name', 'value');
    }

    function handleFilmSelectChange() {
        dom.reciprocity.messageArea.innerHTML = '';
        const isCustom = dom.reciprocity.filmSelect.value === 'custom';
        const isSavedCustom = dom.reciprocity.filmSelect.value?.startsWith('custom_');
        dom.reciprocity.customGroup.classList.toggle('hidden', !isCustom);
        dom.reciprocity.deleteArea.classList.toggle('hidden', !isSavedCustom);
    }

    function initializeEventListeners() {
        // Theme and Language
        dom.themeSwitcher.addEventListener('click', () => setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark', dom));
        dom.langSwitcher.addEventListener('click', () => setLanguage(appData.currentLanguage === 'zh' ? 'en' : 'zh', appData, dom, populateAllSelects, handleFilmSelectChange));

        // Tabs
        const tabs = Object.values(dom.tabs);
        tabs.forEach((tab, index) => {
            tab.addEventListener('click', () => {
                triggerHaptic(10);
                // 清空所有消息区域，防止内容重叠
                dom.reciprocity.messageArea.hidden = true;
                dom.dof.messageArea.hidden = true;
                dom.flash.messageArea.hidden = true;

                tabs.forEach(t => { t.classList.remove('active'); t.setAttribute('aria-selected', 'false'); });
                tab.classList.add('active'); tab.setAttribute('aria-selected', 'true');
                dom.panelsContainer.style.transform = `translateX(-${index * 100}%)`;
            });
        });

        // --- ADDING BACK SWIPE GESTURE ---
        let touchStartX = 0, touchStartY = 0;
        dom.mainContent.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
            touchStartY = e.changedTouches[0].screenY;
        }, { passive: true });

        dom.mainContent.addEventListener('touchend', (e) => {
            const touchEndX = e.changedTouches[0].screenX;
            const touchEndY = e.changedTouches[0].screenY;
            const deltaX = touchEndX - touchStartX;
            const deltaY = touchEndY - touchStartY;

            if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
                // Prevent tab swipe if the user is interacting with a dial
                if (e.target.closest('.dial-container')) return;

                hideTooltip(); // Hide tooltip on swipe
                const currentActiveIndex = tabs.findIndex(tab => tab.classList.contains('active'));
                if (deltaX < 0 && currentActiveIndex < tabs.length - 1) {
                    tabs[currentActiveIndex + 1].click();
                } else if (deltaX > 0 && currentActiveIndex > 0) {
                    tabs[currentActiveIndex - 1].click();
                }
            }
        }, { passive: true });


        // Calculation Buttons
        dom.reciprocity.calculateBtn.addEventListener('click', () => { triggerHaptic(20); handleReciprocityCalculate(dom, appData, showMessage, startTimer); });
        dom.dof.calculateBtn.addEventListener('click', () => { triggerHaptic(20); handleDofCalculate(dom, appData, showMessage); });
        dom.flash.calculateBtn.addEventListener('click', () => { triggerHaptic(20); handleFlashCalculate(dom, appData, showMessage); });

        // Timer
        // Long Press to Stop Timer
        let stopPressTimer = null;
        let stopAnimation = null;
        let stopRingAnimation = null;

        const startStopPress = () => {
            triggerHaptic(20);
            
            const ring = document.getElementById('stop-progress-circle');
            
            stopAnimation = anime({
                targets: dom.timer.stopBtn,
                scale: 0.85,
                duration: 1000,
                easing: 'linear'
            });
            
            if (ring) {
                // Circumference is 2 * pi * r = 2 * 3.14159 * 40 ≈ 251.3
                // Using 252 to ensure it is completely closed/hidden at rest
                ring.style.opacity = '1';
                stopRingAnimation = anime({
                    targets: ring,
                    strokeDashoffset: [252, 0],
                    duration: 1000,
                    easing: 'linear'
                });
            }

            stopPressTimer = setTimeout(() => {
                triggerHaptic(200);
                stopTimer(dom, appData);
                resetStopPress(true);
            }, 1000);
        };

        const resetStopPress = (isComplete = false) => {
            if (stopPressTimer) clearTimeout(stopPressTimer);
            if (stopAnimation) stopAnimation.pause();
            if (stopRingAnimation) stopRingAnimation.pause();
            
            const ring = document.getElementById('stop-progress-circle');

            anime({
                targets: dom.timer.stopBtn,
                scale: 1,
                duration: 300,
                easing: 'easeOutElastic(1, .8)'
            });
            
            if (ring && !isComplete) {
                // If user released early, "rewind" the progress 
                anime({
                    targets: ring,
                    strokeDashoffset: 252,
                    opacity: 0,
                    duration: 300,
                    easing: 'easeOutQuad'
                });
                
                // Optional haptic click to indicate it failed
                triggerHaptic(10);
            } else if (ring && isComplete) {
                ring.style.opacity = '0';
                ring.style.strokeDashoffset = '252';
            }
        };

        const attachPressEvent = (el, type, handler) => {
            el.addEventListener(type, (e) => {
                // Ignore right clicks
                if (e.type === 'mousedown' && e.button !== 0) return;
                // e.preventDefault(); // removed to let ripple effect work
                handler(e);
            }, { passive: false });
        };

        attachPressEvent(dom.timer.stopBtn, 'mousedown', startStopPress);
        attachPressEvent(dom.timer.stopBtn, 'touchstart', startStopPress);
        attachPressEvent(dom.timer.stopBtn, 'mouseup', resetStopPress);
        attachPressEvent(dom.timer.stopBtn, 'mouseleave', resetStopPress);
        attachPressEvent(dom.timer.stopBtn, 'touchend', resetStopPress);

        // Modals
        dom.reciprocity.saveBtn.addEventListener('click', () => openSaveModal(dom, appData, showMessage));
        dom.reciprocity.deleteBtn.addEventListener('click', () => openDeleteModal(dom, appData));
        dom.modals.cancelSave.addEventListener('click', () => closeSaveModal(dom));
        dom.modals.confirmSave.addEventListener('click', () => confirmSaveCustomFilm(dom, appData, showMessage, populateFilmSelect, handleFilmSelectChange));
        dom.modals.cancelDelete.addEventListener('click', () => closeDeleteModal(dom, appData));
        dom.modals.confirmDelete.addEventListener('click', () => confirmDeleteFilm(dom, appData, populateFilmSelect));

        // Inputs and Selects
        dom.reciprocity.filmSelect.addEventListener('change', () => { handleFilmSelectChange(); debouncedSaveState(dom); });
        dom.flash.calcModeRadios.forEach(radio => radio.addEventListener('change', () => { updateFlashUI(radio.value, dom); debouncedSaveState(dom); }));

        // Auto-saving and input handling
        document.querySelectorAll('input, select').forEach(el => {
            el.addEventListener('change', () => debouncedSaveState(dom));
            el.addEventListener('input', () => {
                if (el.type !== 'radio') debouncedSaveState(dom);
            });
        });

        document.querySelectorAll('input[type="number"], input[inputmode="numeric"], input[inputmode="decimal"]').forEach(inputEl => {
            if (inputEl) {
                inputEl.addEventListener('input', cleanNumericInput);
            }
        });

        const handleManualTimeInput = () => {
            if (appData.isUpdatingFromSelect) return;
            dom.reciprocity.shutterSpeedSelect.value = '';
            dom.reciprocity.messageArea.hidden = true;
            debouncedSaveState(dom);
        };
        dom.reciprocity.minInput.addEventListener('input', handleManualTimeInput);
        dom.reciprocity.secInput.addEventListener('input', handleManualTimeInput);
        dom.reciprocity.shutterSpeedSelect.addEventListener('input', (e) => {
            const time = parseFloat(e.target.value);
            if (!isNaN(time)) {
                appData.isUpdatingFromSelect = true;
                dom.reciprocity.minInput.value = '';
                dom.reciprocity.secInput.value = time;
                setTimeout(() => { appData.isUpdatingFromSelect = false; }, 10);
            }
            dom.reciprocity.messageArea.innerHTML = '';
            debouncedSaveState(dom);
        });

        // Stepper buttons
        dom.mainContent.addEventListener('click', function (e) {
            const target = e.target.closest('.stepper-btn');
            if (!target) return;

            if (target.classList.contains('stepper-btn')) {
                triggerHaptic(15);
                playTick(); // Play sound effect
                const inputId = target.dataset.target;
                const step = parseFloat(target.dataset.step);
                const inputEl = document.getElementById(inputId);
                if (!inputEl) return;
                let currentVal = parseFloat(inputEl.value) || 0;
                currentVal += target.classList.contains('stepper-plus') ? step : -step;
                inputEl.value = Math.max(0, parseFloat(currentVal.toFixed(4)));
                inputEl.dispatchEvent(new Event('input', { bubbles: true }));
            }
        });

        // --- ADDING BACK TOOLTIP LISTENERS ---
        document.querySelectorAll('.tooltip-trigger').forEach(trigger => {
            trigger.addEventListener('mouseenter', () => showTooltip(trigger));
            trigger.addEventListener('mouseleave', hideTooltip);
            trigger.addEventListener('focus', () => showTooltip(trigger));
            trigger.addEventListener('blur', hideTooltip);
        });

        document.querySelectorAll('.btn-ripple').forEach(button => {
            button.addEventListener('click', createRipple);
        });
    }

    function initializeApp() {
        // Unhide main content
        dom.mainContent.style.visibility = 'visible';

        // Initial setup
        const preferredTheme = localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
        setTheme(preferredTheme, dom);

        const preferredLanguage = localStorage.getItem('language') || 'zh';
        setLanguage(preferredLanguage, appData, dom, populateAllSelects, handleFilmSelectChange);

        // Initialize Dial Arrays
        const fStops = [0.95, 1.2, 1.4, 1.8, 2, 2.8, 4, 5.6, 8, 11, 16, 22, 32, 45, 64];
        const isos = [6, 12, 25, 50, 64, 100, 160, 200, 400, 800, 1600, 3200, 6400];

        createDial('dof-aperture-dial', 'dof-aperture', fStops, dom, 'f/');
        createDial('flash-aperture-dial', 'flash-aperture', fStops, dom, 'f/');
        createDial('flash-iso-dial', 'flash-iso', isos, dom);

        loadState(dom, appData, handleFilmSelectChange, (mode) => updateFlashUI(mode, dom));

        // Ensure visual state of dials updates if loaded from state
        setTimeout(() => {
            if (dom.dof.aperture.value) setDialValue('dof-aperture-dial', 'dof-aperture', dom.dof.aperture.value);
            if (dom.flash.apertureInput.value) setDialValue('flash-aperture-dial', 'flash-aperture', dom.flash.apertureInput.value);
            if (dom.flash.isoInput.value) setDialValue('flash-iso-dial', 'flash-iso', dom.flash.isoInput.value);
            if (dom.reciprocity.shutterSpeedSelect.value) setDialValue('shutter-speed-dial', 'shutter-speed-select', dom.reciprocity.shutterSpeedSelect.value);
        }, 300);

        // Bind all event listeners
        initializeEventListeners();

        // Reveal the main content smoothly
        requestAnimationFrame(() => {
            if (dom.mainContent) {
                dom.mainContent.style.opacity = '1';
            }
        });
    }


    function start() {
        if (typeof window.appDataString !== 'undefined') {
            try {
                const data = (typeof window.appDataString === 'string') ?
                    JSON.parse(window.appDataString) :
                    window.appDataString;

                const injectedData = data.appData;

                if (!injectedData) {
                    throw new Error("'appData' property not found in the injected data.");
                }

                // Copy injected data to our appData object
                appData.translations = injectedData.translations;
                appData.films = injectedData.films;
                appData.reciprocity = injectedData.reciprocity;
                appData.dof = injectedData.dof;
                appData.flash = injectedData.flash;

                initializeApp();

            } catch (e) {
                console.error("Fatal error during initialization:", e);
                const errorEl = document.getElementById('fatal-error');
                if (errorEl) {
                    errorEl.classList.remove('hidden');
                    errorEl.classList.add('flex');
                } else {
                    document.body.innerHTML = `<div style="text-align: center; padding: 20px; color: red;"><h3>Initialization Error</h3><p>${e.message}</p></div>`;
                }
            }
        } else {
            // If data is not yet available, wait and try again
            setTimeout(start, 50);
        }
    }

    start();
});