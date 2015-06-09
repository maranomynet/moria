'use strict';

var _ = require( 'lodash' );
var m = require( 'mithril' );

var array = [];
var empty = '';
var slash = '/';

// There is only ever one hash (just as Mithril routes can only be
// defined once). It's necessary to store it in a higher scope
// for use in utilities like moria.params.
var hash  = void 0;

// Intercepts m.route & becomes true during routing
var routing = ( function routeDecorator(){
	var route  = m.route;
	var output = m.prop( false );

	m.route = function decorateRoute( x ){
		if( x ){
			output( true );

			setTimeout( function(){
				output( false );
			}, 0 );
		}
		else return route();

		return route.apply( this, _.toArray( arguments ) );
	};

	_.extend( m.route, route );

	return output;
}() );

// Supply a Moria-style hierarchical routeMap,
// return a Mithril-style flat routeHash
function buildRouteHash( routeMap ){
	hash     = {};
	routeMap = { '' : routeMap };

	// Composes one level of routeMap, writing to the flat hash
	// when it reaches a leaf node (module), recursing others.
	void function buildRouteLevel( routeMap, tail, before ){
		_.each( routeMap, function buildRoute( value, key ){
			var props = routeProps( value, key, tail, before );

			if( props.redirect ){
				hash[ props.path ] = redirect( props.redirect, props.path );
			}
			else if( props.module ){
				if( props.setup.length ){
					hash[ props.path ] = decorateModule( props.module, props.setup );
				}
				else {
					hash[ props.path ] = props.module;
				}
			}
			else if( props.subMap ){
				buildRouteLevel( props.subMap, props.path, props.setup );
			}
		} );
	}( routeMap, empty, array );

	return hash;
}

// Supply a routeMap node's context to receive metadata
function routeProps( value, key, tail, before ){
	var output = {};

	var prefix  = ( key || !tail ) ? slash : empty;
	var segment = prefix + key;
	var outcome = _.isArray( value ) && value.pop() || value;

	output.path     = ( tail + segment ).replace( /\/+/g, slash );
	output.setup    = _.isArray( value ) ? before.concat( value ) : before;
	output.module   = isModule( outcome ) && outcome;
	output.subMap   = !output.module && _.isPlainObject( outcome ) && outcome;
	output.redirect = _.isString( outcome ) && outcome;

	return output;
}

// Supply a Mithril-style route path.
// Returns a module which interprets and executes the redirect
// with minimal DOM mashing.
var redirect = ( function redirectScope(){
	var absolute   = /^\//;
	var ascend     = /^\.\.\//;
	var tail       = /[^\/]+\/?$/;
	var paramToken = /:([^\/]+)(\.\.\.)?/g;
	var emptyView  = function emptyView(){};

	return function redirect( to, from ){
		if( arguments.length < 2 ){
			from = m.route();
		}

		if( !absolute.test( to ) ){
			while( ascend.test( to ) ){
				to   = to.replace( ascend, empty );

				from = from.replace( tail, empty );
			}

			to = from + '/' + to;
		}

		return {
			view       : emptyView,
			controller : function redirection(){
				var endpoint = to.replace( paramToken, function insertParam( token, param ){
					return m.route.param( param );
				} );

				// Does this even do anything? Might be worth writing tests.
				m.startComputation();

				m.route( endpoint );

				m.endComputation();
			}
		};
	};
}() );

// Returns a module whose controller will receive the results
// of setup functions - setup will only execute on route
// changes but its results are cached for non-routing redraws
function decorateModule( module, setup ){
	var routeModel;

	return {
		controller : function controllerDecorator(){
			if( routing() === true ){
				routeModel = void 0;

				_.each( setup, function executeSetup( fn ){
					routeModel = fn( routeModel );
				} );
			}

			return construct( module.controller, routeModel );
		},
		view       : module.view
	};
}

// Is x a module? A module must have view & controller props,
// both of which must be functions.
var isModule = ( function propsContainer(){
	var props = [ 'controller', 'view' ];

	return function isModule( x ){
		return _( props ).every( _.curry( _.has )( x ) ) && _( x ).pick( props ).every( _.isFunction );
	};
}() );

// A wrapper for creating instances from controllers
var construct = ( function metaConstructorFacade(){
	var bind = Function.prototype.bind;

	return bind ? function metaConstructor( Constructor, input ){
		return new ( bind.call( Constructor, Constructor, input ) )();
	} : function metaConstructor( Constructor, input ){
		function Reconstruction( input ){
			return Constructor.call( this, input );
		}

		Reconstruction.prototype = Constructor.prototype;

		return new Reconstruction( input );
	};
}() );

// Export the hash builder and redirect functions
var moria = buildRouteHash;

// Get a hash of current parameters, including query parameters
moria.params   = ( function paramFunctions(){
	var segmentKeys = _.memoize( function segmentFunctions(){
		function extractParams( uri ){
			return uri.match( /:[^\/]+/g ) || array;
		}

		function trimParam( paramToken ){
			return paramToken.substr( 1 );
		}

		return function segmentKeys(){
			return _( hash )
				.keys()
				.map( extractParams )
				.flatten()
				.map( trimParam )
				.uniq()
				.valueOf();
		};
	}() );

	function segments(){
		return _.zipObject(
			segmentKeys(),
			_.map(
				segmentKeys(),
				m.route.param
			) );
	}

	var queries = ( function queryFunctions(){
		function tokens( uri ){
			return decodeURIComponent( uri ).match( /(\?|&)([^\?&]+)/g ) || array;
		}

		function split( token ){
			return token.substr( 1 ).split( '=' );
		}

		return function getQueries(){
			return _( tokens( m.route() ) )
				.map( split )
				.zipObject()
				.valueOf();
		};
	}() );

	return function params(){
		return _.extend( queries(), segments() );
	};
}() );

// Redirect to the provided Mithril-tokenized URI
moria.redirect = function redirect( to ){
	redirect( to ).controller();
};

module.exports = moria;
