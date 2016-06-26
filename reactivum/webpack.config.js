module.exports = {
	module: {
		loaders: [{
			test: /\.js(x)?$/,
			exclude: /(node_modules|bower_components)/,
			loader: 'babel-loader?cacheDirectory',
			
		}],
	},
	resolveLoader: {
		root: [
			'/usr/local/lib/node_modules/'
		]
	}
};
