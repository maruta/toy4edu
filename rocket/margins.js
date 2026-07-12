// margins.js — numeric computation of gain-crossover frequency and phase margin
// for the rocket control loops (Ly, Lth, Lx).
//
// Works both in the browser (uses global `math`, exports global `RocketMargins`)
// and in node (exports a factory: `const RocketMargins = require('./margins.js')(require('mathjs'))`).
//
// The convention follows MATLAB's allmargin: the reported crossover is the
// lowest-frequency 0dB crossing of |L(jω)|, and PM = 180° + arg L(jωgc),
// wrapped into (-180°, 180°].
(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory; // node: inject mathjs from caller
    } else {
        root.RocketMargins = factory(root.math);
    }
})(typeof self !== 'undefined' ? self : this, function (math) {
    'use strict';

    function toNum(x) {
        return (x && typeof x.toNumber === 'function') ? x.toNumber() : x;
    }

    function toComplex(v) {
        if (v && v.isComplex) return v;
        return math.complex(toNum(v), 0);
    }

    // Build an evaluator returning {Ly, Lth, Lx} (complex) at a given ω.
    function makeEvaluator(design) {
        const vars = {};
        math.eval(design.params, vars);
        const m = toNum(vars.m),
            g = toNum(vars.g),
            l = toNum(vars.l),
            I = toNum(vars.I);
        const cK = {
            y: math.parse(design.controllers.y).compile(),
            th: math.parse(design.controllers.th).compile(),
            x: math.parse(design.controllers.x).compile()
        };
        const baseScope = {};
        for (const key in vars) {
            if (Object.prototype.hasOwnProperty.call(vars, key)) {
                baseScope[key] = toNum(vars[key]);
            }
        }

        function at(w) {
            const s = math.complex(0, w);
            const scope = Object.assign({}, baseScope, {
                s: s
            });
            const Ky = toComplex(cK.y.eval(scope));
            const Kth = toComplex(cK.th.eval(scope));
            const Kx = toComplex(cK.x.eval(scope));
            const s2 = math.multiply(s, s);
            const Py = math.divide(1, math.multiply(m, s2));
            const Pth = math.divide(l, math.add(math.multiply(-I, s2), m * g * l));
            // Px = 1/(m s^2) * Kth / (1 + Pth Kth)
            const SthKth = math.divide(Kth, math.add(1, math.multiply(Pth, Kth)));
            const Px = math.multiply(Py, SthKth);
            return {
                Ly: math.multiply(Py, Ky),
                Lth: math.multiply(Pth, Kth),
                Lx: math.multiply(Px, Kx)
            };
        }
        return {
            at: at,
            params: {
                m: m,
                g: g,
                l: l,
                I: I,
                L: toNum(vars.L),
                W: toNum(vars.W)
            }
        };
    }

    // First (lowest-ω) 0dB crossing of |f(ω)| on a log grid, refined by bisection.
    // f: ω -> complex L(jω).  Returns {wgc, pm} or {wgc: NaN, pm: NaN}.
    function firstCrossover(f, wmin, wmax, npts) {
        wmin = wmin || 1e-3;
        wmax = wmax || 1e3;
        npts = npts || 2400;
        const lmin = Math.log10(wmin),
            lmax = Math.log10(wmax);
        let wPrev = wmin;
        let gPrev = math.abs(f(wmin)) - 1;
        for (let i = 1; i < npts; i++) {
            const w = Math.pow(10, lmin + (lmax - lmin) * i / (npts - 1));
            const gCur = math.abs(f(w)) - 1;
            if (isFinite(gPrev) && isFinite(gCur) && gPrev * gCur <= 0 && gPrev !== gCur) {
                // bisection on log10(ω)
                let la = Math.log10(wPrev),
                    lb = Math.log10(w),
                    ga = gPrev;
                for (let it = 0; it < 60; it++) {
                    const lc = (la + lb) / 2;
                    const gc = math.abs(f(Math.pow(10, lc))) - 1;
                    if (ga * gc <= 0) {
                        lb = lc;
                    } else {
                        la = lc;
                        ga = gc;
                    }
                }
                const wgc = Math.pow(10, (la + lb) / 2);
                let pm = 180 + math.arg(f(wgc)) * 180 / Math.PI;
                if (pm > 180) pm -= 360;
                return {
                    wgc: wgc,
                    pm: pm
                };
            }
            wPrev = w;
            gPrev = gCur;
        }
        return {
            wgc: NaN,
            pm: NaN
        };
    }

    // Compute margins for all three loops of a design.
    // Returns {ywgc, ypm, thwgc, thpm, xwgc, xpm, omega} (omega = sqrt(mgl/I)).
    function computeMargins(design) {
        const ev = makeEvaluator(design);
        const my = firstCrossover((w) => ev.at(w).Ly);
        const mth = firstCrossover((w) => ev.at(w).Lth);
        const mx = firstCrossover((w) => ev.at(w).Lx);
        const p = ev.params;
        return {
            ywgc: my.wgc,
            ypm: my.pm,
            thwgc: mth.wgc,
            thpm: mth.pm,
            xwgc: mx.wgc,
            xpm: mx.pm,
            omega: Math.sqrt(p.m * p.g * p.l / p.I),
            params: p
        };
    }

    // Annotated display names in the same format the lecture material uses.
    function makeDisplayNames(design, mrg) {
        const f = (w, pm) => isFinite(w) ?
            ` (ω=${w.toFixed(2)}, PM=${pm.toFixed(1)}°)` : ' (no 0dB crossing)';
        return {
            displayName: design.name,
            displayNameX: design.name + f(mrg.xwgc, mrg.xpm),
            displayNameY: design.name + f(mrg.ywgc, mrg.ypm)
        };
    }

    return {
        makeEvaluator: makeEvaluator,
        firstCrossover: firstCrossover,
        computeMargins: computeMargins,
        makeDisplayNames: makeDisplayNames
    };
});
