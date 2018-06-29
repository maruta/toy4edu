class Ltisys {
    constructor(A, B, C, D) {
        this.n = math.size(A).get([0]);
        this.nu = math.size(B).get([1]);
        this.ny = math.size(C).get([0]);
        this.A = A;
        this.B = B;
        this.C = C;
        this.D = D;
        this.x = math.zeros(this.n, 1);
        this.y = math.zeros(this.n, 1);
    }

    step(u, dt) {
        this.x = rk4(
            (x) => math.add(
                math.multiply(this.A, x),
                math.multiply(this.B, u)),
            this.x, dt);
        this.y = math.add(
            math.multiply(this.C, this.x),
            math.multiply(this.D, u)
        );
    }

    clone() {
        return new Ltisys(
            Object(this.A) !== this.A ? this.A : this.A.clone(),
            Object(this.B) !== this.B ? this.B : this.B.clone(),
            Object(this.C) !== this.C ? this.C : this.C.clone(),
            Object(this.D) !== this.D ? this.D : this.D.clone()
        );
    }

    static realizeFromTf(num, den) {

        if (num.length > den.length) {
            throw "Cannot realize improper transfer function";
        }
        let n = den.length - 1;
        num = math.resize(num, [n + 1], 0);
        let A;
        let B;
        let C;
        let D;
        let x;
        if (n == 0) {
            A = math.zeros(1, 1);
            B = math.zeros(1, 1);
            C = math.zeros(1, 1);
            x = math.zeros(1, 1);
            D = num[0];
        } else {
            A = math.zeros(n, n);
            B = math.zeros(n, 1);
            C = math.zeros(1, n);
            x = math.zeros(n, 1);
            for (let i = 0; i < n + 1; i++) {
                if (i < num.length) num[i] /= den[n];
                den[i] /= den[n];
            }
            for (let i = 0; i < n - 1; i++) {
                A.set([i, i + 1], 1);
            }
            for (let i = 0; i < n; i++) {
                A.set([n - 1, i], -den[i]);
            }
            if (n > 0) {
                B.set([n - 1, 0], 1);
            }

            for (let i = 0; i < n; i++) {
                C.set([0, i], num[i] - den[i] * num[n])
            }
            D = num[n];
        }
        return new Ltisys(A, B, C, D);
    }
}