let wrapper = document.getElementById('wrap-sim');
let canvas = document.getElementById('sim');
let ctx = canvas.getContext("2d");
let height, width;

var workerCalcCLP = {};

var latexels = document.getElementsByClassName("latex");
for (var i = 0; i < latexels.length; i++) {
    let e = latexels[i];
    katex.render(e.textContent, e);
}

$('#myTab a').on('click', function (e) {
    e.preventDefault()
    $(this).tab('show')
})


let tfL = {};

let updateBode = {
    'y': function () {
        drawBode(tfL.y.compile(), logspace(-2, 2, 100), 'wrap-canvas-Ky', 'canvas-Ky');
    },
    'th': function () {
        drawBode(tfL.th.compile(), logspace(-2, 2, 100), 'wrap-canvas-Kth', 'canvas-Kth');
    },
    'x': function () {
        drawBode(tfL.x.compile(), logspace(-2, 2, 100), 'wrap-canvas-Kx', 'canvas-Kx');
    }
};

let workerJobs = {};

['y', 'th', 'x'].forEach(
    (v) => {
        $(`#K${v}-tab`).on("shown.bs.tab", updateBode[v]);
        workerCalcCLP[v] = new Worker("worker_calcCLP.js");
        workerJobs[v] = 0;
        workerCalcCLP[v].onmessage = function (e) {
            workerJobs[v]--;
            if (workerJobs[v] == 0) {
                updateCLP(v, e.data[0]);
            }
        }
    }
);


let show_info = true;

function toggle_info() {
    show_info = !show_info;
    if (show_info) {
        $('#toggleinfo').addClass("active");
    } else {
        $('#toggleinfo').removeClass("active");
    }
}

let rx = 0,
    rvx = 0,
    rrx = 0;
let ry = 0,
    rvy = 0,
    rry = 0;

let K = {};
let design = {
    params: {},
    controllers: {}
};

let tfP = {};

function updateCLP(v, roots) {
    let p = root2math(roots);
    let npols = p.length,
        clpols = '',
        firstPole = true;

    for (let i = 0; i < npols; i++) {
        let isStable = true;
        if (p[i].re > 0) {
            isStable = false;
            clpols += '{\\color{red}';
        }
        if (math.abs(p[i].re / p[i].im) < 1e-2) {
            // pure imaginary pole
            if (i < npols - 1 && math.abs(math.add(p[i], p[i + 1])) < 1e-10) {
                clpols += '\\pm' + num2tex(Math.abs(p[i].im), 3) + 'j';
                i++;
            } else {
                clpols += num2tex(p[i].im, 3) + 'j';
            }
        } else if (math.abs(p[i].im / p[i].re) < 1e-2) {
            // real pole
            clpols += num2tex(p[i].re, 3);
        } else {
            if (i < npols - 1 && math.equal(p[i], math.conj(p[i + 1]))) {
                clpols += num2tex(p[i].re, 3) + '\\pm ' +
                    num2tex(Math.abs(p[i].im), 3) + 'j';
                i++;
            } else {
                clpols += num2tex(p[i].re, 3) + (p[i].im > 0 ? '+' : '') +
                    num2tex(p[i].im, 3) + 'j';
            }
        }
        if (!isStable) {
            clpols += '}';
        }
        if (i < npols - 1) {
            clpols += ', ';
        }
    }

    katex.render(
        `p = ${clpols}`,
        document.getElementById('clp-' + v),
    );
    $('#clp-' + v).removeClass('now-calc')
}

