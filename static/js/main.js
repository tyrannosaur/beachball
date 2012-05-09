var app = {};

(function(app) {  
   var settings = {
      impulseMagnitude : 0.0001,
      targetFPS : 30,
      stepSize : 4,
      beachHeight: 50
   }

   var Game = function() {};
   
   var world,
       bodies,
       running,
       gx = [],
       gy = [];

   // Sensor function for when the beachball falls through the floor
   var onFloorHit = function(sensor, bodyA, bodyB) {
      var body;
      if (bodyA.id == '#beachball') { body = bodyA; }
      else if (bodyB.id == '#beachball') { body = bodyB; }

      if (body) {
         $(Game).triggerHandler({type: 'game.wallHit', body: body});
      }
   };

   var onWallHit = function() {
      onFloorHit.apply(this, arguments);
   }

   var worldLastInterval;
   var worldStep = function() {
     world.world.Step(1/30, settings.stepSize, settings.stepSize);
     
     $.each(world.bodies, function(i, body) {                     
         if (body.id != undefined) {                  
            var pos = body.GetPosition(),
                obj = $(body.id);
                   
            obj.css('left', pos.x * world.drawScale - obj.width()/2 + 'px');
            obj.css('top', pos.y * world.drawScale + 'px');       
            obj.rotate(body.GetAngle() / Math.PI * 180);
         }
     });    

     world.world.ClearForces();                   
   }

   // Smooth the gravity data from the device and change
   // the gravity of the world.           
   var changeGravity = function() {
      var sumx = 0,
          sumy = 0;

      for (var i in gx) { sumx += gx[i]; }
      for (var i in gy) { sumy += gy[i]; }
      
      sumx /= gx.length;
      sumy /= gy.length;

      gx = [];
      gy = [];

      if (!isNaN(sumx) && !isNaN(sumy)) {
         world.gravity({
            x : sumx,
            y : -sumy
         });
      
         var angle = Math.atan(sumy/(sumx + 0.00001));      
            
         bodies.beachball.ApplyImpulse({
            x : -Math.cos(angle) * settings.impulseMagnitude, 
            y : Math.sin(angle) * settings.impulseMagnitude
         }, 
         bodies.beachball.GetWorldCenter());
      }
   };   
   
   // The initial position of the beachball
   var beachballPosition;
   
   Game.drawScale = function() {
      return world.drawScale;
   }
   
   Game.running = function() {
      return running;
   }

   // Pause the simulation  
   $(Game).on('game.pause', function() { 
      if (worldLastInterval != undefined) { clearInterval(worldLastInterval); }
      running = false;
   });
      
   // Start the simulation if it hasn't been started
   $(Game).on('game.start game.startPhysics', function() {
      if (!running) { 
         worldLastInterval = setInterval(worldStep, 1000/settings.targetFPS);
         running = true;
      }
   });
      
   // Reset the simulation
   $(Game).on('game.reset', function(msg) {
      if (worldLastInterval != undefined) { clearInterval(worldLastInterval); }
      bodies.beachball.SetAngularVelocity(0);
      bodies.beachball.SetLinearVelocity({
         x : 0,
         y : 0
      });
      bodies.beachball.SetPositionAndAngle({
         x : world.toMeters(beachballPosition.x),
         y : world.toMeters(beachballPosition.y)
      }, 0);      
      running = false;
   });
      
   // Call when the DOM has been fully loaded and the game needs to
   // be initialized.
   Game.init = function() {
      var w = $(window),
          beachball = $('#beachball'),
          safeZone = $('#safe-zone'),
          dangerZone = $('#danger-zone');

      beachballPosition = {
         x : w.width() / 2 + 'px',
         y : '100px'
      }

      // Set up the box2d components
      world = box2dw.world({
         drawScale : w.width(),
         gravity : {
            x : 0,
            y : 9.8
         }
      });      

      // Reposition the sand
      safeZone.css('left', w.width()/2 - safeZone.width()/2 + 'px')
              .css('top', w.height() - settings.beachHeight + 'px');
      dangerZone.css('left', w.width()/2 - dangerZone.width()/2 + 'px')
                .css('top', w.height() - settings.beachHeight + 'px');

      beachball.css('left', w.width()/2 - beachball.width()/2 + 'px');

      var beachRadius = parseInt(/([0-9]+)/.exec(dangerZone.css('-webkit-border-top-left-radius'))[1]),
          beachFlat = dangerZone.width() - beachRadius*2;

      // Set up the bodies.
      // The beach bodies consist of two circles capping the danger zone
      // with a rectangle over the safe zone between them

      var wallThickness = 10;

      bodies = {
         bottomWall : world.body({
            static : true,         
            sensorCallback : onFloorHit,
            x : w.width()/2 + 'px',
            y : w.height() + beachball.height() * 2 + 'px',
            width : w.width() * 4 + 'px',
            height : wallThickness + 'px'
         }),
         leftWall : world.body({
            static : true,
            sensorCallback : onWallHit,
            x : -w.width() + 'px',
            y : w.height()/2 + 'px',
            width : wallThickness + 'px',
            height : w.height() * 4 + 'px'
         }),
         rightWall : world.body({
            static : true,
            sensorCallback : onWallHit,
            x : w.width() * 2 + 'px',
            y : w.height() / 2 + 'px',
            width : wallThickness + 'px',
            height : w.height() * 4 + 'px'
         }),
         topWall : world.body({
            static : true,
            sensorCallback: onWallHit,
            x : w.width()/2 + 'px',
            y : -beachball.height() * 2 + 'px',
            width : w.width() * 4 + 'px',
            height : wallThickness + 'px'
         }),
         beachCenter : world.body({
            shape : 'box',
            x : w.width()/2 + 'px',
            y : w.height() - settings.beachHeight + beachRadius + 'px',
            width : beachFlat + 'px',
            height : beachRadius * 2 + 'px',
            id : '#dangerZone'
         }),
         beachCapRight : world.body({
            shape : 'circle',
            x : w.width()/2 + beachFlat/2 + 'px',
            y : w.height() - settings.beachHeight + beachRadius + 'px',
            radius : beachRadius + 'px'         
         }),
         beachCapLeft : world.body({
            shape : 'circle',
            x : w.width()/2 - beachFlat/2 + 'px',
            y : w.height() - settings.beachHeight + beachRadius + 'px',
            radius : beachRadius + 'px'        
         }),
         beachball : world.body({
            shape : 'circle',
            static : false,
            radius : beachball.width() + 'px',
            x : beachballPosition.x,
            y : beachballPosition.y,
            id : '#beachball'
         })   
      }
    
      if (window.DeviceMotionEvent != undefined) {
         var gravityLastInterval,
             gravityDelay = 100;
             
         window.ondevicemotion = function (e) {
            gx.push(e.accelerationIncludingGravity.x);
            gy.push(e.accelerationIncludingGravity.y);
         }
         
         $(Game).on('game.reset game.stop game.pause', function(e) {
            if (gravityLastInterval != undefined) { clearInterval(gravityLastInterval); };
         });

         $(Game).on('game.start game.unpause', function(e) {
            gravityLastInterval = setInterval(changeGravity, gravityDelay);
         });      
      }
      else {
         $(Game).triggerHandler({type : 'game.notLoaded', reason : 'device gravity not supported in your browser'});
      }
      // Start the simulation
      $(Game).triggerHandler({type : 'game.startPhysics'});
   };        

   app.game = Game;
   app.settings = settings;   
    
})(app);

