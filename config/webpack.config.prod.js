/**
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

var path = require('path');
var autoprefixer = require('autoprefixer');
var webpack = require('webpack');
var HtmlWebpackPlugin = require('html-webpack-plugin');
var ExtractTextPlugin = require('extract-text-webpack-plugin');
var WebpackMd5Hash = require('webpack-md5-hash');
var url = require('url');
var paths = require('./paths');

var homepagePath = require(paths.appPackageJson).homepage;
var publicPath = homepagePath ? url.parse(homepagePath).pathname : '/';
if (!publicPath.endsWith('/')) {
  // Prevents incorrect paths in file-loader
  publicPath += '/';
}

module.exports = {
  bail: true,
  devtool: 'source-map',
  entry: {
    // Split app into the main and vendor bundles.
    // Vendor will contain React by default but we might want to
    // dynamically choose to add something else from node_modules.
    main: path.join(paths.appSrc, 'index'),
    vendor: ['react', 'react-dom'],
  },
  output: {
    path: paths.appBuild,
    filename: '[name].[chunkhash:8].js',
    chunkFilename: '[name].[chunkhash:8].chunk.js',
    publicPath: publicPath
  },
  resolve: {
    extensions: ['', '.js'],
  },
  resolveLoader: {
    root: paths.ownNodeModules,
    moduleTemplates: ['*-loader']
  },
  module: {
    preLoaders: [
      {
        test: /\.js$/,
        loader: 'eslint',
        include: paths.appSrc
      }
    ],
    loaders: [
      {
        test: /\.js$/,
        include: paths.appSrc,
        loader: 'babel',
        query: require('./babel.prod')
      },
      {
        test: /\.css$/,
        include: [paths.appSrc, paths.appNodeModules],
        // Disable autoprefixer in css-loader itself:
        // https://github.com/webpack/css-loader/issues/281
        // We already have it thanks to postcss.
        loader: ExtractTextPlugin.extract('style', 'css?-autoprefixer!postcss')
      },
      {
        test: /\.json$/,
        include: [paths.appSrc, paths.appNodeModules],
        loader: 'json'
      },
      {
        test: /\.(jpg|png|gif|eot|svg|ttf|woff|woff2)$/,
        include: [paths.appSrc, paths.appNodeModules],
        loader: 'file',
        query: {
          name: '[name].[hash:8].[ext]'
        }
      },
      {
        test: /\.(mp4|webm)$/,
        include: [paths.appSrc, paths.appNodeModules],
        loader: 'url?limit=10000'
      }
    ]
  },
  eslint: {
    // TODO: consider separate config for production,
    // e.g. to enable no-console and no-debugger only in prod.
    configFile: path.join(__dirname, 'eslint.js'),
    useEslintrc: false
  },
  postcss: function() {
    return [autoprefixer];
  },
  plugins: [
    // Create two common chunks:
    // - "vendor" chunk is declared in "entry" above.
    // - "manifest" is a built-in Webpack chunk with its runtime.
    // This would enable us to enable long-term caching.
    // The tricky part is that "manifest" will contain the filenames
    // of the other chunks. This is why we want to embed it into HTML.
    // Otherwise, changes in any chunk will cause manifest to change,
    // and thus if manifest isn't separated, its parent will also change.
    // Relevant discussion: https://github.com/webpack/webpack/issues/1315
    new webpack.optimize.CommonsChunkPlugin({
      names: ['vendor', 'manifest']
    }),
    // Fixes deterministic hashes so that changes to CSS don't invalidate JS.
    new WebpackMd5Hash(),
    // Avoids extra request for the manifest that contains webpack runtime
    // by embedding it right into HTML as an inline <script>.
    function embedManifestIntoHTML() {
      this.plugin('compilation', (compilation) => {
        compilation.plugin('html-webpack-plugin-before-html-processing', (data, cb) => {
          var manifestSource;
          // Find the manifest chunk generated by webpack,
          // grab its source, and embed it into generated HTML.
          Object.keys(compilation.assets).forEach(key => {
            if (key.indexOf('manifest.') !== 0) {
              return;
            }
            var children = compilation.assets[key].children;
            if (!children || !children[0]) {
              return;
            }
            delete compilation.assets[key];
            manifestSource = children[0]._value;
          });
          data.html = data.html.replace(
            '</body>',
            '<script>' + manifestSource + '</script></body>'
          );
          cb()
        })
      })
    },
    new HtmlWebpackPlugin({
      inject: true,
      template: paths.appHtml,
      favicon: paths.appFavicon,
      chunksSortMode: 'dependency', // Ensure vendor chunk comes first.
      excludeChunks: ['manifest'], // We embedded it earlier.
      minify: {
        removeComments: true,
        collapseWhitespace: true,
        removeRedundantAttributes: true,
        useShortDoctype: true,
        removeEmptyAttributes: true,
        removeStyleLinkTypeAttributes: true,
        keepClosingSlash: true,
        minifyJS: true,
        minifyCSS: true,
        minifyURLs: true
      }
    }),
    new webpack.DefinePlugin({ 'process.env.NODE_ENV': '"production"' }),
    new webpack.optimize.OccurrenceOrderPlugin(),
    new webpack.optimize.DedupePlugin(),
    new webpack.optimize.UglifyJsPlugin({
      compressor: {
        screw_ie8: true,
        warnings: false
      },
      mangle: {
        screw_ie8: true
      },
      output: {
        comments: false,
        screw_ie8: true
      }
    }),
    new ExtractTextPlugin('[name].[contenthash:8].css')
  ]
};
