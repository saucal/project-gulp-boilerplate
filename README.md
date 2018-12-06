# Saucal Gulp Boilerplate

We've been using this boilerplate to successfully compile and minify JS and CSS for both themes and plugins, so long as they respect the proper structure.

To use, you need to edit the project-folders.json file to match the folders of plugins or themes you want to compile/watch on (relative to the gulpfile.js of course).

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

