// assets/js/calculator.js

function evaluateFormula(formula, tm) {
    const { pow, log10, sqrt } = Math;
    try {
        return new Function('tm', 'pow', 'log10', 'sqrt', `return ${formula}`)(tm, pow, log10, sqrt);
    } catch (e) {
        console.error("Formula evaluation error:", e);
        return -1;
    }
}

function calculateByRules(tm, rules) {
    for (const rule of rules) {
        if (rule.condition === undefined || rule.condition === null || evaluateFormula(rule.condition, tm)) {
            return evaluateFormula(rule.formula, tm);
        }
    }
    return -1;
}

function calculateByPoints(tm, points) {
    if (!points || points.length === 0) return -1;

    // If exact match
    const exact = points.find(p => Math.abs(p[0] - tm) < 0.001);
    if (exact) return exact[1];

    // If below minimum point, just return tm (assume no reciprocity failure for very short times not in chart)
    if (tm < points[0][0]) {
        return tm;
    }

    // Find enclosing interval
    let p1 = null, p2 = null;
    for (let i = 0; i < points.length - 1; i++) {
        if (tm > points[i][0] && tm < points[i + 1][0]) {
            p1 = points[i];
            p2 = points[i + 1];
            break;
        }
    }

    // Extrapolate if above maximum
    if (!p1 || !p2) {
        const p_len = points.length;
        if (p_len >= 2) {
            p1 = points[p_len - 2];
            p2 = points[p_len - 1];
        } else {
            // Only 1 point, can't extrapolate slope, just use it linearly
            return tm * (points[0][1] / points[0][0]);
        }
    }

    // Log-Log Interpolation: log(Tc) = log(Tc1) + (log(Tm) - log(Tm1)) * (log(Tc2) - log(Tc1)) / (log(Tm2) - log(Tm1))
    const logTm = Math.log(tm);
    const logTm1 = Math.log(p1[0]);
    const logTc1 = Math.log(p1[1]);
    const logTm2 = Math.log(p2[0]);
    const logTc2 = Math.log(p2[1]);

    const slope = (logTc2 - logTc1) / (logTm2 - logTm1);
    const logTc = logTc1 + (logTm - logTm1) * slope;

    return Math.exp(logTc);
}

export function handleReciprocityCalculate(dom, appData, showMessage, startTimer) {
    const mVal = parseFloat(dom.reciprocity.minInput.value) || 0;
    const sVal = parseFloat(dom.reciprocity.secInput.value) || 0;
    const bTime = (mVal * 60) + sVal;

    if (bTime <= 0) {
        showMessage(dom.reciprocity.messageArea, 'error', 'errorInvalidTime', null, null, appData);
        return;
    }

    const ndFactor = parseFloat(dom.reciprocity.ndSelect.value) || 1;
    const fLen = parseFloat(dom.reciprocity.focalLengthInput.value);
    const bExt = parseFloat(dom.reciprocity.bellowsExtensionInput.value);
    let bFactor = 1;
    if (fLen > 0 && bExt > fLen) {
        bFactor = (bExt / fLen) ** 2;
    }

    const tbr = bTime * ndFactor * bFactor;
    if (!isFinite(tbr)) {
        showMessage(dom.reciprocity.messageArea, 'error', 'errorInvalidTime', null, null, appData);
        return;
    }

    const filmId = dom.reciprocity.filmSelect.value;
    const customFilms = JSON.parse(localStorage.getItem('customFilms') || '[]') || [];
    const allFilms = [...appData.films, ...customFilms];
    const film = allFilms.find(f => f.id === filmId);

    if (!film) {
        showMessage(dom.reciprocity.messageArea, 'error', 'errorNoFilm', null, null, appData);
        return;
    }

    let pVal = film.p;
    if (filmId === 'custom') {
        const cP = parseFloat(dom.reciprocity.customInput.value);
        if (!cP || cP <= 1.0) {
            showMessage(dom.reciprocity.messageArea, 'error', 'errorInvalidFactor', null, null, appData);
            return;
        }
        pVal = cP;
    }

    let tc;
    if (film.points) {
        tc = calculateByPoints(tbr, film.points);
        // Fallback or adjustment if calculation goes wild
        if (tc > 360000) tc = -1; // Cap at 100 hours
    } else if (film.rules) {
        tc = calculateByRules(tbr, film.rules);
    } else if (pVal) {
        tc = tbr > 1 ? Math.pow(tbr, pVal) : tbr;
    } else {
        tc = tbr;
    }

    if (!isFinite(tc) || tc < 0) {
        showMessage(dom.reciprocity.messageArea, 'error', 'errorOutOfRange', null, null, appData);
    } else if (tc <= tbr * 1.05) { // Relaxed to 5% buffer for "no comp"
        showMessage(dom.reciprocity.messageArea, 'info', 'infoNoCompensation', null, null, appData);
    } else {
        showMessage(dom.reciprocity.messageArea, 'result', 'resultCorrectedTime', null, tc, appData, (time) => startTimer(time, dom, appData));
    }
}