// UI
(function(app) {
   $(document).ready(function() {
      var game = app.game,      
          counterLastInterval,
          c = 0,
          delay = 50,
          counter = $('#counter');
                
      var step = function() {
        var s = c.toPrecision(2);
        counter.text(s.split('.')[1].length == 2 ? s : s + '0');
        c += 1/delay;
      }      
      
      $(game).on('game.reset game.stop', function(e) {
         if (counterLastInterval != undefined) { clearInterval(counterLastInterval); };
         counter.html(e.message || 'beachball madness!');   
         c = 0;
         $('.start').show();
      });

      $(game).on('game.start game.unpause', function() {
         counterLastInterval = setInterval(step, delay);
         step();
      });   

      $(game).on('game.pause', function() {
         if (counterLastInterval != undefined) { clearInterval(counterLastInterval); };
      });
   
      $(game).on('game.notLoaded', function(e) {
         $('#counter').html(e.reason);
         $('.start').fadeOut();      
      });
      
      $(game).on('game.wallHit', function(e) {
         var drawScale = game.drawScale(),
             w = $(window);         
         
         var splashX = ((e.body.GetPosition().x * drawScale) < w.width()/2)
                   ? 0
                   : w.width() - $('#splash').width();
                   
         $('#splash').css('bottom', '0px')
                     .css('left', splashX + 'px')
                     .show(100, function() {
                        $(this).fadeOut(800, function() {
                           $(game).triggerHandler({type : 'game.reset', message : 'game over!<h3>try again!</h3>'});
                        });                           
                     });                      
      });
            
      game.init();      

      $('.start').click(function() {
         $('.start').fadeOut();
         $(game).triggerHandler({type: 'game.start'});
      });
   });
})(app);
