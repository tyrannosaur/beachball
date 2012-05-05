// usage: log('inside coolFunc', this, arguments);
// paulirish.com/2009/log-a-lightweight-wrapper-for-consolelog/
window.log = function f(){ log.history = log.history || []; log.history.push(arguments); if(this.console) { var args = arguments, newarr; try { args.callee = f.caller } catch(e) {}; newarr = [].slice.call(args); if (typeof console.log === 'object') log.apply.call(console.log, console, newarr); else console.log.apply(console, newarr);}};

// make it safe to use console.log always
(function(a){function b(){}for(var c="assert,count,debug,dir,dirxml,error,exception,group,groupCollapsed,groupEnd,info,log,markTimeline,profile,profileEnd,time,timeEnd,trace,warn".split(","),d;!!(d=c.pop());){a[d]=a[d]||b;}})
(function(){try{console.log();return window.console;}catch(a){return (window.console={});}}());

// add rotation
(function($) {   
   $.fn.rotate = function(setter, origin) {      
      var elm = $(this),
          prefix = '-webkit-',
          unit = 'deg',
          origin = origin || 'center center';      
     
      var val = elm.css(prefix + 'transform');

      if (val == 'none' || val == undefined) { 
         val = Math.cos(0); 
      }      
      else {
         val = parseFloat(/^matrix\(([.0-9e-]+)/.exec(val)[1]); 
      }

      if (unit == 'deg') { 
         val = Math.acos(val) / Math.PI * 180 ;
      }
      
      if (setter == undefined || setter == null)
         return val + unit;
      
      var ret;
      if (typeof setter === 'function') { ret = setter(val, unit); }
      else { ret = setter; }
      
      elm.css(prefix + 'transform', 'rotate(' + ret + unit + ')');
      elm.css(prefix + 'transform-origin', origin)

      return this;
   };
})(jQuery);

