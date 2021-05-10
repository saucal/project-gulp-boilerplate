var $, _, gulp, glob, npmRun, merge, fs, path, semver, CONFIG, FOLDERS, DOMAIN, PATHS, MATCH, SRC;

gulp   = require( 'gulp' );
npmRun = require( 'npm-run' );
glob   = require( 'glob' );
merge  = require( 'merge-stream' );
fs     = require( 'fs' );
path   = require( 'path' );
semver = require( 'semver' );
_      = require( 'underscore' );
$      = require( 'gulp-load-plugins' )( {pattern: '*'} );

if( path.sep !== '/' ) {
	var oldJoin = path.join;
	path.join = function(){
		var ret = oldJoin.apply(this, arguments);
		return ret.replace( new RegExp('\\' + path.sep, 'g' ), '/' );
	};
}

CONFIG = {
	production: ! ! $.util.env.production,
	noprefix: ! ! $.util.env.noprefix
};

// Here are defined relateve paths for source files, dest paths and maps
// Change them if you know what you are doing or just stick to folder structure convention
PATHS = {
	assets: '/assets',
	source: '{self.assets}/source',
	sass: '{self.assets}/source/sass',
	jsSource: '{self.assets}/source/js',
	css: '{self.assets}/css',
	jsDest: '{self.assets}/js',
	maps: '{self.assets}/source/_maps'
};

MATCH = {
	php: '**/*.php',
	sass: '**/*.scss',
	css: '**/*.css',
	js: '**/*.js',
};

SRC = {
	sass: [],
	js: []
};

/* Config: Edit project-folders.json or projectFolders entry into package.json to set your folders
========================================================= */
try {
	FOLDERS = JSON.parse( fs.readFileSync( './project-folders.json' ) );
} catch ( e ) {
	var pkgJson = JSON.parse( fs.readFileSync( './package.json' ) );

	if ( "projectFolders" in pkgJson ) {
		FOLDERS = pkgJson.projectFolders;
	} else {
		FOLDERS = [ '.' ];
	}
}

Array.prototype.getFiltered = function(type){
	if ( type ) {
		return this.filter(
			function( item ){
				return item.name.substr( 0, type.length ) === type;
			}
		);
	} else {
		return this;
	}
};

Array.prototype.getFlattened = function(prefix) {
	if ( typeof prefix == 'undefined' ) {
		prefix = '';
	}

	var paths = [];
	this.forEach(
		function(item, i){
			item.files.forEach(
				function(item){
					paths.push( prefix + item.f );
				}
			);
		}
	);
	return paths;
};

var newFolders = [];
_.each(
	FOLDERS,
	function(item, key){
		if ( typeof item == 'string' ) {
			item = { folder: item };
		} else if ( typeof item == 'object' ) {
			if ( typeof item.folder == 'string' ) {
				// do nothing, we have a folder defined
			} else if ( typeof key == 'string' ) {
				// we're on an object based structure
				item.folder = key;
			} else {
				// We don't have a folder defined, we are editing globals here
				if ( ! _.isUndefined( item.PATHS ) ) {
					PATHS = _.extend( {}, PATHS, item.PATHS );
				}
				if ( ! _.isUndefined( item.MATCH ) ) {
					MATCH = _.extend( {}, MATCH, item.MATCH );
				}
				if ( ! _.isUndefined( item.SRC ) ) {
					SRC = _.extend( {}, SRC, item.SRC );
				}
				return; // ignore because we have no folder defined
			}
		}
		if ( _.isUndefined( item.PATHS ) ) {
			item.PATHS = {};
		}
		item.PATHS = _.extend( {}, PATHS, item.PATHS );
		_.each(
			item.PATHS,
			function(val, key, self){
				var newPath = val.replace(
					/\{self\.(.*?)\}/g,
					function(match, g1){
						return self[g1];
					}
				);
				self[key]   = newPath;
			}
		);

		if ( _.isUndefined( item.MATCH ) ) {
			item.MATCH = {};
		}
		item.MATCH = _.extend( {}, MATCH, item.MATCH );

		if ( _.isUndefined( item.SRC ) ) {
			item.SRC = {};
		}
		item.SRC = _.extend( {}, SRC, item.SRC );

		if ( _.isUndefined( item.concat ) ) {
			try {
				item.concat = JSON.parse( fs.readFileSync( path.join( item.folder, item.PATHS.source, 'concat.json' ) ) );
			} catch ( e ) {
				item.concat = [];
			}
		}

		item.concat.forEach(
			function(concatDest){
				concatDest.files = concatDest.files.map(
					function(source){
						if ( typeof source == 'string' ) {
							source = { f: source };
						}
						var prefix = '';
						if ( source.f.substr( 0, 1 ) == '!' ) {
							prefix   = '!';
							source.f = source.f.substr( 1 );
						}
						source.f = prefix + path.join( item.folder, item.PATHS.source, source.f );

						return source;
					}
				);
			}
		);

		newFolders.push( item );
	}
);
FOLDERS = newFolders;

