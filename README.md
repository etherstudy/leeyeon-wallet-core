# leeyeon-wallet-core
leeyeon wallet core module

# Install
```
npm install --global webpack
npm install --global webpack-cli
webpack
```

# Setting
```javascript
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
https://github.com/etherstudy/leeyeon-wallet-core/blob/master/dist/wallet.json

# Usage
```javascript
<script src="https://cdn.rawgit.com/ethereum/web3.js/1.0/dist/web3.min.js"></script>
<script src="https://cdn.rawgit.com/ethereumjs/keythereum/master/dist/keythereum.min.js"></script>
<script src="walletCore.min.js"></script>
```

## Create Wallet
```javascript
window.wallet.create(password,callback);
```

## Login
```javascript
// error is error callback
// success is success callback
window.wallet.login(password,keyObject,error,success);
```

## Logout
```javascript
window.wallet.logout(password,callback);
```

## Balance
```javascript
// 0x0 is Ethereum
window.wallet.getBalance(erc20,callback);
```

## Address QR
```javascript
window.wallet.addressQR();
```

## Transfer
```javascript
// 0x0 is Ethereum
window.wallet.transfer(to,password,erc20,amount,error=null,hash=null,success=null);
```

## SendTx
```javascript
window.wallet.sendTx(to,password,amount,data=null,error=null,hash=null,success=null);
```

## Get PrivateKey
```javascript
window.wallet.getPrivateKeyString(password);
```

## Get Transaction History
```javascript
window.wallet.txHistory(erc20, callback);
```
https://etherscan.io/apis#transactions

## Get Logs
```javascript
window.wallet.logs(address,topics,callback);
```
https://etherscan.io/apis#logs
