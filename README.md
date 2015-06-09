moria
=====

A routing system for [Mithril](http://lhorie.github.io/mithril/).

Mithril has a beautiful lightweight routing paradigm, but as [legends recount](http://en.wikipedia.org/wiki/Durin), sometimes you need to [dig deep](http://en.wikipedia.org/wiki/Moria_(Middle-earth)) to get at the good bits: it's difficult to express the routing of a complex application when [m.route( rootElement, defaultRoute, routesHash )](http://lhorie.github.io/mithril/mithril.route.html#defining-routes) can only be invoked once and the routes hash has to be flat.

Moria aims to solve these problems by producing a Mithril-compatible route hash from nested hierarchies.

# Features

* Nested routes
* Setup functions to run when a route is matched
    * On route, a new variable is created and passed in to each setup function in sequence, before finally being passed to the endpoint module's controller: this allows for the iterative creation of a 'route model'
* Redirects
    * Assign a Mithril-tokenized URI string as a route endpoint to create a dynamic redirect in the route hash
    * Invoke `moria.redirect( MithrilURI )` in application code to redirect to that URI
* Params
    * Invoke `moria.params()` to return a hash of all current URI params: useful as a top-level setup function to give all end-point module controllers a map of current app state

# Roadmap

* Extend redirect functionality to allow automatic param assignment
* Nested modules (currently, each route endpointmust specify the complete module structure you want to render)
* ...

# Install

Currently only works as a CommonJS module, and therefore requires Node (and npm if you want command-line installation). I use [browserify](http://browserify.org/) to compile my CommonJS JavaScript for use on the front-end.

```
npm install --save moria
```

# Use

```javascript
var moria = require( 'moria' );

var routeHash = moria( {
  ''          : loginModule,            // Results in '/loginModule',
  'search'    : '../shop/search',       // Redirect '/search' to '/shop/search'
  'shop'      : {
    ''         : browseModule,          // Results in '/shop'
    'search'   : searchModule,
    'checkout' : {
      'payment'  : foo,                 // Results in '/shop/checkout/payment'
      'delivery' : bar,
      'confirm'  : baz
    }
  },
  ':userName' : [                       // When '/:userName' is matched...
    function(){                         // This function will be executed...
      initUserModel();
    },
    profileModule                       // And this module will render
  ],
  'admin'     : [
    initAdminModel,                     // Another setup function
    {
      ''      : 'users',                // Redirect '/admin' to '/admin/users'
      'users' : [                       // When route matches '/admin/users'...
        initUsersModel,                 // Run initAdminModel && initUserModel...
        {
          ''          : usersListModule,// When we render usersListModule...
          ':userName' : editUserModule  // And when we render editUserModule
        }
      ]
    }
  ]
} );

m.route( document.body, '/', routeHash );
```
