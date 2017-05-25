let path = require('path');
let UglifyJSPlugin = require('../src');
let ExtractTextPlugin = require('extract-text-webpack-plugin');
let HtmlWebpackPlugin = require('html-webpack-plugin');

let PATHS = {
	app: path.join(__dirname, 'app'),
	another: path.join(__dirname, 'another'),
	build: path.join(__dirname, 'build')
};

module.exports = [
	{
		entry: {
			app: PATHS.app
		},
		output: {
			path: path.join(PATHS.build, 'first'),
			filename: '[name].js'
		},
        module: {
            rules: [
                {
                    test: /\.css$/,
                    use: ExtractTextPlugin.extract({
                        fallback: "style-loader",
                        use: "css-loader"
                    })
                }
            ]
        },
        devtool: 'source-map',
		plugins: [
			new HtmlWebpackPlugin({
				title: 'First Example'
			}),
            		new ExtractTextPlugin("styles.css"),
			new UglifyJSPlugin(),
		]
	},
	{
		entry: {
			first: PATHS.app,
			second: PATHS.another
		},
		output: {
			path: path.join(PATHS.build, 'second'),
			filename: '[name].js'
		},
        module: {
            rules: [
                {
                    test: /\.css$/,
                    use: ExtractTextPlugin.extract({
                        fallback: "style-loader",
                        use: "css-loader"
                    })
                }
            ]
        },
        devtool: 'cheap-source-map',
        plugins: [
			new ExtractTextPlugin("styles.css"),
			new HtmlWebpackPlugin({
				title: 'Second Example'
			}),
			new UglifyJSPlugin(),
		]
	}
];