function updateController(e) {
    let vars = {};
    design.params = $('#field-consts').val();
    draw_info();
    math.eval($('#field-consts').val(), vars);

    for (var key in vars) {
        if (vars.hasOwnProperty(key)) {
            vars[key] = new math.expression.node.ConstantNode(vars[key]);
        }
    }
    const vlist = ['y', 'th', 'x'];

    vlist.forEach((v) => {
        let Peq;
        try {
            Peq = math.parse($('#field-P' + v).val());
            tfP[v] = subs(Peq, vars);
            $('#field-P' + v).removeClass('is-invalid').addClass('is-valid');
            $('#vf-P' + v).removeClass('invalid-feedback').addClass('valid-feedback');
            $('#vf-P' + v).text('');
        } catch (e) {
            $('#field-P' + v).removeClass('is-valid').addClass('is-invalid');
            $('#vf-P' + v).removeClass('valid-feedback').addClass('invalid-feedback');
            $('#vf-P' + v).text(e.toString());
            return;
        }
        vars['P' + v] = tfP[v];

        let eq;
        design.controllers[v] = $('#field-K' + v).val();
        try {
            eq = math.parse(design.controllers[v]);
            tfL[v] = new math.expression.node.OperatorNode('*', 'multiply', [eq, tfP[v]]);
            updateBode[v]();
            $('#field-K' + v).removeClass('is-invalid').addClass('is-valid');
            $('#vf-K' + v).removeClass('invalid-feedback').addClass('valid-feedback');
            $('#vf-K' + v).text('');
        } catch (e) {
            $('#field-K' + v).removeClass('is-valid').addClass('is-invalid');
            $('#vf-K' + v).removeClass('valid-feedback').addClass('invalid-feedback');
            $('#vf-K' + v).text(e.toString());
            return;
        }
        vars['K' + v] = eq;
        var Krat = util_rationalize(eq);

        if (v == 'th') {
            var Prat = util_rationalize(tfP[v]);
            vars['SthKth'] = new math.expression.node.OperatorNode('/', 'divide', [
                new math.expression.node.OperatorNode('*', 'multiply', [Prat.denominator, Krat.numerator]),
                new math.expression.node.OperatorNode('+', 'add', [
                    new math.expression.node.OperatorNode('*', 'multiply', [Prat.denominator, Krat.denominator]),
                    new math.expression.node.OperatorNode('*', 'multiply', [Prat.numerator, Krat.numerator])
                ])
            ])
        }

        $('#clp-' + v).text('(now calculating...)').addClass('now-calc');
        workerJobs[v]++;
        workerCalcCLP[v].postMessage([JSON.stringify(eq), JSON.stringify(tfP[v])]);

        katex.render(
            `K_{${v.replace('th','{\\theta\}')}}(s) = ${eq.toTex().replace(/SthKth/g,'S_\{\\theta\}(s)K_\{\\theta\}(s)')}`,
            document.getElementById('eq-K' + v)
        );
        katex.render(
            `P_{${v.replace('th','{\\theta\}')}}(s) = ${Peq.toTex().replace(/SthKth/g,'S_\{\\theta\}(s)K_\{\\theta\}(s)')}`,
            document.getElementById('eq-P' + v)
        );


        let den = util_rationalize(Krat.denominator);
        try {
            K[v] = Ltisys.realizeFromTf(Krat.coefficients, den.coefficients);
            $('#field-K' + v).removeClass('is-invalid').addClass('is-valid');
            $('#vf-K' + v).removeClass('invalid-feedback').addClass('valid-feedback');
            $('#vf-K' + v).text('');
        } catch (e) {
            $('#field-K' + v).removeClass('is-valid').addClass('is-invalid');
            $('#vf-K' + v).removeClass('valid-feedback').addClass('invalid-feedback');
            $('#vf-K' + v).text(e.toString());
            return;
        }

    });
    $('#debug').val(JSON.stringify(design));

}

let rockets = [];
let t = 0,
    dt = 1 / 120;

function clear_rockets() {
    rockets = [];
}

function spawn() {
    let vars = {};
    math.eval($('#field-consts').val(), vars);
    let dx0 = $('#initialVelocityX').prop('checked') ? math.random(-5, 5) : 0,
        dy0 = $('#initialVelocityY').prop('checked') ? math.random(-5, 5) : 0,
        dth0 = $('#initialVelocityTh').prop('checked') ? math.random(-0.5, 0.5) : 0;

    let r = new Rocket(math.matrix([
        [rx],
        [ry],
        [0],
        [dx0],
        [dy0],
        [dth0]
    ]), t, {
        y: K.y.clone(),
        th: K.th.clone(),
        x: K.x.clone()
    });


    r.g = toNum(vars.g);
    r.m = toNum(vars.m);
    r.I = toNum(vars.I);
    r.l = toNum(vars.l);
    r.L = toNum(vars.L);
    r.W = toNum(vars.W);
    rockets.push(r);
}

