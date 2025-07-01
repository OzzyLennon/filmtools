// ** 最终修正版：修复了所有已知问题 **

document.addEventListener('DOMContentLoaded', function() {
    // --- DATA & CONFIG ---
    let _translations = {}, _filmData = [], _reciprocityData = {}, _dofData = {}, _flashData = {};

    // --- GLOBAL STATE & UTILITIES ---
    let _currentLanguage = 'zh';
    const _dom = {};
    let _timerInterval, _alarmInterval, _audioCtx, _tempPValue = 0, _filmToDelete = null;
    const _originalTitle = document.title;
    let isUpdatingFromSelect = false;
    const sunIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`;
    const moonIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`;

    const _restrictInputToNumeric = (e) => { if ([46, 8, 9, 27, 13, 110, 190, 37, 39].includes(e.keyCode) || (e.keyCode === 65 && (e.ctrlKey || e.metaKey)) || (e.keyCode === 67 && (e.ctrlKey || e.metaKey)) || (e.keyCode === 86 && (e.ctrlKey || e.metaKey)) || (e.keyCode === 88 && (e.ctrlKey || e.metaKey))) { if ((e.keyCode === 190 || e.keyCode === 110) && e.target.value.includes('.')) e.preventDefault(); return; } if ((e.shiftKey || (e.keyCode < 48 || e.keyCode > 57)) && (e.keyCode < 96 || e.keyCode > 105)) e.preventDefault(); };
    const _cleanNumericInput = (e) => { e.target.value = e.target.value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1'); };
    const _formatTime = (s, units = true) => { const langData = _translations[_currentLanguage]; if (isNaN(s) || s === null || s < 0 || !isFinite(s)) return units ? "N/A" : "00:00"; const t = Math.round(s); if (!units) { const m = String(Math.floor(t / 60)).padStart(2, '0'); const sec = String(t % 60).padStart(2, '0'); return `${m}:${sec}` } if (t < 60) return `${t.toFixed(t > 10 ? 0 : 1)} ${langData.timeUnitSec}`; const m = Math.floor(t / 60); const sec = t % 60; return `${m} ${langData.timeUnitMin} ${sec.toFixed(0)} ${langData.timeUnitSec}` };
    const _playBeep = () => { if (!_audioCtx) _audioCtx = new(window.AudioContext || window.webkitAudioContext)(); const osc = _audioCtx.createOscillator(); osc.type = 'sine'; osc.frequency.setValueAtTime(880, _audioCtx.currentTime); osc.connect(_audioCtx.destination); osc.start(); osc.stop(_audioCtx.currentTime + 0.2); };
    const _createRipple = (e) => { const btn = e.currentTarget; anime.remove(btn); anime({ targets: btn, scale: [1, 0.95], duration: 200, easing: 'easeOutQuad', direction: 'alternate' }); const r = document.createElement("span"); const rect = btn.getBoundingClientRect(); r.style.left = `${e.clientX - rect.left}px`; r.style.top = `${e.clientY - rect.top}px`; r.classList.add("ripple"); const existing = btn.querySelector(".ripple"); if (existing) existing.remove(); btn.appendChild(r); };
    const _debounce = (func, wait) => { let timeout; return function(...args) { clearTimeout(timeout); timeout = setTimeout(() => func.apply(this, args), wait); }; };
    const _setTheme = (theme) => { document.documentElement.setAttribute('data-theme', theme); localStorage.setItem('theme', theme); _dom.themeSwitcher.innerHTML = theme === 'dark' ? sunIcon : moonIcon; _dom.themeSwitcher.setAttribute('aria-label', theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'); document.querySelector('meta[name="theme-color"]').setAttribute('content', theme === 'dark' ? '#0D1117' : '#ffffff'); };
    const _populateGenericSelect = (selectEl, data, textKey, valueKey) => { if (!selectEl) return; const langData = _translations[_currentLanguage]; selectEl.innerHTML = ''; data.forEach(item => { const opt = document.createElement('option'); opt.value = item[valueKey]; opt.textContent = langData[item[textKey]] || item[textKey] || item.name; selectEl.appendChild(opt); }); };
    const _populateShutterSpeedSelect = () => { if (!_dom.reciprocity.shutterSpeedSelect) return; _dom.reciprocity.shutterSpeedSelect.innerHTML = ''; _reciprocityData.shutterSpeeds.forEach(s => { const opt = document.createElement('option'); opt.value = s.value; opt.textContent = s.name === "placeholder" ? _translations[_currentLanguage].placeholderShutterSpeed : s.name; if (s.name === "placeholder") { opt.disabled = true; opt.selected = true; } _dom.reciprocity.shutterSpeedSelect.appendChild(opt); }); };
    const _populateFilmSelect = () => { if (!_dom.reciprocity.filmSelect) return; const customFilms = JSON.parse(localStorage.getItem('customFilms') || '[]') || []; const allFilms = [..._filmData, ...customFilms]; const currentVal = _dom.reciprocity.filmSelect.value; _dom.reciprocity.filmSelect.innerHTML = ''; const customTemplate = allFilms.find(f => f.id === 'custom'); const sortedFilms = allFilms.filter(f => f.id !== 'custom').sort((a, b) => a.name.localeCompare(b.name, _currentLanguage === 'zh' ? 'zh-Hans-CN' : 'en-US'));[...sortedFilms, customTemplate].forEach(film => { if (!film) return; const option = document.createElement('option'); option.value = film.id; option.textContent = film.id === "custom" ? _translations[_currentLanguage].customFilmOption : film.name; _dom.reciprocity.filmSelect.appendChild(option); }); if (document.querySelector(`#film-select option[value="${currentVal}"]`)) { _dom.reciprocity.filmSelect.value = currentVal; } else if (sortedFilms.length > 0) { _dom.reciprocity.filmSelect.value = sortedFilms[0].id; } else if (customTemplate) { _dom.reciprocity.filmSelect.value = customTemplate.id; } _handleFilmSelectChange(); };
    const _populateAllSelects = () => { _populateFilmSelect(); _populateShutterSpeedSelect(); _populateGenericSelect(_dom.reciprocity.ndSelect, _reciprocityData.ndFilters, 'key', 'factor'); _populateGenericSelect(_dom.dof.format, _dofData.sensorFormats, 'key', 'coc'); _populateGenericSelect(_dom.flash.modifierSelect, _flashData.flashModifiers, 'key', 'loss'); _populateGenericSelect(_dom.flash.powerSelect, _flashData.flashPowers, 'name', 'value'); };
    const _setLanguage = (lang) => { _currentLanguage = lang; localStorage.setItem('language', lang); document.documentElement.lang = lang; const langData = _translations[lang]; document.querySelectorAll('[data-lang-key]').forEach(el => { el.textContent = langData[el.dataset.langKey] || ''; }); document.querySelectorAll('[data-lang-placeholder]').forEach(el => { el.placeholder = langData[el.dataset.langPlaceholder] || ""; }); if (_dom.langSwitcher) _dom.langSwitcher.textContent = langData.langSwitch; _populateAllSelects(); };
    const _handleFilmSelectChange = () => { _dom.reciprocity.messageArea.innerHTML = ''; const isCustom = _dom.reciprocity.filmSelect.value === 'custom'; const isSavedCustom = _dom.reciprocity.filmSelect.value?.startsWith('custom_'); _dom.reciprocity.customGroup.classList.toggle('hidden', !isCustom); _dom.reciprocity.deleteArea.classList.toggle('hidden', !isSavedCustom); };
    const _updateFlashUI = (mode) => { _dom.flash.apertureGroup.classList.toggle('hidden', mode === 'aperture'); _dom.flash.distanceGroup.classList.toggle('hidden', mode === 'distance'); _dom.flash.powerGroup.classList.toggle('hidden', mode === 'power'); _dom.flash.messageArea.innerHTML = ''; };
    const _showMessage = (area, type, titleKey, content, finalTime) => {
        area.innerHTML = ''; const langData = _translations[_currentLanguage]; let title = titleKey ? (langData[titleKey]?.title || langData[titleKey]) : ''; let cardHtml = ''; const cardId = `card-${Date.now()}`; const cardClasses = type === 'error' ? 'error-message p-4 text-center' : 'card p-5 text-center';
        if (type === 'result' && area === _dom.reciprocity.messageArea) { cardHtml = `<div id="${cardId}" class="${cardClasses}" style="opacity:0"><p class="text-lg result-label">${title}</p><p id="animated-result" class="text-4xl result-text mb-4">0</p><button id="start-timer-btn" type="button" data-time="${finalTime}" class="text-white w-full font-bold rounded-lg text-lg px-5 py-3 text-center mt-4 btn-ripple" style="background-color: var(--success-color);">${langData.btnStartTimer}</button></div>`; } else if (type === 'result') { cardHtml = `<div id="${cardId}" class="${cardClasses}" style="opacity:0">${content}</div>`; } else { const messageContent = langData[titleKey]?.content || content || ''; cardHtml = `<div id="${cardId}" class="${cardClasses}" style="opacity:0"><p class="font-bold">${title}</p><p>${messageContent}</p></div>`; }
        area.innerHTML = cardHtml; const cardElement = document.getElementById(cardId); anime({ targets: cardElement, opacity: [0, 1], translateY: [20, 0], scale: [0.95, 1], duration: 500, easing: 'easeOutCubic' });
        const animatedResultEl = document.getElementById('animated-result');
        if (animatedResultEl && isFinite(finalTime) && finalTime > 0) { const animationParams = { value: finalTime }; anime({ targets: animationParams, value: [0, finalTime], duration: 1200, easing: 'easeOutQuint', round: 100, update: function() { animatedResultEl.innerHTML = _formatTime(animationParams.value); }, complete: function() { animatedResultEl.innerHTML = _formatTime(finalTime); } }); } else if (animatedResultEl) { animatedResultEl.innerHTML = content; }
        const startTimerBtn = document.getElementById('start-timer-btn'); if (startTimerBtn) { startTimerBtn.addEventListener('click', e => _startTimer(parseFloat(e.target.dataset.time))); startTimerBtn.addEventListener("click", _createRipple); }
    };
    const _evaluateFormula = (formula, tm) => { const { pow, log10, sqrt } = Math; try { return new Function('tm', 'pow', 'log10', 'sqrt', `return ${formula}`)(tm, pow, log10, sqrt); } catch (e) { console.error("Formula evaluation error:", e); return -1; } };
    const _calculateByRules = (tm, rules) => { for (const rule of rules) { if (rule.condition === undefined || rule.condition === null || _evaluateFormula(rule.condition, tm)) { return _evaluateFormula(rule.formula, tm); } } return -1; };
    const _handleReciprocityCalculate = () => { const mVal=parseFloat(_dom.reciprocity.minInput.value)||0, sVal=parseFloat(_dom.reciprocity.secInput.value)||0, bTime=(mVal*60)+sVal; if(bTime<=0){_showMessage(_dom.reciprocity.messageArea,'error','errorInvalidTime');return} const ndFactor=parseFloat(_dom.reciprocity.ndSelect.value)||1, fLen=parseFloat(_dom.reciprocity.focalLengthInput.value), bExt=parseFloat(_dom.reciprocity.bellowsExtensionInput.value); let bFactor=1; if(fLen>0&&bExt>fLen){bFactor=(bExt/fLen)**2} const tbr=bTime*ndFactor*bFactor; if(!isFinite(tbr)){_showMessage(_dom.reciprocity.messageArea,'error','errorInvalidTime');return} const filmId=_dom.reciprocity.filmSelect.value, allFilms=[..._filmData,...JSON.parse(localStorage.getItem('customFilms')||'[]')], film=allFilms.find(f=>f.id===filmId); if(!film){_showMessage(_dom.reciprocity.messageArea,'error','errorNoFilm');return} let pVal=film.p; if(filmId==='custom'){const cP=parseFloat(_dom.reciprocity.customInput.value);if(!cP||cP<=1.0){_showMessage(_dom.reciprocity.messageArea,'error','errorInvalidFactor');return} pVal=cP} let tc; if(film.rules){tc=_calculateByRules(tbr,film.rules)}else if(pVal){tc=tbr>1?tbr**pVal:tbr}else{tc=tbr} if(!isFinite(tc)||tc<0){_showMessage(_dom.reciprocity.messageArea,'error','errorOutOfRange')}else if(tc<1&&Math.abs(tc-tbr)<0.1){_showMessage(_dom.reciprocity.messageArea,'info','infoNoCompensation')}else{_showMessage(_dom.reciprocity.messageArea,'result','resultCorrectedTime',_formatTime(tc),tc)} };
    const _handleDofCalculate = () => { const fLen=parseFloat(_dom.dof.focalLength.value), apt=parseFloat(_dom.dof.aperture.value), coc=parseFloat(_dom.dof.format.value), dist=parseFloat(_dom.dof.distance.value)*1000; if(!fLen||!apt||!coc||!dist||fLen<=0||apt<=0||dist<=0){_showMessage(_dom.dof.messageArea,'error','errorInvalidDof');return} const H=(fLen**2)/(apt*coc)+fLen, near=(H*dist)/(H+(dist-fLen)), far=(H*dist)/(H-(dist-fLen)), langData=_translations[_currentLanguage]; const resultHtml=`<div class="space-y-3 text-lg"><div class="flex justify-between items-baseline"><p class="result-label">${langData.resultDofNear}</p><p class="result-text font-bold text-2xl">${(near/1000).toFixed(2)}m</p></div><div class="flex justify-between items-baseline"><p class="result-label">${langData.resultDofFar}</p><p class="result-text font-bold text-2xl">${(isFinite(far)&&far>0?(far/1000).toFixed(2)+'m':'∞')}</p></div><div class="flex justify-between items-baseline"><p class="result-label">${langData.resultDofTotal}</p><p class="result-text font-bold text-2xl">${(isFinite(far)&&far>0?((far-near)/1000).toFixed(2)+'m':'∞')}</p></div><div class="flex justify-between items-baseline"><p class="result-label">${langData.resultHyperfocal}</p><p class="result-text font-bold text-2xl">${(H/1000).toFixed(2)}m</p></div></div>`; _showMessage(_dom.dof.messageArea,'result',null,resultHtml) };
    const _handleFlashCalculate = () => { const mode=document.querySelector('input[name="flash-mode"]:checked').value, gn=parseFloat(_dom.flash.gnInput.value), iso=parseFloat(_dom.flash.isoInput.value), modLoss=parseFloat(_dom.flash.modifierSelect.value), dist=parseFloat(_dom.flash.distanceInput.value), pwr=parseFloat(_dom.flash.powerSelect.value), apt=parseFloat(_dom.flash.apertureInput.value), langData=_translations[_currentLanguage]; if(!gn||!iso||gn<=0||iso<=0){_showMessage(_dom.flash.messageArea,'error','errorInvalidFlash');return} const modFactor=Math.sqrt(2**-modLoss), effGn=gn*Math.sqrt(iso/100)*modFactor; let resHtml='', titleKey=''; if(mode==='aperture'){if(isNaN(dist)||isNaN(pwr)||dist<=0){_showMessage(_dom.flash.messageArea,'error','errorInvalidFlash');return} const res=(effGn*Math.sqrt(pwr))/dist; titleKey='resultAperture'; resHtml=`<p class="text-4xl result-text mt-1">f/${res.toFixed(1)}</p>`}else if(mode==='distance'){if(isNaN(apt)||isNaN(pwr)||apt<=0){_showMessage(_dom.flash.messageArea,'error','errorInvalidFlash');return} const res=(effGn*Math.sqrt(pwr))/apt; titleKey='resultDistance'; resHtml=`<p class="text-4xl result-text mt-1">${res.toFixed(1)}<span class="text-2xl ml-2 opacity-75">${langData.unitMeter}</span></p>`}else if(mode==='power'){if(isNaN(apt)||isNaN(dist)||apt<=0||dist<=0){_showMessage(_dom.flash.messageArea,'error','errorInvalidFlash');return} const reqPwr=((apt*dist)/effGn)**2; if(reqPwr>1||!isFinite(reqPwr)){_showMessage(_dom.flash.messageArea,'error','errorOutOfRange');return} const clPwr=_flashData.flashPowers.reduce((p,c)=>Math.abs(c.value-reqPwr)<Math.abs(p.value-reqPwr)?c:p); titleKey='resultPower'; resHtml=`<p class="text-4xl result-text mt-1">${clPwr.name}</p>`} if(resHtml){_showMessage(_dom.flash.messageArea,'result',null,`<p class="text-lg result-label">${langData[titleKey]}</p>${resHtml}`)} };
    const _startTimer = (totalSeconds) => {
        if (!isFinite(totalSeconds) || totalSeconds < 0) return;
        if (window.Android && typeof window.Android.keepScreenOn === 'function') {
            window.Android.keepScreenOn(true);
        }
        _dom.mainContent.classList.add('hidden'); _dom.timer.card.classList.remove('hidden', 'finished'); document.body.classList.remove('flashing');
        const progressRing = document.getElementById('progress-ring'); const radius = progressRing.r.baseVal.value; const circumference = 2 * Math.PI * radius;
        progressRing.style.strokeDasharray = `${circumference} ${circumference}`; progressRing.style.strokeDashoffset = circumference;
        const setProgress = (percent) => { const offset = circumference - percent / 100 * circumference; progressRing.style.strokeDashoffset = offset; };
        let remaining = Math.round(totalSeconds); setProgress(100); _dom.timer.display.textContent = _formatTime(remaining, false);
        if (_timerInterval) clearInterval(_timerInterval); if (_alarmInterval) clearInterval(_alarmInterval);
        _timerInterval = setInterval(() => {
            remaining--; const percent = (remaining / totalSeconds) * 100; setProgress(percent);
            const formattedTime = _formatTime(remaining, false); _dom.timer.display.textContent = formattedTime; document.title = `(${formattedTime}) ${_originalTitle}`;
            if (remaining <= 0) {
                clearInterval(_timerInterval); const langData = _translations[_currentLanguage];
                _dom.timer.display.textContent = langData.timerComplete; document.title = `✅ ${langData.timerComplete}`;
                _dom.timer.card.classList.add('finished'); progressRing.style.strokeDashoffset = 0;
                _alarmInterval = setInterval(() => { _playBeep(); document.body.classList.toggle('flashing'); }, 1000);
            }
        }, 1000);
    };
    const _stopTimer = () => {
        if (window.Android && typeof window.Android.keepScreenOn === 'function') {
            window.Android.keepScreenOn(false);
        }
        clearInterval(_timerInterval); clearInterval(_alarmInterval); _timerInterval = _alarmInterval = null; document.body.classList.remove('flashing'); _dom.timer.card.classList.add('hidden'); _dom.mainContent.classList.remove('hidden'); _dom.tabs.reciprocity.click(); document.title = _originalTitle;
    };
    const _openSaveModal = () => { _tempPValue = parseFloat(_dom.reciprocity.customInput.value); if (!_tempPValue || _tempPValue <= 1.0) { _showMessage(_dom.reciprocity.messageArea, 'error', 'errorInvalidFactor'); return; } _dom.modals.saveNameInput.value = ''; _dom.modals.save.classList.remove('hidden'); _dom.modals.saveNameInput.focus(); };
    const _closeSaveModal = () => _dom.modals.save.classList.add('hidden');
    const _confirmSaveCustomFilm = () => { const name = _dom.modals.saveNameInput.value.trim(); const allFilms=[..._filmData,...JSON.parse(localStorage.getItem('customFilms')||'[]')]; if(!name){_showMessage(_dom.reciprocity.messageArea,'error','errorInvalidName');return} if(allFilms.some(f=>f.name.toLowerCase()===name.toLowerCase())){_showMessage(_dom.reciprocity.messageArea,'error','errorDuplicateName');return} const cFilms=JSON.parse(localStorage.getItem('customFilms')||'[]')||[], newFilm={id:`custom_${Date.now()}`,name:name,p:_tempPValue}; cFilms.push(newFilm); localStorage.setItem('customFilms',JSON.stringify(cFilms)); _populateFilmSelect(); _dom.reciprocity.filmSelect.value=newFilm.id; _handleFilmSelectChange(); _closeSaveModal() };
    const _openDeleteModal = () => { const selOpt = _dom.reciprocity.filmSelect.options[_dom.reciprocity.filmSelect.selectedIndex]; _filmToDelete = { id: selOpt.value, name: selOpt.text }; _dom.modals.deleteText.textContent = _translations[_currentLanguage].modalDeleteText.replace('{filmName}', _filmToDelete.name); _dom.modals.delete.classList.remove('hidden'); };
    const _closeDeleteModal = () => { _dom.modals.delete.classList.add('hidden'); _filmToDelete = null; };
    const _confirmDeleteFilm = () => { if (!_filmToDelete) return; let cFilms = JSON.parse(localStorage.getItem('customFilms') || '[]') || []; cFilms = cFilms.filter(f => f.id !== _filmToDelete.id); localStorage.setItem('customFilms', JSON.stringify(cFilms)); _populateFilmSelect(); _closeDeleteModal(); };
    const debouncedSaveState = _debounce(() => { if (!_dom) return; const sToSave={filmSelect:_dom.reciprocity.filmSelect.value,ndSelect:_dom.reciprocity.ndSelect.value,focalLength:_dom.reciprocity.focalLengthInput.value,bellowsExtension:_dom.reciprocity.bellowsExtensionInput.value,meteredMin:_dom.reciprocity.minInput.value,meteredSec:_dom.reciprocity.secInput.value,dofFormat:_dom.dof.format.value,dofFocalLength:_dom.dof.focalLength.value,dofAperture:_dom.dof.aperture.value,dofDistance:_dom.dof.distance.value,flashMode:document.querySelector('input[name="flash-mode"]:checked')?.value,flashGn:_dom.flash.gnInput.value,flashIso:_dom.flash.isoInput.value,flashModifier:_dom.flash.modifierSelect.value,flashAperture:_dom.flash.apertureInput.value,flashDistance:_dom.flash.distanceInput.value,flashPower:_dom.flash.powerSelect.value}; localStorage.setItem('filmToolkitState',JSON.stringify(sToSave))}, 500);
    const _loadState = () => { const s = JSON.parse(localStorage.getItem('filmToolkitState') || '{}'); if (!Object.keys(s).length) return; if(_dom.reciprocity.filmSelect) _dom.reciprocity.filmSelect.value=s.filmSelect||''; if(_dom.reciprocity.ndSelect) _dom.reciprocity.ndSelect.value=s.ndSelect||'1'; if(_dom.reciprocity.focalLengthInput) _dom.reciprocity.focalLengthInput.value=s.focalLength||''; if(_dom.reciprocity.bellowsExtensionInput) _dom.reciprocity.bellowsExtensionInput.value=s.bellowsExtension||''; if(_dom.reciprocity.minInput) _dom.reciprocity.minInput.value=s.meteredMin||''; if(_dom.reciprocity.secInput) _dom.reciprocity.secInput.value=s.meteredSec||'30'; if(_dom.dof.format) _dom.dof.format.value=s.dofFormat||_dofData.sensorFormats[0].coc; if(_dom.dof.focalLength) _dom.dof.focalLength.value=s.dofFocalLength||''; if(_dom.dof.aperture) _dom.dof.aperture.value=s.dofAperture||''; if(_dom.dof.distance) _dom.dof.distance.value=s.dofDistance||''; const fRadio=document.querySelector(`input[name="flash-mode"][value="${s.flashMode||'aperture'}"]`); if(fRadio)fRadio.checked=true; if(_dom.flash.gnInput) _dom.flash.gnInput.value=s.flashGn||''; if(_dom.flash.isoInput) _dom.flash.isoInput.value=s.flashIso||'100'; if(_dom.flash.modifierSelect) _dom.flash.modifierSelect.value=s.flashModifier||'0'; if(_dom.flash.apertureInput) _dom.flash.apertureInput.value=s.flashAperture||''; if(_dom.flash.distanceInput) _dom.flash.distanceInput.value=s.flashDistance||''; if(_dom.flash.powerSelect) _dom.flash.powerSelect.value=s.flashPower||'1'; };

    function createQuickChips(containerId, targetInputId, values, prefix = '', suffix = '') {
        const container = document.getElementById(containerId);
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

    function syncChipsToInput(inputId, containerId) {
        const inputEl = document.getElementById(inputId);
        const container = document.getElementById(containerId);
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

    function _initializeApp() {
        Object.assign(_dom, {
            mainContent: document.getElementById('main-content'), themeSwitcher: document.getElementById('theme-switcher'), langSwitcher: document.getElementById('lang-switcher'), globalTooltip: document.getElementById('global-tooltip'),
            tabs: { reciprocity: document.getElementById('tab-reciprocity'), dof: document.getElementById('tab-dof'), flash: document.getElementById('tab-flash') },
            panelsContainer: document.getElementById('panels-container'),
            reciprocity: { filmSelect: document.getElementById('film-select'), deleteArea: document.getElementById('delete-film-area'), deleteBtn: document.getElementById('delete-film-btn'), customGroup: document.getElementById('custom-factor-group'), customInput: document.getElementById('custom-factor'), saveBtn: document.getElementById('save-custom-btn'), ndSelect: document.getElementById('nd-filter-select'), minInput: document.getElementById('metered-time-min'), secInput: document.getElementById('metered-time-sec'), calculateBtn: document.getElementById('calculate-btn'), messageArea: document.getElementById('message-area'), focalLengthInput: document.getElementById('focal-length'), bellowsExtensionInput: document.getElementById('bellows-extension'), shutterSpeedSelect: document.getElementById('shutter-speed-select') },
            dof: { format: document.getElementById('dof-format'), focalLength: document.getElementById('dof-focal-length'), aperture: document.getElementById('dof-aperture'), distance: document.getElementById('dof-distance'), calculateBtn: document.getElementById('calculate-dof-btn'), messageArea: document.getElementById('dof-message-area') },
            flash: { gnInput: document.getElementById('flash-gn'), isoInput: document.getElementById('flash-iso'), powerSelect: document.getElementById('flash-power'), distanceInput: document.getElementById('flash-distance'), apertureInput: document.getElementById('flash-aperture'), calculateBtn: document.getElementById('calculate-flash-btn'), messageArea: document.getElementById('flash-message-area'), calcModeRadios: document.querySelectorAll('input[name="flash-mode"]'), modifierSelect: document.getElementById('flash-modifier'), apertureGroup: document.getElementById('flash-aperture-group'), distanceGroup: document.getElementById('flash-distance-group'), powerGroup: document.getElementById('flash-power-group') },
            timer: { card: document.getElementById('timer-card'), display: document.getElementById('timer-display'), stopBtn: document.getElementById('stop-timer-btn') },
            modals: { save: document.getElementById('save-modal'), saveNameInput: document.getElementById('custom-film-name'), cancelSave: document.getElementById('cancel-save-btn'), confirmSave: document.getElementById('confirm-save-btn'), delete: document.getElementById('delete-modal'), deleteText: document.getElementById('delete-confirm-text'), cancelDelete: document.getElementById('cancel-delete-btn'), confirmDelete: document.getElementById('confirm-delete-btn') }
        });

        _dom.mainContent.style.visibility = 'visible';

        _setTheme(localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
        _setLanguage(localStorage.getItem('language') || 'zh');
        _loadState();
        _handleFilmSelectChange();
        _updateFlashUI(document.querySelector('input[name="flash-mode"]:checked')?.value || 'aperture');

        const standardApertures = [1.4, 2, 2.8, 4, 5.6, 8, 11, 16, 22];
        const standardIsos = [50, 100, 200, 400, 800, 1600, 3200];
        createQuickChips('aperture-quick-select', 'dof-aperture', standardApertures, 'f/');
        createQuickChips('flash-aperture-quick-select', 'flash-aperture', standardApertures, 'f/');
        createQuickChips('iso-quick-select', 'flash-iso', standardIsos);
        syncChipsToInput('dof-aperture', 'aperture-quick-select');
        syncChipsToInput('flash-aperture', 'flash-aperture-quick-select');
        syncChipsToInput('flash-iso', 'iso-quick-select');

        _dom.themeSwitcher.addEventListener('click', () => _setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'));
        _dom.langSwitcher.addEventListener('click', () => { _setLanguage(_currentLanguage === 'zh' ? 'en' : 'zh'); });

        const showTooltip = (trigger) => { const tooltipText = _translations[_currentLanguage][trigger.dataset.tooltipKey]; if (!tooltipText) return; _dom.globalTooltip.textContent = tooltipText; const triggerRect = trigger.getBoundingClientRect(); _dom.globalTooltip.classList.add('visible'); const top = triggerRect.top - _dom.globalTooltip.offsetHeight - 8; const left = triggerRect.left + (triggerRect.width / 2) - (_dom.globalTooltip.offsetWidth / 2); _dom.globalTooltip.style.top = `${top}px`; _dom.globalTooltip.style.left = `${left}px`; };
        const hideTooltip = () => { _dom.globalTooltip.classList.remove('visible'); };
        document.querySelectorAll('.tooltip-trigger').forEach(trigger => {
            trigger.addEventListener('mouseenter', () => showTooltip(trigger));
            trigger.addEventListener('mouseleave', hideTooltip);
            trigger.addEventListener('focus', () => showTooltip(trigger));
            trigger.addEventListener('blur', hideTooltip);
        });

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
            const touchEndX = e.changedTouches[0].screenX; const touchEndY = e.changedTouches[0].screenY; const deltaX = touchEndX - touchStartX; const deltaY = touchEndY - touchStartY;
            if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
                hideTooltip();
                const currentActiveIndex = tabs.findIndex(tab => tab.classList.contains('active'));
                if (deltaX < 0 && currentActiveIndex < tabs.length - 1) { tabs[currentActiveIndex + 1].click(); } else if (deltaX > 0 && currentActiveIndex > 0) { tabs[currentActiveIndex - 1].click(); }
            }
        }, { passive: true });

        _dom.reciprocity.calculateBtn.addEventListener('click', _handleReciprocityCalculate);
        _dom.dof.calculateBtn.addEventListener('click', _handleDofCalculate);
        _dom.flash.calculateBtn.addEventListener('click', _handleFlashCalculate);
        _dom.timer.stopBtn.addEventListener('click', _stopTimer);
        _dom.modals.cancelSave.addEventListener('click', _closeSaveModal);
        _dom.modals.confirmSave.addEventListener('click', _confirmSaveCustomFilm);
        _dom.modals.cancelDelete.addEventListener('click', _closeDeleteModal);
        _dom.modals.confirmDelete.addEventListener('click', _confirmDeleteFilm);

        const handleManualTimeInput = () => {
            if (isUpdatingFromSelect) return;
            _dom.reciprocity.shutterSpeedSelect.value = '';
            _dom.reciprocity.messageArea.innerHTML = '';
            debouncedSaveState();
        };
        _dom.reciprocity.minInput.addEventListener('input', handleManualTimeInput);
        _dom.reciprocity.secInput.addEventListener('input', handleManualTimeInput);
        _dom.reciprocity.shutterSpeedSelect.addEventListener('change', (e) => {
            const time = parseFloat(e.target.value);
            if (!isNaN(time)) {
                isUpdatingFromSelect = true;
                _dom.reciprocity.minInput.value = '';
                _dom.reciprocity.secInput.value = time;
                setTimeout(() => { isUpdatingFromSelect = false; }, 10);
            }
            _dom.reciprocity.messageArea.innerHTML = '';
            debouncedSaveState();
        });
        _dom.reciprocity.filmSelect.addEventListener('change', () => { _handleFilmSelectChange(); debouncedSaveState(); });
        _dom.flash.calcModeRadios.forEach(radio => radio.addEventListener('change', () => { _updateFlashUI(radio.value); debouncedSaveState(); }));

        document.getElementById('main-content').addEventListener('click', function(e) {
            const target = e.target;
            if (target.classList.contains('stepper-btn')) { const inputId = target.dataset.target, step = parseFloat(target.dataset.step), inputEl = document.getElementById(inputId); if (!inputEl) return; let currentVal = parseFloat(inputEl.value) || 0; if (target.classList.contains('stepper-plus')) { currentVal += step; } else { currentVal -= step; } inputEl.value = Math.max(0, parseFloat(currentVal.toFixed(4))); inputEl.dispatchEvent(new Event('input')); }
            if (target.classList.contains('quick-select-chip')) {
                const value = target.dataset.value;
                const targetInputId = target.dataset.targetInput;
                if (targetInputId) {
                    const inputEl = document.getElementById(targetInputId);
                    if (inputEl) {
                        inputEl.value = value;
                        inputEl.dispatchEvent(new Event('input'));
                    }
                }
            }
        });
        document.querySelectorAll('input, select').forEach(el => { el.addEventListener('input', debouncedSaveState); el.addEventListener('change', debouncedSaveState); });
        document.querySelectorAll('.btn-ripple').forEach(button => button.addEventListener("click", _createRipple));
        document.querySelectorAll('input[type="number"], input[inputmode="numeric"], input[inputmode="decimal"]').forEach(inputEl => { if(inputEl) { inputEl.addEventListener('keydown', _restrictInputToNumeric); inputEl.addEventListener('input', _cleanNumericInput); } });
    }

    function _start() {
        if (typeof window.appDataString !== 'undefined') {
            try {
                const data = (typeof window.appDataString === 'string')
                    ? JSON.parse(window.appDataString)
                    : window.appDataString;

                const appData = data.appData;

                if (!appData) {
                    throw new Error("'appData' property not found in the injected data.");
                }

                _translations = appData.translations;
                _filmData = appData.films;
                _reciprocityData = appData.reciprocity;
                _dofData = appData.dof;
                _flashData = appData.flash;

                setTimeout(_initializeApp, 0);

            } catch(e) {
                 console.error("Fatal error during initialization:", e);
                 console.error("Received data that caused error:", window.appDataString);
                 document.body.innerHTML = `<div style="text-align: center; padding: 20px; font-family: sans-serif; color: #E6EDF3;"><h3>Application Error</h3><p>Could not process application data.</p><p style="color: #8B949E; font-size: small;">Error: ${e.message}</p></div>`;
            }
        } else {
            setTimeout(_start, 50);
        }
    }

    _start();
});