// usage: log('inside coolFunc', this, arguments);
// paulirish.com/2009/log-a-lightweight-wrapper-for-consolelog/
window.log = function f(){ log.history = log.history || []; log.history.push(arguments); if(this.console) { var args = arguments, newarr; try { args.callee = f.caller } catch(e) {}; newarr = [].slice.call(args); if (typeof console.log === 'object') log.apply.call(console.log, console, newarr); else console.log.apply(console, newarr);}};

// make it safe to use console.log always
(function(a){function b(){}for(var c="assert,count,debug,dir,dirxml,error,exception,group,groupCollapsed,groupEnd,info,log,markTimeline,profile,profileEnd,time,timeEnd,trace,warn".split(","),d;!!(d=c.pop());){a[d]=a[d]||b;}})
(function(){try{console.log();return window.console;}catch(a){return (window.console={});}}());

(function() {

  // Determine which properties to set
  var prefixes = ['', 'Moz', 'Webkit', 'O', 'ms', 'Khtml'],
      cached = {};
      
  var CSSPrefix = function($this, prop) {
    if (prop in cached) { return cached[prop]; }

    if(!$this[0] || !$this[0].style) { return; }
  
    for (var i in prefixes) {                
      prop = prop.replace(/\-[a-z]/ig, function(str) {                
        return str.slice(1).toUpperCase();
      });
      
      var fullProp = prop;
      if (prefixes[i] != '') {
        fullProp = prefixes[i] + prop.charAt(0).toUpperCase() + prop.slice(1);
      }

      if ($this[0].style[fullProp] !== undefined) {
        cached[prop] = fullProp;
        return fullProp;
      }
    };
  };

  // jQuery doesn't reliably get the corner radius in Safari
  (function ($) {
     $.fn.cornerRadius = function() {
        var $this = $(this),
            cssBorderTopLeftRadius = CSSPrefix($this, 'border-top-left-radius');
 
        if (cssBorderTopLeftRadius) {
          return parseFloat(/(\+|-){0,1}\d+(\.\d+(e){0,1}\d+)?/i.exec($this.css(cssBorderTopLeftRadius))[0]);
        }
     }
  })(jQuery);

  // Add CSS rotation to jQuery
  (function($) {         
     $.fn.rotate = function(setter, unit, origin) {      
        var $this = $(this),            
            unit = unit || 'deg',
            origin = origin || 'center center',
            cssTransform = CSSPrefix($this, 'transform'),
            cssTransformOrigin = CSSPrefix($this, 'transform-origin'),
            matrix = $this.css(cssTransform),
            angle;

        if (matrix == 'none' || matrix == undefined || matrix == '') {           
           angle = Math.cos(0); 
        }      
        else {
           angle = parseFloat(/^matrix\(([.0-9e-]+)/.exec(matrix)[1]); 
        }

        switch(unit) {
          case 'deg':
            angle = Math.acos(angle) / Math.PI * 180 ;
            break;
          case 'rad':
            break;
          default:
            return;
        }
        
        // We want the existing angle
        if (setter == undefined || setter == null)
           return angle + unit;
        
        if (typeof setter === 'function') { angle = setter(angle, unit); }
        else { angle = setter; }

        $this.css(cssTransform, 'rotate(' + angle + unit + ')');
        $this.css(cssTransformOrigin, origin)

        return this;
     };
  })(jQuery);
})();