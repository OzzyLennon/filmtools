// assets/js/state.js
import { debounce } from './utils.js';

function getAppState(dom) {
    return {
        filmSelect: dom.reciprocity.filmSelect.value,
        ndSelect: dom.reciprocity.ndSelect.value,
        focalLength: dom.reciprocity.focalLengthInput.value,
        bellowsExtension: dom.reciprocity.bellowsExtensionInput.value,
        meteredMin: dom.reciprocity.minInput.value,
        meteredSec: dom.reciprocity.secInput.value,
        dofFormat: dom.dof.format.value,
        dofFocalLength: dom.dof.focalLength.value,
        dofAperture: dom.dof.aperture.value,
        dofDistance: dom.dof.distance.value,
        flashMode: document.querySelector('input[name="flash-mode"]:checked')?.value,
        flashGn: dom.flash.gnInput.value,
        flashIso: dom.flash.isoInput.value,
        flashModifier: dom.flash.modifierSelect.value,
        flashAperture: dom.flash.apertureInput.value,
        flashDistance: dom.flash.distanceInput.value,
        flashPower: dom.flash.powerSelect.value
    };
}

export const debouncedSaveState = debounce((dom) => {
    if (!dom) return;
    const stateToSave = getAppState(dom);
    localStorage.setItem('filmToolkitState', JSON.stringify(stateToSave));
}, 500);


export function loadState(dom, appData, handleFilmSelectChange, updateFlashUI) {
    const savedState = JSON.parse(localStorage.getItem('filmToolkitState') || '{}');
    if (!Object.keys(savedState).length) return;

    dom.reciprocity.filmSelect.value = savedState.filmSelect || '';
    dom.reciprocity.ndSelect.value = savedState.ndSelect || '1';
    dom.reciprocity.focalLengthInput.value = savedState.focalLength || '';
    dom.reciprocity.bellowsExtensionInput.value = savedState.bellowsExtension || '';
    dom.reciprocity.minInput.value = savedState.meteredMin || '';
    dom.reciprocity.secInput.value = savedState.meteredSec || '30';

    dom.dof.format.value = savedState.dofFormat || appData.dof.sensorFormats[0].coc;
    dom.dof.focalLength.value = savedState.dofFocalLength || '';
    dom.dof.aperture.value = savedState.dofAperture || '';
    dom.dof.distance.value = savedState.dofDistance || '';

    const flashMode = savedState.flashMode || 'aperture';
    const flashModeRadio = document.querySelector(`input[name="flash-mode"][value="${flashMode}"]`);
    if (flashModeRadio) flashModeRadio.checked = true;
    updateFlashUI(flashMode, dom);


    dom.flash.gnInput.value = savedState.flashGn || '';
    dom.flash.isoInput.value = savedState.flashIso || '100';
    dom.flash.modifierSelect.value = savedState.flashModifier || '0';
    dom.flash.apertureInput.value = savedState.flashAperture || '';
    dom.flash.distanceInput.value = savedState.flashDistance || '';
    dom.flash.powerSelect.value = savedState.flashPower || '1';

    handleFilmSelectChange();
}


export function confirmSaveCustomFilm(dom, appData, showMessage, populateFilmSelect, handleFilmSelectChange) {
    const name = dom.modals.saveNameInput.value.trim();
    const customFilms = JSON.parse(localStorage.getItem('customFilms') || '[]') || [];
    const allFilms = [...appData.films, ...customFilms];

    if (!name) {
        showMessage(dom.reciprocity.messageArea, 'error', 'errorInvalidName', null, null, appData);
        return;
    }
    if (allFilms.some(f => f.name.toLowerCase() === name.toLowerCase())) {
        showMessage(dom.reciprocity.messageArea, 'error', 'errorDuplicateName', null, null, appData);
        return;
    }

    const newFilm = {
        id: `custom_${Date.now()}`,
        name: name,
        p: appData.tempPValue,
    };

    customFilms.push(newFilm);
    localStorage.setItem('customFilms', JSON.stringify(customFilms));
    populateFilmSelect();
    dom.reciprocity.filmSelect.value = newFilm.id;
    handleFilmSelectChange();
    closeSaveModal(dom);
}


export function confirmDeleteFilm(dom, appData, populateFilmSelect) {
    if (!appData.filmToDelete) return;
    let customFilms = JSON.parse(localStorage.getItem('customFilms') || '[]') || [];
    customFilms = customFilms.filter(f => f.id !== appData.filmToDelete.id);
    localStorage.setItem('customFilms', JSON.stringify(customFilms));
    populateFilmSelect();
    closeDeleteModal(dom, appData);
}

export function openSaveModal(dom, appData, showMessage) {
    appData.tempPValue = parseFloat(dom.reciprocity.customInput.value);
    if (!appData.tempPValue || appData.tempPValue <= 1.0) {
        showMessage(dom.reciprocity.messageArea, 'error', 'errorInvalidFactor', null, null, appData);
        return;
    }
    dom.modals.saveNameInput.value = '';
    dom.modals.save.classList.remove('hidden');
    dom.modals.saveNameInput.focus();
}

export function closeSaveModal(dom) {
    dom.modals.save.classList.add('hidden');
}

export function openDeleteModal(dom, appData) {
    const selOpt = dom.reciprocity.filmSelect.options[dom.reciprocity.filmSelect.selectedIndex];
    appData.filmToDelete = { id: selOpt.value, name: selOpt.text };
    const langData = appData.translations[appData.currentLanguage];
    dom.modals.deleteText.textContent = langData.modalDeleteText.replace('{filmName}', appData.filmToDelete.name);
    dom.modals.delete.classList.remove('hidden');
}

export function closeDeleteModal(dom, appData) {
    dom.modals.delete.classList.add('hidden');
    appData.filmToDelete = null;
}