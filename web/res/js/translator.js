/*
 * This file is part of ChiffonUpdater
 *
 * SPDX-License-Identifier: MIT
 */

let translations = {};

let supportedLanguages = ["en", "fr"];
const TRANSLATION_FALLBACK_DEFAULT = "en";

const MAX_TRANSLATOR_LOADING_TIME = 2000;

class WebsiteTranslator {
    constructor(translatorInitDone) {
        navigator.languages.forEach((lang) => {
            if (this.chosenLang == undefined) {
                let lang1 = lang.split("-")[0];
                if (supportedLanguages.indexOf(lang1) > -1) {
                    this.chosenLang = lang1;
                }
            }
        });
        if (this.chosenLang == undefined) {
            this.chosenLang = TRANSLATION_FALLBACK_DEFAULT;
        }
        let langUrl = "res/translations/" + this.chosenLang + ".html";
        console.log(`Translator will use language ${this.chosenLang}.`);
        let translationLoader = document.getElementById("translation-loader");
        let iFrame = `<iframe style="display: none;" id="translation-frame"></iframe>`;
        translationLoader.innerHTML = iFrame;
        let iFrameById = document.getElementById("translation-frame");

        window.onmessage = (e) => {
            let frameWindow = iFrameById.contentWindow;
            if (frameWindow == e.source) {
                translations = e.data;
                this.translatorInit = true;
                translatorInitDone();
            }
        };
        setTimeout(() => {
            if (!this.translatorInit) {
                console.log("Translation initialization is too long.");
                translatorInitDone();
            }
        }, MAX_TRANSLATOR_LOADING_TIME);
        iFrameById.src = langUrl;

    }
    getTranslationByKey(key, ...compInfos) {
        let translation = translations[key];
        if (translation == undefined) {
            translation = key;
        }

        for (let i = 0; i < compInfos.length; i++) {
            translation = translation.replaceAll("${" + i + "}", compInfos.at(i));
        }

        return translation;
    }
}