gulp.task(
	'zip',
	function() {
		var tasks = FOLDERS.map(
			function( folderConfig ) {
				var folder   = folderConfig.folder;
				var basename = path.basename( path.resolve( folder ) );
				var filename = path.join( folder, basename + '.zip' );
				try {
					fs.unlinkSync( filename );
				} catch ( e ) {
					// do nothing
				}
				return gulp.src(
					[
						folder + '/**/*',
						'!**/node_modules/**',
						'!**/gulpfile.js',
						'!**/.DS_Store',
						'!**/package.json',
						'!**/package-lock.json',
						'!**/.git/**'
					],
					{
						base: path.join( folder, '..' ),
					}
				)
					.pipe( $.vinylZip.dest( filename ) )
					.pipe( $.size( {title: folder + ' zip'} ) );
			}
		);
		return merge( tasks );
	}
);

function map_destination( folderConfig, dest ) {
	var assetsPath   = path.join( folderConfig.folder, folderConfig.PATHS.assets );
	var destPath     = path.join( folderConfig.folder, dest );
	var mapsPath     = path.join( folderConfig.folder, folderConfig.PATHS.maps );
	var destRelative = path.relative( assetsPath,destPath );

	var suffix = '';
	if ( destRelative.substr( 0,1 ) != '.' && destRelative.substr( 0,1 ) != path.sep ) {
		suffix = path.sep + destRelative;
	}

	return {
		dest: destPath,
		maps: path.relative( destPath, mapsPath ) + suffix
	};
}

