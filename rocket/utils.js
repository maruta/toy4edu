function logspace(s, e, n) {
    let tmp = Array(n);
    for (let i = 0; i < n; i++) {
        tmp[i] = s * ((n - 1 - i) / (n - 1)) + e * (i / (n - 1));
    }
    return math.dotPow(10, tmp);
}

function clip(x, min, max) {
    return math.min(math.max(x, min), max);
}


function lmap(value, start1, end1, start2, end2) {
    return math.add(
        math.multiply(start2, (end1 - value) * (end1 - start1)),
        math.multiply(end2, (value - start1) * (end1 - start1)));
}

function rk4(f, x, h) {
    let k1 = f(x);
    let k2 = f(math.add(x, math.multiply(0.5 * h, k1)));
    let k3 = f(math.add(x, math.multiply(0.5 * h, k2)));
    let k4 = f(math.add(x, math.multiply(h, k3)));
    return math.add(x,
        math.multiply(h / 6,
            math.add(k1,
                math.multiply(2, k2),
                math.multiply(2, k3),
                k4)));
}

function root2math(unsorted_roots) {
    if (unsorted_roots.length == 0) {
        return [];
    }
    let npols = unsorted_roots[0].length;
    let p = new Array(npols);
    for (let i = 0; i < npols; i++) {
        p[i] = math.complex(unsorted_roots[0][i], unsorted_roots[1][i]);
    }
    p.sort((a, b) => {
        if (math.abs(a.re - b.re) < 1e-10) {
            return math.abs(a.im) > math.abs(b.im) ? -1 : 1;
        } else {
            return a.re > b.re ? -1 : 1;
        }
    });
    return p;
}

function reduce_rational(num0, den0) {
    let nrat = math.rationalize(num0, true);
    let drat = math.rationalize(den0, true);
    if (nrat.coefficients.length == 0 || drat.coefficients.length == 0) {
        return ({
            num: num0,
            den: den0
        })
    }
    let nr0 = root2math(findRoots(nrat.coefficients, false, 100000, 1e-20));
    let dr0 = root2math(findRoots(drat.coefficients, false, 100000, 1e-20));
    let nr = [],
        dr = [];
    let dCancelledFlag = new Array(dr0.length);
    for (let i = 0; i < dCancelledFlag.length; i++) {
        dCancelledFlag[i] = false;
    }
    for (let i = 0; i < nr0.length; i++) {
        let isCancelled = false;
        for (let j = 0; j < dr0.length; j++) {
            if (!dCancelledFlag[j] && math.abs(math.subtract(nr0[i], dr0[j])) < 1e-4) {
                isCancelled = true;
                dCancelledFlag[j] = true;
                break;
            }
        }
        if (!isCancelled) {
            nr.push(nr0[i]);
        }
    }
    for (let i = 0; i < dCancelledFlag.length; i++) {
        if (!dCancelledFlag[i]) {
            dr.push(dr0[i]);
        }
    }
    let num = new math.expression.node.ConstantNode(nrat.coefficients[nrat.coefficients.length - 1]),
        den = new math.expression.node.ConstantNode(drat.coefficients[drat.coefficients.length - 1]);
    let s = math.parse('s');
    for (let i = 0; i < nr.length; i++) {
        num = new math.expression.node.OperatorNode('*', 'multiply', [
            num,
            new math.expression.node.OperatorNode('-', 'subtract', [
                s, new math.expression.node.ConstantNode(nr[i])
            ])
        ]);
    }
    for (let i = 0; i < dr.length; i++) {
        den = new math.expression.node.OperatorNode('*', 'multiply', [
            den,
            new math.expression.node.OperatorNode('-', 'subtract', [
                s, new math.expression.node.ConstantNode(dr[i])
            ])
        ]);
    }
    return {
        num: math.rationalize(num),
        den: math.rationalize(den)
    }
}


function util_rationalize(eq, vars) {
    let rat;
    if (vars === undefined) {
        rat = math.rationalize(eq, true);
    } else {
        rat = math.rationalize(eq, vars, true);
    }
    if (rat.coefficients.length == 0) {
        if (rat.numerator.op === '-') {
            rat.coefficients = [-rat.numerator.args[0].value];
        } else {
            rat.coefficients = [rat.numerator.value];
        }
    }
    if (rat.denominator === null) {
        rat.denominator = new math.expression.node.ConstantNode(1);
    }
    return rat;
}

function subs(e, vars) {
    return e.transform(function (node, path, parent) {
        if (node.isSymbolNode && node.name in vars) {
            return vars[node.name];
        } else {
            return node
        }
    })
}

function num2tex(num, prec) {
    return num.toPrecision(prec).replace(/(e)([\+-]?\d+)/, '\\times10^{$2}')
}

function toNum(x) {
    return (typeof x.toNumber === 'function') ? x.toNumber() : x;
}

function canvas_arrow(context, headlen, fromx, fromy, tox, toy) {
    var angle = Math.atan2(toy - fromy, tox - fromx);
    context.beginPath();
    context.moveTo(fromx, fromy);
    context.lineTo(tox, toy);
    context.lineTo(tox - headlen * Math.cos(angle - Math.PI / 6), toy - headlen * Math.sin(angle - Math.PI / 6));
    context.moveTo(tox, toy);
    context.lineTo(tox - headlen * Math.cos(angle + Math.PI / 6), toy - headlen * Math.sin(angle + Math.PI / 6));
    context.stroke();
}