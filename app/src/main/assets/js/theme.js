// assets/js/theme.js
import { sunIcon, moonIcon } from './utils.js';

export function setTheme(theme, dom) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    dom.themeSwitcher.innerHTML = theme === 'dark' ? sunIcon : moonIcon;
    dom.themeSwitcher.setAttribute('aria-label', theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');

    // (新增) 检查 'Android' 桥梁是否存在，并调用新方法
    if (window.Android && typeof window.Android.setSystemUITheme === 'function') {
        window.Android.setSystemUITheme(theme);
    }

    // 注意：这里的 meta theme-color 现在主要影响 PWA 的标题栏颜色，
    // 对于原生安卓应用，状态栏颜色由原生代码控制。
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