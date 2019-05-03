var $, gulp, merge, fs, path, nodegit, CONFIG, FOLDERS, DOMAIN, PATHS, WATCH;

gulp = require( 'gulp' );
merge = require( 'merge-stream' );
fs = require( 'fs' );
path = require( 'path' );
semver = require( 'semver' );
nodegit = require( 'nodegit' );
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
			.pipe( $.sass({ precision: 10 }).on( 'error', $.sass.logError ) )
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

var folderInfo = [];

function set_folderinfo( resolve ) {
	if( folderInfo.length ) {
		return resolve( folderInfo );
	}

	var tasks = FOLDERS.map( function( path, i ) {
		return gulp
			.src([path + '/*.php', path + '/*.css'])
			.pipe($.filter(function(thisPath){
				var thisPath = path + '/' + thisPath.relative;
				var phpFile = fs.readFileSync( thisPath );

				const regex = /^(?:\s+\*\s+)?(.+?)\:\s+(.+)$/gm;
				let m;

				var data = {
					mainFilePath: '',
					text_domain: '',
					langPath: '',
					version: '',
				}

				while ((m = regex.exec(phpFile)) !== null) {
					// This is necessary to avoid infinite loops with zero-width matches
					if (m.index === regex.lastIndex) {
						regex.lastIndex++;
					}

					if( m[1] == 'Text Domain' && m[2] ) {
						data.text_domain = m[2];
					}

					if( m[1] == 'Domain Path' && m[2] ) {
						data.langPath = m[2].substr(1);
					}

					if( m[1] == 'Version' && m[2] ) {
						data.version = m[2];
					}
				}

				if( data.version ) {
					data.mainFilePath = thisPath;
					folderInfo[i] = data;
				}
			}))
	});
	return merge( tasks );
}

var do_translate = function() {
	var tasks = FOLDERS.map( function( folder, i ) {
		var path = folderInfo[i].langPath;
		if( path ) {
			path += '/';
		} else {
			path = 'languages/';
		}
		
		return gulp.src( folder + '/**/*.php' )
			.pipe($.wpPot( {
				domain: folderInfo[i].text_domain,
				headers: false
			} ))
			.pipe( gulp.dest( folder + '/' + path + folderInfo[i].text_domain + '.pot' ) )
			.pipe( $.size({title: folder + ' pot'}) );
	});
	return merge( tasks );
}

gulp.task( 'translate', gulp.series( set_folderinfo, do_translate ) );

var textDomainFunctions = [ //List keyword specifications
	'__:1,2d',
	'_e:1,2d',
	'_x:1,2c,3d',
	'esc_html__:1,2d',
	'esc_html_e:1,2d',
	'esc_html_x:1,2c,3d',
	'esc_attr__:1,2d',
	'esc_attr_e:1,2d',
	'esc_attr_x:1,2c,3d',
	'_ex:1,2c,3d',
	'_n:1,2,4d',
	'_nx:1,2,4c,5d',
	'_n_noop:1,2,3d',
	'_nx_noop:1,2,3c,4d'
];

var do_translate_check = function() {
	var tasks = FOLDERS.map( function( folder, i ) {
		return gulp
			.src(folder + '/**/*.php')
			.pipe($.checktextdomain({
				text_domain: folderInfo[i].text_domain, //Specify allowed domain(s)
				keywords: textDomainFunctions,
			}));
	});
	return merge( tasks );
}

async function do_bump() {
	var versionBump = false;
	var levelBump = false;
	if ( typeof $.util.env.version !== 'undefined' ) {
		switch ( $.util.env.version ) {
			case 'major':
			case 'premajor':
			case 'minor':
			case 'preminor':
			case 'patch':
			case 'prepatch':
			case 'prerelease':
				levelBump = $.util.env.version;
				break;
			default:
				versionBump = $.util.env.version;
				break;
		}
	} else {
		levelBump = 'patch';
	}
	var diff = await getDiffFiles();
	var tasks = FOLDERS.map( function( folder, i ) {
		var origVersion = folderInfo[i].version;
		var regex = new RegExp('(version:?\\s+)((?:[0-9]+\.?){1,3})', 'gi');

		var gulpSrc;

		if ( typeof $.util.env.allfiles !== 'undefined' ) {
			var filesToExplore = [ 
				folder + '/**/*.php', 
				'!**/node_modules/**' // exclude node_modules
			];
			gulpSrc = gulp.src( filesToExplore );
		} else {
			var realPath = path.resolve(folder);
			var diffFilesOnFolder = diff.map(function(filePath){
				var resolvedPath = path.resolve(filePath);
				var withinDir = resolvedPath.indexOf(realPath + path.sep) === 0;
				if( ! withinDir ) {
					return false;
				} else {
					return folder + resolvedPath.substr( realPath.length ).replace(new RegExp('\\' + path.sep, 'g'), "/");
				}
			});
			diffFilesOnFolder = diffFilesOnFolder.filter(function(cont){
				return cont ? true : false;
			});
			diffFilesOnFolder.unshift(folderInfo[i].mainFilePath)
			diffFilesOnFolder.push('!**/node_modules/**'); // exclude node_modules

			gulpSrc = gulp.src( diffFilesOnFolder, { base: folder + "/" } )
				.pipe( $.filter( [ '**/*.php' ] ) )
		}

		return gulpSrc
			.pipe($.replace(regex, function(match, g1, oldFileVersion){
				var newVersion;
				if( levelBump ) {
					newVersion = semver.inc( origVersion, levelBump );
				} else {
					newVersion = versionBump;
				}
				return g1 + newVersion;
			}))
			.pipe( gulp.dest( folder ) )
	});
	return merge( tasks );
}

gulp.task( 'bump', gulp.series( set_folderinfo, do_bump ) );

gulp.task( 'translate_check', gulp.series( set_folderinfo, do_translate_check ) );

gulp.task( 'build', gulp.parallel( 'sass', 'js' ) );

gulp.task( 'package', gulp.series( 'build', 'translate', 'zip' ) );

var default_task;
if ( CONFIG.watch ) {
	default_task = gulp.series( 'build', 'watch' );
} else {
	default_task = gulp.series( 'build' );
}

async function getDiffFiles() {
	var repository = await nodegit.Repository.open('.');
	var currCommit = await repository.getHeadCommit();
	var mastCommit = await repository.getMasterCommit();

	var currTree = await currCommit.getTree();
	var mastTree = await mastCommit.getTree();

	var diff = await currTree.diff(mastTree);
	diff = await diff.patches();

	diff = diff.map(function(diffFile) {
		if( diffFile.isDeleted() ) {
			return false;
		}
		return "./"  + diffFile.newFile().path();
	}).filter(function(cont){
		return cont ? true : false;
	});
	return diff;
}

gulp.task( 'default', default_task);
