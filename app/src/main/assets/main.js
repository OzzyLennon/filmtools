window.onload = function() {
    // --- DATA AND CONFIGURATION ---
    let _translations = {}, _filmData = [], _reciprocityData = {}, _dofData = {}, _flashData = {};

    // --- GLOBAL STATE & UTILITIES ---
    let _currentLanguage = 'zh';
    const _dom = {};
    let _timerInterval, _alarmInterval, _audioCtx, _tempPValue = 0, _filmToDelete = null;
    const _originalTitle = document.title;
    const sunIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`;
    const moonIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`;

    const _formatTime = (s, units=true) => { const langData=_translations[_currentLanguage]; if (isNaN(s) || s === null || s < 0 || !isFinite(s) ) return units ? "N/A" : "00:00"; const t=Math.round(s); if(!units){const m=String(Math.floor(t/60)).padStart(2,'0');const sec=String(t%60).padStart(2,'0');return`${m}:${sec}`}if(t<60)return`${t.toFixed(t > 10 ? 0 : 1)} ${langData.timeUnitSec}`;const m=Math.floor(t/60);const sec=t%60;return`${m} ${langData.timeUnitMin} ${sec.toFixed(0)} ${langData.timeUnitSec}`};
    const _playBeep = () => { if (!_audioCtx) _audioCtx = new(window.AudioContext || window.webkitAudioContext)(); const osc = _audioCtx.createOscillator(); osc.type = 'sine'; osc.frequency.setValueAtTime(880, _audioCtx.currentTime); osc.connect(_audioCtx.destination); osc.start(); osc.stop(_audioCtx.currentTime + 0.2); };
    const _restrictInputToNumeric = (e) => { if ([46, 8, 9, 27, 13, 110, 190, 37, 39].includes(e.keyCode) || (e.keyCode === 65 && (e.ctrlKey || e.metaKey)) || (e.keyCode === 67 && (e.ctrlKey || e.metaKey)) || (e.keyCode === 86 && (e.ctrlKey || e.metaKey)) || (e.keyCode === 88 && (e.ctrlKey || e.metaKey))) { if ((e.keyCode === 190 || e.keyCode === 110) && e.target.value.includes('.')) e.preventDefault(); return; } if ((e.shiftKey || (e.keyCode < 48 || e.keyCode > 57)) && (e.keyCode < 96 || e.keyCode > 105)) e.preventDefault(); };
    const _cleanNumericInput = (e) => { e.target.value = e.target.value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1'); };
    // 旧代码
    // const _createRipple = (e) => { const btn=e.currentTarget; const r=document.createElement("span"); const rect=btn.getBoundingClientRect(); r.style.left=`${e.clientX-rect.left}px`; r.style.top=`${e.clientY-rect.top}px`; r.classList.add("ripple"); const existing=btn.querySelector(".ripple"); if (existing) existing.remove(); btn.appendChild(r); };

    // 新代码
    const _createRipple = (e) => {
        const btn = e.currentTarget;

        // 按下动效
        anime.remove(btn); // 移除之前的动画，防止冲突
        anime({
            targets: btn,
            scale: [1, 0.95], // 从100%大小缩放到95%
            duration: 200,
            easing: 'easeOutQuad',
            direction: 'alternate' // 动画会反向播放，回到原样
        });

        // 创建涟漪
        const r = document.createElement("span");
        const rect = btn.getBoundingClientRect();
        r.style.left = `${e.clientX - rect.left}px`;
        r.style.top = `${e.clientY - rect.top}px`;
        r.classList.add("ripple");
        const existing = btn.querySelector(".ripple");
        if (existing) existing.remove();
        btn.appendChild(r);
    };
    const _debounce = (func, wait) => { let timeout; return function(...args) { clearTimeout(timeout); timeout = setTimeout(() => func.apply(this, args), wait); }; };
    const _setTheme = (theme) => { document.documentElement.setAttribute('data-theme', theme); localStorage.setItem('theme', theme); _dom.themeSwitcher.innerHTML = theme === 'dark' ? sunIcon : moonIcon; _dom.themeSwitcher.setAttribute('aria-label', theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'); document.querySelector('meta[name="theme-color"]').setAttribute('content', theme === 'dark' ? '#0D1117' : '#ffffff'); };
    const _populateGenericSelect = (selectEl, data, textKey, valueKey) => { const langData = _translations[_currentLanguage]; selectEl.innerHTML = ''; data.forEach(item => { const opt = document.createElement('option'); opt.value = item[valueKey]; opt.textContent = langData[item[textKey]] || item[textKey] || item.name; selectEl.appendChild(opt); }); };
    const _populateShutterSpeedSelect = () => { _dom.reciprocity.shutterSpeedSelect.innerHTML = ''; _reciprocityData.shutterSpeeds.forEach(s => { const opt = document.createElement('option'); opt.value = s.value; opt.textContent = s.name === "placeholder" ? _translations[_currentLanguage].placeholderShutterSpeed : s.name; if (s.name === "placeholder") { opt.disabled = true; opt.selected = true;} _dom.reciprocity.shutterSpeedSelect.appendChild(opt); }); };
    const _populateFilmSelect = () => { const customFilms = JSON.parse(localStorage.getItem('customFilms') || '[]') || []; const allFilms = [..._filmData, ...customFilms]; const currentVal = _dom.reciprocity.filmSelect.value; _dom.reciprocity.filmSelect.innerHTML = ''; const customTemplate = allFilms.find(f => f.id === 'custom'); const sortedFilms = allFilms.filter(f => f.id !== 'custom').sort((a,b) => a.name.localeCompare(b.name, _currentLanguage === 'zh' ? 'zh-Hans-CN' : 'en-US')); [...sortedFilms, customTemplate].forEach(film => { if(!film) return; const option = document.createElement('option'); option.value = film.id; option.textContent = film.id === "custom" ? _translations[_currentLanguage].customFilmOption : film.name; _dom.reciprocity.filmSelect.appendChild(option); }); if (document.querySelector(`#film-select option[value="${currentVal}"]`)) { _dom.reciprocity.filmSelect.value = currentVal; } else if (sortedFilms.length > 0) { _dom.reciprocity.filmSelect.value = sortedFilms[0].id; } else if (customTemplate) { _dom.reciprocity.filmSelect.value = customTemplate.id; } _handleFilmSelectChange(); };
    const _populateAllSelects = () => { _populateFilmSelect(); _populateGenericSelect(_dom.reciprocity.ndSelect, _reciprocityData.ndFilters, 'key', 'factor'); _populateGenericSelect(_dom.dof.format, _dofData.sensorFormats, 'key', 'coc'); _populateGenericSelect(_dom.flash.modifierSelect, _flashData.flashModifiers, 'key', 'loss'); _populateGenericSelect(_dom.flash.powerSelect, _flashData.flashPowers, 'name', 'value'); _populateShutterSpeedSelect(); };
    const _setLanguage = (lang) => { _currentLanguage = lang; localStorage.setItem('language', lang); document.documentElement.lang = lang; const langData = _translations[lang]; document.querySelectorAll('[data-lang-key]').forEach(el => { const key = el.dataset.langKey; if (key === 'btnConfirmDelete' && el.id === 'cancel-delete-btn') { el.textContent = langData['btnCancel']; } else { el.textContent = langData[key] || ''; }}); document.querySelectorAll('[data-lang-placeholder]').forEach(el => { el.placeholder = langData[el.dataset.langPlaceholder] || ""; }); if(_dom.langSwitcher) _dom.langSwitcher.textContent = langData.langSwitch; _populateAllSelects(); };
    const _handleFilmSelectChange = () => { _dom.reciprocity.messageArea.innerHTML = ''; const isCustom = _dom.reciprocity.filmSelect.value === 'custom'; const isSavedCustom = _dom.reciprocity.filmSelect.value?.startsWith('custom_'); _dom.reciprocity.customGroup.classList.toggle('hidden', !isCustom); _dom.reciprocity.deleteArea.classList.toggle('hidden', !isSavedCustom); };
    const _updateFlashUI = (mode) => { _dom.flash.apertureGroup.classList.toggle('hidden', mode === 'aperture'); _dom.flash.distanceGroup.classList.toggle('hidden', mode === 'distance'); _dom.flash.powerGroup.classList.toggle('hidden', mode === 'power'); _dom.flash.messageArea.innerHTML = ''; };
    // 旧代码
    // const _showMessage = (area, type, titleKey, content, finalTime) => { let cardHtml = ''; const langData = _translations[_currentLanguage]; let title = titleKey ? (langData[titleKey]?.title || langData[titleKey]) : ''; if (type === 'result' && area === _dom.reciprocity.messageArea) { cardHtml = `<div class="card p-5 text-center fade-in"><p class="text-lg result-label">${title}</p><p class="text-4xl result-text mb-4">${content}</p><button id="start-timer-btn" type="button" data-time="${finalTime}" class="text-white w-full font-bold rounded-lg text-lg px-5 py-3 text-center mt-4 btn-ripple" style="background-color: var(--success-color);">${langData.btnStartTimer}</button></div>`; } else if (type === 'result') { cardHtml = `<div class="card p-5 text-center fade-in">${content}</div>`; } else if (type === 'info') { cardHtml = `<div class="card p-5 text-center fade-in"><p class="text-xl font-bold mb-2">${title}</p><p>${langData[titleKey].content}</p></div>`; } else { cardHtml = `<div class="error-message p-4 text-center fade-in"><p class="font-bold">${title}</p><p>${langData[titleKey].content || content}</p></div>`; } area.innerHTML = cardHtml; const startTimerBtn = document.getElementById('start-timer-btn'); if (startTimerBtn) { startTimerBtn.addEventListener('click', e => _startTimer(parseFloat(e.target.dataset.time))); startTimerBtn.addEventListener("click", _createRipple); } };

    // 新代码
    const _showMessage = (area, type, titleKey, content, finalTime) => {
        area.innerHTML = ''; // 先清空区域
        const langData = _translations[_currentLanguage];
        let title = titleKey ? (langData[titleKey]?.title || langData[titleKey]) : '';
        let cardHtml = '';

        // 1. 创建卡片的HTML结构
        const cardId = `card-${Date.now()}`; // 为卡片创建一个唯一ID
        const cardClasses = type === 'error' ? 'error-message p-4 text-center' : 'card p-5 text-center';

        if (type === 'result' && area === _dom.reciprocity.messageArea) {
            // 为需要滚动的数字创建一个带ID的span
            cardHtml = `<div id="${cardId}" class="${cardClasses}" style="opacity:0">
                            <p class="text-lg result-label">${title}</p>
                            <p id="animated-result" class="text-4xl result-text mb-4">0</p>
                            <button id="start-timer-btn" type="button" data-time="${finalTime}" class="text-white w-full font-bold rounded-lg text-lg px-5 py-3 text-center mt-4 btn-ripple" style="background-color: var(--success-color);">${langData.btnStartTimer}</button>
                        </div>`;
        } else if (type === 'result') {
            cardHtml = `<div id="${cardId}" class="${cardClasses}" style="opacity:0">${content}</div>`;
        } else { // info 和 error
            const messageContent = langData[titleKey]?.content || content || '';
            cardHtml = `<div id="${cardId}" class="${cardClasses}" style="opacity:0">
                            <p class="font-bold">${title}</p>
                            <p>${messageContent}</p>
                        </div>`;
        }

        area.innerHTML = cardHtml;

        const cardElement = document.getElementById(cardId);

        // 2. 实现卡片入场动画
        anime({
            targets: cardElement,
            opacity: [0, 1],
            translateY: [20, 0], // 从下方20px处移入
            scale: [0.95, 1],    // 从95%大小放大到100%
            duration: 500,
            easing: 'easeOutCubic'
        });

        // 3. 如果是倒易律结果，执行数字滚动动画
        const animatedResultEl = document.getElementById('animated-result');
        if (animatedResultEl && isFinite(finalTime) && finalTime > 0) {
            const animationParams = { value: finalTime };
            anime({
                targets: animationParams,
                value: [0, finalTime],
                duration: 1200,
                easing: 'easeOutQuint',
                round: 100, // 保留两位小数
                update: function() {
                    animatedResultEl.innerHTML = _formatTime(animationParams.value);
                },
                complete: function() {
                    // 动画结束后显示最终的精确格式化时间
                    animatedResultEl.innerHTML = _formatTime(finalTime);
                }
            });
        } else if(animatedResultEl) {
            // 如果不是需要动画的有效数字，直接显示内容
            animatedResultEl.innerHTML = content;
        }


        const startTimerBtn = document.getElementById('start-timer-btn');
        if (startTimerBtn) {
            startTimerBtn.addEventListener('click', e => _startTimer(parseFloat(e.target.dataset.time)));
            startTimerBtn.addEventListener("click", _createRipple);
        }
    };

    const _evaluateFormula = (formula, tm) => {
        const { pow, log10, sqrt } = Math;
        try {
            return new Function('tm', 'pow', 'log10', 'sqrt', `return ${formula}`)(tm, pow, log10, sqrt);
        } catch (e) {
            console.error("Formula evaluation error:", e);
            return -1; // Indicates an error
        }
    };

    const _calculateByRules = (tm, rules) => {
        for (const rule of rules) {
            if (rule.condition === undefined || rule.condition === null || _evaluateFormula(rule.condition, tm)) {
                return _evaluateFormula(rule.formula, tm);
            }
        }
        return -1; // No rule matched
    };

    const _handleReciprocityCalculate = () => {
        const minutesVal = parseFloat(_dom.reciprocity.minInput.value) || 0;
        const secondsVal = parseFloat(_dom.reciprocity.secInput.value) || 0;
        const baseTime = (minutesVal * 60) + secondsVal;
        if (baseTime <= 0) { _showMessage(_dom.reciprocity.messageArea, 'error', 'errorInvalidTime'); return; }
        const ndFactor = parseFloat(_dom.reciprocity.ndSelect.value) || 1;
        const focalLength = parseFloat(_dom.reciprocity.focalLengthInput.value);
        const bellowsExtension = parseFloat(_dom.reciprocity.bellowsExtensionInput.value);
        let bellowsFactor = 1;
        if (focalLength > 0 && bellowsExtension > focalLength) { bellowsFactor = (bellowsExtension / focalLength) ** 2; }
        const timeBeforeReciprocity = baseTime * ndFactor * bellowsFactor;
        if (!isFinite(timeBeforeReciprocity)) { _showMessage(_dom.reciprocity.messageArea, 'error', 'errorInvalidTime'); return; }
        const filmId = _dom.reciprocity.filmSelect.value;
        const allFilmData = [..._filmData, ...JSON.parse(localStorage.getItem('customFilms') || '[]')];
        const film = allFilmData.find((f) => f.id === filmId);

        if (!film) { _showMessage(_dom.reciprocity.messageArea, 'error', 'errorNoFilm'); return; }

        let pValue = film.p;
        if (filmId === 'custom') {
            const customP = parseFloat(_dom.reciprocity.customInput.value);
            if (!customP || customP <= 1.0) { _showMessage(_dom.reciprocity.messageArea, 'error', 'errorInvalidFactor'); return; }
            pValue = customP;
        }

        let tc;
        if (film.rules) {
            tc = _calculateByRules(timeBeforeReciprocity, film.rules);
        } else if (pValue) {
            tc = timeBeforeReciprocity > 1 ? Math.pow(timeBeforeReciprocity, pValue) : timeBeforeReciprocity;
        } else {
             tc = timeBeforeReciprocity;
        }

        if (!isFinite(tc) || tc < 0) {
            _showMessage(_dom.reciprocity.messageArea, 'error', 'errorOutOfRange');
        } else if (tc < 1 && Math.abs(tc - timeBeforeReciprocity) < 0.1) {
            _showMessage(_dom.reciprocity.messageArea, 'info', 'infoNoCompensation');
        } else {
            _showMessage(_dom.reciprocity.messageArea, 'result', 'resultCorrectedTime', _formatTime(tc), tc);
        }
    };

    const _handleDofCalculate = () => { const focalLength = parseFloat(_dom.dof.focalLength.value); const aperture = parseFloat(_dom.dof.aperture.value); const coc = parseFloat(_dom.dof.format.value); const distance = parseFloat(_dom.dof.distance.value) * 1000; if (!focalLength || !aperture || !coc || !distance || focalLength <= 0 || aperture <= 0 || distance <= 0) { _showMessage(_dom.dof.messageArea, 'error', 'errorInvalidDof'); return; } const H = (focalLength * focalLength) / (aperture * coc) + focalLength; const nearLimit = (H * distance) / (H + (distance - focalLength)); const farLimit = (H * distance) / (H - (distance - focalLength)); const langData = _translations[_currentLanguage]; const resultHtml = `<div class="space-y-3 text-lg"><div class="flex justify-between items-baseline"><p class="result-label">${langData.resultDofNear}</p><p class="result-text font-bold text-2xl">${(nearLimit / 1000).toFixed(2)}m</p></div><div class="flex justify-between items-baseline"><p class="result-label">${langData.resultDofFar}</p><p class="result-text font-bold text-2xl">${(isFinite(farLimit) && farLimit > 0 ? (farLimit / 1000).toFixed(2) + 'm' : '∞')}</p></div><div class="flex justify-between items-baseline"><p class="result-label">${langData.resultDofTotal}</p><p class="result-text font-bold text-2xl">${(isFinite(farLimit) && farLimit > 0 ? ((farLimit - nearLimit) / 1000).toFixed(2) + 'm' : '∞')}</p></div><div class="flex justify-between items-baseline"><p class="result-label">${langData.resultHyperfocal}</p><p class="result-text font-bold text-2xl">${(H / 1000).toFixed(2)}m</p></div></div>`; _showMessage(_dom.dof.messageArea, 'result', null, resultHtml); };
    const _handleFlashCalculate = () => { const mode = document.querySelector('input[name="flash-mode"]:checked').value; const gn = parseFloat(_dom.flash.gnInput.value); const iso = parseFloat(_dom.flash.isoInput.value); const modifierLoss = parseFloat(_dom.flash.modifierSelect.value); const distance = parseFloat(_dom.flash.distanceInput.value); const power = parseFloat(_dom.flash.powerSelect.value); const aperture = parseFloat(_dom.flash.apertureInput.value); const langData = _translations[_currentLanguage]; if (!gn || !iso || gn <= 0 || iso <= 0) { _showMessage(_dom.flash.messageArea, 'error', 'errorInvalidFlash'); return; } const modifierFactor = Math.sqrt(Math.pow(2, -modifierLoss)); const effectiveGn = gn * Math.sqrt(iso / 100) * modifierFactor; let resultHtml = '', titleKey = ''; if (mode === 'aperture') { if (isNaN(distance) || isNaN(power) || distance <= 0) { _showMessage(_dom.flash.messageArea, 'error', 'errorInvalidFlash'); return; } const result = (effectiveGn * Math.sqrt(power)) / distance; titleKey = 'resultAperture'; resultHtml = `<p class="text-4xl result-text mt-1">f/${result.toFixed(1)}</p>`; } else if (mode === 'distance') { if (isNaN(aperture) || isNaN(power) || aperture <= 0) { _showMessage(_dom.flash.messageArea, 'error', 'errorInvalidFlash'); return; } const result = (effectiveGn * Math.sqrt(power)) / aperture; titleKey = 'resultDistance'; resultHtml = `<p class="text-4xl result-text mt-1">${result.toFixed(1)}<span class="text-2xl ml-2 opacity-75">${langData.unitMeter}</span></p>`; } else if (mode === 'power') { if (isNaN(aperture) || isNaN(distance) || aperture <= 0 || distance <= 0) { _showMessage(_dom.flash.messageArea, 'error', 'errorInvalidFlash'); return; } const requiredPower = Math.pow((aperture * distance) / effectiveGn, 2); if (requiredPower > 1 || !isFinite(requiredPower)) { _showMessage(_dom.flash.messageArea, 'error', 'errorOutOfRange'); return;} const closestPower = _flashData.flashPowers.reduce((prev, curr) => Math.abs(curr.value - requiredPower) < Math.abs(prev.value - requiredPower) ? curr : prev); titleKey = 'resultPower'; resultHtml = `<p class="text-4xl result-text mt-1">${closestPower.name}</p>`; } if (resultHtml) { _showMessage(_dom.flash.messageArea, 'result', null, `<p class="text-lg result-label">${langData[titleKey]}</p>${resultHtml}`); } };
    const _startTimer = (totalSeconds) => { if (!isFinite(totalSeconds) || totalSeconds < 0) return; _dom.mainContent.classList.add('hidden'); _dom.timer.card.classList.remove('hidden', 'finished'); document.body.classList.remove('flashing'); let remaining = Math.round(totalSeconds); _dom.timer.display.textContent = _formatTime(remaining, false); if (_timerInterval) clearInterval(_timerInterval); if (_alarmInterval) clearInterval(_alarmInterval); _timerInterval = setInterval(() => { remaining--; const formattedTime = _formatTime(remaining, false); _dom.timer.display.textContent = formattedTime; document.title = `(${formattedTime}) ${_originalTitle}`; if (remaining <= 0) { clearInterval(_timerInterval); const langData = _translations[_currentLanguage]; _dom.timer.display.textContent = langData.timerComplete; document.title = `✅ ${langData.timerComplete}`; _dom.timer.card.classList.add('finished'); _alarmInterval = setInterval(() => { _playBeep(); document.body.classList.toggle('flashing'); }, 1000); } }, 1000); };
    const _stopTimer = () => { clearInterval(_timerInterval); clearInterval(_alarmInterval); _timerInterval = _alarmInterval = null; document.body.classList.remove('flashing'); _dom.timer.card.classList.add('hidden'); _dom.mainContent.classList.remove('hidden'); _dom.tabs.reciprocity.click(); document.title = _originalTitle; };
    const _openSaveModal = () => { _tempPValue = parseFloat(_dom.reciprocity.customInput.value); if (!_tempPValue || _tempPValue <= 1.0) { _showMessage(_dom.reciprocity.messageArea, 'error', 'errorInvalidFactor'); return; } _dom.modals.saveNameInput.value = ''; _dom.modals.save.classList.remove('hidden'); _dom.modals.saveNameInput.focus(); };
    const _closeSaveModal = () => _dom.modals.save.classList.add('hidden');
    const _confirmSaveCustomFilm = () => { const name = _dom.modals.saveNameInput.value.trim(); const allFilms = [..._filmData, ...JSON.parse(localStorage.getItem('customFilms') || '[]')]; if(!name) { _showMessage(_dom.reciprocity.messageArea, 'error', 'errorInvalidName'); return; } if(allFilms.some(f => f.name.toLowerCase() === name.toLowerCase())) { _showMessage(_dom.reciprocity.messageArea, 'error', 'errorDuplicateName'); return; } const customFilms = JSON.parse(localStorage.getItem('customFilms') || '[]') || []; const newFilm = { id: `custom_${Date.now()}`, name: name, p: _tempPValue }; customFilms.push(newFilm); localStorage.setItem('customFilms', JSON.stringify(customFilms)); _populateFilmSelect(); _dom.reciprocity.filmSelect.value = newFilm.id; _handleFilmSelectChange(); _closeSaveModal(); };
    const _openDeleteModal = () => { const selectedOption = _dom.reciprocity.filmSelect.options[_dom.reciprocity.filmSelect.selectedIndex]; _filmToDelete = { id: selectedOption.value, name: selectedOption.text }; _dom.modals.deleteText.textContent = _translations[_currentLanguage].modalDeleteText.replace('{filmName}', _filmToDelete.name); _dom.modals.delete.classList.remove('hidden'); };
    const _closeDeleteModal = () => { _dom.modals.delete.classList.add('hidden'); _filmToDelete = null; };
    const _confirmDeleteFilm = () => { if (!_filmToDelete) return; let customFilms = JSON.parse(localStorage.getItem('customFilms') || '[]') || []; customFilms = customFilms.filter(f => f.id !== _filmToDelete.id); localStorage.setItem('customFilms', JSON.stringify(customFilms)); _populateFilmSelect(); _closeDeleteModal(); };
    const _saveState = () => { const stateToSave = { filmSelect: _dom.reciprocity.filmSelect.value, ndSelect: _dom.reciprocity.ndSelect.value, focalLength: _dom.reciprocity.focalLengthInput.value, bellowsExtension: _dom.reciprocity.bellowsExtensionInput.value, meteredMin: _dom.reciprocity.minInput.value, meteredSec: _dom.reciprocity.secInput.value, dofFormat: _dom.dof.format.value, dofFocalLength: _dom.dof.focalLength.value, dofAperture: _dom.dof.aperture.value, dofDistance: _dom.dof.distance.value, flashMode: document.querySelector('input[name="flash-mode"]:checked')?.value, flashGn: _dom.flash.gnInput.value, flashIso: _dom.flash.isoInput.value, flashModifier: _dom.flash.modifierSelect.value, flashAperture: _dom.flash.apertureInput.value, flashDistance: _dom.flash.distanceInput.value, flashPower: _dom.flash.powerSelect.value, }; localStorage.setItem('filmToolkitState', JSON.stringify(stateToSave)); };
    const _loadState = () => { const saved = JSON.parse(localStorage.getItem('filmToolkitState') || '{}'); if (!Object.keys(saved).length) return; _dom.reciprocity.filmSelect.value = saved.filmSelect || ''; _dom.reciprocity.ndSelect.value = saved.ndSelect || '1'; _dom.reciprocity.focalLengthInput.value = saved.focalLength || ''; _dom.reciprocity.bellowsExtensionInput.value = saved.bellowsExtension || ''; _dom.reciprocity.minInput.value = saved.meteredMin || ''; _dom.reciprocity.secInput.value = saved.meteredSec || '30'; _dom.dof.format.value = saved.dofFormat || _dofData.sensorFormats[0].coc; _dom.dof.focalLength.value = saved.dofFocalLength || ''; _dom.dof.aperture.value = saved.dofAperture || ''; _dom.dof.distance.value = saved.dofDistance || ''; const flashModeRadio = document.querySelector(`input[name="flash-mode"][value="${saved.flashMode || 'aperture'}"]`); if (flashModeRadio) flashModeRadio.checked = true; _dom.flash.gnInput.value = saved.flashGn || ''; _dom.flash.isoInput.value = saved.flashIso || '100'; _dom.flash.modifierSelect.value = saved.flashModifier || '0'; _dom.flash.apertureInput.value = saved.flashAperture || ''; _dom.flash.distanceInput.value = saved.flashDistance || ''; _dom.flash.powerSelect.value = saved.flashPower || '1'; };

    // --- APP INITIALIZATION ---
    function _initializeApp() {
        Object.assign(_dom, {
            mainContent: document.getElementById('main-content'), themeSwitcher: document.getElementById('theme-switcher'), langSwitcher: document.getElementById('lang-switcher'),
            globalTooltip: document.getElementById('global-tooltip'),
            tabs: { reciprocity: document.getElementById('tab-reciprocity'), dof: document.getElementById('tab-dof'), flash: document.getElementById('tab-flash') },
            panelsContainer: document.getElementById('panels-container'),
            panelsWrapper: document.getElementById('panels-wrapper'),
            reciprocity: { filmSelect: document.getElementById('film-select'), deleteArea: document.getElementById('delete-film-area'), deleteBtn: document.getElementById('delete-film-btn'), customGroup: document.getElementById('custom-factor-group'), customInput: document.getElementById('custom-factor'), saveBtn: document.getElementById('save-custom-btn'), ndSelect: document.getElementById('nd-filter-select'), minInput: document.getElementById('metered-time-min'), secInput: document.getElementById('metered-time-sec'), calculateBtn: document.getElementById('calculate-btn'), messageArea: document.getElementById('message-area'), focalLengthInput: document.getElementById('focal-length'), bellowsExtensionInput: document.getElementById('bellows-extension'), shutterSpeedSelect: document.getElementById('shutter-speed-select') },
            dof: { format: document.getElementById('dof-format'), focalLength: document.getElementById('dof-focal-length'), aperture: document.getElementById('dof-aperture'), distance: document.getElementById('dof-distance'), calculateBtn: document.getElementById('calculate-dof-btn'), messageArea: document.getElementById('dof-message-area') },
            flash: { gnInput: document.getElementById('flash-gn'), isoInput: document.getElementById('flash-iso'), powerSelect: document.getElementById('flash-power'), distanceInput: document.getElementById('flash-distance'), apertureInput: document.getElementById('flash-aperture'), calculateBtn: document.getElementById('calculate-flash-btn'), messageArea: document.getElementById('flash-message-area'), calcModeRadios: document.querySelectorAll('input[name="flash-mode"]'), modifierSelect: document.getElementById('flash-modifier'), apertureGroup: document.getElementById('flash-aperture-group'), distanceGroup: document.getElementById('flash-distance-group'), powerGroup: document.getElementById('flash-power-group') },
            timer: { card: document.getElementById('timer-card'), display: document.getElementById('timer-display'), stopBtn: document.getElementById('stop-timer-btn') },
            modals: { save: document.getElementById('save-modal'), saveNameInput: document.getElementById('custom-film-name'), cancelSave: document.getElementById('cancel-save-btn'), confirmSave: document.getElementById('confirm-save-btn'), delete: document.getElementById('delete-modal'), deleteText: document.getElementById('delete-confirm-text'), cancelDelete: document.getElementById('cancel-delete-btn'), confirmDelete: document.getElementById('confirm-delete-btn') }
        });

        _dom.mainContent.style.visibility = 'visible';

        // ... 在 _initializeApp 函数内部 ...

        // --- 输入体验优化逻辑 ---
        //const standardApertures = [1.4, 2, 2.8, 4, 5.6, 8, 11, 16, 22];
        //const apertureQuickSelectBar = document.getElementById('aperture-quick-select');
        // 旧的 "输入体验优化逻辑" 部分可以整个删除或注释掉

        // --- 新的、更完整的输入体验优化逻辑 ---
        const standardApertures = [1.4, 2, 2.8, 4, 5.6, 8, 11, 16, 22];
        const standardIsos = [50, 100, 200, 400, 800, 1600, 3200];

        // 1. 动态创建快速选择按钮 (Chips)
        function createQuickChips(containerId, values, prefix = '', suffix = '') {
            const container = document.getElementById(containerId);
            if (!container) return;
            values.forEach(val => {
                const chip = document.createElement('button');
                chip.type = 'button';
                chip.className = 'quick-select-chip';
                chip.textContent = `${prefix}${val}${suffix}`;
                chip.dataset.value = val;
                chip.dataset.family = containerId; // 标记同组按钮
                container.appendChild(chip);
            });
        }
        createQuickChips('aperture-quick-select', standardApertures, 'f/');
        createQuickChips('flash-aperture-quick-select', standardApertures, 'f/');
        createQuickChips('iso-quick-select', standardIsos);


        // 2. 为所有快速选择按钮和步进器按钮添加统一的事件委托监听
        document.getElementById('main-content').addEventListener('click', function(e) {
            const target = e.target;

            // A. 处理步进器按钮 (+/-)
            if (target.classList.contains('stepper-btn')) {
                const inputId = target.dataset.target;
                const step = parseFloat(target.dataset.step);
                const inputEl = document.getElementById(inputId);
                if (!inputEl) return;

                let currentValue = parseFloat(inputEl.value) || 0;
                if (target.classList.contains('stepper-plus')) {
                    currentValue += step;
                } else {
                    currentValue -= step;
                }

                // 保证数值不小于0，并处理浮点数精度问题
                inputEl.value = Math.max(0, parseFloat(currentValue.toFixed(4)));
                // 手动触发input事件，以便状态保存逻辑能捕捉到变化
                inputEl.dispatchEvent(new Event('input'));
            }

            // B. 处理快速选择按钮 (Chips)
            if (target.classList.contains('quick-select-chip')) {
                const value = target.dataset.value;
                const family = target.dataset.family;
                let inputEl;

                // 根据按钮组确定要操作的输入框
                if (family === 'aperture-quick-select') {
                    inputEl = document.getElementById('dof-aperture');
                } else if (family === 'flash-aperture-quick-select') {
                    inputEl = document.getElementById('flash-aperture');
                } else if (family === 'iso-quick-select') {
                    inputEl = document.getElementById('flash-iso');
                }

                if (inputEl) {
                    inputEl.value = value;
                    inputEl.dispatchEvent(new Event('input')); // 同样触发事件
                }
            }
        });

        // 3. 监听输入框变化，同步快速选择按钮的激活状态
        function syncChipsToInput(inputId, chipFamily) {
            const inputEl = document.getElementById(inputId);
            const chips = document.querySelectorAll(`.quick-select-chip[data-family="${chipFamily}"]`);
            if (!inputEl || chips.length === 0) return;

            inputEl.addEventListener('input', function() {
                const currentValue = parseFloat(this.value);
                chips.forEach(chip => {
                    chip.classList.toggle('active', parseFloat(chip.dataset.value) === currentValue);
                });
            });
            // 初始化时也检查一次
            inputEl.dispatchEvent(new Event('input'));
        }

        syncChipsToInput('dof-aperture', 'aperture-quick-select');
        syncChipsToInput('flash-aperture', 'flash-aperture-quick-select');
        syncChipsToInput('flash-iso', 'iso-quick-select');
        // --- 输入体验优化逻辑结束 ---

        // 1. 动态创建光圈快速选择按钮
        standardApertures.forEach(f => {
            const chip = document.createElement('button');
            chip.type = 'button';
            chip.className = 'quick-select-chip';
            chip.textContent = `f/${f}`;
            chip.dataset.value = f;
            apertureQuickSelectBar.appendChild(chip);
        });

        // 2. 为所有快速选择按钮和步进器按钮添加统一的事件监听
        document.addEventListener('click', function(e) {
            const target = e.target;

            // 处理步进器按钮
            if (target.classList.contains('stepper-btn')) {
                const inputId = target.dataset.target;
                const step = parseFloat(target.dataset.step);
                const inputEl = document.getElementById(inputId);
                if (!inputEl) return;

                let currentValue = parseFloat(inputEl.value) || 0;
                if (target.classList.contains('stepper-plus')) {
                    currentValue += step;
                } else {
                    currentValue -= step;
                }

                // 保证数值不小于0，并处理浮点数精度问题
                inputEl.value = Math.max(0, parseFloat(currentValue.toFixed(2)));
                // 手动触发input事件，以便我们的状态保存逻辑能捕捉到变化
                inputEl.dispatchEvent(new Event('input'));
            }

            // 处理光圈快速选择按钮
            if (target.classList.contains('quick-select-chip')) {
                const value = target.dataset.value;
                const apertureInput = document.getElementById('dof-aperture');
                apertureInput.value = value;
                apertureInput.dispatchEvent(new Event('input'));

                // 更新快速选择按钮的激活状态
                document.querySelectorAll('.quick-select-chip').forEach(c => c.classList.remove('active'));
                target.classList.add('active');
            }
        });

        // 3. 监听光圈输入框，以同步快速选择按钮的激活状态
        const dofApertureInput = document.getElementById('dof-aperture');
        dofApertureInput.addEventListener('input', function() {
            const currentValue = parseFloat(this.value);
            document.querySelectorAll('.quick-select-chip').forEach(chip => {
                chip.classList.toggle('active', parseFloat(chip.dataset.value) === currentValue);
            });
        });

        // ... 函数内其他代码 ...

        const debouncedSaveState = _debounce(_saveState, 500);

        _setTheme(localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
        _setLanguage(localStorage.getItem('language') || 'zh');
        _loadState();

        const showTooltip = (trigger) => {
            const tooltipText = _translations[_currentLanguage][trigger.dataset.tooltipKey];
            if (!tooltipText) return;

            _dom.globalTooltip.textContent = tooltipText;
            const triggerRect = trigger.getBoundingClientRect();
            _dom.globalTooltip.classList.add('visible');

            const top = triggerRect.top - _dom.globalTooltip.offsetHeight - 8;
            const left = triggerRect.left + (triggerRect.width / 2) - (_dom.globalTooltip.offsetWidth / 2);

            _dom.globalTooltip.style.top = `${top}px`;
            _dom.globalTooltip.style.left = `${left}px`;
        };

        const hideTooltip = () => {
            _dom.globalTooltip.classList.remove('visible');
        };

        document.querySelectorAll('.tooltip-trigger').forEach(trigger => {
            trigger.addEventListener('mouseenter', () => showTooltip(trigger));
            trigger.addEventListener('mouseleave', hideTooltip);
            trigger.addEventListener('focus', () => showTooltip(trigger));
            trigger.addEventListener('blur', hideTooltip);
        });

        _dom.themeSwitcher.addEventListener('click', () => _setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'));
        _dom.langSwitcher.addEventListener('click', () => { _setLanguage(_currentLanguage === 'zh' ? 'en' : 'zh'); });

        const tabs = Object.values(_dom.tabs);
        tabs.forEach((tab, index) => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => { t.classList.remove('active'); t.setAttribute('aria-selected', 'false'); });
                tab.classList.add('active'); tab.setAttribute('aria-selected', 'true');
                _dom.panelsContainer.style.transform = `translateX(-${index * 100}%)`;
            });
        });

        let touchStartX = 0, touchStartY = 0;
        _dom.mainContent.addEventListener('touchstart', (e) => { touchStartX = e.changedTouches[0].screenX; touchStartY = e.changedTouches[0].screenY; }, { passive: true });
        _dom.mainContent.addEventListener('touchend', (e) => {
            const touchEndX = e.changedTouches[0].screenX; const touchEndY = e.changedTouches[0].screenY;
            const deltaX = touchEndX - touchStartX; const deltaY = touchEndY - touchStartY;
            if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
                // MODIFICATION: Hide tooltip on swipe
                hideTooltip();
                const currentActiveIndex = tabs.findIndex(tab => tab.classList.contains('active'));
                if (deltaX < 0 && currentActiveIndex < tabs.length - 1) {
                    tabs[currentActiveIndex + 1].click();
                } else if (deltaX > 0 && currentActiveIndex > 0) {
                    tabs[currentActiveIndex - 1].click();
                }
            }
        }, { passive: true });

        _dom.reciprocity.calculateBtn.addEventListener('click', _handleReciprocityCalculate);
        _dom.dof.calculateBtn.addEventListener('click', _handleDofCalculate);
        _dom.flash.calculateBtn.addEventListener('click', _handleFlashCalculate);
        _dom.timer.stopBtn.addEventListener('click', _stopTimer);

        _dom.reciprocity.saveBtn.addEventListener('click', _openSaveModal);
        _dom.modals.cancelSave.addEventListener('click', _closeSaveModal);
        _dom.modals.confirmSave.addEventListener('click', _confirmSaveCustomFilm);
        _dom.reciprocity.deleteBtn.addEventListener('click', _openDeleteModal);
        _dom.modals.cancelDelete.addEventListener('click', _closeDeleteModal);
        _dom.modals.confirmDelete.addEventListener('click', _confirmDeleteFilm);

        const handleManualTimeInput = () => { _dom.reciprocity.shutterSpeedSelect.value = ''; _dom.reciprocity.messageArea.innerHTML = ''; debouncedSaveState(); };
        _dom.reciprocity.minInput.addEventListener('input', handleManualTimeInput);
        _dom.reciprocity.secInput.addEventListener('input', handleManualTimeInput);
        _dom.reciprocity.shutterSpeedSelect.addEventListener('change', (e) => {
            const time = parseFloat(e.target.value);
            if (!isNaN(time)) { _dom.reciprocity.minInput.value = ''; _dom.reciprocity.secInput.value = time; }
            _dom.reciprocity.messageArea.innerHTML = ''; debouncedSaveState();
        });

        _dom.reciprocity.filmSelect.addEventListener('change', () => { _handleFilmSelectChange(); debouncedSaveState(); });
        _dom.flash.calcModeRadios.forEach(radio => radio.addEventListener('change', () => { _updateFlashUI(radio.value); debouncedSaveState(); }));

        const numericInputs = [ _dom.reciprocity.customInput, _dom.reciprocity.focalLengthInput, _dom.reciprocity.bellowsExtensionInput, _dom.reciprocity.minInput, _dom.reciprocity.secInput, _dom.dof.focalLength, _dom.dof.aperture, _dom.dof.distance, _dom.flash.gnInput, _dom.flash.isoInput, _dom.flash.apertureInput, _dom.flash.distanceInput ];
        numericInputs.forEach(inputEl => {
            if(inputEl) {
                inputEl.addEventListener('keydown', _restrictInputToNumeric);
                inputEl.addEventListener('input', _cleanNumericInput);
            }
        });

        document.querySelectorAll('input, .select').forEach(el => {
            el.addEventListener('input', debouncedSaveState);
            el.addEventListener('change', debouncedSaveState);
        });
        document.querySelectorAll('.btn-ripple').forEach(button => button.addEventListener("click", _createRipple));

        _handleFilmSelectChange();
        _updateFlashUI(document.querySelector('input[name="flash-mode"]:checked')?.value || 'aperture');
        _dom.tabs.reciprocity.click();

        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('sw.js')
            .then(reg => console.log('Service Worker registered.', reg))
            .catch(err => console.error('Service Worker registration failed:', err));
        }
    }

    function _start() {
        if (window.appDataString) {
            try {
                const data = window.appDataString; // Already an object
                const appData = data.appData;
                _translations = appData.translations;
                _filmData = appData.films;
                _reciprocityData = appData.reciprocity;
                _dofData = appData.dof;
                _flashData = appData.flash;
                _initializeApp();
            } catch(e) {
                 console.error("Fatal: Failed to parse injected data.", e);
                 document.body.innerHTML = '<div style="text-align: center; padding-top: 50px; font-family: sans-serif; color: #E6EDF3;">Failed to parse application data.</div>';
            }
        } else {
            // If data is not yet available, wait a bit and try again.
            setTimeout(_start, 100);
        }
    }

    _start();
};