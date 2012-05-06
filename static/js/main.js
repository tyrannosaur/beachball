var app = {};

(function(app) {  
   var settings = {
      impulseMagnitude : 0.0001,
      targetFPS : 30,
      timeStep : 1 / 30,
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

   var worldLastTimeout = -1;
   var worldStep = function() {
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
     worldLastTimeout = setTimeout(worldStep, (delay > 0) ? delay : 0);
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
         y : sumy
      });
      
      var angle = Math.atan(gy/gx);      
      
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
      clearTimeout(worldLastTimeout);
      running = false;
   });
      
   // Start the simulation if it hasn't been started
   $(Game).on('game.start', function() {
      if (!running) { 
         worldStep();
         running = true;
      }
   });
      
   // Reset the simulation
   $(Game).on('game.reset', function(msg) {
      clearTimeout(worldLastTimeout);
      running = false;

      bodies.beachball.SetAngularVelocity(0);
      bodies.beachball.SetLinearVelocity({
         x : 0,
         y : 0
      });
      bodies.beachball.SetPositionAndAngle({
         x : world.toMeters(beachballPosition.x),
         y : world.toMeters(beachballPosition.y)
      }, 0);      
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

      var beachRadius = parseInt(/([0-9]+)/.exec(dangerZone.css('-webkit-border-top-left-radius'))[1]),
          beachFlat = dangerZone.width() - beachRadius*2;

      // Set up the bodies.
      // The beach bodies consist of two circles capping the danger zone
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
            x : beachballPosition.x,
            y : beachballPosition.y,
            id : '#beachball'
         })   
      }
    
      if (window.DeviceMotionEvent != undefined) {
         var lastGravityInterval = -1,
             gravityDelay = 100;
  /*    
         window.ondevicemotion = function (e) {
            gx.push(e.accelerationIncludingGravity.x);
            gy.push(e.accelerationIncludingGravity.y);
         }
         
         $(Game).on('game.reset game.stop game.pause', function(e) {
            clearInterval(lastGravityInterval);
         });

         $(Game).on('game.start game.unpause', function(e) {
            lastGravityInterval = setInterval(changeGravity, gravityDelay);
         });      
*/
         // Start the simulation
         $(Game).triggerHandler({type : 'game.start' });
      }
      else {
         $(Game).triggerHandler({type : 'game.notLoaded', reason : 'gravity not supported in your browser'});
      }
   };        
   
   app.game = Game;
   app.settings = settings;   
    
})(app);

// UI
(function(app) {
   $(document).ready(function() {
      var game = app.game,      
          counterLastInterval = -1,
          c = 0,
          delay = 1000,
          counter = $('#counter');
                
      var step = function() {
        counter.text(c);
        c += 1;
      }
      
      game.init();      

      $('#start').click(function() {
         $(this).hide();
         $(game).triggerHandler({type: 'game.start'});
      });
      
      $(game).on('game.reset game.stop', function(e) {
         clearInterval(counterLastInterval);
         counter.html(e.message || 'beachball madness!');   
         c = 0;
         $('#start').show();
      });

      $(game).on('game.start game.unpause', function() {
         counterLastInterval = setInterval(step, delay);
         step();
      });   

      $(game).on('game.pause', function() {
         clearInterval(counterLastInterval);
      });
   
      $(game).on('game.notLoaded', function(reason) {
         $('#counter').html(reason);
         $('#start').hide();      
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
   });
})(app);
