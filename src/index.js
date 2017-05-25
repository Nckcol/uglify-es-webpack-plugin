/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Authors
 - Tobias Koppers @sokra
 - Raffael Stahl  @noBlubb  
 */

const UglifyEs = require('uglify-es');
const RawSource = require('webpack-sources').RawSource;
const SourceMapSource = require('webpack-sources').SourceMapSource;
const SourceMapConsumer = require('source-map').SourceMapConsumer;
const RequestShortener = require('webpack/lib/RequestShortener');
const ModuleFilenameHelpers = require('webpack/lib/ModuleFilenameHelpers');

class UglifyEsPlugin {
    constructor(options = {}) {
        this.options = UglifyEsPlugin.normalizeOptions(options);
    }

    apply(compiler) {
        this.options.shortener = new RequestShortener(compiler.context);
        compiler.plugin('compilation', (compilation) => {
                this.options.withSourceMap = compilation.options.devtool !== false;
                compilation.plugin('optimize-chunk-assets', (chunks, callback) => {
                    for (let chunk of chunks) {
                        for (let file of chunk.files) {
                            UglifyEsPlugin.optimize( this.options, compilation, file);
                        }
                    }
                    callback();
                });
                for (let file of compilation.additionalChunkAssets) {
                    UglifyEsPlugin.optimize(this.options, compilation, file);
                }
            }
        );
    }
    
    static normalizeOptions(options) {
        if (typeof options !== 'object' || Array.isArray(options)) options = {};
        options.test = options.test || /\.js($|\?)/i;
        options.warningsFilter = options.warningsFilter || (() => true);
        //options.comments = options.comments || /^\**!|@preserve|@license/;
        
        return options;
    }

    static optimize(options, compilation, file) {
        if (!ModuleFilenameHelpers.matchObject(options, file)) return;

        const asset = compilation.assets[file];

        if (asset.__UglifyJsPlugin) {
            compilation.assets[file] = asset.__UglifyJsPlugin;
            return;
        }

        const [source, map] = UglifyEsPlugin.extract(asset);
        const result = UglifyEsPlugin.process(options, file, source);
        const sourceMap = new SourceMapConsumer(map);
        
        if (result.error) {
            compilation.errors.push(UglifyEsPlugin.exception(options, result.error, sourceMap));
            return;
        }

        if (options.withSourceMap) {
            compilation.assets[file] = new SourceMapSource(result.code, file, JSON.parse(result.map), source, map);
        } else {
            compilation.assets[file] = new RawSource(result.code);
        }

        // TODO: Extract Comments

        compilation.assets[file].__UglifyJsPlugin = compilation.assets[file];

        if (result.warnings && result.warnings.length > 0) {
            compilation.warnings.push(UglifyEsPlugin.warnings(options, result.warnings, sourceMap));
        }
    }

    /**
     * Extract source and optional source map from the asset
     *
     * @param {Object}  asset
     * @returns {Array}
     */
    static extract(asset) {
        if (asset.sourceAndMap) {
            const sourceAndMap = asset.sourceAndMap();
            return [sourceAndMap.source, sourceAndMap.map];
        } else {
            return [asset.source(), asset.map()];
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
    static process(options, filename, source) {
        options.sourceMap = options.withSourceMap ? {filename, root: ''} : false;
        return UglifyEs.minify({[filename]: source}, UglifyEsPlugin.mapOptions(options));
    }

    /**
     * Map plugin options to uglify-es compatible options
     *
     * @param {Object}  options     plugin options
     * @returns {Object}            uglify-es compatible options
     */
    static mapOptions(options) {
        let uglifyOptions = {};
        [
            'warnings',
            'parse',
            'compress',
            'mangle',
            'output',
            'sourceMap',
            'toplevel',
            'ie8'
        ].forEach((optionName) => {
            if (options.hasOwnProperty(optionName)) {
                uglifyOptions[optionName] = options[optionName];
            }
        });

        return uglifyOptions;
    }

    /**
     * Transform UglifyES errors for webpack (maybe not even required?) 
     *
     * @param options
     * @param error
     * @param sourceMap
     */
    static exception(options, error, sourceMap) {

        const original = sourceMap.originalPositionFor({
            line: error.line,
            column: error.col
        });
        
        let webpackError = new Error(
            'UglifyEsPlugin: \n' + 
            error.message +
            ' [' + options.shortener.shorten(original.source) + ':' + original.line + ',' + original.column + ']'
        );

        webpackError.name = 'UglifyEsProcessingError';

        return webpackError;
    }

    /**
     * Transform UglifyEs warnings for webpack (maybe not even required?)
     *
     * @param options
     * @param warnings
     * @param sourceMap
     */
    static warnings(options, warnings, sourceMap) {
        let convertedWarnings = [];
        
        warnings.forEach(warning => {
            const warningMatch = /([^\[]+?)\s\[.+:([0-9]+),([0-9]+)\]/.exec(warning);
            
            const original = sourceMap.originalPositionFor({
                line: +warningMatch[2],
                column: +warningMatch[3]
            });

            if(!options.warningsFilter(original.source)) {
                return;
            }
            
            convertedWarnings.push(warningMatch[1] + 
                ' [' + options.shortener.shorten(original.source) + ':' + original.line + ',' + original.column + ']');
        });

        const webpackWarnings = new Error(
            'UglifyEsPlugin: \n' + 
            convertedWarnings.join('\n')
        );
        webpackWarnings.name = 'UglifyEsProcessingWarning';
        return webpackWarnings;
    }
}

module.exports = UglifyEsPlugin;