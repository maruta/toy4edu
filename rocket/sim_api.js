// sim_api.js — 講評・実験用スクリプトAPI (`sim`) とスクリプトパネル。
// main.js のあとに読み込むこと (main.js のトップレベル束縛に依存する)。
//
// 主なAPI:
//   sim.massSpawnY(designs, {sortBy:'ywgc'})            y追従テスト用に一列に整列
//   sim.massSpawnX(designs, {sortBy:'xwgc', ny:4})      x方向グリッド配置
//   sim.shake('y', 20)                                  徐々に速くなる目標値 (振幅20)
//   sim.ramp('x', 1) / sim.accel('x', 0.5)              ランプ/等加速度の目標値
//   sim.spawn(design?, {x,y,th,dx,dy,dth,label})        1機スポーン (省略時: 編集中の設計)
//   sim.step('y', 1)                                    ステップ応答ログ (debugタブに出力)
//   sim.clear() / sim.setRef(x,y) / sim.resetRef()
//   sim.view({x,y,scale}) / sim.fullscreen(true|false)
//   sim.load(design) / sim.computeMargins(design)

const sim = {};

// ---------------- sim API ----------------

sim.computeMargins = function (d) {
    return RocketMargins.computeMargins(d || design);
};

function simMarginFields(mrg) {
    return {
        ywgc: mrg.ywgc,
        ypm: mrg.ypm,
        thwgc: mrg.thwgc,
        thpm: mrg.thpm,
        xwgc: mrg.xwgc,
        xpm: mrg.xpm,
        omega: mrg.omega
    };
}

// 整列キーが無い設計にはその場でω/PMを計算して付与する
function simEnsureField(ds, key) {
    ds.forEach(function (d) {
        if (typeof d[key] === 'number' && isFinite(d[key])) return;
        try {
            const mrg = RocketMargins.computeMargins(d);
            Object.assign(d, simMarginFields(mrg));
            if (!d.displayNameX) {
                Object.assign(d, RocketMargins.makeDisplayNames(d, mrg));
            }
        } catch (e) {
            console.warn('margin computation failed for ' + d.name, e);
        }
    });
}

function simOrder(ds, opts) {
    if (opts.order) return opts.order;
    let idx = ds.map((d, i) => i);
    if (opts.sortBy) {
        simEnsureField(ds, opts.sortBy);
        idx.sort((a, b) => ds[a][opts.sortBy] - ds[b][opts.sortBy]);
    }
    return idx;
}

// 整列後に全機が見えるように表示範囲を調整する (massSpawn* の fit:false で無効化)
function simFitView(xmin, xmax, ymin, ymax, padx, pady) {
    center.x = (xmin + xmax) / 2;
    center.y = (ymin + ymax) / 2;
    scale = Math.min(
        width / (xmax - xmin + 4 * padx),
        height / (ymax - ymin + 4 * pady),
        height / 20
    );
}

function simUseDesigns(ds) {
    if (!ds) ds = window.designs;
    if (!ds || !ds.length) {
        throw new Error('designs がありません: sim.massSpawn*(designs, ...) の形で設計の配列を渡してください');
    }
    sim.designs = ds;
    window.designs = ds; // 旧 debug_mass_spawn_*(list) 互換のため
    return ds;
}

