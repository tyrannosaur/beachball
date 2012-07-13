(function(exports) {
  var game = exports.game,
      sprites = {};
  
  var zLevels = [250, 400, 550],
      minZLevel = 250;

  function scale(how, x, zLevel) {
    switch(how) {
      case 'linear-random':
        return parseInt((x/2 + (Math.random()*x/2))*minZLevel/zLevel);
      case 'linear':
        return parseInt(x*minZLevel/zLevel);
      case 'exp':
        return parseInt(3 * x * Math.pow(minZLevel/zLevel, 2));
    }
  }

  function Sprite($obj, dx, zIndex, fixedZLevel) {
    var oWidth = $obj[0].width,
        oHeight = $obj[0].height;
  
    this.$obj = $obj;
    
    this.permutate = function() {
      var zLevelIndex = Math.floor(Math.random()*zLevels.length),
          zLevel = fixedZLevel || zLevels[zLevelIndex],
          sWidth = scale('exp', oWidth, zLevel),
          sHeight = scale('exp', oHeight, zLevel);

      this.dx = scale('linear-random', dx, zLevel);
    
      $obj.css('width',  sWidth + 'px')
          .css('height', sHeight + 'px')
          .css('z-index', zIndex - zLevelIndex);
      
      return this;   
    }        
  }
  
  Sprite.prototype.position = function(val) {
    if (!val) {  
      var o = this.$obj.offset();
      return {x: o.left, y:o.top};
    }
    else {
      if (val.x != undefined) {
        this.$obj.css('left', parseInt(val.x) + 'px');
      }
      if (val.y != undefined) {
        this.$obj.css('top', parseInt(val.y) + 'px');   
      }
      return this;   
    }
  }  
  
  function load(settings) {
    var fps = settings.fps,
        total = settings.cloudsTotal || 5,
        planeFlybyChance = settings.planeFlybyChance || 0.5,
        cloudDx = -Math.abs(settings.cloudVelocity || -150)/fps,
        planeDx = -Math.abs(settings.planeVelocity || -150)/fps,
        cloudNode = $('#cloud'),
        planeNode = $('#plane'),
        containerNode = $('#sky'),
        winWidth = $(window).width(),
        winHeight = $(window).height(),
        waterLevel = Math.min($('#water-bg').offset().top, $('#water-fg').offset().top);        

    function createSprite(nodeToClone, className, dx, fixedZLevel) {
      var node = nodeToClone.clone(),
          zIndex = nodeToClone.css('z-index');
      
      node.attr('id', null)
          .addClass(className)
          .removeClass(hidden)
          .hide();
    
      return (new Sprite(node, dx, zIndex, fixedZLevel)).permutate()
                                           .position({
                                              x: Math.random() * (winWidth - node.width()),
                                              y: Math.random() * (waterLevel - node.height()) });
    } 
    
    sprites['plane'] = createSprite(planeNode, 'plane', planeDx, 500);

    for (var i=0; i<total; i++) {  
      sprites['cloud' + i] = createSprite(cloudNode, 'cloud', cloudDx);
    }
    
    for (var key in sprites) { containerNode.append(sprites[key].$obj); }

    loop = exports.repeater({delay: 1/fps}, function() {
      $.each(sprites, function(key, s) {
        var pos = s.position(),
            $obj = s.$obj;
        
        if (pos.x <= 0) {
          $obj.fadeOut('short', function() {
            // Change the scale and reset the position
            s.permutate()
             .position({
                x: winWidth - $obj.width(),
                y: Math.random() * (waterLevel - $obj.height())
             });          
          
            // Only show the plane a certain percent of the time
            switch(key) {
              case 'plane':
                if (Math.random() <= planeFlybyChance) { $obj.fadeIn('short'); }
                else { $obj.hide(); }      
                break;        
              default:
                $obj.fadeIn('short');
                break;
            }
          });
        }
        else {
          s.position({x: pos.x + s.dx });
        }
      });
    });   
    
    loop.start();
    game.events.emit('loaded.clouds');
  }

  game.events.on('loaded.core', function(e) {
    var settings = e.settings,
        cloudNode = $('#cloud'),
        planeNode = $('#plane'),
        loaded = 0;
        
    function inc() {
      loaded += 1;
      if (loaded == 2) { load(settings); }
    }        
        
    if (cloudNode[0].complete) { inc(); }
    if (planeNode[0].complete) { inc(); }
            
    cloudNode.on('load', inc);
    planeNode.on('load', inc);
  });       

})(this);
