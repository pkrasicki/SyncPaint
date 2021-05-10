const path = require("path");
const MiniCssExtract = require("mini-css-extract-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const OptimizeCssAssetsPlugin = require("optimize-css-assets-webpack-plugin");
const TerserPlugin = require("terser-webpack-plugin");

module.exports =
{
	mode: "development",
	entry: "./public/js/main.js",
	output:
	{
		path: path.resolve(__dirname, "dist"),
		filename: "main.js"
	},
	devtool: "inline-source-map",
	optimization:
	{
		minimizer:
		[
			new TerserPlugin({}),
			new OptimizeCssAssetsPlugin({})
		]
	},
	module:
	{
		rules:
		[
			{
				test: /\.scss$/,
				include: [path.resolve(__dirname, "public/js/components")],
				use:
				[
					"css-loader",
					"resolve-url-loader",
					{
						loader: "sass-loader",
						options:
						{
							sourceMap: true
						}
					}
				]
			},
			{
				test: /\.scss$/,
				include: [path.resolve(__dirname, "public/scss")],
				use:
				[
					{
						loader: MiniCssExtract.loader
					},
					"css-loader",
					"resolve-url-loader",
					{
						loader: "sass-loader",
						options:
						{
							sourceMap: true
						}
					}
				]
			},
			{
				test: /\.css$/,
				use:
				[
					{
						loader: MiniCssExtract.loader
					},
					"css-loader"
				]
			},
			{
				test: /\.(svg|ttf|eot|woff|woff2)$/,
				use:
				{
					loader: "file-loader",
					options:
					{
						outputPath: "webfonts"
					}
				}
			},
			{
				test: /\.(png|jpg)$/,
				use:
				{
					loader: "file-loader",
					options:
					{
						outputPath: "img"
					}
				}
			},
			{
				test: /favicon\.ico$/,
				use:
				{
					loader: "file-loader",
					options:
					{
						name: "[name].[ext]"
					}
				}
			},
			{
				test: /\.worker\.js$/,
				use:
				{
					loader: "worker-loader",
					options:
					{
						filename: "[name].js"
					}
				}
			}
		]
	},
	plugins:
	[
		new MiniCssExtract({
			name: "[name].[ext]"
		}),
		new HtmlWebpackPlugin({
			filename: "index.html",
			template: "./public/index.html"
		}),
		new HtmlWebpackPlugin({
			filename: "draw.html",
			template: "./public/draw.html"
		})
	]
}