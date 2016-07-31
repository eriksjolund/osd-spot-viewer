var path = require("path");
var webpack = require('webpack');

module.exports = {
    entry: [  'babel-polyfill', './src/main.js' ],
    output: {
	path:  path.resolve(__dirname, "dist"),

	filename: "bundle.js",
	publicPath: "/"
    },

			    
module: {
  loaders: [
    {
      loader: "babel-loader",
      include: [
        path.resolve(__dirname, "src"),
      ],
      test: /\.js$/,
      query: {
        plugins: ['transform-runtime'],
        presets: ['es2015']
      }
    },
  ]
}
};
