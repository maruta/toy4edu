window.URL = window.URL || window.webkitURL;
// deflate
function decode(string) {
    return decodeURIComponent(RawDeflate.inflate(window.atob(string)));
}

function encode(string) {
    return window.btoa(RawDeflate.deflate(encodeURIComponent(string)));
}


var documents = [{
    filename: 'spawn.js',
    filetype: 'text/javascript',
    code: defaultCode
}];

if (localStorage.codeeditor !== undefined) {
    documents = JSON.parse(localStorage.codeeditor);
}

var codeFromHash = false;

let spawnOnce = false;

if (window.location.hash) {
    var hash = window.location.hash.substr(2);
    documents[0].code = decode(hash);
    codeFromHash = true;
    if(documents[0].code.startsWith("/* autospawn: true */") ){
        let checkbox = document.getElementById('autospawn')
        checkbox.checked = true
    }else if(documents[0].code.startsWith("/* autospawn: once */")){
        spawnOnce = true
    }
}

// editor
var interval;
var editor = document.getElementById('editor');
var codemirror = CodeMirror(editor, {
    value: documents[0].code,
    mode: 'text/javascript',
    lineNumbers: false,
    matchBrackets: true,
    indentWithTabs: true,
    tabSize: 4,
    indentUnit: 4,
    theme: 'cobalt'
});

codemirror.on('change', function () {
    buttonSave.style.display = '';
    buttonDownload.style.display = 'none';
});

// toolbar
var toolbar = document.getElementById('toolbar');

var buttonHide = document.createElement('button');
buttonHide.className = 'button';
buttonHide.textContent = 'hide code';
buttonHide.addEventListener('click', function (event) {
    toggle();
}, false);
toolbar.appendChild(buttonHide);

var buttonMenu = document.createElement('button');
buttonMenu.className = 'button';
buttonMenu.innerHTML = '&hellip;';
buttonMenu.addEventListener('click', function (event) {
    menu.style.display = menu.style.display === '' ? 'none' : '';
}, false);
toolbar.appendChild(buttonMenu);
toolbar.appendChild(document.createElement('br'));
var menu = document.createElement('span');
menu.style.display = 'none';
toolbar.appendChild(menu);
var buttonSave = document.createElement('button');
buttonSave.className = 'button';
buttonSave.textContent = 'save';
buttonSave.addEventListener('click', function (event) {
    save();
}, false);
menu.appendChild(buttonSave);
var buttonDownload = document.createElement('a');
buttonDownload.className = 'button';
buttonDownload.style.display = 'none';
buttonDownload.download = 'controller.js';
buttonDownload.textContent = 'download';
menu.appendChild(buttonDownload);
var buttonShare = document.createElement('button');
buttonShare.className = 'button';
buttonShare.textContent = 'share';
buttonShare.addEventListener('click', function (event) {
    var dom = document.createElement('input');
    dom.value = (location.origin === "null" ? 'file://' : location.origin) + location.pathname + '#/' + encode(codemirror.getValue());
    dom.style.width = '400px';
    dom.style.padding = '5px';
    dom.style.marginTop = '20px';
    popup.set(dom);
    popup.show();
    dom.focus();
    dom.select();
}, false);
menu.appendChild(buttonShare);
var buttonReset = document.createElement('button');
buttonReset.className = 'button';
buttonReset.textContent = 'reset';
buttonReset.addEventListener('click', function (event) {
    if (confirm('Are you sure?') === true) {
        codemirror.setValue(defaultCode);
        save();
    }
}, false);
menu.appendChild(buttonReset);
var buttonAbout = document.createElement('button');
buttonAbout.className = 'button';
buttonAbout.textContent = 'about';
buttonAbout.addEventListener('click', function (event) {
    var dom = document.createElement('div');
    dom.style.width = '550px';
    dom.style.padding = '5px';
    dom.style.border = '0px';
    dom.style.textAlign = 'center';
    dom.innerHTML = `
    <h1>TOYS FOR CONTROL EDUCATION</h1>
    <h2>#1 CARS</h2>
    by Ichiro Maruta<br>
    based on <a href="https://github.com/mrdoob/htmleditor" target="_blank">html editor by Mr.doob</a> and <a href="http://piqnt.com/planck.js/" target="_blank">Planck.js by Ali Shakiba</a>.
    `;
    popup.set(dom);
    popup.show();
}, false);
menu.appendChild(buttonAbout);
// popup
var popup = (function () {
    var scope = this;
    var element = document.getElementById('popup');
    element.style.display = 'none';
    var buttonClose = (function () {
        var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', 32);
        svg.setAttribute('height', 32);
        var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', 'M 9,12 L 11,10 L 15,14 L 19,10 L 21,12 L 17,16 L 21,20 L 19,22 L 15,18 L 11,22 L 9,20 L 13,16');
        path.setAttribute('fill', 'rgba(0,255,255,0.9)');
        svg.appendChild(path);
        return svg;
    })();
    buttonClose.style.position = 'absolute';
    buttonClose.style.top = '5px';
    buttonClose.style.right = '5px';
    buttonClose.style.cursor = 'pointer';
    buttonClose.addEventListener('click', function (event) {
        scope.hide();
    }, false);
    element.appendChild(buttonClose);
    var content = document.createElement('div');
    element.appendChild(content);

    function update() {
        element.style.left = ((window.innerWidth - element.offsetWidth) / 2) + 'px';
        element.style.top = ((window.innerHeight - element.offsetHeight) / 2) + 'px';
    }
    window.addEventListener('load', update, false);
    window.addEventListener('resize', update, false);
    //
    this.show = function () {
        element.style.display = '';
        update();
    };
    this.hide = function () {
        element.style.display = 'none';
    };
    this.set = function (value) {
        while (content.children.length > 0) {
            content.removeChild(content.firstChild);
        }
        content.appendChild(value);
    };
    return this;
})();
// events
document.addEventListener('drop', function (event) {
    event.preventDefault();
    event.stopPropagation();
    var file = event.dataTransfer.files[0];
    documents[0].filename = file.name;
    documents[0].filetype = file.type;
    var reader = new FileReader();
    reader.onload = function (event) {
        codemirror.setValue(event.target.result);
    };
    reader.readAsText(file);
}, false);
document.addEventListener('keydown', function (event) {
    if (event.keyCode === 83 && (event.ctrlKey === true || event.metaKey === true)) {
        event.preventDefault();
        save();
    }
    if (event.keyCode === 13 && (event.ctrlKey === true || event.metaKey === true)) {
        update();
    }
    if (event.keyCode === 27) {
        toggle();
    }
}, false);
// actions
function update() {
    var value = codemirror.getValue();
}
var errorLines = [];
var widgets = [];

