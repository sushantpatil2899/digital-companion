'use strict';

// The character's name in a window's title and text (?name=…, set by
// src/main/main.js): every element with class "name" shows it, and
// "Togepi" in the page title is replaced. Load before the page's own script.
window.CHARACTER_NAME = new URLSearchParams(location.search).get('name') || 'Togepi';
document.title = document.title.replace('Togepi', window.CHARACTER_NAME);
for (const el of document.querySelectorAll('.name')) el.textContent = window.CHARACTER_NAME;
