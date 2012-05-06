var app = {};

(function(exports) {  
   var settings = {
      gravityAngle : 0,
      gravityMagnitude : 4.8,
      impulseMagnitude : 0.0001,
      targetFPS : 30,
      timeStep : 1 / 30,
      stepSize : 4,
      beachHeight: 50
   }

   var world,
       bodies;

   var gx = [],
       gy = [];
          
   var changeGravity = function() {
      // smooth
      var sumx = 0,
          sumy = 0;

      for (var i in gx) { sumx += gx[i]; }
      for (var i in gy) { sumy += gy[i]; }
      
      sumx /= gx.length;
      sumy /= gy.length;

      gx = [];
      gy = [];

      world.gravity({
         x : sumx,
         y : sumy
      });
      
      var angle = Math.atan(gy/gx);      
      
      bodies.beachball.ApplyImpulse({
         x : -Math.cos(angle) * settings.impulseMagnitude, 
         y : Math.sin(angle) * settings.impulseMagnitude
      }, 
      bodies.beachball.GetWorldCenter());            
   };   
   
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
      
      var worldLastTimeout = null;
      
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
        worldLastTimeout = setTimeout(step, (delay > 0) ? delay : 0);
      }

      exports.running = false;
      
      // Pause the simulation
      var pause = exports.pause = function() {
         clearTimeout(worldLastTimeout);
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
      };

      if (window.ondevicemotion) {
         var lastGravityInterval = -1,
             gravityDelay = 100;
      
         window.ondevicemotion = function (e) {
            gx.push(e.accelerationIncludingGravity.x);
            gy.push(e.accelerationIncludingGravity.y);
         }
         
         $(app).on('game.reset game.stop game.pause', function(e) {
            clearInterval(lastGravityInterval);
         });

         $(app).on('game.start game.unpause', function(e) {
            lastGravityInterval = setInterval(changeGravity, gravityDelay);
         });      

         // Start the simulation
         start();
      }
      else {
         $(app).triggerHandler({type: 'game.stop', message: 'gravity not supported in your browser'});
         $('#start').hide();
      }
   });         
})(app);

(function(app) {
   var lastInterval = -1,
       c = 0,
       delay = 1000,
       counter = $('#counter');
   
   var step = function() {
     counter.text(c);
     c += 1;
   }

   $('#start').click(function() {
      $(this).hide();
      $(app).triggerHandler({type: 'game.start'});
   });
   
   $(app).on('game.reset game.stop', function(e) {
      clearInterval(lastInterval);
      counter.html(e.message || 'beachball madness!');   
      c = 0;
      $('#start').show();
   });

   $(app).on('game.start game.unpause', function() {
      lastInterval = setInterval(step, delay);
      step();
   });   

   $(app).on('game.pause', function() {
      clearInterval(lastInterval);
   });   
})(app);