let vymin = -200,
    vymax = 200,
    vxmin = -200,
    vxmax = 200;
const minvx = 20,
    minvy = 20;
let scale = 1;
const gw = 1;
let maxAcc = 20;

function loop() {
    t += dt;
    let txt = "";
    rockets.forEach(function (r) {
        for (let i = 0; i < (1 / 60) / dt; i++) {
            r.step(t, dt);
        }
        txt += r.x.toString() + '\n';
    });
    rockets = rockets.filter(function (r) {
        let y = r.x.get([1, 0]);
        let x = r.x.get([0, 0]);
        return (!isNaN(x) && !isNaN(y));
    });

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.scale(scale * devicePixelRatio, -scale * devicePixelRatio);
    vxmin = -canvas.width / 2 / scale;
    vxmax = -vxmin;
    vymin = -canvas.height / 2 / scale;
    vymax = -vymin;

    ctx.strokeStyle = "#AAAAFF";
    ctx.lineWidth = 0.5 / scale;
    for (let x = Math.floor(vxmin / gw) * gw; x <= vxmax; x += gw) {
        ctx.beginPath();
        ctx.moveTo(x, vymin);
        ctx.lineTo(x, vymax);
        ctx.stroke();
    }
    for (let y = Math.floor(vymin / gw) * gw; y <= vymax; y += gw) {
        ctx.beginPath();
        ctx.moveTo(vxmin, y);
        ctx.lineTo(vxmax, y);
        ctx.stroke();
    }

    let rfx = (rrx - rx),
        rfy = (rry - ry);
    let softsign = (x) => 100 * x / (1 + 100 * Math.abs(x));
    rfx = 2 / dt * (softsign(rfx) * Math.sqrt(0.9 * 2 * maxAcc * math.abs(rfx)) - rvx);
    rfx = clip(rfx, -maxAcc, maxAcc);
    rfy = 2 / dt * (softsign(rfy) * Math.sqrt(0.9 * 2 * maxAcc * math.abs(rfy)) - rvy);
    rfy = clip(rfy, -maxAcc, maxAcc);

    rvx += rfx * dt;
    rvy += rfy * dt;
    rx += rvx * dt;
    ry += rvy * dt;

    ctx.strokeStyle = "#FF0000";
    ctx.lineWidth = 3 / scale;
    ctx.beginPath();
    ctx.moveTo(rrx - 10 / scale, rry - 10 / scale);
    ctx.lineTo(rrx + 10 / scale, rry + 10 / scale);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(rrx - 10 / scale, rry + 10 / scale);
    ctx.lineTo(rrx + 10 / scale, rry - 10 / scale);
    ctx.stroke();
    ctx.lineWidth = 1 / scale;
    ctx.strokeStyle = "#FF0000";
    ctx.beginPath();
    ctx.moveTo(vxmin, ry);
    ctx.lineTo(vxmax, ry);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(rx, vymin);
    ctx.lineTo(rx, vymax);
    ctx.stroke();

    rockets.forEach(function (r) {
        r.draw(ctx, scale, show_info);
    });
    window.requestAnimationFrame(loop);
}

let canvasInfo = document.getElementById('canvas-info');
let ctxInfo = canvasInfo.getContext("2d");

