# leeyeon-wallet-core
leeyeon wallet core module

# Build
```
npm install
npm install --global webpack
npm install --global webpack-cli
webpack
```

# Install npm package from GitHub
```
npm install git+https://github.com/etherstudy/leeyeon-wallet-core.git
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
wallet.start(    
    {
        "name"   : "ropsten",
        "type"   : "http",  // or wss
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
wallet.account.create(password);
```
<img width="722" alt="create keyobject" src="https://user-images.githubusercontent.com/11692220/48324290-7b5b2b00-e673-11e8-92ae-c5aae183bf47.png">

## Login & out
```javascript
wallet.login(password,keyObject,error,success);
```
```javascript
wallet.logout(callback=null);
```
<img width="722" alt="login&out" src="https://user-images.githubusercontent.com/11692220/48324326-988ff980-e673-11e8-8fa2-78152490995e.png">

## GetBalance
```javascript
wallet.utils.getBalance(address,token,callback=null);
```
<img width="552" alt="getbalance" src="https://user-images.githubusercontent.com/11692220/48202246-ae699a00-e3a7-11e8-8716-d45f9501863a.png">

## Account
```javascript
wallet.account.decrypt(password,keyObject);
```
<img width="722" alt="keyobject2account" src="https://user-images.githubusercontent.com/11692220/48324302-8746ed00-e673-11e8-86f4-ba7bc8fc405e.png">


## Transfer (Ethereum)
```javascript
wallet.tx.transfer(password,keyObject,to,gasPrice,weiAmount,error=null,hash=null,success=null);
```
<img width="723" alt="transfer" src="https://user-images.githubusercontent.com/11692220/48324348-b0677d80-e673-11e8-8bf8-f2d135d9c200.png">

## Transaction List
```javascript
wallet.logs.txlistAll(address,token,callback);
```
<img width="722" alt="txlistall" src="https://user-images.githubusercontent.com/11692220/48324359-bcebd600-e673-11e8-9d9a-79d4a1b2aa50.png">
