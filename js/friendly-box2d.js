/* friendly-box2d.js
   A friendlier version of box2d for JavaScript. Wraps up the complexity of [http://code.google.com/p/box2dweb](box2dweb)
   for easier use.
     
   For example:
   
      var fps = 1/30,
          stepSize = 4,
          world;
          
      world = new Box2D.world({
          drawRatio : $(window).width(),
          gravity : {
              x : 0,
              y : 9.8
          }
      });
   
      world.addBody({
          shape : 'circle',
          radius : '50px',
          friction : 0.1,
          id : '#circle'
      });
   
      setInterval(function() {
          world.step(1/fps, stepSize, stepSize);
          world.iterBodies(function(i, body) {            
            if (body.id != undefined) {
                var pos = body.GetPosition(),
                    angle = body.GetAngle(),
                    obj = $(body.id);
                                
                obj.css('left', pos.x * world.drawRatio() - obj.width()/2 + 'px');
                obj.css('top', pos.y * world.drawRatio() - obj.height()/2 + 'px');                                           
                // CSS rotation here
            }
          });    
          world.clearForces();                            
      });   
*/

(function(Box2D) {
   
   var Vec2 = Box2D.Common.Math.b2Vec2,  
      AABB = Box2D.Collision.b2AABB,
      BodyDef = Box2D.Dynamics.b2BodyDef,
      Body = Box2D.Dynamics.b2Body,
      FixtureDef = Box2D.Dynamics.b2FixtureDef,
      Fixture = Box2D.Dynamics.b2Fixture,
      B2DWorld = Box2D.Dynamics.b2World,
      MassData = Box2D.Collision.Shapes.b2MassData,
      PolygonShape = Box2D.Collision.Shapes.b2PolygonShape,
      CircleShape = Box2D.Collision.Shapes.b2CircleShape;
      ContactListener = Box2D.Dynamics.b2ContactListener;   
   
   // Iterate over an object and apply a function to each key-value pair
   function map(obj, func, context) {
      var results = [];
      for (var key in obj) {
         if (obj.hasOwnProperty(key)) { results.push(func(key, obj[key], context)); }
      }
      return results;
   }
   
   // Merge two objects
   function merge(defaults, settings) {      
      map(defaults, function(key, val) {
         if (defaults.hasOwnProperty(key) && !(key in settings))
            settings[key] = defaults[key];
      });
      return settings;
   };   

   /* Create a new Box2D world.      
      options:
         ignoreStatic :    [true]         ignore static bodies
         drawRatio    :    [1]            the ratio of images on the screen to bodies in the world (pixels:meters)
         gravity      :    [{x:0, y:9.8}] world gravitational acceleration, given in meters/s^2
   */
   function world(settings) {
      var world,
          bodies = [];
   
      merge({
         ignoreStatic : true,
         drawRatio : 1,
         gravity : {x: 0, y: 9.8}
      }, settings);      

      /* Get the draw ratio */
      this.drawRatio = function() {
         return settings.drawRatio;
      }
      
      /* Get the box2d world */
      this.world = function() {         
         return world;
      }
      
      /* Step the world */
      this.step = function() {
         return world.Step.apply(world, arguments);
      }
      
      /* Clear the world */
      this.clearForces = function() {
         return world.ClearForces.apply(world, arguments);
      }
       
      /* Iterate over all bodies.
         This is meant to prevent errant removal of bodies from the list,
         which may give the impression that they are removed from the world too.
      */
      this.iterBodies = function(func, context) {
         return map(bodies, func, context);
      }
       
      /* Create a body with reasonable defaults and return it.
         
         If measurements are given as strings in pixels (i.e., "10px"), the world scaling
         factor is used to scale them to MKS units.
            
         options:
            shape          : [box]   box, circle or polygon
            static         : [true]  whether the body is static or not
            density        : [1.0]   density
            friction       : [0.5]   friction
            restitution    : [0.3]   restitutiton, or the amount of elasticity that this body
                                     will have after a collision. A value of 1 results in an
                                     elastic collision.
            
            sensorCallback : [false] if a function, makes this body a sensor. Sensor functions
                                     take the following form:
                                       
                                       function(contactBody, bodyA, bodyB);                                     
            
            x              : [0]     the body's centeroid x position in meters
            y              : [0]     the body's the centeroid y position in meters
            
            rotation       : [0]     the body's initial rotation in radians
            
            radius         :         if the shape is a circle, the radius of the circle in meters
            width          :         if the shape is a box, the width in meters 
            height         :         if the shape is a box, the height in meters
            
            vertices       :         if the shape is a polygon, an array of vertices. Vertices may 
                                     take any of the following forms:
                                    
                                       [[x0, y0], [x1, y1], ...]
                                       [{x : x0, y : y0}, {x : x1, y : y1}, ...]
                                       [x0, y0, x1, y1, ...]
                                       
            id             :        an identifier used to tag the body. May be any object.
      */          
      this.addBody = function(settings) {
         if (arguments.length === 0)
            throw new TypeError();

         // Merge the defaults
         merge({      
            'shape' : 'box',
            'static' : true,
            'density' : 1.0,
            'friction' : 0.5,
            'restitution' : 0.3,         
            'sensorCallback' : undefined,         
            'x' : 0,
            'y' : 0,
            'rotation' : 0,         
            'radius' : undefined,
            'width'  : undefined,
            'height' : undefined,        
            'vertices' : undefined,
            'id' : undefined,
         }, settings);

         // Convert all pixels to meters
         settings = merge(settings, {
            'x'      : this.parsePixels(settings.x),
            'y'      : this.parsePixels(settings.y),
            'radius' : this.parsePixels(settings.radius),
            'width'  : this.parsePixels(settings.width),
            'height' : this.parsePixels(settings.height)
         });  

         if (settings.vertices)
            settings.shape = 'polygon';

         var fixDef = new FixtureDef,
             bodyDef = new BodyDef;          

         fixDef.density = settings.density;
         fixDef.friction = settings.friction;
         fixDef.restitution = settings.restitution;   

         bodyDef.type = settings.static ? Body.b2_staticBody : Body.b2_dynamicBody;   
         bodyDef.position.Set(settings.x, settings.y);

         switch(settings.shape) {
            case 'box':         
               fixDef.shape = new PolygonShape;
               fixDef.shape.SetAsBox(settings.width / 2, settings.height / 2);
               break;
            case 'polygon':
               var w = this;
               var vec = map(settings.vertices, function(i, e) {               
                  return new Vec2(w.parsePixels(e[0]), w.parsePixels(e[1])) 
               });            
               fixDef.shape = new PolygonShape;            
               fixDef.shape.SetAsArray(vec, vec.length);
               break;
            case 'circle':
               fixDef.shape = new CircleShape(settings.radius);
               break;
            default:
               throw new TypeError();
         }
         
         var body = world.CreateBody(bodyDef),
             fix = body.CreateFixture(fixDef);      

         if (typeof settings.sensorCallback === 'function') {          
            body.sensorCallback = settings.sensorCallback;      
         }

         body.SetAngle(settings.rotation);         
         body.id = settings.id;
         
         bodies.push(body);

         return body;
      };

      world = new B2DWorld(
         new Vec2(settings.gravity.x, settings.gravity.y), settings.ignoreStatic);

      // Needed for contact joints
      var contactListener = new Box2D.Dynamics.b2ContactListener;
      contactListener.BeginContact = function(contact) {      
         if (typeof contact.m_fixtureA.m_body.sensorCallback === 'function')
            contact.m_fixtureA.m_body.sensorCallback.call(null, contact, contact.m_fixtureA.m_body, contact.m_fixtureB.m_body);
            
         if (typeof contact.m_fixtureB.m_body.sensorCallback === 'function')
            contact.m_fixtureB.m_body.sensorCallback.call(null, contact, contact.m_fixtureB.m_body, contact.m_fixtureA.m_body);           
      };

      world.SetContactListener(contactListener);
   };      

   /* Get or set the world's gravity */
   world.prototype.gravity = function(gravity) {
      var current = this.world().GetGravity();
      
      if (!gravity) {
         return current;
      }
      else {
         this.world().SetGravity(new Vec2(
            gravity.x == undefined ? current.x : gravity.x,
            gravity.y == undefined ? current.y : gravity.y));
      }
   };
   
   /* Parse a pixel value and return the equivalent in meters
      (according to this world's drawRatio).
   */
   world.prototype.parsePixels = function(str) {
      var drawRatio = this.drawRatio();
      if (typeof str == 'string')
         return parseFloat(str.replace(/^\s*([-0-9.]+)\s*px/im, function ($0, $1) {return parseFloat($1) * 1/drawRatio}));
      else
         return str;        
   }

   /* Convert a number to pixels from meters according to this world's drawRatio. */
   world.prototype.toPixels = function(num) {
      return num * this.drawRatio();
   };

   /* Convert a number to meters from pixels according to this world's drawRatio. */
   world.prototype.toMeters = function(num) {
      if (typeof num == 'string') { num = num.replace(/px/i, ''); }
      return num / this.drawRatio();
   };
      
   /* Pushes a body with an impulse in a random direction with the given scale (in pixels).
      If maxAngle and minAngle are given, the direction is within those angles.   
   */
   world.prototype.randomImpulse = function(body, settings) {     
      merge({
         minAngle : 0,
         maxAngle : 360,
         scale : '10px'
      }, settings);        
      
      settings.scale = this.parsePixels(settings.scale);
      
      var angle = settings.minAngle + Math.random() * (settings.maxAngle - settings.minAngle);    
      var c = body.GetWorldCenter();   
      
      var f = new Vec2(
         Math.cos(angle * Math.PI / 180) * settings.scale,
         Math.sin(angle * Math.PI / 180) * settings.scale
      );
      body.ApplyImpulse(f, c);   
   };

   Box2D.world = world;
})(Box2D);