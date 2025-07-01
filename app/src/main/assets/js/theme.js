// assets/js/theme.js
import { sunIcon, moonIcon } from './utils.js';

export function setTheme(theme, dom) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    dom.themeSwitcher.innerHTML = theme === 'dark' ? sunIcon : moonIcon;
    dom.themeSwitcher.setAttribute('aria-label', theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
    document.querySelector('meta[name="theme-color"]').setAttribute('content', theme === 'dark' ? '#0D1117' : '#ffffff');
}

export function setLanguage(lang, appData, dom, populateAllSelects, handleFilmSelectChange) {
    appData.currentLanguage = lang;
    localStorage.setItem('language', lang);
    document.documentElement.lang = lang;
    const langData = appData.translations[lang];

    document.querySelectorAll('[data-lang-key]').forEach(el => {
        const key = el.dataset.langKey;
        if (langData[key]) {
            el.textContent = langData[key];
        }
    });

    document.querySelectorAll('[data-lang-placeholder]').forEach(el => {
        const key = el.dataset.langPlaceholder;
        if(langData[key]) {
           el.placeholder = langData[key];
        }
    });

    if (dom.langSwitcher) {
        dom.langSwitcher.textContent = langData.langSwitch;
    }

    populateAllSelects();
    handleFilmSelectChange();
}