sim.massSpawnX = function (ds, opts) {
    ds = simUseDesigns(ds);
    opts = opts || {};
    refcursor = REFCURSOR.X;
    getDisplayName = (r) => r.displayNameX || r.displayName || r.name || '';
    show_info = 0;
    const list = simOrder(ds, opts);
    const n = list.length;
    const ny = opts.ny !== undefined ? opts.ny : 4;
    const xstep = opts.xstep !== undefined ? opts.xstep : 5;
    const ystep = opts.ystep !== undefined ? opts.ystep : 5;
    const y0 = opts.y0 !== undefined ? opts.y0 : 0;
    nxstep = xstep;
    nxref = Math.ceil(n / ny);
    for (let k = 0; k < n; k++) {
        const d = Object.assign({}, ds[list[k]]);
        const ax = Math.floor((n - k - 1) / ny);
        const ay = (n - k - 1) % ny;
        const px = ax * xstep;
        const py = (-ay + ny / 2) * ystep + y0;
        d.rgen = (t, rx0, ry0) => math.matrix([
            [rx0 + px],
            [py]
        ]);
        d.debug = () => {};
        spawn(d, math.matrix([
            [px],
            [py],
            [0],
            [0],
            [0],
            [0]
        ]));
    }
    rx = 0; rvx = 0; rrx = 0;
    ry = 0; rvy = 0; rry = 0;
    if (opts.fit !== false) {
        const nx = Math.ceil(n / ny);
        simFitView(0, (nx - 1) * xstep, (1 - ny / 2) * ystep + y0, ny / 2 * ystep + y0, xstep, ystep);
    }
};

sim.massSpawnY = function (ds, opts) {
    ds = simUseDesigns(ds);
    opts = opts || {};
    refcursor = REFCURSOR.Y;
    getDisplayName = (r) => r.displayNameY || r.displayName || r.name || '';
    show_info = 90;
    const list = simOrder(ds, opts);
    const n = list.length;
    const xstep = opts.xstep !== undefined ? opts.xstep : 5;
    for (let k = 0; k < n; k++) {
        const d = Object.assign({}, ds[list[k]]);
        const px = (k - n / 2) * xstep;
        d.rgen = (t, rx0, ry0) => math.matrix([
            [px],
            [ry0]
        ]);
        d.debug = () => {};
        spawn(d, math.matrix([
            [px],
            [0],
            [0],
            [0],
            [0],
            [0]
        ]));
    }
    rx = 0; rvx = 0; rrx = 0;
    ry = 0; rvy = 0; rry = 0;
    if (opts.fit !== false) {
        simFitView((0 - n / 2) * xstep, (n - 1 - n / 2) * xstep, 0, 0, xstep, 5);
    }
};

sim.spawn = function (d, o) {
    o = o || {};
    const dd = Object.assign({}, d || design);
    const label = o.label !== undefined ? o.label : (dd.displayName || dd.name || '');
    const saved = getDisplayName;
    getDisplayName = () => label;
    try {
        spawn(dd, math.matrix([
            [o.x !== undefined ? o.x : rx],
            [o.y !== undefined ? o.y : ry],
            [o.th || 0],
            [o.dx || 0],
            [o.dy || 0],
            [o.dth || 0]
        ]));
    } finally {
        getDisplayName = saved;
    }
};

sim.clear = function () {
    clear_rockets();
};

sim.shake = function (axis, width) {
    shake(axis, width);
};

sim.ramp = function (axis, vel) {
    (axis === 'x' ? debug_ramp_x : debug_ramp_y)(vel);
};

sim.accel = function (axis, acc) {
    (axis === 'x' ? debug_accel_x : debug_accel_y)(acc);
};

sim.step = function (axis, amount) {
    debug_step(axis, amount);
};

sim.setRef = function (x, y) {
    rrx = x;
    rry = y;
    rgen = rgen_manual;
};

sim.resetRef = function () {
    reset_r();
};

sim.view = function (o) {
    o = o || {};
    if (o.x !== undefined) center.x = o.x;
    if (o.y !== undefined) center.y = o.y;
    if (o.scale !== undefined) scale = o.scale;
};

sim.fullscreen = function (on) {
    if (on === false) {
        normal_screen();
    } else {
        full_screen();
    }
};

sim.load = function (d) {
    updateController(d, true);
};

// ---------------- スクリプトパネル ----------------

let scriptEditor = null;

