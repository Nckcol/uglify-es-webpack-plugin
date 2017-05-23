/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Authors
 - Tobias Koppers @sokra
 - Raffael Stahl  @noBlubb
 */

const UglifyEs = require('uglify-es');
const RawSource = require("webpack-sources").RawSource;
const SourceMapSource = require("webpack-sources").SourceMapSource;
const SourceMapConsumer = require("source-map").SourceMapConsumer;
const RequestShortener = require("webpack/lib/RequestShortener");
const ModuleFilenameHelpers = require("webpack/lib/ModuleFilenameHelpers");

class UglifyEsPlugin {
    constructor(options = {}) {
        if(typeof options !== "object" || Array.isArray(options)) options = {};
        options.test = options.test || /\.js($|\?)/i;
        this.options = options;
    }

    apply(compiler) {

        const requestShortener = new RequestShortener(compiler.context);
        
        compiler.plugin('compilation', (compilation) => {
            
                this.options.withSourceMap = compilation.options.devtool !== false;
            
                compilation.plugin('optimize-chunk-assets', (chunks, callback) => {

                    for (let chunk of chunks) {
                        for (let file of chunk.files) {
                            UglifyEsPlugin.optimize(compilation, requestShortener, file, this.options);
                        }
                    }

                    callback();
                });

                for (let file of compilation.additionalChunkAssets) {
                    UglifyEsPlugin.optimize(compilation, requestShortener, file, this.options);
                }
            }
        );
    }

    static optimize(compilation, requestShortener, file, options) {

        if(!ModuleFilenameHelpers.matchObject(options, file)) return;
        
        const asset = compilation.assets[file];

        if(asset.__UglifyJsPlugin) {
            compilation.assets[file] = asset.__UglifyJsPlugin;
            return;
        }

        const [source, map] = UglifyEsPlugin.extract(asset, options);
        const result = UglifyEsPlugin.process(file, source, options);
        
        let sourceMap = new SourceMapConsumer(map);
        
        if (result.error) {
            compilation.errors.push(UglifyEsPlugin.exception(file, sourceMap, result.error, requestShortener));
        } else {
            if (options.withSourceMap) {
                compilation.assets[file] = new SourceMapSource(result.code, file, result.map, source, map);
            } else {
                compilation.assets[file] = new RawSource(result.code);
            }

            // TODO: Extract Comments

            asset.__UglifyJsPlugin = compilation.assets[file];
        }

        if(result.warnings.length > 0) {
            compilation.warnings.push(UglifyEsPlugin.warnings(file, sourceMap, result.warnings, requestShortener));
        }
    }

    /**
     * Extract source and optional source map from the asset
     *
     * @param {Object}  asset
     * @param {Object}  options
     * @returns {Array}
     */
    static extract(asset, options) {
        if (!options.withSourceMap) {
            return [asset.source(), undefined];
        }

        if (asset.sourceAndMap) {
            const sourceAndMap = asset.sourceAndMap();
            return [sourceAndMap.source, JSON.stringify(sourceAndMap.map)];
        } else {
            return [asset.source(), JSON.stringify(asset.map())];
        }
    }

    /**
     * Pass a file through UglifyEs
     *
     * @param {String}  filename      filename
     * @param {String}  source        content of the file
     * @param {Object}  options       plugin options
     * @returns {Object}
     */
    static process(filename, source, options) {
        return UglifyEs.minify({[filename]: source}, UglifyEsPlugin.mapOptions(options));
    }

    /**
     * Map plugin options to uglify-es compatible options
     * 
     * @param {Object}  options     plugin options
     * @returns {Object}            uglify-es compatible options
     */
    static mapOptions(options) {
        return {
            warnings: options.warnings || false,
            parse: options.parse || {},
            compress: options.compress || true,
            mangle: options.mangle || true,
            output: options.output || null,
            sourceMap: options.withSourceMap ? {filename, root: ''} : false,
            toplevel: options.toplevel || false,
            ie8: options.ie8 || false
        }
    }

    /**
     * Transform UglifyEs errors for webpack (maybe not even required?)
     *
     * @param file
     * @param sourceMap
     * @param uglyErrors
     * @param requestShortener
     */
    static exception(file, sourceMap, uglyErrors, requestShortener) {

        const convertedErrors = uglyErrors.map(error => {
            // TODO: Find original error place using sourceMap and requestShortener
            return JSON.stringify(error);
        });
        
        const errors = new Error(
            `UglifyEsPlugin - ${file}\n` +
            convertedErrors.join("\n")
        );

        errors.name = 'UglifyEsProcessingError';

        return errors;
    }

    /**
     * Transform UglifyEs warnings for webpack (maybe not even required?)
     *
     * @param file
     * @param sourceMap 
     * @param uglyWarnings
     * @param requestShortener
     */
    static warnings(file, sourceMap, uglyWarnings, requestShortener) {
        const convertedWarnings = uglyWarnings.map(warning => {
            // TODO: Filter warnings with user defined function 
            // TODO: Find original error place using sourceMap and requestShortener
            return JSON.stringify(warning);
        });
            
        const warnings = new Error(
            `UglifyEsPlugin - ${file}\n` +
            convertedWarnings.join("\n")
        );
        
        warnings.name = 'UglifyEsProcessingWarning';
        
        return warnings;
    }
}

module.exports = UglifyEsPlugin;