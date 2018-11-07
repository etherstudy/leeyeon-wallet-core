const path            = require('path');

module.exports = {
    entry: {
        walletCore  : './src/wallet.js'
    },
    output: {
        filename    : '[name].min.js'
    } 
}