function save() {
    documents[0].code = codemirror.getValue();
    localStorage.codeeditor = JSON.stringify(documents);
    var blob = new Blob([codemirror.getValue()], {
        type: documents[0].filetype
    });
    var objectURL = URL.createObjectURL(blob);
    buttonDownload.href = objectURL;
    var date = new Date();
    buttonDownload.download = documents[0].filename;
    buttonSave.style.display = 'none';
    buttonDownload.style.display = '';
}

function toggle() {
    if (editor.style.display === '') {
        buttonHide.textContent = 'show code';
        editor.style.display = 'none';
        buttonShare.display = 'none';
    } else {
        buttonHide.textContent = 'hide code';
        editor.style.display = '';
        buttonShare.display = '';
    }
}
update();

let status = document.getElementById('status');
let info = document.getElementById('info');
// wrap testbed with ui
var _testbed = planck.testbed;

planck.testbed = function (opts, callback) {
    _testbed(opts, function (testbed) {

        // playbtn.onclick = function () {
        //     testbed.isPaused() ? testbed.resume() : testbed.pause();
        // };

        // testbed._pause = function () {
        //     playbtn.className = playbtn.className.replace('pause', 'play');
        // };

        status.innerText = '';
        info.innerText = '';

        var _lastStatus = '';
        var _lastInfo = '';

        testbed._status = function (statusText, statusMap) {
            var newline = '\n';
            var string = statusText || '';
            for (var key in statusMap) {
                var value = statusMap[key];
                if (typeof value === 'function') continue;
                string += (string && newline) + key + ': ' + value;
            }

            if (_lastStatus !== string) {
                status.innerText = _lastStatus = string;
            }
        };

        testbed._info = function (text) {
            if (_lastInfo !== text) {
                info.innerHTML = _lastInfo = text;
            }
        };

        var world = callback.apply(null, arguments);


        return world;
    });
};
