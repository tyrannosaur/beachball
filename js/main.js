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

/* Push a body with an impulse */
Box2D.impulse = function(body, angle, impulseMagnitude) {        
   body.ApplyImpulse({
         x : -Math.cos(angle) * impulseMagnitude, 
         y : Math.sin(angle) * impulseMagnitude
   }, 
   body.GetWorldCenter());
}
   
var beachball = {};

/* Game logic
*/
(function(app) {  
   /* Wrap up an interval.
   
      step           :  the function to be called
   
      options:
         delay       :  the delay (in seconds) to call the step function         
         runningHook :  if a function, this will be called with a true value if
                        the repeater is running and false if it is stopped
   */
   var repeater = app.repeater = function(settings, step) {      
      if (!settings) { throw new Error(); }      
      if (!settings.delay || settings.delay < 0) { throw new Error('delay must be >= 0'); }
   
      var lastInterval,
          delay = settings.delay,          
          runningHook = function(val) {
            if (typeof settings.runningHook === 'function') { settings.runningHook(val); }
          };
   
      return {
         start : function() {
            if (lastInterval == undefined) {               
               lastInterval = setInterval(step, 1000*delay);
               runningHook(true);
            }
         },
         stop : function() {
            if (lastInterval != undefined) {
               clearInterval(lastInterval);
               lastInterval = undefined;
               runningHook(false);
            }
         },
         step : step,
         running : function() {
            return lastInterval != undefined;
         }
      };
   }

   var settings = {
      impulseMagnitude : 0.0001,    // the impulse (in N*s) applied via impulse()
      targetFPS : 30,               // the FPS desired for the physics engine
      stepSize : 4,                 // iterative physics calculations performed by the physics 
                                    // engine for every frame
      defaultGravity : {            // the gravity used if an accelerometer is not present
         x : 0, 
         y : 9.8
      },
      difficulty : {                // the game difficulties and the corresponding gravity scales
         'easy'   : 0.5,
         'medium' : 1.0,
         'hard'   : 1.25
      }
   }
   
   var beachballPosition,  // The initial position of the beachball, in pixels
       beachballBody;      // The beachball's Box2D body  
   
   var world,                       // the friendly-Box2D world       
       gx = [],                     // a history of device gravities (x component)
       gy = [],                     // a history of device gravities (y component)       
       started = false,             // if the game has been started and is running
       paused = false,              // if the game has been paused
       gameGravityScale = 1 ,       // the scaling factor of the gravity (scale*G)
       gameDifficulty = 'hard';     // the current difficulty of the game                                  
       
   var game = {},          // The game object
       $game = $(game);    // The jQuery game object, used for event binding   

   /* Callback for when the accelerometer has been detected */   
   game.accelerometer = false;
   $(window).on('devicemotion.detect', function() {
      $(window).off('devicemotion.detect');
      $game.triggerHandler({
         type : 'game.accelerometer',
         enabled : true
      });
      game.accelerometer = true;
   });

   /* Callback for when a wall is hit.
   */
   var onWallHit = function(sensor, bodyA, bodyB) {
      var body;
      if (bodyA.id == '#beachball') { body = bodyA; }
      else if (bodyB.id == '#beachball') { body = bodyB; }

      if (body) {
         $game.triggerHandler({type : 'game.wallHit', body: body});
      }
   };

   /* Main loop for updating the physics engine and graphics
   */
   var mainRepeater = repeater({
            delay : 1/settings.targetFPS            
         }, function() {                              
               world.step(1/settings.targetFPS, settings.stepSize, settings.stepSize);
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

   /* Smooth the gravity data from the device and change the gravity of the world. 
   */
   var gravityRepeater = repeater({
            delay : 1/100         
         }, function() {
               var sumx = 0,
                   sumy = 0;

               for (var i in gx) { sumx += gx[i]; }
               for (var i in gy) { sumy += gy[i]; }
               
               sumx /= gx.length;
               sumy /= gy.length;

               gx = [];
               gy = [];
               
               sumx *= gameGravityScale;
               sumy *= gameGravityScale;
  
               if (!isNaN(sumx) && !isNaN(sumy)) {
                  world.gravity({
                     x : sumx,
                     y : -sumy
                  });
               
                  var angle = Math.atan(sumy/(sumx + 0.00001));      
                     
                  beachballBody.ApplyImpulse({
                     x : -Math.cos(angle) * settings.impulseMagnitude, 
                     y : Math.sin(angle) * settings.impulseMagnitude
                  }, 
                  beachballBody.GetWorldCenter());
               }
   });      
   
   /* Set or get the current difficulty of the game.
   */
   game.difficulty = function() {
      if (arguments[0] && arguments[0] in settings.difficulty) {
         gameDifficulty = arguments[0];   
         gameGravityScale = settings.difficulty[arguments[0]];
      }
      else {
         return gameDifficulty;
      }
   }
   
   // The ratio between pixels and Box2D units (meters).
   game.drawRatio = function() {
      return world.drawRatio();
   };
   
   // Has the game been started?
   game.started = function() {
      return started;
   };

   // Is the entire game paused or is it running?
   game.paused = function() {
      return paused;
   };

   /* Called when the DOM has been fully loaded and the game needs to
      be initialized.
   */
   game.load = function() {
      var $w = $(window),
          $width = $w.width(),
          $height = $w.height(),          
          $beachball = $('#beachball'),
          $safeZone = $('#safe-zone'),
          $dangerZone = $('#danger-zone');

      // Save the initial position of the beachball
      beachballPosition = {
         x : $width/2 + 'px',
         y : '100px'
      }

      // Set up the Box2D components
      world = new Box2D.world({
         drawRatio : $w.width(),
         gravity : settings.defaultGravity
      });      

      // Reposition the sand so that it's centered horizontally and
      // centered and straddling the bottom of the screen verticially
      $safeZone.css('left', $width/2 - $safeZone.width()/2 + 'px');               
      $dangerZone.css('left', $width/2 - $dangerZone.width()/2 + 'px');      

      $beachball.css('left', beachballPosition.x)
                .css('top', beachballPosition.y);

      // bounding wall thickness
      var wallThickness = 10;                                

      beachballBody = world.addBody({
         shape : 'circle',
         static : false,
         radius : $beachball.width()/2 + 'px',
         x : beachballPosition.x,
         y : beachballPosition.y,
         id : '#beachball'
      });

      // Bottom wall
      world.addBody({
            static : true,         
            sensorCallback : onWallHit,
            x : $width/2 + 'px',
            y : $height + $beachball.height() + wallThickness + 'px',
            width : $width * 4 + 'px',
            height : wallThickness + 'px'
      });
      
      // Left wall
      world.addBody({
         static : true,
         sensorCallback : onWallHit,
         x : -$width + 'px',
         y : $height/2 + 'px',
         width : wallThickness + 'px',
         height : $height * 4 + 'px'
      });
      
      // Right wall
      world.addBody({
         static : true,
         sensorCallback : onWallHit,
         x : $width*2 + 'px',
         y : $height/2 + 'px',
         width : wallThickness + 'px',
         height : $height * 4 + 'px'
      });
      
      // Top wall
      world.addBody({
         static : true,
         sensorCallback: onWallHit,
         x : $width/2 + 'px',
         y : -$beachball.height() * 2 + 'px',
         width : $width * 4 + 'px',
         height : wallThickness + 'px'
      });
      
      // The flat, center of the beach
      world.addBody({
         shape : 'box',
         x : $width/2 + 'px',
         y : $dangerZone.offset().top + $dangerZone.height() + 'px',
         width : $dangerZone.width() - $dangerZone.cornerRadius()*2 + 'px',
         height : $dangerZone.height() * 2 + 'px'            
      });
      
      // The largest left corner of the beach
      world.addBody({
         shape : 'circle',
         x : $dangerZone.offset().left + $dangerZone.cornerRadius() + 'px',
         y : $dangerZone.offset().top + $dangerZone.height()/2 + 'px',
         radius : $dangerZone.cornerRadius() + 'px'         
      })
      
      // The largest right corner of the beach    
      world.addBody({
         shape : 'circle',
         x : $dangerZone.offset().left + $dangerZone.width() - $dangerZone.cornerRadius() + 'px',
         y : $dangerZone.offset().top + $dangerZone.height()/2 + 'px',
         radius : $dangerZone.cornerRadius() + 'px'        
      });
     
      $game.on('game.pushLeft', function() {
         var g = world.gravity(),	
             angle = Math.atan(g.x/(g.y + 0.00001));
         Box2D.impulse(beachballBody, angle, 0.001 + Math.random() * 0.001); 
      });

      $game.on('game.pushRight', function() {
         var g = world.gravity(),	
             angle = Math.PI - Math.atan(g.x/(g.y + 0.00001));
         Box2D.impulse(beachballBody, angle, 0.001 + Math.random() * 0.001);
      });      

      // Bind additional callbacks
      $game.on('game.reset game.unloaded game.pause', gravityRepeater.stop);         
      $game.on('game.start game.unpause', gravityRepeater.start);
      
      var originalOrientation;        
   
      $w.on('devicemotion.game', function(e) {
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
      
      /* Detect when device orientation changes and warn that the game will be
         restarted (unless, of course, the original orientation is restored)
      
         TODO: tweak Box2D so that orientation changes are seamless and don't
               require a restart            
      */
      if (window.orientation != undefined) {
        originalOrientation = window.orientation;                    
        
        $(window).on('orientationchange.game', function() {        
          if (window.orientation != originalOrientation) {
            if (!game.paused()) {
                originalOrientation = window.orientation;
                game.reload();
            }
            else {
               $game.triggerHandler({
                  type : 'game.pause',
                  reason : 'orientation changed and the game will reset!<h3>rotate back to unpause</h3>'
               });                       
            }
          }
        });   
        
        $game.on('game.unpause.orientationchange', function() {
            if (window.orientation != originalOrientation) { game.reload(); }
        });
      }

      // Send an notification that the game is now loaded           
      $game.triggerHandler('game.startPhysics');     
      $game.triggerHandler('game.loaded');        
   };        

   /* Called when the game should be unloaded and then reloaded.
      Emits 'game.unloaded' event when unloading is complete.
   */
   game.reload = function() {     
      started = false;
      paused = false;      
      mainRepeater.stop();
      
      $game.off('game.unpause.orientationchange game.pushRight game.pushLeft game.reset game.unloaded game.pause');
      $(window).off('devicemotion.game orientationchange.game');            
      $.when($game.triggerHandler('game.unloaded'))
       .done(game.load);
   };

   // Callback for when the game is paused.
   $game.on('game.pause', function() { 
      paused = true;      
      mainRepeater.stop();      
   });
      
   $game.on('game.startPhysics', function() {
      mainRepeater.start();         
      started = true;
      paused = false;   
   });
      
   // Start the physics and game if it hasn't been started.
   $game.on('game.unpause game.start', function() {         
      if (!started) {                   
         beachballBody.SetAngularVelocity(0);
         beachballBody.SetLinearVelocity({
            x : 0,
            y : 0
         });
         beachballBody.SetPositionAndAngle({
            x : world.toMeters(beachballPosition.x),
            y : world.toMeters(beachballPosition.y)
         }, 0);           
         Box2D.impulse(beachballBody, Math.random() * 360, 0.002);   
         mainRepeater.start();         
         started = true;
         paused = false;
      }
   });
   
   // Reset the game.
   $game.on('game.reset', function() {      
      started = false;
      paused = false;      
      mainRepeater.stop();
   });

   app.game = game;
   app.settings = settings;   
    
})(beachball);

/* Clouds 
*/
(function(app) {
   var settings = {
      numClouds : 4,
      targetFPS : 30,
      scaleMin : 0.2,
      scaleMax : 1.5,
      parallaxMin : 1,
      parallaxScale : 10,
      parallaxPower : 2,
      planeFlybyChance: 0.4,
      cloudNode : $('#cloud'),
      planeNode : $('#plane'),
      containerNode : $('#sea')      
   }
    
   var w = $(window),
       waterLevel = Math.min($('#water-bg').offset().top, $('#water-fg').offset().top),
       clouds = [];

   // A function to turn pixel measurement strings into numbers
   // '100px' => 100       
   // '0.5px' => 0.5
   var parsePx = function(x) { 
         return parseFloat(x.replace(/px/i, ''));          
   };

   var cloudsRepeater = app.repeater({
      delay : 1/settings.targetFPS
   }, function() {   
      $.each(clouds, function(key, cloud) {    
         var $cloud = cloud.image,
             $width = $cloud.width(),
             $height = $cloud.height(),
             $left = parsePx($cloud.css('left'));

         if ($left <= 0) {
            $cloud.fadeOut('short', function() {               
               $cloud.css('left', parseInt(w.width()) + 'px');
               $cloud.css('top', parseInt(Math.random() * (waterLevel - $height)) + 'px');   
               
               // If it's actually the plane, only display it planeFlybyChance% of the time
               if (cloud.plane) {
                  if (Math.random() <= settings.planeFlybyChance) { $cloud.fadeIn('short'); }
                  else { $cloud.hide(); }
               }
               else {
                  $cloud.fadeIn('short');
               }
            });
         }
         else {
            $cloud.css('left', parseInt($left - cloud.dx) + 'px');
         }
      });
   });

   var Clouds = function() {
   };

   var cloudsInit = function() {
     for (var i=0; i<settings.numClouds+1; i++) {
        var c = {},
            scale = (settings.scaleMin + (Math.random() * settings.scaleMax));

        // If we're adding the plane
        if (i == 0) {
            node = settings.planeNode.clone();
            c.plane = true;
        }
        else {
            node = settings.cloudNode.clone();
        }

        c.image = node;
        c.image.attr('id', null);
        c.image.addClass('cloud');
       
        settings.containerNode.append(c.image);
        
        var width = node[0].width;
            height = node[0].height;
        
        c.image.css('width', parseInt(width * scale) + 'px');
        c.image.css('height', parseInt(height * scale) + 'px');
        
        // Parallax effect
        c.dx = Math.pow((settings.parallaxMin + ((scale - settings.scaleMin)/settings.scaleMax) * settings.parallaxScale), settings.parallaxPower) / settings.targetFPS;

        c.image.css('left', parseInt(Math.random() * (w.width() - c.image.width())) + 'px');
        c.image.css('top', parseInt(Math.random() * (waterLevel - c.image.height())) + 'px');

        // If we're adding the plane
        if (i == 0) {
            c.image.hide();
        }        

        clouds.push(c);
     }
     
     cloudsRepeater.start();
   }

   Clouds.load = function() {         
      if (!settings.cloudNode[0].complete) { settings.cloudNode.on('load', cloudsInit); }
      else { cloudsInit(); }         
   }

   Clouds.unload = function() {
      cloudsRepeater.stop();      
      settings.containerNode.children().remove();
      clouds = [];
      settings.cloudNode.off('load.game');
   }

   app.clouds = Clouds;

})(beachball);

/* UI and controls
*/
(function(app) {
   $(document).ready(function() {
      var title = 'beachball madness!';

      var game = app.game,      
          $game = $(game),          
          c = 0,
          delay = 50,              
          $counter = $('#counter'),
          $startButtons = $('.start'),
          $pauseButtons = $('.pause-unpause');
      
      var _started = false,
          started = function(val) {            
            if (val != undefined) { _started = val; }
            else { return _started; }
      };

      var counterRepeater = app.repeater({
         delay : 1/delay,
         runningHook : started
      }, function() {                
            $counter.text(c.toFixed(2));
            c += 1/delay;
      });           

      $startButtons.hide();
      $pauseButtons.hide();

      $game.on('game.reset game.unloaded', function(e) {        
         counterRepeater.stop();
         $counter.html(e.reason || title);   
         c = 0;       
         if (app.accelerometer) {
            $startButtons.fadeIn();         
         }
      });

      $game.on('game.start game.unpause', function() {         
         if (!started()) {         
            counterRepeater.start();
            counterRepeater.step();
            $pauseButtons.fadeOut();                      
         }
      });   

      $game.on('game.pause', function(e) {
         if (started()) {
            counterRepeater.stop();   
            $pauseButtons.attr('value', 'unpause')
                          .fadeIn();
            if (e.reason) { 
               $counter.html(e.reason); 
            }            
         }
      });
   
      $game.on('game.notLoaded', function(e) {                  
         $counter.html(e.reason);                   
         $startButtons.fadeOut();
      });
            
      $game.on('game.wallHit', function(e) {
         if (started()) {            
            started(false);
            var drawRatio = game.drawRatio(),
                $w = $(window),
                $width = $w.width(),
                position = e.body.GetPosition();
         
            var splashX = ((position.x * drawRatio) < $width/2)
                      ? 0
                      : $width - $('#splash').width();
                   
            $game.triggerHandler({
               type : 'game.reset', 
               reason : c.toFixed(2) + '<h3>final time</h3>'
            });                   
                   
            $('#splash').css('bottom', '0px')
                        .css('left', splashX + 'px')
                        .show(100, function() {                       
                           $(this).fadeOut(800);                                    
                        });                      
         }
      });

      $game.on('game.unloaded', function() {
         started(false);
         $counter.html(title);
         $startButtons.off('click.game')
                      .fadeOut(); 
         $pauseButtons.off('click.game')
                      .fadeOut();  
         $(window).off('keydown.game');
      });
         
      $game.on('game.loaded', function() {
         started(false);                    
      
         /* Check to see if the accelerometer exists and is
            spewing forth data.
         */
         if (!game.accelerometer) {         
            $counter.html('Load this page on a device with an accelerometer!' +
                          '<h3>(or use the ← and → keys to move the ball)</h3>');
                
            $game.on('game.accelerometer', function(e) {
               console.log(e.enabled);
               if (e.enabled) {
                  $counter.html(title);
               }
            });                                
         }
         else {
            $counter.html(title);
            $startButtons.fadeIn();
         }           
                
         $startButtons.on('click.game', function() {
            if (!started()) {                              
               $startButtons.fadeOut();
               $game.triggerHandler('game.start');
            }
         })         
         
         $pauseButtons.on('click.game', function() {
            if (started()) {               
               $(this).fadeIn();
               $game.triggerHandler('game.pause');
            }
            else {               
               $(this).fadeOut();
               $game.triggerHandler('game.unpause');
            }
         });              
      });
      
      /* Super-secret keyboard controls */
      $(window).on('keydown.game', function(e) {
         switch(e.keyCode) {
            case 37:
               if (!started()) {
                  $game.triggerHandler('game.start');
               }
               $game.triggerHandler('game.pushLeft');                                 
               break;
            case 39:
               if (!started()) {
                  $game.triggerHandler('game.start');
               }
               $game.triggerHandler('game.pushRight');                                 
               break;
         }
      });          

      app.clouds.load();
      game.load();      
   });
})(beachball);
