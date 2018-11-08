module.exports = {
    entry: {
        wallet    : './src/wallet.js'
    },
    output: {
        filename  : '[name].min.js'
    },
    node: {
       fs         : "empty"
    }
}
