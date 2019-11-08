# Saucal Gulp Boilerplate

We've been using this boilerplate to successfully compile and minify JS and CSS for both themes and plugins, so long as they respect the proper structure.

To use, you need to edit the `project-folders.json` file to match the folders of plugins or themes you want to compile/watch on (relative to the `gulpfile.js` of course).

If the `project-folders.json` file does not exist, it'll default to compiling the current folder (which could be useful for standalone plugin development).

The theme or plugin assets should be structured like the gulpfile expects

```
assets
    js
    css
    source
        sass
            **.scss
        js
            **.js
```

## Install

### For only asset compilation

`npm install --production`

or

`yarn install --production`

### For release packing (modifying versions)

`npm install`

or

`yarn install`

## Usage

`gulp`

Will compile things in dev mode (with source maps)

### Options

The following options can be combined as desired.

`gulp --production`

Will disable the source map generation

`gulp --noprefix`

Disable the use of the autoprefixer for css properties

`gulp --watch`

Will keep the process running and recompile after you change any of the source files

`gulp --bs`

Will enable browser-sync support. This feature require to have the `dev-domain.json` file with a string setting the domain that will be used for refresh (usually the domain you use to access your local env)

## Tasks

### Default / Build

`gulp build` or just `gulp`

Will compile sass (scss) and js files (concatenation too)

### SASS

`gulp sass`

Compiles Sass into CSS assets, minify them (and also leave the unminified version available), and optionally generate source maps (unless --production is set)

### JS

`gulp js`

Will minify JS assets, and (if any) concatenate JS files into single files (read Advanced section)

### Zip

`gulp zip`

Will create a zip for the plugin/theme being used.

### Translate

`gulp translate_check`

Will check that the defined Text Domain on the plugin/theme matches the domain text used across the plugin.

`gulp translate`

Will generate translation files (pot) accordingly.

### Package

`gulp package`

Will run `build`, `translate` and `zip`. Useful when releasing a ZIP version of a plugin for a client to install.

### Bump (Advanced)

`gulp bump`

Will bump the version of the plugin to the next patch version. This will be applied to the plugin/theme file, and also to any class/file DocBlock which was affected on the current branch compared to master. This of course requires that the project follows GitFlow

You can use the `--version` option to target a specific bump. You can use the following settings:

- `major`
- `premajor`
- `minor`
- `preminor`
- `patch`
- `prepatch`
- `prerelease`
- `x.x.x` to set a specific version number. Eg `--version=2.3.4`

For details on which version to bump, read about [Semantic Versioning](https://semver.org/).

## Configuration

By default, `project-folders.json` is structured as follows:

```json
[
    "wp-content/plugins/project-plugin",
    "wp-content/themes/project-theme"
]
```

Which will run everything with default settings, and compile assets on all folders defined on this file.

The file also supports object notation. Object notation will be as follows for the above example:

```json
[
    {
        "folder": "wp-content/plugins/project-plugin"
    },
    {
        "folder": "wp-content/themes/project-theme"
    }
]
```

### Concatenation support

There may be some times where you want to concatenate libraries used by your code to be on a single file to avoid extra requests coming. For that you can either switch to object notation the `project-folders.json` file and set the `concat` property, or add a `concat.json` file under your `PATHS.source` folder (by default `/assets/source`).

Either the property, or file can be set as follows:

```json
[ 
    {
        "name" : "js/ph-bundle-slick.js",
        "files" : [
            "../lib/slick/slick.js"
        ]
    },
    {
        "name" : "js/ph-bundle-swiper.js",
        "files" : [
            "../lib/swiper/lib-swiper.min.js",
            "js/swiper-func.js"
        ]
    },
    {
        "passthrough": true,
        "name" : "js/libs",
        "files" : [
            "libs/js/*.js"
        ]
    },
    {
        "minifiedOnly": true,
        "name" : "js/main.js",
        "files" : [
            "libs/js/*.js",
            "!libs/js/html5.js",
            { "f": "js/main.js", "keepUnminified": true },
            { "f": "js/responsive.js", "keepUnminified": true }
        ]
    }
]
```

Paths are relative as follows:

- `name` is relative to the `PATHS.assets` folder
- `files` items are relative to the `PATHS.source` folder.

Extra options

- `passthrough` will allow to just copy files from one location to another (out of `PATHS.source` for example)
- `minifiedOnly` can be set to true to avoid generating a non minified version of the concatenated file.
- each entry under `files` can be switched to object notation, and set the `keepUnminified` to override the parent `minifiedOnly` setting. Only usecase for this is a legacy situation where we had a main.js file with a section of code and concatenating+minifying this with a bunch of other small files to be named main.min.js. This should not be the case in most cases.


## Configuration (Advanced) 

Advanced configuration allows more control over the scripts. Let's break it down.

### Overridable configuration

```js
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
    js: '**/*.js'
};

SRC = {
    sass: [],
    js: []
};
```

These are overridable globally, or by folder.

Note: `{self.*}` under `PATHS` is replaced by a self reference. In the example given, it's replaced by the assets value of the same `PATHS` object, making `PATHS.source` result in `/assets/source`. 

### Overriding globally

```json
[
    {
        "SRC": {
            "sass": [ "!**/responsive/**" ]
        }
    }
]
```

Simply add an object to the list without any `folder` property, which will indicate that these are global overrides.

### Overriding by folder

First, switch the folder setting to object, notation, and then set the desired overrides.

```json
[
    {
        "folder": "wp-content/plugins/project-plugin",
        "PATHS": {
            "assets": "/public/assets"
        }
    }
]
```
