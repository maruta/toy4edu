class Rocket {
    constructor(x0, t0, K) {
        this.x0 = x0;
        this.x = x0;
        this.K = K;
        this.t0 = t0;
        this.rth = 0;
        this.Fx = 0;
        this.Fy = 0;
        this.Fn = 0;
        this.rgen = (t, rx, ry) => math.matrix([
            [rx],
            [ry]
        ]);
        this.debug = () => undefined;
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
/*        if ($('#disturbance').prop('checked')) {
            wx = Math.random() * 0.1 - 0.05;
            wy = Math.random() * 0.1 - 0.05;
            wth = Math.random() * 0.1 - 0.05;
        }*/
        return math.matrix([
            [dx],
            [dy],
            [dth],
            [F * Math.sin(th + phi) / m + wx],
            [(F * Math.cos(th + phi) / m) - g + wy],
            [-F * l * Math.sin(phi) / I + wth]
        ]);
    }

    step(tnow, rx0, ry0, h) {
        let t = tnow - this.t0;
        let y0 = this.x0.get([1, 0]);
        let r = this.rgen(t, rx0, ry0);
        let rx = r.get([0, 0]);
        let ry = r.get([1, 0]);
        
        const x = this.x.get([0, 0]),
            y = this.x.get([1, 0]),
            th = this.x.get([2, 0]);

        let ex = math.subtract(rx, x);
        this.ex = ex
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

        let F = Math.sqrt(Fx * Fx + Fy * Fy);
        let phi = Math.atan2(Fx, Fy) - th;
        //            this.phi = Math.atan2(-Fx, Fy);

        let u = math.matrix([
            [phi],
            [F]
        ]);
        this.Fx = Fx;
        this.Fy = Fy; 
        this.Fn = this.Fn + 1;       
        let that = this;
        this.x = rk4(function (x) {
            return that.f(x, u)
        }, this.x, h);
        this.debug(t, this);
    };

    draw(ctx, scale, show_info) {

        ctx.save();
        const x = this.x.get([0, 0]);
        const y = this.x.get([1, 0]);
        const th = this.x.get([2, 0]);
        const dx = this.x.get([3, 0]);
        const dy = this.x.get([4, 0]);
        const dth = this.x.get([5, 0]);
        const rth = this.rth;
        let F = Math.sqrt(this.Fx * this.Fx + this.Fy * this.Fy)/(this.Fn>0 ? this.Fn : 1);
        let phi = Math.atan2(this.Fx, this.Fy) - th;
        this.Fx=0;
        this.Fy=0;
        this.Fn=0;
        const L = this.L;
        const W = this.W;

        ctx.translate(x, y);
        if (this.name !==undefined){
            ctx.save();

            ctx.scale(1, -1);
            let fontSize = 18 / scale;
            ctx.font = `bold ${fontSize}px BIZ UDPゴシック`;
            if(show_info==0){
                ctx.textAlign = "left";
                ctx.textBaseline = "middle";
                ctx.fillStyle = "#004433";
                let re = /(.*)\((.*)\)/
                let name = re.exec(this.name)
                if(name){
                    ctx.fillText(name[1], W * 2, fontSize * (0));
                    ctx.font = `${fontSize}px BIZ UDPゴシック`;
                    ctx.fillText(name[2], W * 2, fontSize * (1.2));    
                }
            }else{
                ctx.textAlign = "center";
                ctx.textBaseline = "bottom";
                ctx.translate(W * 2, fontSize * (0))
                ctx.rotate(math.PI/2);
                ctx.fillText(this.name, 0,0);
            }

            if(this.timer != undefined){
                    ctx.font = `bold ${fontSize}px BIZ UDPゴシック`;
                    if(this.timerStyle){
                        ctx.fillStyle = this.timerStyle;
                    }
                    ctx.fillText(this.timer.toFixed(3), W * 2, fontSize * (-1.2));   
            }

            ctx.restore();

        }else if (show_info) {
            ctx.save();

            ctx.scale(1, -1);
            let fontSize = 12 / scale;
            ctx.font = `${fontSize}px Consolas`;
            ctx.fillText("x = " + x.toFixed(1), W * 2, fontSize * (-4));
            ctx.fillText("y = " + y.toFixed(1), W * 2, fontSize * (-3));
            ctx.fillText("θ = " + th.toFixed(3), W * 2, fontSize * (-2));
            ctx.fillText("rθ = " + rth.toPrecision(3), W * 2, fontSize * (-1));
            ctx.fillText("dx = " + dx.toPrecision(3), W * 2, fontSize * (0));
            ctx.fillText("dy = " + dy.toPrecision(3), W * 2, fontSize * 1);
            ctx.fillText("dθ = " + dth.toPrecision(3), W * 2, fontSize * 2);
            ctx.fillText("F = " + F.toFixed(2), W * 2, fontSize * 3);
            ctx.fillText("φ = " + phi.toPrecision(3), W * 2, fontSize * 4);

            ctx.restore();
        }

        ctx.rotate(-th);

        ctx.lineWidth = 2 / scale;
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