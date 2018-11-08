# leeyeon-wallet-core
leeyeon wallet core module

# Install
```
npm install
npm install --global webpack
npm install --global webpack-cli
webpack
```

# Usage
To use wallet in Node.js, just require it:
```javascript
var wallet = require("./wallet.js");
```

A minified, browserified file dist/wallet.min.js is included for use in the browser. Including this file simply attaches the wallet object to window:
```javascript
<script src="wallet.min.js"></script>
```

## Start
```javascript
window.wallet.start(    
    {
        "name"   : "ropsten",
        "type"   : "http",
        "network": {"http"	: "https://ropsten.infura.io",
                    "wss"	: "wss://ropsten.infura.io/ws",
                    "api"	: "https://api-ropsten.etherscan.io",
                    "href"	: "https://ropsten.etherscan.io"},
        "erc20s" : {"<<ADDRESS>>":["<<NAME>>","<<ICON>>"]},
        "erc721s": {}
    }
);
```

## Create
```javascript
window.wallet.account.create(password,callback=null);
```


## Login
```javascript
window.wallet.login(password,keyObject,error,success);
```

## Logout
```javascript
window.wallet.logout(password,callback);
```

## GetBalance
```javascript
window.wallet.utils.getBalance(address,erc20,callback=null);
```

## Transfer
```javascript
window.wallet.tx.transfer(password,keyObject,to,gasPrice,erc20,weiAmount,error=null,hash=null,success=null);
```


## Transaction List
```javascript
window.wallet.logs.txlistAll(address,token,callback);
```