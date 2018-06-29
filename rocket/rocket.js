class Rocket {
    constructor(x0, t0, K) {
        this.x0 = x0;
        this.x = x0;
        this.K = K;
        this.t0 = t0;
        this.rth = 0;
    }

    f(xvec, u) {
        const x = xvec.get([0, 0]);
        const y = xvec.get([1, 0]);
        const th = xvec.get([2, 0]);
        const dx = xvec.get([3, 0]);
        const dy = xvec.get([4, 0]);
        const dth = xvec.get([5, 0]);
        const phi = u.get([0, 0]);
        const F = u.get([1, 0]);
        const l = this.l,
            I = this.I,
            m = this.m,
            g = this.g;

        let wx = 0,
            wy = 0,
            wth = 0;
        if ($('#disturbance').prop('checked')) {
            wx = Math.random() * 0.1 - 0.05;
            wy = Math.random() * 0.1 - 0.05;
            wth = Math.random() * 0.1 - 0.05;
        }
        return math.matrix([
            [dx],
            [dy],
            [dth],
            [F * Math.sin(th + phi) / m + wx],
            [(F * Math.cos(th + phi) / m) - g + wy],
            [-F * l * Math.sin(phi) / I + wth]
        ]);
    }

    step(tnow, h) {
        let t = tnow - this.t0;
        let y0 = this.x0.get([1, 0]);

        const x = this.x.get([0, 0]),
            y = this.x.get([1, 0]),
            th = this.x.get([2, 0]);

        let ex = math.subtract(rx, x);
        let ey = math.subtract(ry, y);
        this.K.y.step(ey, h);
        this.K.x.step(ex, h);

        let rth = this.K.x.y.get([0, 0]);
        this.rth = rth;
        let eth = math.subtract(rth, th);
        this.K.th.step(eth, h);

        let Fy = this.K.y.y.get([0, 0]) + this.m * this.g;
        let Fx = this.K.th.y.get([0, 0]);


        //            if (Fy < 0.1 * this.g * this.m) Fy = 0.1 * this.g * this.m;

        this.F = Math.sqrt(Fx * Fx + Fy * Fy);
        this.phi = Math.atan2(Fx, Fy) - th;
        //            this.phi = Math.atan2(-Fx, Fy);

        let u = math.matrix([
            [this.phi],
            [this.F]
        ]);
        let that = this;
        this.x = rk4(function (x) {
            return that.f(x, u)
        }, this.x, h);
    };

    draw(ctx,scale,show_info) {

        ctx.save();
        const x = this.x.get([0, 0]);
        const y = this.x.get([1, 0]);
        const th = this.x.get([2, 0]);
        const dx = this.x.get([3, 0]);
        const dy = this.x.get([4, 0]);
        const dth = this.x.get([5, 0]);
        const rth = this.rth;
        const F = this.F;
        const phi = this.phi;
        const L = this.L;
        const W = this.W;

        ctx.translate(x, y);
        if (show_info) {
            ctx.save();

            ctx.scale(1, -1);
            let fontSize = 12 / scale;
            ctx.font = `${fontSize}px Consolas`;
            ctx.fillText("x = " + x.toFixed(1), W * 2, fontSize * (-4));
            ctx.fillText("y = " + y.toFixed(1), W * 2, fontSize * (-3));
            ctx.fillText("θ = " + th.toFixed(3), W * 2, fontSize * (-2));
            ctx.fillText("rθ = " + rth.toFixed(3), W * 2, fontSize * (-1));
            ctx.fillText("dx = " + dx.toFixed(1), W * 2, fontSize * (0));
            ctx.fillText("dy = " + dy.toFixed(1), W * 2, fontSize * 1);
            ctx.fillText("dθ = " + dth.toFixed(3), W * 2, fontSize * 2);
            ctx.fillText("F = " + F.toFixed(2), W * 2, fontSize * 3);
            ctx.fillText("φ = " + phi.toFixed(3), W * 2, fontSize * 4);

            ctx.restore();
        }

        ctx.rotate(-th);

        ctx.lineWidth = 2/scale;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';

        ctx.strokeStyle = "#FF0000";
        ctx.beginPath();
        ctx.moveTo(W / 4, -L / 2);
        ctx.lineTo(-1 * W * F * Math.sin(phi), -L / 2 - 1 * W * F * Math.cos(phi));
        ctx.lineTo(-W / 4, -L / 2);
        ctx.stroke();

        // hull
        ctx.strokeStyle = "#222244";
        ctx.beginPath();
        ctx.moveTo(0, L / 2);
        ctx.lineTo(-W / 2, L / 2 - W);
        ctx.lineTo(-W / 2, -L / 2);
        ctx.lineTo(W / 2, -L / 2);
        ctx.lineTo(W / 2, L / 2 - W);
        ctx.closePath();
        ctx.stroke();

        // left leg
        ctx.beginPath();
        ctx.moveTo(-W / 2, -L / 2);
        ctx.lineTo(-1.8 * W, -L / 2 - W);
        ctx.lineTo(-W / 2, -L / 2 + W);
        ctx.stroke();

        // right leg
        ctx.beginPath();
        ctx.moveTo(W / 2, -L / 2);
        ctx.lineTo(1.8 * W, -L / 2 - W);
        ctx.lineTo(W / 2, -L / 2 + W);
        ctx.stroke();

        ctx.restore();
    }
}