gulp.task(
	'js',
	function() {
		var tasks = FOLDERS.map(
			function( folderConfig ) {
				var folder = folderConfig.folder;
				var PATHS  = folderConfig.PATHS;
				var MATCH  = folderConfig.MATCH;
				var SRC    = JSON.parse( JSON.stringify( folderConfig.SRC.js ) );
				var baseSRC = path.join( folder, PATHS.jsSource );
				SRC.unshift( path.join( baseSRC, MATCH.js ) );

				var destination = map_destination( folderConfig, PATHS.jsDest );

				// get concat sources for this particular folder (from the source folder)
				var concatFiles = folderConfig.concat.getFiltered( 'js' );
				// use the concat sources as ignored paths in the "base" process
				var includePaths = concatFiles.getFlattened( '!' );
				SRC              = _.union( SRC, includePaths );

				var folderTasks = [];

				// Do everything not included in the concat
				var base = gulp.src( SRC, { base: baseSRC } )
					.pipe( $.plumber() )
					.pipe( $.sourcemaps.init() )
					.pipe( ! CONFIG.production ? $.sourcemaps.write( destination.maps ) : $.util.noop() )
					.pipe( $.cached( 'js' ) )
					.pipe( gulp.dest( destination.dest ) )
					.pipe( $.filter( [ '**/*.js', '!**/*.min.js' ] ) )
					.pipe( $.uglify() )
					.pipe( $.rename( {suffix: '.min'} ) )
					.pipe( ! CONFIG.production ? $.sourcemaps.write( destination.maps ) : $.util.noop() )
					.pipe( $.cached( 'js' ) )
					.pipe( gulp.dest( destination.dest ) )
					.pipe( $.size( {title: folder + ' js'} ) );

				folderTasks.push( base );

				// Process each concat dest as it's individual file
				concatFiles.forEach(
					function(dest) {
						var thisDest;

						if ( dest.passthrough ) {
							var passThroughDest = destination;
							if ( dest.files.length > 1 || dest.files[0].f.indexOf( '*' ) > -1 ) {
								passThroughDest = map_destination( folderConfig, path.join( PATHS.jsDest, path.basename( dest.name ) ) );
							}
							thisDest = gulp.src( [ dest ].getFlattened() )
								.pipe( $.plumber() )
								.pipe( $.cached( 'js' ) )
								.pipe( gulp.dest( passThroughDest.dest ) )
								.pipe( $.size( {title: folder + ' passthrough ' + dest.name } ) );
						} else {
							var thisDestPath    = path.join( folderConfig.PATHS.assets, path.dirname( dest.name ) );
							var thisDestination = map_destination( folderConfig, thisDestPath );

							var keepUnminified = _.pluck( _.filter( dest.files, 'keepUnminified' ), 'f' );
							keepUnminified     = keepUnminified.length ? $.filter( keepUnminified, { restore : true } ) : null;
							thisDest           = gulp.src( [ dest ].getFlattened() )
								.pipe( $.plumber() )
								.pipe( $.sourcemaps.init() )
								.pipe( keepUnminified ? keepUnminified : $.util.noop() )
								.pipe( keepUnminified && ! CONFIG.production ? $.sourcemaps.write( thisDestination.maps ) : $.util.noop() )
								.pipe( keepUnminified ? $.cached( 'js' ) : $.util.noop() )
								.pipe( keepUnminified ? gulp.dest( thisDestination.dest ) : $.util.noop() )
								.pipe( keepUnminified ? keepUnminified.restore : $.util.noop() )
								.pipe( $.filter( [ '**/*.js' ] ) )
								.pipe( $.concat( path.basename( dest.name ) ) )
								.pipe( ! dest.minifiedOnly && ! CONFIG.production ? $.sourcemaps.write( thisDestination.maps ) : $.util.noop() )
								.pipe( ! dest.minifiedOnly ? $.cached( 'js' ) : $.util.noop() )
								.pipe( ! dest.minifiedOnly ? gulp.dest( thisDestination.dest ) : $.util.noop() )
								.pipe( $.filter( [ '**/*.js' ] ) )
								.pipe( $.uglify() )
								.pipe( $.rename( {suffix: '.min'} ) )
								.pipe( ! CONFIG.production ? $.sourcemaps.write( thisDestination.maps ) : $.util.noop() )
								.pipe( $.cached( 'js' ) )
								.pipe( gulp.dest( thisDestination.dest ) )
								.pipe( $.size( {title: folder + ' concat ' + dest.name } ) );
						}

						folderTasks.push( thisDest );
					}
				);

				return merge( folderTasks );
			}
		);
		return merge( tasks );
	}
);

function set_folderinfo( resolve ) {
	var tasks = FOLDERS.map(
		function( folderConfig ) {
			var folder = folderConfig.folder;
			return gulp
				.src( [ path.join( folder, '*.php' ), path.join( folder, '*.css' ) ] )
				.pipe(
					$.filter(
						function(_thisPath){
							var thisPath = path.join( folder, _thisPath.relative );
							var phpFile  = fs.readFileSync( thisPath );

							const regex = /^(?:\s+\*\s+)?(.+?):\s+(.+)$/gm;
							let m;

							var data = {
								mainFilePath: '',
								text_domain: '',
								langPath: '',
								version: '',
							};

							while ((m = regex.exec( phpFile )) !== null) {
								// This is necessary to avoid infinite loops with zero-width matches
								if (m.index === regex.lastIndex) {
									regex.lastIndex++;
								}

								if ( m[1] == 'Text Domain' && m[2] ) {
									data.text_domain = m[2];
								}

								if ( m[1] == 'Domain Path' && m[2] ) {
									data.langPath = m[2].substr( 1 );
								}

								if ( m[1] == 'Version' && m[2] ) {
									data.version = m[2];
								}
							}

							if ( data.version ) {
								data.mainFilePath = thisPath;
								folderConfig.info = data;
							}
						}
					)
				);
		}
	);
	return merge( tasks );
}

gulp.task( 'build', gulp.parallel( 'js' ) );

gulp.task( 'package', gulp.series( 'build', 'zip' ) );

var default_task;
default_task = gulp.series( 'build' );

gulp.task( 'default', default_task );
