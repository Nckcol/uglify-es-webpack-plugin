# Webpack2 with uglify-es as a plugin
Webpack with UglifyJs3 / Harmony for ES6 optimization
- webpack 2.5.1
- uglify-es 3.0.10

Supports source maps using `devtool = 'source-map'` - others untested.

## Options

This plugin supports UglifyJS features as discussed below:

 UglufyES options (see [uglify-es documentation](https://github.com/mishoo/UglifyJS2/tree/harmony#minify-options)): 

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


## Warning
- does not keep comments
- error handling is untested and minimal