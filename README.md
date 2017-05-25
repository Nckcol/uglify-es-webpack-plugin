**Attention!** 
This plugin is under development. It means in some cases it _may work incorrectly_! Be careful of using it.
> Official repo: [uglifyjs-webpack-plugin](https://github.com/webpack-contrib/uglifyjs-webpack-plugin)

# UglifyES Webpack Plugin
This plugin uses UglifyES3 (Harmony) for ES6 optimization.

## TODO list:

- [x] Basic minification with UglifyES 3
- [x] Providing most of options
- [ ] User-friendly warning and error output
- [ ] Extract comments option
- [ ] Port tests from official [webpack repo](https://github.com/webpack/webpack) ([related issue](https://github.com/webpack-contrib/uglifyjs-webpack-plugin/issues/1))
- [ ] Fix work with `cheap` sourcemaps (if possible)

## Usage

### Install

`yarn add https://github.com/Nckcol/uglify-es-webpack-plugin.git --dev`


### Setup `webpack.config.js`

```javascript
const UglifyESPlugin = require('uglify-es-webpack-plugin');

/* ... */

export default {
    /* ... */
    plugins: [
      /* ... */
      new UglifyEsPlugin({
        /* options */
      })
    ]
};

```

## Options

This plugin supports UglifyES features as discussed below:

 UglufyES options (see [UglifyES documentation](https://github.com/mishoo/UglifyJS2/tree/harmony#minify-options)): 

| Property | Type | Default | Description |
| --- | --- | --- | --- |
| parse | object | | Pass an object if you wish to specify some additional parse options. ([more in UglifyES docs](https://github.com/mishoo/UglifyJS2/tree/harmony#parse-options)) |
| compress | boolean, object | |  pass false to skip compressing entirely. Pass an object to specify custom compress options. ([more in UglifyES docs](https://github.com/mishoo/UglifyJS2/tree/harmony#compress-options)) |
| mangle | boolean, object | true | pass false to skip mangling names, or pass an object to specify mangle options. ([more in UglifyES docs](https://github.com/mishoo/UglifyJS2/tree/harmony#mangle-options)) |
| output | object | null | pass an object if you wish to specify additional output options. The defaults are optimized for best compression. ([more in UglifyES docs](https://github.com/mishoo/UglifyJS2/tree/harmony#compress-options)) |
| warnings | boolean | false | Pass true to return compressor warnings in result.warnings. Use the value "verbose" for more detailed warnings. |
| ie8 | boolean | false | Set to true to support IE8. |

Filter options:

| Property | Type | Default | Description |
| --- | --- | --- | --- |
| test | RegExp, Array<RegExp> | <code>/\.js($&#124;\?)/i</code> | Test to match files against. |
| include | RegExp, Array<RegExp> | | Test only `include` files. |
| exclude | RegExp, Array<RegExp> | | Files to `exclude` from testing. |
