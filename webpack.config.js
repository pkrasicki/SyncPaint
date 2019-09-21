const path = require("path");
const MiniCssExtract = require("mini-css-extract-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const OptimizeCssAssetsPlugin = require("optimize-css-assets-webpack-plugin");
const TerserPlugin = require("terser-webpack-plugin");

const META_VIEWPORT = "width=device-width, initial-scale=1.0";
const META_DESCRIPTION = "synchronized group drawing";

module.exports =
{
	mode: "development",
	entry: "./src/frontend/js/main.js",
	output:
	{
		path: path.resolve(__dirname, "dist"),
		filename: "main.js"
	},
	devServer:
	{
		contentBase: "./dist"
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
				test: /\.(css|scss)$/,
				use:
				[
					{
						loader: MiniCssExtract.loader
					},
					"css-loader",
					"sass-loader"
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
			}
		]
	},
	plugins:
	[
		new MiniCssExtract({
			name: "[name].[ext]"
		}),
		new HtmlWebpackPlugin({
			title: "SyncPaint - Synchronized Drawing",
			filename: "index.html",
			template: "./src/frontend/index.html",
			meta: {
				viewport: META_VIEWPORT,
				description: META_DESCRIPTION
			}
		}),
		new HtmlWebpackPlugin({
			title: "SyncPaint - Drawing Room",
			filename: "draw.html",
			template: "./src/frontend/draw.html",
			meta: {
				viewport: META_VIEWPORT,
				description: META_DESCRIPTION
			}
		}),
		new HtmlWebpackPlugin({
			filename: "toolbar.html",
			template: "./src/frontend/toolbar.html",
			inject: false
		})
	]
}