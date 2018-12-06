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