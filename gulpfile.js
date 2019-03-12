var $, gulp, merge, fs, path, CONFIG, FOLDERS, DOMAIN, PATHS, WATCH;

gulp = require( 'gulp' );
merge = require( 'merge-stream' );
fs = require( 'fs' );
path = require( 'path' );
$ = require( 'gulp-load-plugins' )({pattern: '*'});

CONFIG = {
	production: !! $.util.env.production,
	watch: !! $.util.env.watch,
	bs: !! $.util.env.bs,
	noprefix: !! $.util.env.noprefix
};

/* Confing: Edit saucal.json to set your folders and domain
========================================================= */
FOLDERS = JSON.parse( fs.readFileSync( './project-folders.json' ) );

 // Here are defined relateve paths for source files, dest paths and maps
 // Change them if you know what you are doing or just stick to folder structure convention
 PATHS = {
	sass: '/assets/source/sass',
	css: '/assets/css',
	jsSource: '/assets/source/js',
	jsDest: '/assets/js',
	maps: '../source/_maps'
 };

// Here are defined default file paths to watch
// change them if you know what you are doing or just stick to folder structure convention
WATCH = {
	php: buildPath( '/**/*.php' ),
	sass: buildPath( PATHS.sass + '/**/*.scss' ),
	css: buildPath( PATHS.css + '/**/*.css' ),
	jsSource: buildPath( PATHS.jsSource + '/**/*.js' ),
	jsDest: buildPath( PATHS.jsDest + '/**/*.js' )
};

// helper function - creates watch paths array based on FOLDERS
function buildPath( path ) {
	return paths = FOLDERS.map( function( folder ) {
		return folder + path;
	});
}

gulp.task( 'zip', function() {
	var tasks = FOLDERS.map( function( folder ) {
		var basename = path.basename(path.resolve(folder));
		var filename = folder + "/" + basename + ".zip";
		try {
			fs.unlinkSync(filename);
		} catch( e ) {
			// do nothing
		} 
		return gulp.src([
				folder + '/**/*', 
				'!**/node_modules/**', 
				'!**/gulpfile.js', 
				'!**/.DS_Store', 
				'!**/package.json', 
				'!**/package-lock.json', 
				'!**/.git/**'
			], {
				base: folder + '/..',
			})
			.pipe($.vinylZip.dest(filename))
			.pipe( $.size({title: folder + ' zip'}) );
	});
	return merge( tasks );
} )

gulp.task( 'sass', function() {
	var tasks = FOLDERS.map( function( folder ) {

		return gulp.src( folder + PATHS.sass + '/**/*.scss' )
			.pipe( $.plumber() )
			.pipe( $.sourcemaps.init() )
			.pipe( $.sass().on( 'error', $.sass.logError ) )
			.pipe( ! CONFIG.noprefix ? $.autoprefixer({browsers: [ 'last 5 versions', '> 1%' ]}) : $.util.noop() )
			.pipe( ! CONFIG.production ? $.sourcemaps.write( PATHS.maps + '/css' ) : $.util.noop() )
			.pipe( $.cached( 'sass' ) )
			.pipe( gulp.dest( folder + PATHS.css ) )
			.pipe( $.filter( '**/*.css' ) )
			.pipe( $.cleanCss() )
			.pipe( $.rename({suffix: '.min'}) )
			.pipe( ! CONFIG.production ? $.sourcemaps.write( PATHS.maps + '/css' ) : $.util.noop() )
			.pipe( $.cached( 'sass' ) )
			.pipe( gulp.dest( folder + PATHS.css ) )
			.pipe( $.size({title: folder + ' css'}) );
	});
	return merge( tasks );
});

gulp.task( 'js', function() {
	var tasks = FOLDERS.map( function( folder ) {
		return gulp.src( folder + PATHS.jsSource + '/**/*.js' )
			.pipe( $.plumber() )
			.pipe( $.sourcemaps.init() )
			.pipe( ! CONFIG.production ? $.sourcemaps.write( PATHS.maps + '/js' ) : $.util.noop() )
			.pipe( $.cached( 'js' ) )
			.pipe( gulp.dest( folder + PATHS.jsDest ) )
			.pipe( $.filter( [ '**/*.js', '!**/*.min.js' ] ) )
			.pipe( $.uglify() )
			.pipe( $.rename({suffix: '.min'}) )
			.pipe( ! CONFIG.production ? $.sourcemaps.write( PATHS.maps + '/js' ) : $.util.noop() )
			.pipe( $.cached( 'js' ) )
			.pipe( gulp.dest( folder + PATHS.jsDest ) )
			.pipe( $.size({title: folder + ' js'}) );
	});
	return merge( tasks );
});

gulp.task( 'browser-sync', function(done) {
	var files = WATCH.css.concat( WATCH.jsDest ).concat( WATCH.php );
    try {
        DOMAIN = JSON.parse( fs.readFileSync( './dev-domain.json' ) );
    } catch( e ) {
        return done(e);
    }
    $.browserSync.init( files, {proxy: DOMAIN});
    return done();
});

var doWatch = function(done) {
    gulp.watch( WATCH.sass, gulp.parallel( 'sass' ) );
    gulp.watch( WATCH.jsSource, gulp.parallel( 'js' ) );
}
var watch_task;
if( CONFIG.bs ) {
    watch_task = gulp.series('browser-sync', doWatch);
} else {
    watch_task = doWatch;
}

gulp.task( 'watch', watch_task );

gulp.task( 'build', gulp.parallel( 'sass', 'js' ) );

gulp.task( 'package', gulp.series( 'build', 'zip' ) );

var default_task;
if ( CONFIG.watch ) {
	default_task = gulp.series( 'build', 'watch' );
} else {
	default_task = gulp.series( 'build' );
}

gulp.task( 'default', default_task);