const SCRIPT_DEFAULT = `// 実験スクリプト — Ctrl+Enter または Run で実行
// 講評時は build_report.js が生成した experiment_YYYY.js をここに貼り付けて Run。
// スニペットは上の insert… から挿入できます。主なAPI:
//   sim.massSpawnY(designs, {sortBy:'ywgc'})   // y追従テスト用に一列整列
//   sim.massSpawnX(designs, {sortBy:'xwgc'})   // x方向グリッド配置
//   sim.shake('y', 20)                         // 徐々に速くなる目標値
//   sim.spawn() / sim.clear() / sim.resetRef() / sim.fullscreen()
`;

const SCRIPT_PRESETS = {
    massY: "sim.massSpawnY(designs, {sortBy: 'ywgc'});",
    massXw: "sim.massSpawnX(designs, {sortBy: 'xwgc'});",
    massXpm: "sim.massSpawnX(designs, {sortBy: 'xpm'});",
    shakeY: "sim.shake('y', 20);",
    shakeX: "sim.shake('x', 20);",
    rampX: "sim.ramp('x', 1);",
    spawn1: "sim.spawn();",
    clearAll: "sim.clear();",
    resetRef: "sim.resetRef();"
};

function initScriptEditor() {
    if (scriptEditor) return;
    scriptEditor = CodeMirror(document.getElementById('script-editor'), {
        value: SCRIPT_DEFAULT,
        mode: 'javascript',
        theme: 'material-darker',
        lineNumbers: true,
        extraKeys: {
            'Ctrl-Enter': runScript,
            'Cmd-Enter': runScript
        }
    });
}

function openScriptPanel() {
    $('#script-panel').removeClass('d-none');
    initScriptEditor();
    scriptEditor.refresh();
}

function closeScriptPanel() {
    $('#script-panel').addClass('d-none');
}

function toggleScriptPanel() {
    if ($('#script-panel').hasClass('d-none')) {
        openScriptPanel();
    } else {
        closeScriptPanel();
    }
}

function setScriptStatus(msg, isError) {
    $('#script-status').text(msg).css('color', isError ? '#ff8888' : '#66ddcc');
}

function runScript() {
    initScriptEditor();
    const code = scriptEditor.getValue();
    try {
        (new Function('sim', code)).call(window, sim);
        setScriptStatus('実行 ' + new Date().toLocaleTimeString());
    } catch (e) {
        console.error(e);
        openScriptPanel(); // 自動実行失敗時などにエラーを見えるようにする
        setScriptStatus(e.toString(), true);
    }
}

function scriptShareUrl() {
    initScriptEditor();
    const payload = {
        code: scriptEditor.getValue(),
        run: true
    };
    const url = (location.origin === 'null' ? 'file://' : location.origin) +
        location.pathname + '#/2/' + encodeUtf8(JSON.stringify(payload));
    const done = () => setScriptStatus('URLをコピーしました (' + url.length + '文字)');
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(done, () => window.prompt('このURLをコピーしてください', url));
    } else {
        window.prompt('このURLをコピーしてください', url);
    }
    return url;
}

$('#script-preset').on('change', function () {
    const v = $(this).val();
    $(this).val('');
    if (!v || !SCRIPT_PRESETS[v]) return;
    openScriptPanel();
    const doc = scriptEditor.getDoc();
    doc.replaceRange(SCRIPT_PRESETS[v] + '\n', {
        line: doc.lastLine() + 1,
        ch: 0
    });
    scriptEditor.focus();
    scriptEditor.scrollIntoView({
        line: doc.lastLine(),
        ch: 0
    });
});

// URL (#/2/...) で渡されたスクリプトの読み込みと自動実行 (main.js が pendingScript を設定)
// 自動実行時はパネルを開かず表示領域を確保する (コードは script ボタンでいつでも確認できる)
if (typeof pendingScript !== 'undefined' && pendingScript && pendingScript.code) {
    initScriptEditor();
    scriptEditor.setValue(pendingScript.code);
    if (pendingScript.run) {
        setTimeout(runScript, 100);
    } else {
        openScriptPanel();
    }
}
