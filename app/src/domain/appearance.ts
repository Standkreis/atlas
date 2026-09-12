// Shared with the server layout: do not move these values into a 'use client' module.
// The theme bootstrap must be a synchronous string in the HTML, not a Flight client reference.
export const THEME_KEY = 'dex_theme'
export const LOCALE_KEY = 'dex_locale'
export const themeScript = `(function(){try{var t=localStorage.getItem('${THEME_KEY}');if(t==='light'||t==='dark'){document.documentElement.dataset.theme=t}}catch(e){}})()`
