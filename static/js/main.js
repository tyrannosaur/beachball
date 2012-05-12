var app = {};

/** The game itself **/
(function(app) {  
   var settings = {
      impulseMagnitude : 0.0001,
      targetFPS : 30,
      stepSize : 4,
      beachHeight: 50,
      gravityScale : 1,
      defaultGravity : {x : 0, y : 9.8}
   }
   
   var world,
       bodies,     
       gx = [],
       gy = [],
       worldLastInterval,
       started = false,
       paused = false;

   var beachballPosition;  // The initial position of the beachball
       
   var Game = function() {};

   // Callback for when a floor is hit.
   var onFloorHit = function(sensor, bodyA, bodyB) {
      var body;
      if (bodyA.id == '#beachball') { body = bodyA; }
      else if (bodyB.id == '#beachball') { body = bodyB; }

      if (body) {
         $(Game).triggerHandler({type: 'game.wallHit', body: body});
      }
   };

   // Callback for when a wall is hit.
   var onWallHit = function() {
      onFloorHit.apply(null, arguments);
   }

   var worldStep = function() {    
     world.world.Step(1/settings.targetFPS, settings.stepSize, settings.stepSize);
              
     $.each(world.bodies, function(i, body) {                     
         if (body.id != undefined) {                  
            var pos = body.GetPosition(),
                obj = $(body.id);

            obj.css('left', pos.x * world.drawScale - obj.width()/2 + 'px');
            obj.css('top', pos.y * world.drawScale + 'px');                                           
            obj.rotate(body.GetAngle(), 'rad');
         }
     });    

     world.world.ClearForces();                            
   }

   // Smooth the gravity data from the device and change the gravity of the world.           
   var changeGravity = function() {
      var sumx = 0,
          sumy = 0;

      for (var i in gx) { sumx += gx[i]; }
      for (var i in gy) { sumy += gy[i]; }
      
      sumx /= gx.length;
      sumy /= gy.length;

      gx = [];
      gy = [];

      sumx *= settings.gravityScale;
      sumy *= settings.gravityScale;

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
   
   Game.difficulty = function() {
      if (arguments[0]) {
         var scale;
         switch(arguments[0]) {
            case 'easy':
               scale = 0.5;
               break;
            case 'medium':
               scale = 0.75;
               break;
            case 'hard':
               scale = 1.0;
               break;
         }
         settings.gravityScale = scale;
         settings.difficulty = arguments[0];
      }
      else {
         return settings.difficulty; 
      }
   }
   
   // The ratio between pixels and Box2D units (meters).
   Game.drawScale = function() {
      return world.drawScale;
   };
   
   // Has the game been started?
   Game.started = function() {
      return started;
   };

   // Is the entire game paused or is it running?
   Game.paused = function() {
      return paused;
   };

   // Call this when the DOM has been fully loaded and the game needs to
   // be initialized.
   Game.load = function() {
      var w = $(window),
          beachball = $('#beachball'),
          safeZone = $('#safe-zone'),
          dangerZone = $('#danger-zone');

      beachballPosition = {
         x : w.width() / 2 + 'px',
         y : '100px'
      }

      // Set up the Box2D components
      world = box2dw.world({
         drawScale : w.width(),
         gravity : settings.defaultGravity
      });      

      // Reposition the sand
      safeZone.css('left', w.width()/2 - safeZone.width()/2 + 'px')
              .css('top', w.height() - settings.beachHeight + 'px');
      dangerZone.css('left', w.width()/2 - dangerZone.width()/2 + 'px')
                .css('top', w.height() - settings.beachHeight + 'px');

      beachball.css('left', w.width()/2 - beachball.width()/2 + 'px');

      var beachRadius = dangerZone.cornerRadius(),
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
            y : w.height() + beachball.height() + wallThickness + 'px',
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
            height : beachRadius * 2 + 'px'            
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
     
      var gravityLastInterval,
          gravityDelay = 100,
          originalOrientation;
      
      if (window.DeviceMotionEvent == undefined) {
         return $(Game).triggerHandler({
            type: 'game.notLoaded',
            reason : 'device gravity not supported in your browser'
         });    
      }        
   
      $(window).on('devicemotion.game', function(e) {
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

      $(Game).on('game.reset game.unloaded game.pause', function(e) {
         if (gravityLastInterval != undefined) { clearInterval(gravityLastInterval); };
      });

      $(Game).on('game.start game.unpause', function(e) {
         gravityLastInterval = setInterval(changeGravity, gravityDelay);
      });                       
      
      // Detect when device orientation changes and warn that the game will be
      // restarted (unless, of course, the original orientation is restored)
      
      // TODO: tweak Box2D so that orientation changes are seamless and don't
      //       require a restart            
      if (window.orientation != undefined) {
        originalOrientation = window.orientation;                    
        
        $(window).on('orientationchange.game', function() {        
          if (window.orientation != originalOrientation) {
            if (!Game.paused()) {
                originalOrientation = window.orientation;
                Game.reload();
            }
            else {
               $(Game).triggerHandler({
                 type : 'game.pause',
                 reason : 'orientation changed and the game will reset!<br/><h3>rotate back to unpause</h3>'
               });                       
            }
          }
        });   
        
        $(Game).on('game.unpause.orientationchange', function() {
            if (window.orientation != originalOrientation) { Game.reload(); }
        });
      }

      $(Game).triggerHandler('game.startPhysics') 
      $(Game).triggerHandler('game.loaded');              
   };        

   // Call this when the game should be unloaded.
   // Emits 'game.unloaded' event when unloading is complete.
   Game.unload = function(done) {      
      started = false;
      paused = false;
      
      $(Game).off('game.unpause.orientationchange');
      $(window).off('devicemotion.game orientationchange.game');
 
      if (worldLastInterval != undefined) { clearInterval(worldLastInterval); }
      $.when($(Game).triggerHandler('game.unloaded'))
       .done(function() {          
          world = undefined;  
          if (typeof done === 'function') { done(); }
      });
   };
   
   Game.reload = function() {      
      Game.unload(Game.load);
   };

   // Callback for when the game is paused.
   $(Game).on('game.pause', function() { 
      paused = true;      
      if (worldLastInterval != undefined) { clearInterval(worldLastInterval); }      
   });
      
   // Start the physics and game if it hasn't been started.
   $(Game).on('game.unpause game.startPhysics game.start', function() {
      if (!started) { 
         worldLastInterval = setInterval(worldStep, 1000/settings.targetFPS);
         started = true;
         paused = false;
      }
   });
      
   // Reset the game.
   $(Game).on('game.reset', function(msg) {
      started = false;
      paused = false;
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
   });

   app.game = Game;
   app.settings = settings;   
    
})(app);

/** Clouds **/
(function(app) {
   var settings = {
      numClouds : 4,
      targetFPS : 30,
      scaleMin : 0.5,
      scaleMax : 1.5,
      parallaxMin : 1,
      parallaxScale : 10,
      parallaxPower : 2,
      cloudNode : $('#cloud'),
      containerNode : $('#sea')      
   }
  
   var lastInterval = undefined, 
       w = $(window),
       clouds = [];

   // A function to turn pixel measurement strings into numbers
   // '100px' => 100       
   // '0.5px' => 0.5
   var parsePx = function(x) { 
         return parseFloat(x.replace(/px/i, ''));          
   };

   var step = function() {
      $.each(clouds, function(key, cloud) {       
         var $cloud = cloud.image,
             $width = $cloud.width(),
             $height = $cloud.height(),
             $left = parsePx($cloud.css('left'));

         if ($left <= 0) {
            $cloud.fadeOut('short', function() {
               $cloud.css('left', parseInt(w.width()) + 'px');
               $cloud.css('top', parseInt(Math.random() * (w.height - $height)) + 'px');   
               $cloud.fadeIn('short');
            });
         }
         else {
            $cloud.css('left', parseInt($left - cloud.dx) + 'px');
         }
      });
   }

   var Clouds = function() {
   };

   var cloudsLoaded = false;
   var cloudsInit = function() {
        for (var i=0; i<settings.numClouds; i++) {
           var c = {},
               scale = (settings.scaleMin + (Math.random() * settings.scaleMax));

           c.image = settings.cloudNode.clone();
           c.image.attr('id', null);
           c.image.css('position', 'fixed');
           
           settings.containerNode.append(c.image);
                    
           c.image.css('width', settings.cloudNode[0].width * scale + 'px');
           c.image.css('height', settings.cloudNode[0].height * scale + 'px');
           
           // Parallax effect
           c.dx = Math.pow((settings.parallaxMin + ((scale - settings.scaleMin)/settings.scaleMax) * settings.parallaxScale), settings.parallaxPower) / settings.targetFPS;

           c.image.css('left', parseInt(Math.random() * (w.width() - c.image.width())) + 'px');
           c.image.css('top', parseInt(Math.random() * (w.height() - c.image.height())) + 'px');

           clouds.push(c);
        }

        lastInterval = setInterval(step, 1000 /  settings.targetFPS);  
        cloudsLoaded = true;
   }

   Clouds.load = function() {
      if (!cloudsLoaded) {
         settings.cloudNode.load(cloudsInit);
      }
      else {
         cloudsInit();
      }
   }

   Clouds.unload = function() {
      if (lastInterval != undefined) { clearInterval(lastInterval); }
      settings.containerNode.children().remove();
      clouds = [];
      settings.cloudNode.off('ready.game load.game');
   }

   app.clouds = Clouds;

})(app);

/** UI **/
(function(app) {
   $(document).ready(function() {
      var title = 'beachball madness!';

      var game = app.game,      
          counterLastInterval,
          c = 0,
          delay = 50,   
          started = false,                
          counter = $('#counter');
                
      var step = function() {
        counter.text(c.toFixed(2));
        c += 1/delay;
      }      
      
      $(game).on('game.reset game.unloaded', function(e) {        
         if (counterLastInterval != undefined) { clearInterval(counterLastInterval); };
         counter.html(e.reason || title);   
         c = 0;                  
         $('.start').fadeIn();         
      });

      $(game).on('game.start game.unpause', function() {   
        if (!started) {
          counterLastInterval = setInterval(step, delay);
          step();
          $('.pause-unpause').fadeOut();            
          started = true;
        }
      });   

      $(game).on('game.pause', function(e) {
         if (started) {
            if (counterLastInterval != undefined) { clearInterval(counterLastInterval); };            
            $('.pause-unpause').attr('value', 'unpause')
                               .fadeIn();
            if (e.reason) { $('#counter').html(e.reason); }
            started = false;
         }
      });
   
      $(game).on('game.notLoaded', function(e) {
         $('#counter').html(e.reason);         
         $('.start').fadeOut();      
      });
      
      $(game).on('game.wallHit', function(e) {
         if (started) {            
            started = false;
            var drawScale = game.drawScale(),
                w = $(window);         
         
            var splashX = ((e.body.GetPosition().x * drawScale) < w.width()/2)
                      ? 0
                      : w.width() - $('#splash').width();
                   
            $('#splash').css('bottom', '0px')
                        .css('left', splashX + 'px')
                        .show(100, function() {
                           $(this).fadeOut(800, function() {
                              var time = c.toFixed(2);
                              $(game).triggerHandler({type : 'game.reset', reason : time + '<h3>final time</h3>'});
                           });                           
                        });                      
         }
      });

      $(game).on('game.unloaded', function() {
         started = false;
         $('#counter').html(title);
         $('.start').off('click.game')
                    .fadeOut(); 
         $('.pause-unpause').off('click.game')
                    .fadeOut();                    
      });
         
      $(game).on('game.loaded', function() {
         started = false;
         $('#counter').html(title);
         
         $('.start').on('click.game', function() {
            if (!started) {               
               stated = true;
               $('.start').fadeOut();
               $(game).triggerHandler('game.start');
            }
         })
         .fadeIn();
         
         $('.pause-unpause').on('click.game', function() {
            if (started) {
                $(this).fadeIn();
                $(game).triggerHandler('game.pause');
            }
            else {
                $(this).fadeOut();
                $(game).triggerHandler('game.unpause');
            }
         });         
      });

      var toggled = false;

      $('#clouds-toggle').on('click.game', function() {                     
          if (toggled) {
             $(this).attr('value', 'clouds');
             app.clouds.unload();            
          }
          else {          
             $(this).attr('value', 'no clouds');
             app.clouds.load();             
          }
          toggled = !toggled;
      })
      .click();      

      var difficulty = 2,
          difficulties = [
            'easy',
            'medium',
            'hard'
          ];

      Game.difficulty(difficulties[difficulty];

      $('#difficulty-toggle').on('click.game', function() {
         difficulty = (difficulty + 1) % difficulties.length;\
         
         Game.difficulty(difficulties[difficulty];
         $(this).attr('value', difficulties[difficulty]);
      });

      game.load();      
   });
})(app);
