# leeyeon-wallet-core
leeyeon wallet core module

# Install
```
npm install --global webpack
npm install --global webpack-cli
webpack
```

# Setting
./dist/wallet.json

```
{
    "name"   : "ropsten",
    "type"   : "http",
    "network": {"http"	: "https://ropsten.infura.io",
                "wss"	: "wss://ropsten.infura.io/ws",
                "api"	: "https://api-ropsten.etherscan.io",
                "href"	: "https://ropsten.etherscan.io"},
    "erc20s" : [["[ADDRESS]","[NAME]","[FULL_NAME]"]]
}
```

# Usage
