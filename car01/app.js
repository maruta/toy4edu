planck.testbed('Car', function (testbed) {
    let pl = planck,
        Vec2 = pl.Vec2;

    testbed.speed = 1.5;
    testbed.height = 30;
    testbed.width = 0;
    testbed.ratio = 80;
    testbed.xmin = -40;
    testbed.xmax = 280;
    testbed.ymin = -20;
    testbed.ymax = 40;
    testbed.debug = false;
    testbed.hz = 1 / 60;

    let world = new pl.World({
        gravity: Vec2(0, -10)
    });


    const groundFD = {
        density: 0.0,
        friction: 1
    };


    // generate ground
    const height = 16,
        length = 20,
        offset = 60;
    let ground = world.createBody();
    ground.createFixture(pl.Edge(Vec2(-length, 0.0), Vec2(length * 2 + offset, 0.0)), groundFD);
    ground.createFixture(pl.Edge(Vec2(length * 2 + offset, 0.0), Vec2(length * 4 + offset, height)), groundFD);
    ground.createFixture(pl.Edge(Vec2(length * 4 + offset, height), Vec2(length * 5 + offset, height)), groundFD);
    ground.createFixture(pl.Edge(Vec2(length * 5 + offset, height), Vec2(length * 7 + offset, 0.0)), groundFD);
    ground.createFixture(pl.Edge(Vec2(length * 7 + offset, 0.0), Vec2(length * 10 + offset, 0.0)), groundFD);

    // Boxes
    var box = pl.Box(0.5, 0.5);

    const pheight = 6;
    for (let i = 0; i < pheight; i++) {
        for (let j = 0; j < pheight - i; j += 1) {
            world.createDynamicBody(Vec2(-(pheight - i) * 0.5 + j - 10, 0.5 + i))
                .createFixture(box, 0.5);
        }
    }

    var carList = new Array();
    var k = 0; // time count

    function spawn(props) {

        // wheel spring settings
        const HZ = 5;
        const ZETA = 3;
        const SPEED = 50.0;

        let car = Object.assign({
            x0: 0,
            y0: 0,
            v0: 0,
            m: 4.0,
            filterGroupIndex: 0
        }, props);

        car.ud = 0;
        car.t0 = k / 60;


        car.body = world.createDynamicBody(Vec2(0.0, 1.0));
        let fx1 = car.body.createFixture(pl.Box(0.1, 0.1, Vec2(1.4, -0.6)), {
            density: car.m,
            filterGroupIndex: car.filterGroupIndex
        });
        fx1.render = {
            stroke: 'transparent'
        };
        let fx2 = car.body.createFixture(pl.Box(0.1, 0.1, Vec2(-1.5, -0.6)), {
            density: 2.0,
            filterGroupIndex: car.filterGroupIndex
        });
        fx2.render = {
            stroke: 'transparent'
        };
        car.body.createFixture(pl.Polygon([
            Vec2(-1.5, -0.5),
            Vec2(1.5, -0.5),
            Vec2(1.5, 0.0),
            Vec2(0.0, 0.9),
            Vec2(-1.15, 0.9),
            Vec2(-1.5, 0.2)
        ]), {
            density: 0.01,
            filterGroupIndex: car.filterGroupIndex
        });

        car.body.setLinearDamping(0.4);

        const wheelFD = {
            density: 0.01,
            friction: 50,
            filterGroupIndex: car.filterGroupIndex
        };
        car.wheelBack = world.createDynamicBody(Vec2(-1.0, 0.35));
        car.wheelBack.createFixture(pl.Circle(0.4), wheelFD);
        car.wheelFront = world.createDynamicBody(Vec2(1.0, 0.35));
        car.wheelFront.createFixture(pl.Circle(0.4), wheelFD);

        car.wheelFront.setLinearDamping(0.4);
        car.wheelBack.setLinearDamping(0.4);

        car.wheelFront.setAngularDamping(0);
        car.wheelBack.setAngularDamping(0);

        car.springBack = world.createJoint(pl.WheelJoint({
            motorSpeed: 0.0,
            maxMotorTorque: 2,
            enableMotor: true,
            frequencyHz: HZ,
            dampingRatio: ZETA
        }, car.body, car.wheelBack, car.wheelBack.getPosition(), Vec2(0.0, 1.0)));

        car.springFront = world.createJoint(pl.WheelJoint({
            motorSpeed: 0.0,
            maxMotorTorque: 10.0,
            enableMotor: false,
            frequencyHz: HZ * 1.4,
            dampingRatio: ZETA
        }, car.body, car.wheelFront, car.wheelFront.getPosition(), Vec2(0.0, 1.0)));

        car.body.setPosition(Vec2(car.x0 + car.body.getPosition().x, car.y0 + car.body.getPosition().y));
        car.wheelFront.setPosition(Vec2(car.x0 + car.wheelFront.getPosition().x, car.y0 + car.wheelFront.getPosition().y));
        car.wheelBack.setPosition(Vec2(car.x0 + car.wheelBack.getPosition().x, car.y0 + car.wheelBack.getPosition().y));
        car.body.setLinearVelocity(Vec2(car.v0, 0));
        car.wheelFront.setLinearVelocity(Vec2(car.v0, 0));
        car.wheelBack.setLinearVelocity(Vec2(car.v0, 0));
        carList.push(car)
    };

    function view(x, y,height){
        if( x != undefined) testbed.x = x
        if( y != undefined) testbed.y = -y
        if( height != undefined) testbed.height = height
    }

    function spawnFromUserCode() {
        try {
            user_code = Function('spawn', 'view', codemirror.getValue());
            user_code(spawn,view);
        } catch (e) {}
    }

    function getCarList() {
        return carList;
    }

    function destroyCar(idx) {
        let car = carList[idx];
        world.destroyBody(car.wheelBack);
        world.destroyBody(car.wheelFront);
        world.destroyBody(car.body);
        carList.splice(idx, 1);
    }

    function step() {
        k++;
        if (k % 60 == 0 && checkbox.checked == true) {
            spawnFromUserCode();
        }
        let deathnote = new Array();
        carList.forEach(function (car, idx, obj) {
            let cp = car.body.getPosition();
            let v = car.body.getLinearVelocity();
            let th = car.body.getAngle();
            let vx = (v.x * Math.cos(th) + v.y * Math.sin(th));
            let co = {
                u: 0,
                display: 'ERR',
                logSpeed: 1e-2
            };
            try {
                co = Object.assign(co,car.controller(vx, cp.x, k * (1 / 60) - car.t0))
            } catch (e) {}
            //car.ud = car.ud * 0.9 + co.controlInput * 0.1;
            car.ud = co.controlInput
            if (car.ud > 0) {
                car.springBack.setMotorSpeed(-100);
                car.springBack.setMaxMotorTorque(car.ud);
            } else {
                car.springBack.setMotorSpeed(100);
                car.springBack.setMaxMotorTorque(-car.ud);
            }
            if (cp.y < -20) {
                deathnote.push(idx);
            }
            let lines = co.display.split('\n')
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                testbed.drawText(Vec2(cp.x, cp.y + 1.2*(lines.length-i)), line, 'rgba(0,255,255,0.9)');                                
            }
            if(co.log){
                if(!car.log){
                    car.log = []
                    car.plot = [...Array(co.log.length)].map(e => []);
                    car.plotY = 0
                }
                car.log.unshift(co.log)

                const colors = ['rgba(0,255,0,0.7)','rgba(255,255,0,0.7)']
                for (let k = 0; k < co.log.length; k++) {
                    car.plot[k].push({x:co.log[k],y:-car.plotY})                    
                    testbed.drawPath(car.plot[k],colors[k],3,cp.y+car.plotY)                    
                }

                car.plotY += co.logSpeed         

            }
        });
        deathnote.reverse();
        deathnote.forEach(function (idx) {
            destroyCar(idx);
        });
    }

    testbed.keydown = function () {

    };

    testbed.step = function () {
        step();
        if(spawnOnce){
            spawnFromUserCode()
            spawnOnce = false
        }
        if (editor.style.display === 'none') {
            if (testbed.activeKeys.right) {
                testbed.x += 1;
            } else if (testbed.activeKeys.left) {
                testbed.x -= 1;
            }
            if (testbed.activeKeys.down) {
                testbed.y += 1;
            } else if (testbed.activeKeys.up) {
                testbed.y -= 1;
            }
            if (testbed.activeKeys["X"]) {
                testbed.height *= 1.01;
            } else if (testbed.activeKeys["Z"]) {
                testbed.height *= 0.99;
            }
        }
        testbed.status('x: ' + testbed.x.toFixed(0) + ', y: ' + (-testbed.y).toFixed(0) + ', vh: ' + testbed.height.toFixed(2));
        if (editor.style.display === ''){
            testbed.info('<kbd>ESC</kbd>Toggle Editor/Player');
        }else{
            testbed.info('<kbd>ESC</kbd>Toggle Editor/Player, <kbd>↑</kbd><kbd>↓</kbd><kbd>←</kbd><kbd>→</kbd>Move, <kbd>Z</kbd><kbd>X</kbd>Zoom, <span class="material-icons-outlined" style="vertical-align:text-bottom;">mouse</span>Interact');
        }        
    };


    let buttonSpawn = document.getElementById('spawn');
    let checkbox = document.getElementById('autospawn');
    buttonSpawn.addEventListener('click', function (event) {
        spawnFromUserCode();
    }, false);

    return world;
});
