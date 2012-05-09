var box2dw = {};

(function(root) {
   var Vec2 = Box2D.Common.Math.b2Vec2,  
      AABB = Box2D.Collision.b2AABB,
      BodyDef = Box2D.Dynamics.b2BodyDef,
      Body = Box2D.Dynamics.b2Body,
      FixtureDef = Box2D.Dynamics.b2FixtureDef,
      Fixture = Box2D.Dynamics.b2Fixture,
      World = Box2D.Dynamics.b2World,
      MassData = Box2D.Collision.Shapes.b2MassData,
      PolygonShape = Box2D.Collision.Shapes.b2PolygonShape,
      CircleShape = Box2D.Collision.Shapes.b2CircleShape;
      ContactListener = Box2D.Dynamics.b2ContactListener;

   var merge = function(defaults, settings) {
      $.each(defaults, function(key, val) {
         if (defaults.hasOwnProperty(key) && !(key in settings))
            settings[key] = defaults[key];
      });
      return settings;
   };

   /* Converts pixels to meters */
   box2dw.px2m = function(str, scale) {
       if (typeof str == 'string')
         return parseFloat(str.replace(/^\s*([-0-9.]+)\s*px/im, function ($0, $1) {return parseFloat($1) * 1/scale;}));
       else
         return str;    
   };

   /* Create a new world with some initial settings */
   function W(settings) {
      merge({
         ignoreStatic : true,
         drawScale : 1.0,
         gravity : {x : 0, y : 9.8 }
      }, settings);      

      // List of bodies with attached sprites
      this.bodies = [];

      // Ratio of meters:pixels
      this.drawScale = settings.drawScale;

      // The world itself
      this.world = new World(
         new Vec2(settings.gravity.x, settings.gravity.y), 
         settings.ignoreStatic);

      var contactListener = new Box2D.Dynamics.b2ContactListener;
      contactListener.BeginContact = function(contact) {      
         if (typeof contact.m_fixtureA.m_body.sensorCallback === 'function')
            contact.m_fixtureA.m_body.sensorCallback.call(null, contact, contact.m_fixtureA.m_body, contact.m_fixtureB.m_body);
            
         if (typeof contact.m_fixtureB.m_body.sensorCallback === 'function')
            contact.m_fixtureB.m_body.sensorCallback.call(null, contact, contact.m_fixtureB.m_body, contact.m_fixtureA.m_body);           
      };


      this.world.SetContactListener(contactListener);
   };
   
   /* Pushes a body with an impulse in a random direction with the given scale (in pixels).
      If maxAngle and minAngle are given, the direction is within those angles.   
      */
   W.prototype.randomImpulse = function(body, settings) {     
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

   W.prototype.parsePixels = function(str) {
      return box2dw.px2m(str, this.drawScale);
   }

   W.prototype.toPixels = function(num) {
      return num * this.drawScale;
   };

   W.prototype.toMeters = function(num) {
      if (typeof num == 'string') { num = num.replace(/px/i, ''); }
      return num / this.drawScale;
   };
   
   W.prototype.gravity = function(gravity) {
      var current = this.world.GetGravity();
      
      if (!gravity) {
         return current;
      }
      else {
         this.world.SetGravity(new Vec2(
            gravity.x == undefined ? current.x : gravity.x,
            gravity.y == undefined ? current.y : gravity.y));
      }
   };

   /* Create a body.
      If a sprite is given, the body is matched to the dimensions of the sprite.
      If a string is given, the sprite image is loaded from that url.

      If measurements are given as strings in pixels (i.e., "10px"), the world scaling
      factor is used to scale them to MKS units.
         
      Body settings are:

            shape       : box, circle or polygon
            static      : whether the body is static or not
            density     : density, defaults to 1.0
            friction    : friction, defaults to 0.5
            restitution : restitutiton, defaults to 0.2
            
            sensorCallback : if a function, makes this node a sensor
            
            x           : the centeroid x position, relative to the world
            y           : the centeroid y position, relative to the world
            
            radius      : if the shape is a circle, the radius of the circle in meters
            width       : if the shape is a box, the width in meters 
            height      : if the shape is a box, the height in meters
            
            vertices    : if the shape is a polygon, an array of vertices. Vertices may 
                          take any of the following forms:
                           [[x0, y0], [x1, y1], ...]
                           [{x : x0, y : y0}, {x : x1, y : y1}, ...]
                           [x0, y0, x1, y1, ...]
            
            autoDimensions : automatically generate the body dimensions to match the sprite
                             dimensions and initial rotation. If true, overrides radius, width and height.
                             Polygons are not currently supported.
                             Defaults to false.
                     
            sprite      : if a string, the url of the image to be loaded into a new sprite.
                          Otherwise treated as an existing sprite.
   */   
      
   W.prototype.body = function(settings) {
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
         
         'radius' : 0.1,
         'width'  : 0.1,
         'height' : 0.1,
         'scaleX' : 1,
         'scaleY' : 1,
         'scale' : 1,
         
         'vertices' : undefined,
         
         'autoDimensions' : true,
         'id' : undefined,
      }, settings);

      // Convert all pixels to meters
      settings = merge(settings,
      {
         'x'      : this.parsePixels(settings.x),
         'y'      : this.parsePixels(settings.y),

         'radius' : this.parsePixels(settings.radius),
         'width' : this.parsePixels(settings.width),
         'height' : this.parsePixels(settings.height)
      });  

      if (settings.vertices)
         settings.shape = 'polygon';

      // Set the scale
      if (settings.scale) {
         settings.scaleX = settings.scale;
         settings.scaleY = settings.scale;
      }

      /*
      if (settings.sprite) {
         if (typeof settings.sprite === 'string')
            settings.sprite = settings.sprite;

         // Auto fit the dimensions?
         if (settings.autoDimensions) {
            if (settings.shape == 'polygon')
               throw new TypeError('polygon shape cannot be autoDimensioned yet');
         
            with (settings.sprite.contentSize) {
               settings.width = this.toMeters(width);
               settings.height = this.toMeters(height);
               settings.radius = this.toMeters(Math.max(width, height));
               settings.rotation = settings.sprite.rotation;
            }      
         }
         
         settings.sprite.position = new geo.Point(this.toPixels(settings.x), this.toPixels(settings.y));
         settings.sprite.scaleX = settings.scaleX;
         settings.sprite.scaleY = settings.scaleY;
      }
      */
      
      var fixDef = new FixtureDef;
      var bodyDef = new BodyDef;

      fixDef.density = settings.density;
      fixDef.friction = settings.friction;
      fixDef.restitution = settings.restitution;   

      bodyDef.type = settings.static ? Body.b2_staticBody : Body.b2_dynamicBody;   
      bodyDef.position.Set(settings.x, settings.y);

      switch(settings.shape) {
         case 'box':         
            fixDef.shape = new PolygonShape;
            fixDef.shape.SetAsBox(settings.scaleX * settings.width / 2, settings.scaleY * settings.height / 2);
            break;
         case 'polygon':
            var world = this;
            var vec = $.map(settings.vertices, function(e, i) {               
               return new Vec2(settings.scaleX * world.parsePixels(e[0]), settings.scaleY * world.parsePixels(e[1])) 
            });            
            fixDef.shape = new PolygonShape;            
            fixDef.shape.SetAsArray(vec, vec.length);
            break;
         case 'circle':
            fixDef.shape = new CircleShape(settings.scaleX * settings.radius);
            break;
         default:
            throw new TypeError();
      }
      
      var body = this.world.CreateBody(bodyDef);      
      var fix = body.CreateFixture(fixDef);      

      if (typeof settings.sensorCallback === 'function') {
     //    fix.SetSensor(true);         
         body.sensorCallback = settings.sensorCallback;      
      }

      body.SetAngle(settings.rotation);         
      body.id = settings.id;
      
      this.bodies.push(body);   
      return body;
   };

   box2dw.world = function(settings) {
      return new W(settings || {});
   };
   
})(this);
