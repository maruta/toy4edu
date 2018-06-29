function drawBode(G, w, wrapperId, canvasId) {
    let wrapper = document.getElementById(wrapperId);
    let canvas = document.getElementById(canvasId);
    let ctx = canvas.getContext("2d");

    const height = wrapper.clientHeight;
    const width = wrapper.clientWidth;

    canvas.height = height * devicePixelRatio;
    canvas.width = width * devicePixelRatio;
    canvas.style.height = height + 'px';
    canvas.style.width = width + 'px';

    ctx.scale(devicePixelRatio, devicePixelRatio);
    let N = w.length;

    let gain = Array(N),
        phase = Array(N);

    let wgc = [],
        wpc = [];
    let phase_offset = 0;


    for (let i = 0; i < N; i++) {
        let omega = w[i];
        let Gjw = G.eval({
            's': math.complex(0, omega)
        });
        if (typeof Gjw.abs !== 'function') Gjw = math.complex(Gjw, 0);
        gain[i] = 20 * math.log10(Gjw.abs());

        if (i > 0 && Math.abs(Gjw.arg() / math.pi * 180 + phase_offset - phase[i - 1]) > 180) {
            phase_offset += Math.round(-(Gjw.arg() / math.pi * 180 + phase_offset - phase[i - 1]) / 360) * 360;
        }
        phase[i] = Gjw.arg() / math.pi * 180 + phase_offset;

        if (i > 0 && 0 < gain[i - 1] && gain[i] <= 0) {
            wgc.push((w[i - 1] + w[i]) / 2);
        }
    }

    let wmin = math.log10(math.min(w));
    let wmax = math.log10(math.max(w));

    let gmin = math.floor(clip(math.min(gain) - 1, -210, 210) / 20) * 20;
    let gmax = math.ceil(clip(math.max(gain) + 1, -210, 210) / 20) * 20;
    let pmin = math.floor((math.min(phase) - 1) / 45) * 45;
    let pmax = math.ceil((math.max(phase) + 1) / 45) * 45;


    const leftMargin = 70,
        rightMargin = 20;
    const topMargin = 10;
    const bottomMargin = 100;
    const midMargin = 20;
    const plotWidth = width - leftMargin - rightMargin;
    const plotHeight = (height - topMargin - midMargin - bottomMargin) / 2;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    ctx.save();
    let w2x = (w) => (w - wmin) * plotWidth / (wmax - wmin) + leftMargin;
    let g2y = (g) => (g - gmax) * (-plotHeight) / (gmax - gmin) + topMargin;
    let p2y = (p) => (p - pmax) * (-plotHeight) / (pmax - pmin) + topMargin + plotHeight + midMargin;

    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.font = "20px Consolas";

    // freq. grid
    for (let i = math.ceil(wmin); i <= math.floor(wmax); i++) {
        let x = w2x(i);
        ctx.fillText((math.pow(10, i)).toFixed(Math.max(0, -i)), x, p2y(pmin));
        ctx.strokeStyle = "#222222";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, g2y(gmin));
        ctx.lineTo(x, g2y(gmax));
        ctx.moveTo(x, p2y(pmin));
        ctx.lineTo(x, p2y(pmax));
        ctx.stroke();
        for (let k = 2; k < 10; k++) {
            if (i + math.log10(k) >= wmax) break;
            ctx.strokeStyle = "#AAAAAA";
            ctx.lineWidth = 1;
            let x = w2x(i + math.log10(k));
            ctx.beginPath();
            ctx.moveTo(x, g2y(gmin));
            ctx.lineTo(x, g2y(gmax));
            ctx.moveTo(x, p2y(pmin));
            ctx.lineTo(x, p2y(pmax));
            ctx.stroke();
        }
    }
    wgc.forEach((w) => {
        let x = w2x(math.log10(w));
        ctx.strokeStyle = "#ff2222";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, g2y(gmax));
        ctx.lineTo(x, p2y(pmin));
        ctx.stroke();
    })
    ctx.fillText("ω [rad/s]", (w2x(wmin) + w2x(wmax)) / 2, p2y(pmin) + 30);

    // gain and phase grid
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.save();
    ctx.translate(w2x(wmin) - 45, (g2y(gmin) + g2y(gmax)) / 2);
    ctx.rotate(-math.pi / 2);
    ctx.fillText("Gain [dB]", 0, 0);
    ctx.restore();
    ctx.save();
    ctx.translate(w2x(wmin) - 45, (p2y(pmin) + p2y(pmax)) / 2);
    ctx.rotate(-math.pi / 2);
    ctx.fillText("Phase [°]", 0, 0);
    ctx.restore();

    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    for (let g = gmin; g <= gmax + 1; g += 20) {
        let y = g2y(g);
        ctx.fillText(g.toFixed(0), w2x(wmin), y);
        ctx.strokeStyle = "#222222";
        if (g == 0) {
            ctx.strokeStyle = "#ff2222";
        }
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(w2x(wmin), y);
        ctx.lineTo(w2x(wmax), y);
        ctx.stroke();
    }
    for (let p = pmin; p <= pmax + 1; p += 45) {
        let y = p2y(p);
        ctx.fillText(p.toFixed(0), w2x(wmin), y);
        ctx.strokeStyle = "#222222";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(w2x(wmin), y);
        ctx.lineTo(w2x(wmax), y);
        ctx.stroke();
    }

    // gain plot
    ctx.strokeStyle = "#008888";
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let i = 0; i < N; i++) {
        let x = w2x(math.log10(w[i]));
        let y = g2y(gain[i]);
        if (i == 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    }
    ctx.stroke();

    // phase plot
    ctx.beginPath();
    for (let i = 0; i < N; i++) {
        let x = w2x(math.log10(w[i]));
        let y = p2y(phase[i]);
        if (i == 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    }
    ctx.stroke();

    ctx.restore();
}