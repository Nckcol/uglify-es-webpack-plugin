/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Authors
 - Tobias Koppers @sokra
 - Raffael Stahl  @noBlubb
 - Nikita Popov   @nckcol
 */

import UglifyEs from 'uglify-es';
import { RawSource, SourceMapSource, ConcatSource } from 'webpack-sources';
import { SourceMapConsumer } from 'source-map';
import RequestShortener from 'webpack/lib/RequestShortener';
import ModuleFilenameHelpers from 'webpack/lib/ModuleFilenameHelpers';

class UglifyEsPlugin {
  constructor(options = {}) {
    this.options = UglifyEsPlugin.normalizeOptions(options);

    this.filterOptions = UglifyEsPlugin.getFilterOptions(options);
    this.uglifyEsOptions = UglifyEsPlugin.getUglifyEsOptions(options);
  }

  apply(compiler) {
    this.shortener = new RequestShortener(compiler.context);
    compiler.plugin('compilation', (compilation) => {
      compilation.plugin('optimize-chunk-assets', (chunks, callback) => {
        chunks.forEach((chunk) => {
          chunk.files.forEach((file) => {
            this.optimize(compilation, file);
          });
        });
        callback();
      });
      if (compilation.additionalChunkAssets) {
        compilation.additionalChunkAssets.forEach((file) => {
          this.optimize(compilation, file);
        });
      }
    },
        );
  }

  optimize(compilation, file) {
    if (!ModuleFilenameHelpers.matchObject(this.filterOptions, file)) return;

    const withSourceMap = compilation.options.devtool || false;
    const asset = compilation.assets[file];

    if (asset.__UglifyJsPlugin) {
      compilation.assets[file] = asset.__UglifyJsPlugin;
      return;
    }

    const extractedComments = [];
    let extractCommentFunction = this.options.output.comments;

    if (this.options.extractComments) {
      extractCommentFunction = (astNode, comment) => {
        if (this.options.extractComments.condition(astNode, comment)) {
          extractedComments.push(
                        comment.type === 'comment2' ? `/*${comment.value}*/` : `//${comment.value}`,
                    );
        }
        return this.options.output.comments(astNode, comment);
      };
    }

    const [source, map] = UglifyEsPlugin.extract(asset);
    const uglifyEsOptions = this.uglifyEsOptions(file, withSourceMap, extractCommentFunction);
    const result = UglifyEsPlugin.process(uglifyEsOptions, file, source);
    const sourceMapConsumer = new SourceMapConsumer(map);

    if (result.error) {
      compilation.errors.push(UglifyEsPlugin.error(result.error, sourceMapConsumer, this.shortener));
      return;
    }

    if (withSourceMap) {
      compilation.assets[file] = new SourceMapSource(result.code, file, JSON.parse(result.map), source, map);
    } else {
      compilation.assets[file] = new RawSource(result.code);
    }

    if (extractedComments.length > 0) {
      const [commentsFile, commentsSource] = UglifyEsPlugin.writeCommentsFile(this.options, file, extractedComments);

      if (commentsFile in compilation.assets) {
                // commentsFile already exists, append new comments...
        if (compilation.assets[commentsFile] instanceof ConcatSource) {
          compilation.assets[commentsFile].add('\n');
          compilation.assets[commentsFile].add(commentsSource);
        } else {
          compilation.assets[commentsFile] = new ConcatSource(
                        compilation.assets[commentsFile], '\n', commentsSource,
                    );
        }
      } else {
        compilation.assets[commentsFile] = commentsSource;
      }

            // Add a banner to the original file
      const banner = this.options.extractComments.banner(commentsFile);
      if (banner) {
        compilation.assets[file] = new ConcatSource(
                    `/*! ${banner} */\n`,
                    compilation.assets[file],
                );
      }
    }

    compilation.assets[file].__UglifyJsPlugin = compilation.assets[file];

    if (result.warnings && result.warnings.length > 0) {
      compilation.warnings.push(UglifyEsPlugin.warnings(result.warnings, sourceMapConsumer, this.shortener, this.options.warningsFilter));
    }
  }

  static normalizeOptions(options) {
    if (typeof options !== 'object' || Array.isArray(options)) options = {};
    options.test = options.test || /\.js($|\?)/i;
    options.warningsFilter = options.warningsFilter || (() => true);
    options.output = options.output || {};

    if (options.output.comments) {
      if (options.output.comments === 'all') {
        options.output.comments = () => (true);
      } else if (options.output.comments === 'some') {
        options.output.comments = (astNode, comment) => (/^\**!|@preserve|@license|@cc_on/.test(comment.value));
      } else if (options.output.comments instanceof RegExp) {
        options.output.comments = (astNode, comment) => (options.output.comments.test(comment.value));
      } else if (typeof options.output.comments !== 'function') {
                // throw new Error('options.output.comments can be "all", "some", RegExp or function(sstNode, comment) {} ')
      }
    } else {
      options.output.comments = () => (false);
    }

    if (options.extractComments) {
      if (typeof options.extractComments !== 'object') {
        options.extractComments = {
          condition: options.extractComments,
        };
      }

      if (options.extractComments.condition === 'all') {
        options.extractComments.condition = () => (true);
      } else if (options.extractComments.condition === 'some') {
        options.extractComments.condition = (astNode, comment) => (/^\**!|@preserve|@license|@cc_on/.test(comment.value));
      } else if (options.extractComments.condition instanceof RegExp) {
        options.extractComments.condition = (astNode, comment) => options.extractComments.condition.test(comment.value);
      } else if (typeof options.extractComments.condition !== 'function') {
        options.extractComments.condition = () => (true);
      }

      if (typeof options.extractComments.file === 'string') {
        options.extractComments.file = file => (file === options.extractComments.file);
      } else if (typeof options.extractComments.file !== 'function') {
        options.extractComments.file = file => (`${file}.LICENSE`);
      }

      if (options.extractComments.banner) {
        if (typeof options.extractComments.banner === 'string') {
          options.extractComments.banner = () => (options.extractComments.banner);
        } else if (typeof options.extractComments.banner !== 'function') {
          options.extractComments.banner = commentsFile => (`For license information please see ${commentsFile}`);
        }
      } else {
        options.extractComments.banner = () => (false);
      }
    } else {
      options.extractComments = false;
    }

    return options;
  }

