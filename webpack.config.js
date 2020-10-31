const path = require('path');

module.exports = {
    mode: 'development',
    output: {
        path: path.join(__dirname, './'),
        filename: '[name]',
        libraryTarget: "umd",
        globalObject: 'this'
    },
    entry: {
        'model/model-magma-free_edge.js': './model-src/opx_zoning_free_edge/index.js'
    },

    module: {
        rules: [
            {
                test: /\.js$/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: [['@babel/preset-env', { modules: false }]]
                    }
                },
                exclude: /(node_modules|dist)/
            }
        ]
    },

    plugins: []
}
