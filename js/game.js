/* beachball
   =========
   
   A simple physics game: keep the beachball balanced on the beach!

   controls
   ========
   
   move left   - 'A' key or tilting left (on a device with an accelerometer)
   move right  - 'D' key or tilting right
   start game  - 'S' key or clicking on the 'start' button. The 'S' key will
                  function even if no accelerometer is detected.
*/

(function(exports) {
  /*  Wrap up an interval, with the function to be called on setInterval
      as the second argument.
        
        delay         the delay (in seconds) to call the function         
        onStart       if a function, called when the repeater is started     
        onStop        if a function, called when the repeater is stopped
  */
  var repeater = exports.repeater = function(settings, func) {
    if (settings.delay <= 0) { throw Error('delay must be greater than zero'); }
    if (typeof func !== 'function') { throw Error(); }  
        
    var last,
        onStart = settings.onStart,
        onStop = settings.onStop,
        delay = settings.delay;    

    function running() {
      return last != undefined;
    }

    return {
       start : function() {
          if (!running()) {
            last = setInterval(func, 1000*delay);
            if (typeof onStart === 'function') { onStart(); }
          }
       },
       stop : function() {
          if (running()) {
            last = clearInterval(last);
            if (typeof onStop === 'function') { onStop(); }  
          }
       },
       running : running
    };
  }  

  var world,
      fps,
      step,
      originalBeachballPosition,  // The initial position of the beachball, in pixels
      beachballBody,              // The beachball's Box2D body   
      nudgeMagnitude = 10e-5;     // A good nudging value
     
  var originalGravity,
      gravityLoop,
      gravityIntensity = 1,
      gravityPollFreq = 1/100,
      gx = [],
      gy = [];     
     
  var difficulty,
      loop,
      started = false,
      game = {},      
      events = $({}); // Events binding
  
  exports.game = game;
  
  // Rename the emitting function to something more sensible.
  events.emit = events.triggerHandler;

  /*  Apply an impulse [N*s] with a magnitude from the given
      angle to the body.
  */
  function impulse(body, angle, mag) {        
    body.ApplyImpulse({
         x : Math.cos(angle) * mag, 
         y : Math.sin(angle) * mag
    }, 
    body.GetWorldCenter());
  }

  /*  Reset the beachball's position and applies an impulse to the ball
      and a random direction. This is to prevent Box2D from treating the
      beachball as a static body.
  */
  function resetBeachball() {
    beachballBody.SetAngularVelocity(0);
    beachballBody.SetLinearVelocity({
      x : 0,
      y : 0
    });
    beachballBody.SetPositionAndAngle({
      x : world.toMeters(originalBeachballPosition.x),
      y : world.toMeters(originalBeachballPosition.y)
    }, 0);
    
    // Apply an initial nudge 
    impulse(beachballBody, 2 * Math.PI * Math.random(), nudgeMagnitude);   
  }

  function onWallHit(sensor, bodyA, bodyB) {
    var body;
    if (bodyA.id == '#beachball') { body = bodyA; }
    else if (bodyB.id == '#beachball') { body = bodyB; }

    if (body) {
      events.emit({type: 'lost', body: body, 'drawRatio': world.drawRatio()});
    }  
  };

  /*  The physics/drawing loop. */
  loop = repeater({delay: 1/fps}, function() {   
    world.step(1/fps, step, step);
    world.iterBodies(function(i, body) {                  
      if (body.id != undefined) {            
        var pos = body.GetPosition(),
            angle = body.GetAngle(),
            drawRatio = world.drawRatio(),
            obj = $(body.id);

        obj.css('left', pos.x * drawRatio - obj.width()/2 + 'px');
        obj.css('top', pos.y * drawRatio - obj.height()/2 + 'px');                                           
        obj.rotate(angle, 'rad');
      }
    });
    world.clearForces();
  });

  /*  Smooth the gravity data from the device and change the 
      gravity of the world accordingly.
  */
  gravityLoop = repeater({delay: gravityPollFreq}, function() {
     var sumx = 0,
         sumy = 0;

     for (var i in gx) { sumx += gx[i]; }
     for (var i in gy) { sumy += gy[i]; }
     
     sumx /= gx.length;
     sumy /= gy.length;

     gx = [];
     gy = [];

     sumx *= gravityIntensity;
     sumy *= gravityIntensity;

     if (!isNaN(sumx) && !isNaN(sumy)) {
        console.log(sumx, sumy);
     
        world.gravity({
           x : sumx,
           y : -sumy      // gravity comes in with -y pointing down; we want the opposite
        });
        
        // Give the beachball a nudge so that gravity will take effect.
        impulse(
          beachballBody,
          Math.asin(sumx / Math.sqrt(Math.pow(sumx, 2) + Math.pow(sumy, 2))), 
          nudgeMagnitude);                  
     }
   });   

  game.events = events;
  game.resetBeachball = resetBeachball;  
     
  game.load = function(s) {
    // Settings    
    originalGravity = s.gravity || { x: 0*gravityIntensity, y: 9.8*gravityIntensity };
    
    fps = (s.fps > 0) ? s.fps : 30;
    step = (s.step > 0) ? s.step : 4;

    game.difficulty(s.difficulty || 'hard');    

    var $w = $(window),
        winWidth = $w.width(),
        winHeight = $w.height();

    // Reposition the sand so that it's centered horizontally and
    // centered and straddling the bottom of the screen verticially
    $('#beach-fg').css('left', winWidth/2 - $('#beach-fg').width()/2 + 'px');               
    $('#beach-bg').css('left', winWidth/2 - $('#beach-bg').width()/2 + 'px');      

    // Set up the Box2D world and bodies
    var $beachBg = $('#beach-bg'),
        $beachball = $('#beachball'),
        beachTop = $beachBg.offset().top,
        beachLeft = $beachBg.offset().left,
        beachWidth = $beachBg.width(),
        beachHeight = $beachBg.height(),
        beachRadius = $beachBg.cornerRadius(), 
        beachballRadius = Math.max($beachball.width(), $beachball.height())/2;                        
        
    world = new Box2D.world({
       drawRatio : winWidth,
       gravity : originalGravity
    });

    // Center the beachball horizontally
    $beachball.css('left', (winWidth/2 - $beachball.width()/2) + 'px');

    originalBeachballPosition =  {
      x: $beachball.offset().left,
      y: $beachball.offset().top
    };

    // Bounding wall thickness and internal padding.
    var wallThickness = 10,
        wallPadding = beachballRadius * 2;

    // Add bounding walls in order of: top, right, bottom, left
    var boundingWalls = [
      {
        width:  2*wallPadding + winWidth, 
        height: wallThickness, 
        x:      winWidth/2, 
        y:      -wallPadding-wallThickness
      },
      {
        width:  wallThickness, 
        height: 2*wallPadding + winHeight, 
        x:      winWidth + wallPadding,
        y:      winHeight/2
      },
      {
        width:  2*wallPadding + winWidth, 
        height: wallThickness, 
        x:      winWidth/2, 
        y:      winHeight+wallPadding
      },
      {
        width:  wallThickness, 
        height: 2*wallPadding + winHeight, 
        x:      winWidth + wallPadding,
        y:      winHeight/2
      },            
    ];
    $.each(boundingWalls, function(i, o) {
      world.addBody({
        static: true,
        sensorCallback: onWallHit,
        x: o.x + 'px',
        y: o.y + 'px',
        width : o.width + 'px',
        height: o.height + 'px'
      });
    });

    // Represent the beach as two circles with a box between them
    // The background is always equal to or larger than the foreground beach.
    
    // Beach center box
    world.addBody({
       shape: 'box',
       x: winWidth/2 + 'px',
       y: beachTop + beachHeight/2 + 'px',
       width: beachWidth - 2*beachRadius + 'px',
       height: beachHeight + 'px'            
    });
    
    // The largest left corner of the beach
    world.addBody({
       shape : 'circle',
       x: beachLeft + beachRadius + 'px',
       y: beachTop + beachHeight/2 + 'px',       
       radius: beachRadius + 'px'
    })
    
    // The largest right corner of the beach    
    world.addBody({
       shape: 'circle',
       x: beachLeft + beachWidth - beachRadius + 'px',
       y: beachTop + beachHeight/2 + 'px',
       radius: beachRadius + 'px'
    });

    // The beachball
    beachballBody = world.addBody({
       shape : 'circle',
       static : false,
       radius : beachballRadius + 'px',
       x : originalBeachballPosition.x + 'px',
       y : originalBeachballPosition.y + 'px',
       id : '#beachball'
    });    

    // Start polling for the accelerometer
    $w.on('devicemotion', function(e) {
        e = e.originalEvent;
        switch(window.orientation) {        
          // Reverse x and y
          case 90:
            gx.push(-e.accelerationIncludingGravity.y);
            gy.push(e.accelerationIncludingGravity.x);
            break;
          case -90:
            gx.push(e.accelerationIncludingGravity.y);
            gy.push(-e.accelerationIncludingGravity.x);            
            break;
          default:
            gx.push(e.accelerationIncludingGravity.x);
            gy.push(e.accelerationIncludingGravity.y);
            break;
       }
    });          
    gravityLoop.start();      
          
    events.emit({type: 'loaded.core', settings: s}); 
  }      
    
  game.pushBeachball = function(dir) {
     var g = world.gravity(),	
         hyp = Math.sqrt(Math.pow(g.x, 2) + Math.pow(g.y, 2)),
         randomNudge = nudgeMagnitude * (1 + Math.random());
  
    // Choose an angle orthogonal to gravity and pointing
    // in the direction of the push
    switch(dir) {
      case 'left':
        impulse(beachballBody, Math.acos(-g.y / hyp), randomNudge);
        break;
      case 'right':   
        impulse(beachballBody, Math.acos(g.y / hyp), randomNudge);      
        break;
      case 'gravity':
        gx.push(arguments[1]);
        gy.push(arguments[2]);
        break;
    }     
  };
   
  /*  Start the game.
      This can be safely called multiple times and will only
      start the game once until stop is called.
  */
  game.start = function() {
    loop.start();
    started = true;    
  }
  
  game.stop = function() {    
    started = false;
    loop.stop();
  }
    
  game.restart = function() {
    game.stop();
    resetBeachball();
    game.start();
  }
  
  game.started = function() {
    return started;
  }  
  
  /*  Set or get the game's difficulty.
      Harder difficulties increase gravity and the force applied
      to the beachball.
  */
  game.difficulty = function(val) {
    if (!val) { return difficulty; }
    
    switch(val) {
      case 'hard':
        gravityIntensity = 1.25;
        impulseMagnitude = 10e-3;
        difficulty = val;
        break;
      case 'normal':
        gravityIntensity = 1;      
        impulseMagnitude = 10e-4;
        difficulty = val;        
        break;
      case 'easy':
        gravityIntensity = 0.5;
        impulseMagnitude = 10e-5;
        difficulty = val;        
        break;              
    }
  }
    
})(this);    
