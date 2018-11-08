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
<img width="555" alt="create" src="https://user-images.githubusercontent.com/11692220/48202221-972aac80-e3a7-11e8-971f-d10e44700907.png">

## Login
```javascript
window.wallet.login(password,keyObject,error,success);
```
<img width="553" alt="login" src="https://user-images.githubusercontent.com/11692220/48202231-a27dd800-e3a7-11e8-95d7-6cf697068970.png">

## Logout
```javascript
window.wallet.logout(password,callback);
```
<img width="555" alt="logout" src="https://user-images.githubusercontent.com/11692220/48202359-fe486100-e3a7-11e8-9c63-b3b8f31277c6.png">

## GetBalance
```javascript
window.wallet.utils.getBalance(address,erc20,callback=null);
```
<img width="552" alt="getbalance" src="https://user-images.githubusercontent.com/11692220/48202246-ae699a00-e3a7-11e8-8716-d45f9501863a.png">

## Transfer
```javascript
window.wallet.tx.transfer(password,keyObject,to,gasPrice,erc20,weiAmount,error=null,hash=null,success=null);
```
<img width="554" alt="transfer" src="https://user-images.githubusercontent.com/11692220/48202262-ba555c00-e3a7-11e8-9d6e-59828cbd31f3.png">

## Transaction List
```javascript
window.wallet.logs.txlistAll(address,token,callback);
```
<img width="553" alt="txlistall" src="https://user-images.githubusercontent.com/11692220/48202187-85490980-e3a7-11e8-8e2d-af22e6e7a05e.png">
