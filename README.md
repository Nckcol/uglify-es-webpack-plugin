**Attention!** 
This plugin is under development. It means in some cases it _may work incorrectly_! Be careful of using it.
> Official repo: [uglifyjs-webpack-plugin](https://github.com/webpack-contrib/uglifyjs-webpack-plugin)

# UglifyES Webpack Plugin
This plugin uses UglifyES3 (Harmony) for ES6 optimization.

## TODO list:

- [x] Basic minification with UglifyES 3
- [x] Providing most of options
- [x] User-friendly warning and error output
- [x] Extract comments option
- [ ] Port tests from official [webpack repo](https://github.com/webpack/webpack) ([related issue](https://github.com/webpack-contrib/uglifyjs-webpack-plugin/issues/1))
- [ ] Fix work with `cheap` sourcemaps (if possible)

## Usage

### Install

With yarn:
`yarn add https://github.com/Nckcol/uglify-es-webpack-plugin.git --dev`

With npm:
`npm install https://github.com/Nckcol/uglify-es-webpack-plugin.git --save-dev`

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

UglufyES options (for more information see [UglifyES documentation](https://github.com/mishoo/UglifyJS2/tree/harmony#minify-options)): 

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

Other options:

| Property | Type | Default | Description |
| --- | --- | --- | --- |
| warningsFilter | function(source) -> boolean |  | Allow to filter uglify warnings |
| extractComments | boolean, RegExp, function (astNode, comment) -> boolean, object | false | Whether comments shall be extracted to a separate file. |

## Extracting Comments

The extractComments option can be:

- `true` or `'all'`: All comments will be moved to a separate file. If the original file is named `foo.js`, then the comments will be stored to `foo.js.LICENSE`.
- `'some'`: Comments started with `@preserve`, `@license` or `@cc_on` will be extracted to the separate file.
- `RegExp`: All comments that match the given expression will be extracted to the separate file
- `function (astNode, comment) -> boolean`: All comments that evaluated to true by the function will be extracted to the separate file.
- an `object` consisting of the following keys, all optional:
  - `condition`: `'all'`, `'some'`, `RegExp` or `function (astNode, comment) -> boolean` (see above)
  - `filename`: The file where the extracted comments will be stored. Can be either a string or function `(string) -> string` which will be given the original filename. Default is to append the suffix `.LICENSE` to the original filename.
  - `banner`: The banner text that points to the extracted file and will be added on top of the original file. will be added to the original file. Can be `false` (no banner), a `string`, or a `function (string) -> string` that will be called with the filename where extracted comments have been stored. Will be wrapped into comment. Default: `/*! For license information please see foo.js.LICENSE */`
