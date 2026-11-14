'use strict';

/*
 * Quiz zur Selbstkontrolle (```quiz-Block, HTML-Aufbau siehe templates/page.ftl).
 *
 * Je Frage ein Knopf "Prüfen": markiert die richtigen Optionen gruen und
 * falsch gewaehlte rot, zeigt die Erklaerung und wird danach zu "Nochmal".
 * Eingabefragen (data-input) vergleichen die Eingabe mit den Antworten aus
 * data-answers ("a | b | 0,971 ± 0,001"): Zahlen und Brueche numerisch
 * (3/4 = 0,75 = 0.75), sonst als Text ohne Gross-/Kleinschreibung.
 * Die Beschriftungen gibt es auf Deutsch und Englisch; eine Site kann sie ueber
 * ihre UI-Strings (quiz.check, quiz.retry, quiz.correct, quiz.wrong,
 * quiz.partial, quiz.none, quiz.multi) ueberschreiben. Beim Sprachwechsel
 * (Ereignis lang-change aus i18n.js) werden sie neu gesetzt.
 */
(function () {
    var DEFAULTS = {
        de: {
            check: 'Prüfen', retry: 'Nochmal', correct: 'Richtig!',
            wrong: 'Leider falsch.', partial: 'Nicht ganz – die richtigen Antworten sind grün markiert.',
            none: 'Bitte zuerst eine Antwort wählen.', multi: '(mehrere Antworten möglich)',
            empty: 'Bitte zuerst eine Antwort eingeben.', solution: 'Richtige Antwort:',
            placeholder: 'Antwort, z.B. 3/4 oder 0,75', placeholderText: 'Antwort eingeben'
        },
        en: {
            check: 'Check', retry: 'Try again', correct: 'Correct!',
            wrong: 'Unfortunately wrong.', partial: 'Not quite – the correct answers are marked green.',
            none: 'Please choose an answer first.', multi: '(several answers possible)',
            empty: 'Please enter an answer first.', solution: 'Correct answer:',
            placeholder: 'Answer, e.g. 3/4 or 0.75', placeholderText: 'Enter your answer'
        }
    };

    function lang() {
        var l = document.documentElement.getAttribute('data-lang') || document.documentElement.getAttribute('lang') || 'de';
        return l === 'en' ? 'en' : 'de';
    }
    function t(key) {
        var l = lang();
        var site = window.I18N && window.I18N[l] && window.I18N[l]['quiz.' + key];
        return site || DEFAULTS[l][key];
    }

    /* Zahl, Dezimalzahl (Komma oder Punkt) oder Bruch a/b -> Zahl, sonst null. */
    function num(s) {
        var x = String(s).replace(/\u2212/g, '-').replace(/\s+/g, '');
        var dec = '[-+]?(?:\\d+(?:[.,]\\d*)?|[.,]\\d+)';
        var m = new RegExp('^(' + dec + ')(?:/(' + dec + '))?$').exec(x);
        if (!m) return null;
        var a = parseFloat(m[1].replace(',', '.'));
        if (m[2] === undefined) return a;
        var b = parseFloat(m[2].replace(',', '.'));
        return b === 0 ? null : a / b;
    }
    function norm(s) { return String(s).trim().replace(/\s+/g, ' ').toLowerCase(); }
    /* Passt die Eingabe auf eine der Antworten ("a | b | 0,971 ± 0,001")? */
    function matches(input, spec) {
        return spec.split('|').some(function (alt) {
            var parts = alt.split(/±|\+-|\+\/-/), want = parts[0].trim();
            if (!want) return false;
            var u = num(input), v = num(want);
            if (u !== null && v !== null) {
                var tol = parts.length > 1 ? num(parts[1]) : null;
                if (tol === null) tol = 1e-9 * Math.max(1, Math.abs(v));
                return Math.abs(u - v) <= Math.abs(tol) + 1e-12;
            }
            return norm(input) === norm(want);
        });
    }
    function firstAnswer(spec) { return spec.split('|')[0].trim(); }

    function label(q) {
        var inp = q.querySelector('.quiz-input');
        if (inp) {
            /* Zahlenhinweis nur, wenn die erste akzeptierte Antwort eine Zahl/ein Bruch ist */
            var ph = num(firstAnswer(inp.getAttribute('data-answers') || '').split(/±|\+-|\+\/-/)[0]) !== null ? t('placeholder') : t('placeholderText');
            inp.placeholder = ph; inp.setAttribute('aria-label', ph);
        }
        var btn = q.querySelector('.quiz-check');
        if (btn) btn.textContent = q.classList.contains('quiz-done') ? t('retry') : t('check');
        var hint = q.querySelector('.quiz-multi');
        if (hint) hint.textContent = ' ' + t('multi');
        var fb = q.querySelector('.quiz-feedback');
        if (fb && fb.getAttribute('data-state')) fb.textContent = feedbackText(q, fb.getAttribute('data-state'));
    }
    function feedbackText(q, state) {
        var inp = q.querySelector('.quiz-input');
        if (inp && state === 'wrong') return t('wrong') + ' ' + t('solution') + ' ' + firstAnswer(inp.getAttribute('data-answers'));
        return t(state);
    }

    function reset(q) {
        q.classList.remove('quiz-done');
        q.querySelectorAll('li').forEach(function (li) { li.classList.remove('quiz-ok', 'quiz-wrong', 'quiz-missed'); });
        q.querySelectorAll('input').forEach(function (i) { i.checked = false; i.disabled = false; });
        q.querySelectorAll('.quiz-input').forEach(function (i) { i.value = ''; i.classList.remove('quiz-input-ok', 'quiz-input-wrong'); });
        var fb = q.querySelector('.quiz-feedback');
        fb.textContent = ''; fb.removeAttribute('data-state'); fb.className = 'quiz-feedback';
        var ex = q.querySelector('.quiz-explain');
        if (ex) ex.hidden = true;
        label(q);
    }

    function checkInput(q) {
        var inp = q.querySelector('.quiz-input'), fb = q.querySelector('.quiz-feedback');
        if (!inp.value.trim()) {
            fb.setAttribute('data-state', 'empty'); fb.className = 'quiz-feedback'; fb.textContent = t('empty');
            return;
        }
        var ok = matches(inp.value, inp.getAttribute('data-answers'));
        inp.classList.add(ok ? 'quiz-input-ok' : 'quiz-input-wrong');
        inp.disabled = true;
        var state = ok ? 'correct' : 'wrong';
        fb.setAttribute('data-state', state);
        fb.className = 'quiz-feedback ' + (ok ? 'quiz-feedback-ok' : 'quiz-feedback-wrong');
        fb.textContent = feedbackText(q, state);
        var ex = q.querySelector('.quiz-explain');
        if (ex) ex.hidden = false;
        q.classList.add('quiz-done');
        label(q);
    }

    function check(q) {
        if (q.getAttribute('data-input') === 'true') { checkInput(q); return; }
        var inputs = [].slice.call(q.querySelectorAll('input'));
        var fb = q.querySelector('.quiz-feedback');
        if (!inputs.some(function (i) { return i.checked; })) {
            fb.setAttribute('data-state', 'none'); fb.className = 'quiz-feedback';
            fb.textContent = t('none');
            return;
        }
        var allRight = true, anyRight = false;
        inputs.forEach(function (i) {
            var ok = i.hasAttribute('data-ok'), li = i.closest('li');
            if (ok) li.classList.add(i.checked ? 'quiz-ok' : 'quiz-missed');
            else if (i.checked) li.classList.add('quiz-wrong');
            if (ok !== i.checked) allRight = false;
            if (ok && i.checked) anyRight = true;
            i.disabled = true;
        });
        var state = allRight ? 'correct' : (anyRight ? 'partial' : 'wrong');
        fb.setAttribute('data-state', state);
        fb.className = 'quiz-feedback ' + (allRight ? 'quiz-feedback-ok' : 'quiz-feedback-wrong');
        fb.textContent = t(state);
        var ex = q.querySelector('.quiz-explain');
        if (ex) ex.hidden = false;
        q.classList.add('quiz-done');
        label(q);
    }

    function init() {
        document.querySelectorAll('.quiz-q').forEach(function (q) {
            if (q.getAttribute('data-multi') === 'true') {
                var hint = document.createElement('span');
                hint.className = 'quiz-multi';
                q.querySelector('.quiz-question').appendChild(hint);
            }
            q.querySelector('.quiz-check').addEventListener('click', function () {
                if (q.classList.contains('quiz-done')) reset(q); else check(q);
            });
            var inp = q.querySelector('.quiz-input');
            if (inp) inp.addEventListener('keydown', function (e) {
                if (e.key === 'Enter') { e.preventDefault(); if (!q.classList.contains('quiz-done')) check(q); }
            });
            label(q);
        });
        document.addEventListener('lang-change', function () {
            document.querySelectorAll('.quiz-q').forEach(label);
        });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
}());