    /**
     * Extract source and optional source map from the asset
     *
     * @param {Object}  asset webpack asset
     * @returns {Array} [source, map]
     */
  static extract(asset) {
    if (asset.sourceAndMap) {
      const sourceAndMap = asset.sourceAndMap();
      return [sourceAndMap.source, sourceAndMap.map];
    }
    return [asset.source(), asset.map()];
  }

    /**
     * Pass a file through UglifyEs
     *
     * @param {Object}  options       plugin options
     * @param {String}  filename      filename
     * @param {String}  source        content of the file
     * @returns {Object}              Result of UflifyES work
     */
  static process(options, filename, source) {
    return UglifyEs.minify({ [filename]: source }, options);
  }

    /**
     * Write extracted comments in file
     *
     * @param {Object}   options  plugin options
     * @param {String}   file name of file from where comments was extracted
     * @param {String}   comments comments content
     * @returns {Array}  [filename, source]
     */
  static writeCommentsFile(options, file, comments) {
    const commentsFile = options.extractComments.file(file);

        // Write extracted comments to commentsFile
    const commentsSource = new RawSource(`${comments.join('\n\n')}\n`);

    return [
      commentsFile,
      commentsSource,
    ];
  }

    /**
     * Map plugin options to UglifyEs compatible options
     *
     * @param {Object}  options     plugin options
     * @returns {Object}            UglifyEs compatible options
     */
  static getUglifyEsOptions(options) {
    const resultOptions = {};
    [
      'warnings',
      'parse',
      'compress',
      'mangle',
      'output',
      'sourceMap',
      'toplevel',
      'ie8',
    ].forEach((optionName) => {
      if (options[optionName]) {
        resultOptions[optionName] = options[optionName];
      }
    });

    return function generateOptions(filename, withSourceMap, commentFunction) {
      return Object.assign({}, resultOptions, {
        sourceMap: withSourceMap ? { filename, root: '' } : false,
        output: Object.assign({}, resultOptions.output, {
          comments: commentFunction,
        }),
      });
    };
  }

    /**
     * Map plugin options to matchObject compatible options
     *
     * @param {Object}  options     plugin options
     * @returns {Object}            uglify-es compatible options
     */
  static getFilterOptions(options) {
    const filterOptions = {};
    [
      'test',
      'include',
      'exclude',
    ].forEach((optionName) => {
      if (options[optionName]) {
        filterOptions[optionName] = options[optionName];
      }
    });

    return filterOptions;
  }

    /**
     * Transform UglifyEs errors for webpack (maybe not even required?)
     *
     * @param {Object} error      Error object
     * @param {Object} sourceMap  Source map
     * @param {Object} shortener  Name shortener
     * @returns {Error}           Error object
     */
  static error(error, sourceMap, shortener) {
    const original = sourceMap.originalPositionFor({
      line: error.line,
      column: error.col,
    });

    let place = '';

    if (original.source) {
      place = `[${shortener.shorten(original.source)
                }:${original.line
                },${original.column}]`;
    }

    const webpackError = new Error(
            `UglifyEsPlugin: \n ${error.message
            } ${place}`,
        );
    webpackError.name = 'UglifyEsProcessingError';

    return webpackError;
  }

    /**
     * Transform UglifyEs warnings for webpack (maybe not even required?)
     *
     * @param {Object}   warnings  Warning object
     * @param {Object}   sourceMap Source map
     * @param {Object}   shortener Name shortener
     * @param {function} warningsFilter filter
     * @return {Error}   Error object
     */
  static warnings(warnings, sourceMap, shortener, warningsFilter) {
    const convertedWarnings = [];

    warnings.forEach((warning) => {
      const warningMatch = /(.+?)\s\[.+:([0-9]+),([0-9]+)/.exec(warning);

      const original = sourceMap.originalPositionFor({
        line: +warningMatch[2],
        column: +warningMatch[3],
      });

      if (!original.source) {
        convertedWarnings.push(warningMatch[1]);
        return;
      }

      if (!warningsFilter(original.source)) {
        return;
      }

      convertedWarnings.push(`${warningMatch[1]
                } [${shortener.shorten(original.source)
                }:${original.line
                },${original.column}]`);
    });

    const webpackWarnings = new Error(
            `UglifyEsPlugin: \n${
            convertedWarnings.join('\n')}`,
        );
    webpackWarnings.name = 'UglifyEsProcessingWarning';

    return webpackWarnings;
  }
}

UglifyEsPlugin.defaultOptions = {};

export default UglifyEsPlugin;
