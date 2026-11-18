'use strict';

/*
 * "Mit Lösungen drucken" - fuer Seiten mit Quiz (```quiz) oder SQL-Editoren
 * mit Musterloesung (```sql-query mit "solution:").
 *
 * Der normale Druckknopf druckt wie bisher OHNE Loesungen (Arbeitsblatt). Dieses
 * Skript setzt daneben einen zweiten Knopf; er schaltet vor dem Drucken die
 * Klasse "print-solutions" an <html> ein, das Druck-Stylesheet (style.css)
 * blendet dann ein:
 *   - die Musterloesungen der SQL-Editoren, ueberschrieben mit "Musterlösung",
 *   - bei Quizfragen die richtigen Optionen (gruen, mit Haken), die erste
 *     richtige Antwort bei Eingabefragen und die Erklaerungen.
 * Nach dem Drucken (afterprint) ist alles wieder wie vorher.
 *
 * Beschriftungen auf Deutsch und Englisch; eine Site kann sie ueber ihre
 * UI-Strings (print.solutions.title, print.solutions.aria,
 * print.solutions.model, print.solutions.answer) ueberschreiben.
 */
(function () {
    var DEFAULTS = {
        de: { title: 'Mit Lösungen drucken', aria: 'Seite mit Lösungen drucken',
              model: 'Musterlösung', answer: 'Richtige Antwort:' },
        en: { title: 'Print with solutions', aria: 'Print page with solutions',
              model: 'Model solution', answer: 'Correct answer:' }
    };
    var html = document.documentElement;

    function lang() {
        var l = html.getAttribute('data-lang') || html.getAttribute('lang') || 'de';
        return l === 'en' ? 'en' : 'de';
    }
    function t(key) {
        var l = lang();
        var site = window.I18N && window.I18N[l] && window.I18N[l]['print.solutions.' + key];
        return site || DEFAULTS[l][key];
    }

    function hasSolutions() {
        return !!document.querySelector('.sqlq-solution, .quiz-q');
    }

    /* Loesungen fuer den Druck markieren bzw. die Markierung wieder entfernen. */
    function prepare(on) {
        html.classList.toggle('print-solutions', on);
        if (!on) return;
        document.querySelectorAll('.sqlq-solution').forEach(function (s) {
            s.setAttribute('data-label', t('model'));
        });
        document.querySelectorAll('.quiz-options input[data-ok]').forEach(function (i) {
            var li = i.closest('li');
            if (li) li.classList.add('quiz-print-ok');
        });
        document.querySelectorAll('.quiz-input[data-answers]').forEach(function (i) {
            var p = i.closest('.quiz-q');
            if (!p) return;
            var a = p.querySelector('.quiz-print-answer');
            if (!a) {
                a = document.createElement('p');
                a.className = 'quiz-print-answer';
                var box = i.closest('.quiz-answer') || i;
                box.parentNode.insertBefore(a, box.nextSibling);
            }
            var first = (i.getAttribute('data-answers') || '').split('|')[0].trim();
            a.textContent = t('answer') + ' ' + first;
        });
    }

    function label(btn) {
        btn.title = t('title');
        btn.setAttribute('aria-label', t('aria'));
    }

    function init() {
        if (!hasSolutions()) return;
        var print = document.querySelector('.nav-print');
        if (!print) return;
        var btn = document.createElement('a');
        btn.className = 'nav-print nav-print-solutions';
        btn.href = '#';
        var img = document.createElement('img');
        img.className = 'nav-icon';
        img.alt = '';
        img.src = (print.querySelector('img') || {}).src
            ? print.querySelector('img').src.replace(/printer\.svg(\?.*)?$/, 'printer-check.svg')
            : 'images/printer-check.svg';
        btn.appendChild(img);
        label(btn);
        /* Manche Browser (Safari, Firefox) oeffnen den Druckdialog asynchron:
           window.print() kehrt sofort zurueck. Deshalb bleibt die Markierung
           bis nach "afterprint" stehen (mit kurzer Nachfrist) und wird bei
           "beforeprint" erneut gesetzt, solange der Knopf gerade gedrueckt wurde. */
        var armed = false, timer = null;
        btn.addEventListener('click', function (e) {
            e.preventDefault();
            armed = true;
            clearTimeout(timer);
            prepare(true);
            window.print();
        });
        window.addEventListener('beforeprint', function () { if (armed) prepare(true); });
        window.addEventListener('afterprint', function () {
            if (!armed) return;
            armed = false;
            clearTimeout(timer);
            timer = setTimeout(function () { prepare(false); }, 1000);
        });
        print.parentNode.insertBefore(btn, print.nextSibling);
        document.addEventListener('lang-change', function () { label(btn); });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
}());