function draw_info() {
    let ctx = ctxInfo;
    let r = new Rocket(math.matrix([
        [0],
        [0],
        [0],
        [0],
        [0],
        [0]
    ]), 0, {});
    let vars = {};
    math.eval($('#field-consts').val(), vars);
    r.g = toNum(vars.g);
    r.m = toNum(vars.m);
    r.I = toNum(vars.I);
    r.l = toNum(vars.l);
    r.L = toNum(vars.L);
    r.W = toNum(vars.W);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvasInfo.width, canvasInfo.height);

    ctx.translate(canvasInfo.width / 2, canvasInfo.height / 2);
    ctx.scale(scale * devicePixelRatio, -scale * devicePixelRatio);
    r.draw(ctx, scale, false);
    let fontSize = 14 / scale;
    ctx.font = `${fontSize}px Consolas`;
    ctx.fillStyle = "#008888";
    ctx.textBaseline = "middle";

    function text(s, x, y) {
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(1, -1);
        ctx.fillText(s, 0, 0);
        ctx.restore();
    }

    function line(bx, by, ex, ey) {
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.lineTo(ex, ey);
        ctx.stroke();
    }

    ctx.lineWidth = 1 / scale;
    ctx.strokeStyle = "#008888";
    ctx.textAlign = "left";
    canvas_arrow(ctx, 10 / scale, r.W * 2, r.l - r.L / 2 - 1 / scale, r.W * 2, r.l - r.L / 2);
    canvas_arrow(ctx, 10 / scale, r.W * 2, r.l - r.L / 2, r.W * 2, -r.L / 2);
    text("l", r.W * 2 + 2 / scale, r.l / 2 - r.L / 2)
    canvas_arrow(ctx, 10 / scale, -r.W / 2 - 20 / scale, (r.L - r.l) * 0.6, -r.W / 2, (r.L - r.l) * 0.6);
    canvas_arrow(ctx, 10 / scale, r.W / 2 + 20 / scale, (r.L - r.l) * 0.6, r.W / 2, (r.L - r.l) * 0.6);
    text("W", r.W / 2 + 23 / scale, (r.L - r.l) * 0.6)
    canvas_arrow(ctx, 10 / scale, -r.W * 3, 0, -r.W * 3, r.L / 2);
    canvas_arrow(ctx, 10 / scale, -r.W * 3, 0, -r.W * 3, -r.L / 2);
    ctx.textAlign = "right";
    text("L", -r.W * 3 - 2 / scale, 0);
    ctx.strokeStyle = "#888888";
    line(0, r.l - r.L / 2, r.W * 2 + 5 / scale, r.l - r.L / 2);
    line(-r.W * 3 - 5 / scale, -r.L / 2, r.W * 2 + 5 / scale, -r.L / 2);
    line(-r.W * 3 - 5 / scale, r.L / 2, r.W * 2 + 5 / scale, r.L / 2);
}

function resize_info() {
    let wr = document.getElementById('wrap-canvas-info');
    let ch = wr.clientHeight;
    let cw = wr.clientWidth;
    canvasInfo.height = ch * devicePixelRatio;
    canvasInfo.width = cw * devicePixelRatio;
}

function resize_func() {
    height = wrapper.clientHeight;
    width = wrapper.clientWidth;
    canvas.height = height * devicePixelRatio;
    canvas.width = width * devicePixelRatio;
    resize_info();
}

$(window).resize(resize_func);
resize_func();
scale = Math.min(width / (minvx), height / (minvy));

let timeoutId = undefined;

$('.tfinput,#field-consts').on("input", function () {
    if (typeof timeoutId === 'number') {
        clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(updateController, 500);
});

function updateMaxAcc() {
    maxAcc = Number($('#field-maxacc').val());
}
$('#field-maxacc').on("input", updateMaxAcc);
updateMaxAcc();

$('#field-consts').val(
    `g = 9.8
L = 3; W = 0.3; l = L/2
m = 1; I = 1/3 m*l^2`
);

updateController();

canvas.onclick = function (e) {
    let rect = e.target.getBoundingClientRect();
    mouseX = e.clientX - Math.floor(rect.left);
    mouseY = e.clientY - Math.floor(rect.top);
    rrx = (mouseX - width / 2) / scale;
    rry = -(mouseY - height / 2) / scale;
}

canvas.ondblclick = function (e) {
    let rect = e.target.getBoundingClientRect();
    mouseX = e.clientX - Math.floor(rect.left);
    mouseY = e.clientY - Math.floor(rect.top);
    rrx = (mouseX - width / 2) / scale;
    rry = -(mouseY - height / 2) / scale;
    rx = rrx;
    ry = rry;
    rvx = 0;
    rvy = 0;
}
canvas.onmousewheel = function (e) {
    console.log(scale);
    if (e.wheelDelta > 0) {
        scale *= 1.1;
    } else {
        scale /= 1.1;
    }
    draw_info();
}
setTimeout(function () {
    window.requestAnimationFrame(loop);
}, 10);