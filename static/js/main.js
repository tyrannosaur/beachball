var app = {};

(function(exports) {  
   var settings = {
      gravityAngle : 0,
      gravityMagnitude : 4.8,
      impulseMagnitude : 0.0001,
      targetFPS : 30,
      timeStep : 1 / 30,
      stepSize : 4,
      beachHeight: 100,
   }

   var world,
       bodies;

   var gravityAngle = exports.gravityAngle = function() {
      if (world) {    
         if (typeof arguments[0] == 'number') {
            settings.gravityAngle = arguments[0] * Math.PI / 180;
            
            world.gravity({
               x : Math.sin(settings.gravityAngle) * settings.gravityMagnitude,
               y : Math.cos(settings.gravityAngle) * settings.gravityMagnitude
            });            
         }
         else {
            return settings.gravityAngle * 180 / Math.PI;
         }         
      }
   }

   // If an angle is given, increments the gravity vector by the given angle (in degrees)      
   var incrementGravity = exports.incrementGravity = function(angle) {
      return gravityAngle(gravityAngle() + angle);
   }  

   $(document).bind('keydown', function(e) {
      var LEFT = 37,
          RIGHT = 39,
          ESC = 27,
          TOGGLE = 32;
                    
      var direction;          
               
      if (/r/i.test(String.fromCharCode(e.which))) {
         exports.reset();
      }      
      else if (e.which == LEFT) {
         direction = -1;               
         $(exports).triggerHandler({type : 'game.unpause'});                              
      }
      else if (e.which == RIGHT) {
         direction = +1;         
         $(exports).triggerHandler({type : 'game.unpause'});                     
      }
      else if (e.which == ESC) {
         exports.pause();         
         $(exports).triggerHandler({type : 'game.pause'});                     
      }
      else if (e.which == TOGGLE) {
         if (exports.running) {
            exports.pause();
            $(exports).triggerHandler({type : 'game.pause'});            
         }
         else {
            exports.start();
            $(exports).triggerHandler({type : 'game.unpause'});
         }            
      }

      if (direction != undefined) {
         incrementGravity(direction);
      
         bodies.beachball.ApplyImpulse({
            x : -Math.cos(settings.gravityAngle) * direction * settings.impulseMagnitude, 
            y : Math.sin(settings.gravityAngle) * direction * settings.impulseMagnitude
         }, 
         bodies.beachball.GetWorldCenter());      
      } 
      
   });
   
   $(document).ready(function() {  
      var w = $(window);

      // Update the settings once the DOM has been fully loaded
      settings.beachball = {
         x : w.width() / 2 + 'px',
         y : '100px'
      }

      var beachball = $('#beachball'),
          safeZone = $('#safe-zone'),
          dangerZone = $('#danger-zone');

      // Reposition the the sand
      safeZone.css('left', w.width()/2 - safeZone.width()/2 + 'px')
              .css('top', w.height() - settings.beachHeight + 'px');
      dangerZone.css('left', w.width()/2 - dangerZone.width()/2 + 'px')
                .css('top', w.height() - settings.beachHeight + 'px');

      // Set up the box2d components
      world = box2dw.world({
         drawScale : w.width(),
         gravity : {
            x : Math.sin(settings.gravityAngle) * settings.gravityMagnitude,
            y : Math.cos(settings.gravityAngle) * settings.gravityMagnitude
         }
      });      

      var beachRadius = parseInt(/([0-9]+)/.exec(dangerZone.css('-webkit-border-top-left-radius'))[1]),
          beachFlat = dangerZone.width() - beachRadius*2;

      // Sensor function for when the beachball falls through the floor
      var onFloorHit = function(sensor, bodyA, bodyB) {
         var body;
         if (bodyA.id == '#beachball') { body = bodyA; }
         else if (bodyB.id == '#beachball') { body = bodyB; }

         if (body) {
            var splashX = ((body.GetPosition().x * world.drawScale) < w.width()/2)
                      ? 0
                      : w.width() - $('#splash').width();
                      
            $('#splash').css('bottom', '0px')
                        .css('left', splashX + 'px')
                        .show(100, function() {
                           $(this).fadeOut(800, function() {
                              exports.reset('game over!<h3>try again!</h3>');
                           });                           
                        });                      
         }
      };

      // Set up the bodies.
      // The beach bodies consist of two circles cexportsing the danger zone
      // with a rectangle over the safe zone between them
      bodies = {
         floor : world.body({
            static : true,         
            sensorCallback : onFloorHit,
            x : w.width()/2 + 'px',
            y : w.height() + 'px',
            width : w.width() * 4 + 'px',
            height : '10px'
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
            x : settings.beachball.x,
            y : settings.beachball.y,
            id : '#beachball'
         })   
      }
      
      var lastTimeout = null;
      
      function step() {
        var delay = settings.timeStep * 1000;
        world.world.Step(settings.timeStep, settings.stepSize, settings.stepSize);
        
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
        lastTimeout = setTimeout(step, (delay > 0) ? delay : 0);
      }

      exports.running = false;
      
      // Pause the simulation
      var pause = exports.pause = function() {
         clearTimeout(lastTimeout);
         exports.running = false;
      }
      
      // Start the simulation if it hasn't been started
      var start = exports.start = function() {
         if (!exports.running) { 
            step();
            exports.running = true;
         }
      }
      
      // Reset the simulation
      var reset = exports.reset  = function(message) {
         pause();         
         gravityAngle(0);
         bodies.beachball.SetAngularVelocity(0);
         bodies.beachball.SetLinearVelocity({
            x : 0,
            y : 0
         });
         bodies.beachball.SetPositionAndAngle({
            x : world.toMeters(settings.beachball.x),
            y : world.toMeters(settings.beachball.y)
         }, 0);
         $(exports).triggerHandler({
            type : 'game.reset',
            message : message
         });         
         start();
      };
      
      // Start the simulation
      start();
   });         
})(app);

(function(app) {
   var lastTimeout,
       running = false,
       c = 0,
       counter = $('#counter');
   
   function step() {
     counter.text(c);
     c += 1;
     lastTimeout = setTimeout(step, 1000);
   }
   
   $(app).on('game.reset game.stop', function(e) {
      if (lastTimeout)
         clearTimeout(lastTimeout);
      counter.html(e.message || 'beachball madness!');   
      c = 0;
      running = false;      
   });

   $(app).on('game.start', function() {
      if (!running) {
         step();
         running = true;
      }
   });   

   $(app).on('game.unpause', function() {
      if (!running) {
         step();
         running = true;
      }
   });
   
   $(app).on('game.pause', function() {
      if (running) {
         clearTimeout(lastTimeout);
         running = false;
      }
   });   
})(app);
