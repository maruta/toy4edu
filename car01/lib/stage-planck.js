(function () {
  Stage.Planck = PlanckViewer;
  Stage.planck = function(world, opts) {
    return new PlanckViewer(world, opts);
  };

  PlanckViewer._super = Stage;
  PlanckViewer.prototype = Stage._create(PlanckViewer._super.prototype);

  function PlanckViewer(world, opts) {
    PlanckViewer._super.call(this);
    this.label('Planck');

    opts = opts || {};

    var options = this._options = {};
    this._options.speed = opts.speed || 1;
    this._options.hz = opts.hz || 60;
    if (Math.abs(this._options.hz) < 1) {
      this._options.hz = 1 / this._options.hz;
    }
    this._options.ratio = opts.ratio || 16;
    this._options.lineWidth = 4 / this._options.ratio;

    this._world = world;

    var timeStep = 1 / this._options.hz;
    var elapsedTime = 0;
    this.tick(function(dt) {
      dt = dt * 0.001 * options.speed;
      elapsedTime += dt;
      while (elapsedTime > timeStep) {
        world.step(timeStep);
        elapsedTime -= timeStep;
      }
      this.renderWorld();
      return true;
    }, true);

    world.on('remove-fixture', function (obj) {
      obj.ui && obj.ui.remove();
    });

    world.on('remove-joint', function (obj) {
      obj.ui && obj.ui.remove();
    });
  }

  PlanckViewer.prototype.renderWorld = function(world) {
    var world = this._world;
    var viewer = this;

    for (var b = world.getBodyList(); b; b = b.getNext()) {
      for (var f = b.getFixtureList(); f; f = f.getNext()) {

        if (!f.ui) {
          if (f.render && f.render.stroke) {
            this._options.strokeStyle = f.render.stroke;
          } else if (b.render && b.render.stroke) {
            this._options.strokeStyle = b.render.stroke;
          } else if (b.isDynamic()) {
            this._options.strokeStyle = 'rgba(255,255,255,0.9)';
          } else if (b.isKinematic()) {
            this._options.strokeStyle = 'rgba(255,255,255,0.7)';
          } else if (b.isStatic()) {
            this._options.strokeStyle = 'rgba(255,255,255,0.5)';
          }

          if (f.render && f.render.fill) {
            this._options.fillStyle = f.render.fill;
          } else if (b.render && b.render.fill) {
            this._options.fillStyle = b.render.fill;
          } else {
            this._options.fillStyle = '';
          }

          var type = f.getType();
          var shape = f.getShape();
          if (type == 'circle') {
            f.ui = viewer.drawCircle(shape, this._options);
          }
          if (type == 'edge') {
            f.ui = viewer.drawEdge(shape, this._options);
          }
          if (type == 'polygon') {
            f.ui = viewer.drawPolygon(shape, this._options);
          }
          if (type == 'chain') {
            f.ui = viewer.drawChain(shape, this._options);
          }

          if (f.ui) {
            f.ui.appendTo(viewer);
          }
        }

        if (f.ui) {
          var p = b.getPosition(), r = b.getAngle();
          if (f.ui.__lastX !== p.x || f.ui.__lastY !== p.y || f.ui.__lastR !== r) {
            f.ui.__lastX = p.x;
            f.ui.__lastY = p.y;
            f.ui.__lastR = r;
            f.ui.offset(p.x, p.y);
            f.ui.rotate(r);
          }
        }

      }
    }

    for (var j = world.getJointList(); j; j = j.getNext()) {
      var type = j.getType();
      var a = j.getAnchorA();
      var b = j.getAnchorB();

      if (!j.ui) {
        this._options.strokeStyle = 'rgba(255,255,255,0.2)';

        j.ui = viewer.drawJoint(j, this._options);
        j.ui.pin('handle', 0.5);
        if (j.ui) {
          j.ui.appendTo(viewer);
        }
      }

      if (j.ui) {
        var cx = (a.x + b.x) * 0.5;
        var cy = (a.y + b.y) * 0.5;
        var dx = a.x - b.x;
        var dy = a.y - b.y;
        var d = Math.sqrt(dx * dx + dy * dy);
        j.ui.width(d)
        j.ui.rotate(Math.atan2(dy, dx));
        j.ui.offset(cx, cy);
      }
    }

  }

  PlanckViewer.prototype.drawJoint = function(joint, options) {
    var lw = options.lineWidth;
    var ratio = options.ratio;

    var length = 10;

    var texture = Stage.canvas(function(ctx) {

      this.size(length + 2 * lw, 2 * lw, ratio);

      ctx.scale(ratio, ratio);
      ctx.beginPath();
      ctx.moveTo(lw, lw);
      ctx.lineTo(lw + length, lw);

      ctx.lineCap = 'round';
      ctx.lineWidth = options.lineWidth;
      ctx.strokeStyle = options.strokeStyle;
      ctx.stroke();
    });

    var image = Stage.image(texture).stretch();
    return image;
  };

  PlanckViewer.prototype.drawCircle = function(shape, options) {
    var lw = options.lineWidth;
    var ratio = options.ratio;

    var r = shape.m_radius;
    var cx = r + lw;
    var cy = r + lw;
    var w = r * 2 + lw * 2;
    var h = r * 2 + lw * 2;

    var texture = Stage.canvas(function(ctx) {

      this.size(w, h, ratio);

      ctx.scale(ratio, ratio);
      ctx.arc(cx, cy, r, 0, 2 * Math.PI);
      if (options.fillStyle) {
        ctx.fillStyle = options.fillStyle;
        ctx.fill();
      }
      ctx.lineTo(cx, cy);
      ctx.lineWidth = options.lineWidth;
      ctx.strokeStyle = options.strokeStyle;
      ctx.stroke();
    });
    var image = Stage.image(texture)
      .offset(shape.m_p.x - cx, shape.m_p.y - cy);
    var node = Stage.create().append(image);
    return node;
  };

  PlanckViewer.prototype.drawEdge = function(edge, options) {
    var lw = options.lineWidth;
    var ratio = options.ratio;

    var v1 = edge.m_vertex1;
    var v2 = edge.m_vertex2;

    var dx = v2.x - v1.x;
    var dy = v2.y - v1.y;

    var length = Math.sqrt(dx * dx + dy * dy);

    var texture = Stage.canvas(function(ctx) {

      this.size(length + 2 * lw, 2 * lw, ratio);

      ctx.scale(ratio, ratio);
      ctx.beginPath();
      ctx.moveTo(lw, lw);
      ctx.lineTo(lw + length, lw);

      ctx.lineCap = 'round';
      ctx.lineWidth = options.lineWidth;
      ctx.strokeStyle = options.strokeStyle;
      ctx.stroke();
    });

    var minX = Math.min(v1.x, v2.x);
    var minY = Math.min(v1.y, v2.y);

    var image = Stage.image(texture);
    image.rotate(Math.atan2(dy, dx));
    image.offset(minX - lw, minY - lw);
    var node = Stage.create().append(image);
    return node;
  };

  PlanckViewer.prototype.drawPolygon = function(shape, options) {
    var lw = options.lineWidth;
    var ratio = options.ratio;

    var vertices = shape.m_vertices;

    if (!vertices.length) {
      return;
    }

    var minX = Infinity, minY = Infinity;
    var maxX = -Infinity, maxY = -Infinity;
    for (var i = 0; i < vertices.length; ++i) {
      var v = vertices[i];
      minX = Math.min(minX, v.x);
      maxX = Math.max(maxX, v.x);
      minY = Math.min(minY, v.y);
      maxY = Math.max(maxY, v.y);
    }

    var width = maxX - minX;
    var height = maxY - minY;

    var texture = Stage.canvas(function(ctx) {

      this.size(width + 2 * lw, height + 2 * lw, ratio);

      ctx.scale(ratio, ratio);
      ctx.beginPath();
      for (var i = 0; i < vertices.length; ++i) {
        var v = vertices[i];
        var x = v.x - minX + lw;
        var y = v.y - minY + lw;
        if (i == 0)
          ctx.moveTo(x, y);
        else
          ctx.lineTo(x, y);
      }

      if (vertices.length > 2) {
        ctx.closePath();
      }

      if (options.fillStyle) {
        ctx.fillStyle = options.fillStyle;
        ctx.fill();
        ctx.closePath();
      }

      ctx.lineCap = 'round';
      ctx.lineWidth = options.lineWidth;
      ctx.strokeStyle = options.strokeStyle;
      ctx.stroke();
    });

    var image = Stage.image(texture);
    image.offset(minX - lw, minY - lw);
    var node = Stage.create().append(image);
    return node;
  };

  PlanckViewer.prototype.drawChain = function(shape, options) {
    var lw = options.lineWidth;
    var ratio = options.ratio;

    var vertices = shape.m_vertices;

    if (!vertices.length) {
      return;
    }

    var minX = Infinity, minY = Infinity;
    var maxX = -Infinity, maxY = -Infinity;
    for (var i = 0; i < vertices.length; ++i) {
      var v = vertices[i];
      minX = Math.min(minX, v.x);
      maxX = Math.max(maxX, v.x);
      minY = Math.min(minY, v.y);
      maxY = Math.max(maxY, v.y);
    }

    var width = maxX - minX;
    var height = maxY - minY;

    var texture = Stage.canvas(function(ctx) {

      this.size(width + 2 * lw, height + 2 * lw, ratio);

      ctx.scale(ratio, ratio);
      ctx.beginPath();
      for (var i = 0; i < vertices.length; ++i) {
        var v = vertices[i];
        var x = v.x - minX + lw;
        var y = v.y - minY + lw;
        if (i == 0)
          ctx.moveTo(x, y);
        else
          ctx.lineTo(x, y);
      }

      // TODO: if loop
      if (vertices.length > 2) {
        // ctx.closePath();
      }

      if (options.fillStyle) {
        ctx.fillStyle = options.fillStyle;
        ctx.fill();
        ctx.closePath();
      }

      ctx.lineCap = 'round';
      ctx.lineWidth = options.lineWidth;
      ctx.strokeStyle = options.strokeStyle;
      ctx.stroke();
    });

    var image = Stage.image(texture);
    image.offset(minX - lw, minY - lw);
    var node = Stage.create().append(image);
    return node;
  };
})();
