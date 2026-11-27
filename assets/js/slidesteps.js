'use strict';

/*
 * Pfeiltasten fuer Bloecke, die sich Schritt fuer Schritt weiterschalten lassen
 * (java-steps, algo-viz). Ein Block meldet sich mit
 *
 *     SlideSteps.register(element, { canMove: function (d) {...}, move: function (d) {...} })
 *
 * an (d = +1 vor, -1 zurueck). Im Folienmodus steuern die Pfeiltasten zuerst die
 * Bloecke der aktuellen Folie - der erste in Dokumentreihenfolge, der sich noch in
 * die Richtung bewegen kann - und wechseln erst danach die Folie. Ausserhalb des
 * Folienmodus reagiert nur der Block, in dem der Fokus liegt. Ein einziger Handler in
 * der Capture-Phase, damit er vor dem Folien-Handler in footer.ftl laeuft.
 */
(function () {
    var items = [];

    function inOrder(a, b) {
        return a.el.compareDocumentPosition(b.el) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
    }

    window.SlideSteps = {
        register: function (el, ctl) { items.push({ el: el, ctl: ctl }); }
    };

    document.addEventListener('keydown', function (e) {
        var d = (e.key === 'ArrowRight' || e.key === 'PageDown') ? 1
              : (e.key === 'ArrowLeft' || e.key === 'PageUp') ? -1 : 0;
        if (!d || e.altKey || e.ctrlKey || e.metaKey) return;
        if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
        var mine;
        if (document.documentElement.classList.contains('mode-slides')) {
            var slide = document.querySelector('.slide.active');
            if (!slide) return;
            mine = items.filter(function (it) { return slide.contains(it.el); });
        } else {
            mine = items.filter(function (it) { return it.el.contains(e.target); });
        }
        mine.sort(inOrder);
        if (d < 0) mine.reverse();
        for (var i = 0; i < mine.length; i++) {
            if (mine[i].ctl.canMove(d)) {
                e.preventDefault();
                e.stopImmediatePropagation();
                mine[i].ctl.move(d);
                return;
            }
        }
    }, true);
}());
