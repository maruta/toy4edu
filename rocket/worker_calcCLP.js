importScripts("../lib/next-pow-2/np2.js", "../lib/durand-kerner/roots.js", "../lib/mathjs-dist/math.min.js", "utils.js")

onmessage = function (e) {
    let Peq = JSON.parse(e.data[0], math.json.reviver);
    let Keq = JSON.parse(e.data[1], math.json.reviver);
    let Prat = util_rationalize(Peq);
    let Krat = util_rationalize(Keq);

    //    let P = reduce_rational(Prat.numerator,Prat.denominator);
    //    let K = reduce_rational(Krat.numerator,Krat.denominator);

    let phi = math.rationalize(
        new math.expression.node.OperatorNode('+', 'add', [
            new math.expression.node.OperatorNode('*', 'multiply', [Prat.denominator, Krat.denominator]),
            new math.expression.node.OperatorNode('*', 'multiply', [Prat.numerator, Krat.numerator])
        ]), true);

    let coeffs = phi.coefficients;
    postMessage([findRoots(coeffs)]);
}