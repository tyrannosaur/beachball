(function(exports) {
      /* Detect when device orientation changes and warn that the game will be
         restarted (unless, of course, the original orientation is restored)
      
         TODO: tweak Box2D so that orientation changes are seamless and don't
               require a restart            
      */
      /*
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
      */

  var $controls,
      $message,
      $counter,
      $beachball,
      $w;

  var game = exports.game; 
      counterFreq = 1/50,
      counterTime = 0,
      counter = exports.repeater({delay: counterFreq}, function() {
        $message.text(counterTime.toFixed(2));
        counterTime += counterFreq;
      });

  var controlsEnabled = function() {
    var enabled = false;
    return function(val) {
      if (val == undefined) { return enabled; }
      
      enabled = Boolean(val);
      if (val) { $controls.fadeIn(); }
      else { $controls.fadeOut(); }
    };      
  }();

  function start() {
    if (!game.started() && controlsEnabled()) {      
      $beachball.fadeIn()
                .css('visibility', 'visible');
      game.start();
      counter.start();
      controlsEnabled(false);
    }  
  }

  function msg() {
    if (arguments[0]) { $message.html(arguments[0]); }
    if (arguments[1]) { $counter.html(arguments[1]); }
  }

  game.events.on('loaded.core', function(settings) {
    $controls = $('#thumb-button-left, #thumb-button-right');
    $message = $('#message');
    $counter = $('#counter');
    $beachball = $('#beachball');
    $w = $(window);
      
    msg('beachball madness!', 'Tilt your device left and right or use the ← and → keys to move the ball.');
  
    $controls.on('click touchup', start)
             .attr('value', 'start');
    
    /* Super-secret keyboard controls */
    $w.on('keydown', function(e) {   
      switch(e.keyCode) {
        case 37:
           if (!game.started()) { start(); }      
           game.pushBeachball('left');
           break;
        case 39:
           if (!game.started()) { start(); }                
           game.pushBeachball('right');          
           break;           
      }
    });    
    
    controlsEnabled(true);      
    game.events.emit('loaded.ui');    
  });
  
  game.events.on('not-loaded', function(e) {
    msg(e.reason);
    controlsEnabled(false);
  });
  
  game.events.on('lost', function(e) {
    if (game.started()) {
      game.stop();
      counter.stop();
      
      var drawRatio = e.drawRatio,
          winWidth = $(window).width();
          position = e.body.GetPosition();
         
      var splashX = ((position.x * drawRatio) < winWidth/2)
                ? 0
                : winWidth - $('#splash').width();
      
      msg(counterTime.toFixed(2), 'final time');            
      counterTime = 0;      
             
      $('#splash').css('bottom', '0px')
                  .css('left', splashX + 'px')
                  .show(100, function() {                                         
                     $(this).fadeOut(800); 
                     $beachball.fadeOut();                       
                     game.resetBeachball();
                     controlsEnabled(true);            
                  });                      
    }
  });    
})(this);
