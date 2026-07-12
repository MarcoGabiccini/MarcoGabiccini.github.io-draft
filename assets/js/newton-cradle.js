/* Interactive Newton's cradle (Matter.js) rendered below the hero portrait. */
(function () {
  'use strict';

  var container = document.getElementById('newton-cradle');
  if (!container || typeof Matter === 'undefined') return;

  var Engine = Matter.Engine,
      Render = Matter.Render,
      Runner = Matter.Runner,
      Bodies = Matter.Bodies,
      Body = Matter.Body,
      Composite = Matter.Composite,
      Constraint = Matter.Constraint,
      Mouse = Matter.Mouse,
      MouseConstraint = Matter.MouseConstraint,
      Events = Matter.Events;

  var INK = '#151814';
  var ACCENT = '#e34b32';
  var LINE = 'rgba(21, 24, 20, .45)';

  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var touchPrimary = window.matchMedia('(hover: none) and (pointer: coarse)').matches;

  var engine, render, runner, visible = true, running = false, activeMouse = null;

  // Release the grab even when the pointer is let go outside the canvas.
  window.addEventListener('mouseup', function () {
    if (activeMouse) activeMouse.button = -1;
  });

  function destroy() {
    if (!engine) return;
    Render.stop(render);
    Runner.stop(runner);
    Events.off(engine);
    render.canvas.remove();
    Engine.clear(engine);
    engine = render = runner = null;
    running = false;
  }

  function build() {
    destroy();

    var width = container.clientWidth;
    if (width < 120) return;
    var height = Math.max(150, Math.round(width * 0.56));
    container.style.height = height + 'px';

    engine = Engine.create({ constraintIterations: 4 });

    render = Render.create({
      element: container,
      engine: engine,
      options: {
        width: width,
        height: height,
        pixelRatio: window.devicePixelRatio || 1,
        background: 'transparent',
        wireframes: false
      }
    });

    // Cradle geometry, scaled to the container.
    var count = 5;
    var radius = Math.max(12, Math.min(22, width / 16));
    var spacing = radius * 1.9; // slight overlap keeps the chain in contact
    var barY = 16;
    var length = height - barY - radius - 14;
    var firstX = width / 2 - ((count - 1) * spacing) / 2;

    var balls = [];
    for (var i = 0; i < count; i++) {
      var ax = firstX + i * spacing;
      var ball = Bodies.circle(ax, barY + length, radius, {
        inertia: Infinity,
        restitution: 1,
        friction: 0,
        frictionStatic: 0,
        frictionAir: 0.0001,
        slop: radius * 0.05,
        render: { fillStyle: i === count - 1 ? ACCENT : INK }
      });
      var string = Constraint.create({
        pointA: { x: ax, y: barY },
        bodyB: ball,
        length: length,
        stiffness: 1,
        render: { type: 'line', strokeStyle: LINE, lineWidth: 1, anchors: false }
      });
      balls.push(ball);
      Composite.add(engine.world, [ball, string]);
    }

    // Cosmetic support bar the strings hang from.
    Composite.add(engine.world, Bodies.rectangle(width / 2, barY - 2, (count - 1) * spacing + radius * 4, 4, {
      isStatic: true,
      collisionFilter: { mask: 0 },
      render: { fillStyle: INK }
    }));

    if (!reducedMotion) {
      // Largest release angle whose swing peak still stays inside the canvas.
      var sinTheta = Math.min(Math.sin(Math.PI / 3), (firstX - radius - 4) / length);
      Body.setPosition(balls[0], {
        x: firstX - length * sinTheta,
        y: barY + length * Math.sqrt(1 - sinTheta * sinTheta)
      });
    }

    var mouse = Mouse.create(render.canvas);
    // Matter's Mouse reads the canvas pixel ratio with parseInt, which truncates
    // fractional ratios (e.g. 1.25/1.5 on Windows display scaling) and breaks
    // grabbing. Use the render's exact value instead.
    mouse.pixelRatio = render.options.pixelRatio;
    var mouseConstraint = MouseConstraint.create(engine, {
      mouse: mouse,
      constraint: { stiffness: 0.2, render: { visible: false } }
    });
    // Let the page scroll normally over the canvas.
    mouse.element.removeEventListener('wheel', mouse.mousewheel);
    if (touchPrimary) {
      mouse.element.removeEventListener('touchmove', mouse.mousemove);
      mouse.element.removeEventListener('touchstart', mouse.mousedown);
      mouse.element.removeEventListener('touchend', mouse.mouseup);
    }
    Composite.add(engine.world, mouseConstraint);
    render.mouse = mouse;
    activeMouse = mouse;

    Events.on(mouseConstraint, 'startdrag', function () {
      container.classList.add('is-dragging');
    });
    Events.on(mouseConstraint, 'enddrag', function () {
      container.classList.remove('is-dragging');
    });

    // Keep dragged/released balls from picking up unphysical speeds.
    Events.on(engine, 'beforeUpdate', function () {
      var vMax = 38;
      for (var j = 0; j < balls.length; j++) {
        var v = balls[j].velocity;
        var speed = Math.hypot(v.x, v.y);
        if (speed > vMax) {
          Body.setVelocity(balls[j], { x: (v.x / speed) * vMax, y: (v.y / speed) * vMax });
        }
      }
    });

    runner = Runner.create();
    if (visible) start();
  }

  function start() {
    if (!engine || running) return;
    Runner.run(runner, engine);
    Render.run(render);
    running = true;
  }

  function stop() {
    if (!engine || !running) return;
    Runner.stop(runner);
    Render.stop(render);
    running = false;
  }

  // Pause the simulation while it is off-screen.
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      if (visible) start(); else stop();
    }, { threshold: 0 }).observe(container);
  }

  var resizeTimer, lastWidth = 0;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      if (container.clientWidth !== lastWidth) {
        lastWidth = container.clientWidth;
        build();
      }
    }, 200);
  });

  lastWidth = container.clientWidth;
  build();
})();