export function handleDofCalculate(dom, appData, showMessage) {
    const fLen = parseFloat(dom.dof.focalLength.value);
    const apt = parseFloat(dom.dof.aperture.value);
    const coc = parseFloat(dom.dof.format.value);
    const dist = parseFloat(dom.dof.distance.value) * 1000;

    if (!fLen || !apt || !coc || !dist || fLen <= 0 || apt <= 0 || dist <= 0) {
        showMessage(dom.dof.messageArea, 'error', 'errorInvalidDof', null, null, appData);
        return;
    }

    const H = (fLen ** 2) / (apt * coc) + fLen;
    const near = (H * dist) / (H + (dist - fLen));
    const far = (H * dist) / (H - (dist - fLen));
    const langData = appData.translations[appData.currentLanguage];

    const resultHtml = `<div class="space-y-3 text-lg">
        <div class="flex justify-between items-baseline"><p class="result-label">${langData.resultDofNear}</p><p class="result-text font-bold text-2xl">${(near / 1000).toFixed(2)}m</p></div>
        <div class="flex justify-between items-baseline"><p class="result-label">${langData.resultDofFar}</p><p class="result-text font-bold text-2xl">${(isFinite(far) && far > 0 ? (far / 1000).toFixed(2) + 'm' : '∞')}</p></div>
        <div class="flex justify-between items-baseline"><p class="result-label">${langData.resultDofTotal}</p><p class="result-text font-bold text-2xl">${(isFinite(far) && far > 0 ? ((far - near) / 1000).toFixed(2) + 'm' : '∞')}</p></div>
        <div class="flex justify-between items-baseline"><p class="result-label">${langData.resultHyperfocal}</p><p class="result-text font-bold text-2xl">${(H / 1000).toFixed(2)}m</p></div>
    </div>`;

    showMessage(dom.dof.messageArea, 'result', null, resultHtml, null, appData);
}


export function handleFlashCalculate(dom, appData, showMessage) {
    const mode = document.querySelector('input[name="flash-mode"]:checked').value;
    const gn = parseFloat(dom.flash.gnInput.value);
    const iso = parseFloat(dom.flash.isoInput.value);
    const modLoss = parseFloat(dom.flash.modifierSelect.value);
    const dist = parseFloat(dom.flash.distanceInput.value);
    const pwr = parseFloat(dom.flash.powerSelect.value);
    const apt = parseFloat(dom.flash.apertureInput.value);
    const langData = appData.translations[appData.currentLanguage];

    if (!gn || !iso || gn <= 0 || iso <= 0) {
        showMessage(dom.flash.messageArea, 'error', 'errorInvalidFlash', null, null, appData);
        return;
    }

    const modFactor = Math.sqrt(2 ** -modLoss);
    const effGn = gn * Math.sqrt(iso / 100) * modFactor;
    let resHtml = '', titleKey = '';

    if (mode === 'aperture') {
        if (isNaN(dist) || isNaN(pwr) || dist <= 0) {
            showMessage(dom.flash.messageArea, 'error', 'errorInvalidFlash', null, null, appData);
            return;
        }
        const res = (effGn * Math.sqrt(pwr)) / dist;
        titleKey = 'resultAperture';
        resHtml = `<p class="text-4xl result-text mt-1">f/${res.toFixed(1)}</p>`;
    } else if (mode === 'distance') {
        if (isNaN(apt) || isNaN(pwr) || apt <= 0) {
            showMessage(dom.flash.messageArea, 'error', 'errorInvalidFlash', null, null, appData);
            return;
        }
        const res = (effGn * Math.sqrt(pwr)) / apt;
        titleKey = 'resultDistance';
        resHtml = `<p class="text-4xl result-text mt-1">${res.toFixed(1)}<span class="text-2xl ml-2 opacity-75">${langData.unitMeter}</span></p>`;
    } else if (mode === 'power') {
        if (isNaN(apt) || isNaN(dist) || apt <= 0 || dist <= 0) {
            showMessage(dom.flash.messageArea, 'error', 'errorInvalidFlash', null, null, appData);
            return;
        }
        const reqPwr = ((apt * dist) / effGn) ** 2;
        if (reqPwr > 1 || !isFinite(reqPwr)) {
            showMessage(dom.flash.messageArea, 'error', 'errorOutOfRange', null, null, appData);
            return;
        }
        const clPwr = appData.flash.flashPowers.reduce((p, c) => Math.abs(c.value - reqPwr) < Math.abs(p.value - reqPwr) ? c : p);
        titleKey = 'resultPower';
        resHtml = `<p class="text-4xl result-text mt-1">${clPwr.name}</p>`;
    }

    if (resHtml) {
        showMessage(dom.flash.messageArea, 'result', null, `<p class="text-lg result-label">${langData[titleKey]}</p>${resHtml}`, null, appData);
    }
}