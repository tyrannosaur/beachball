var app = {};

/** The game itself **/
(function(app) {  
   var settings = {
      impulseMagnitude : 0.0001,
      targetFPS : 30,
      stepSize : 4,
      beachHeight: 50,
      defaultGravity : {x : 0, y : 9.8}
   }

   var Game = function() {};
   
   var world,
       bodies,
       running,
       gx = [],
       gy = [];

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
      onFloorHit.apply(this, arguments);
   }

   var worldLastInterval;
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
     
   var gravityLastInterval,
       gravityDelay = 100,
       gravityInit = false,
       orientationInit = false,
       originalOrientation;
   
   var initGravityCallbacks = function() {         
      if (window.DeviceMotionEvent == undefined)
          return 'device gravity not supported in your browser';
   
      if (!gravityInit) {
        gravityInit = true;      
        
        window.ondevicemotion = function (e) {
          switch(window.orientation) {        
            // Reverse x and y
            case 90:
            case -90:
              gx.push(e.accelerationIncludingGravity.y);
              gy.push(e.accelerationIncludingGravity.x);            
              break;
            default:
              gx.push(e.accelerationIncludingGravity.x);
              gy.push(e.accelerationIncludingGravity.y);
              break;
            }
        }

        $(Game).on('game.reset game.unload game.pause', function(e) {
          if (gravityLastInterval != undefined) { clearInterval(gravityLastInterval); };
        });

        $(Game).on('game.start game.unpause', function(e) {
          gravityLastInterval = setInterval(changeGravity, gravityDelay);
        });                    
      }
   }
   
   var initOrientationCallbacks = function() {
      // Detect when device orientation changes and warn that the game will be
      // restarted (unless, of course, the original orientation is restored)
      
      // TODO: tweak Box2D so that orientation changes are seamless and don't
      //       require a restart
            
      // We can survive without orientation changes
      if (window.onorientationchange != undefined && !orientationInit) {  
        var reset = functino() {
          originalOrientation = window.orientation;
          Game.uninit();
          Game.init();
        }

        orientationInit = true;        
        originalOrientation = window.orientation;                    

        window.onorientationchange = function() {
          if (window.orientation != originalOrientation) {
            // Just do it
            if (!Game.running()) {
               reset();
            }
            else {
               $(Game).trigglerHandler({
                 type : 'game.pause',
                 reason : 'orientation changed and the game will reset!<br/><h3>rotate back to unpause</h3>'
               });                       
            }
          }
          else {
            $(Game).triggerHandler({type : 'game.unpause'});
          }
        }           
        
        $(Game).on('game.unpause', function() {
            if (window.orientation != originalOrientation) { reset(); }
        });
      }
   }
   
   // The initial position of the beachball
   var beachballPosition;
   
   // The ratio between pixels and Box2D units (meters).
   Game.drawScale = function() {
      return world.drawScale;
   }
   
   // Is the game running?
   Game.running = function() {
      return running;
   }

   // Callback for when the game is paused.
   $(Game).on('game.pause', function() { 
      if (worldLastInterval != undefined) { clearInterval(worldLastInterval); }
      running = false;
   });
      
   // Start the simulation and game if it hasn't been started.
   $(Game).on('game.unpause game.start game.startPhysics', function() {
      if (!running) { 
         worldLastInterval = setInterval(worldStep, 1000/settings.targetFPS);
         running = true;
      }
   });
      
   // Reset the game.
   $(Game).on('game.reset game.unload', function(msg) {
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

   // Call this when the DOM has been fully loaded and the game needs to
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
  
      var checks = [];
      checks.push(initOrientationCallbacks());
      checks.push(initGravityCallbacks());
    
      var reasons = [];
      for (var i in checks) {
        if (typeof checks[i] === 'string') { reasons.push(checks[i]); }
      }
    
      if (reasons.length > 0) {
        $(Game).triggerHandler({
          type: 'game.notLoaded',
          reason : reasons.join('<br/>')
        });     
      }                     
      else {
        $(Game).triggerHandler({type : 'game.startPhysics'}); 
        $(Game).triggerHandler({type: 'game.loaded'});        
      }
   };        

   // Uninitialize the game
   Game.uninit = function() {      
      $.when($(Game).triggerHandler({type : 'game.unload'}))
       .done(function() {          
          world = undefined;        
      });
   }

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

   Clouds.init = function() {
      settings.cloudNode.ready(function() {
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
      });
   }

   Clouds.uninit = function() {
      if (lastInterval != undefined) { clearInterval(lastInterval); }
      settings.containerNode.children().remove();
      clouds = [];
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
      
      $(game).on('game.reset game.unload', function(e) {        
         if (counterLastInterval != undefined) { clearInterval(counterLastInterval); };
         counter.html(e.message || title);   
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
                              $(game).triggerHandler({type : 'game.reset', message : time + '<h3>final time</h3>'});
                              started = false;
                           });                           
                        });                      
         }
      });

      $(game).on('game.unload', function() {
         $('#counter').html(title);
         $('.start').unbind('click.game')
                    .fadeOut(); 
         $('.pause-unpause').unbind('click.game')
                    .fadeOut();
      });
         
      $(game).on('game.loaded', function() {
         $('#counter').html(title);
         
         $('.start').bind('click.game', function() {
            if (!started) {               
               stated = true;
               $('.start').fadeOut();
               $(game).triggerHandler({type: 'game.start'});
            }
         })
         .fadeIn();
         
         $('.pause-unpause').bind('click.game', function() {
            if (started) {
                $(this).fadeIn();
                $(game).triggerHandler({type : 'game.pause'});
            }
            else {
                $(this).fadeOut();
                $(game).triggerHandler({type : 'game.unpause'});
            }
         });
      });

      var toggled = false;

      $('#clouds-toggle').bind('click.game', function() {                     
          if (toggled) {
             $(this).attr('value', 'clouds');
             app.clouds.uninit();            
          }
          else {          
             $(this).attr('value', 'no clouds');
             app.clouds.init();             
          }
          toggled = !toggled;
      })
      .click();      

      game.init();      
   });
})(app);
