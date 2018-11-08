window.wallet	= new function() {
  this.web3				= null,
  this.keythereum = require("keythereum"),
  this.contracts  = {},
  this.update		  = null,
  this.account    = {keyObject:null,balances:{}},
  this.tx         = {},
  this.logs       = {},
  this.utils      = {},
  this.erc20abi   = [{"constant": true,"inputs": [],"name": "name","outputs": [{"name": "","type": "string"}],"payable": false,"type": "function"},{"constant": true,"inputs": [],"name": "decimals","outputs": [{"name": "","type": "uint8"}],"payable": false,"type": "function"},{"constant": true,"inputs": [{"name": "_owner","type": "address"}],"name": "balanceOf","outputs": [{"name": "balance","type": "uint256"}],"payable": false,"type": "function"},{"constant": true,"inputs": [],"name": "symbol","outputs": [{"name": "","type": "string"}],"payable": false,"type": "function"}],
  this.erc721abi  = [],

  this.start	= function(option, update=null) {
    window.wallet.option  = option;
    window.wallet.update  = update;

    let Web3  = require('web3');

    if(option['type']=="http") {
      window.wallet.web3		= new Web3(new Web3.providers.HttpProvider(option['network'][option['type']]));
      if(window.wallet.update)
        setInterval(window.wallet.update,60000);
    } else if(option['type']=="wss") {
      window.wallet.web3		= new Web3(new Web3.providers.WebsocketProvider(option['network'][option['type']]));
      if(window.wallet.update)
        window.wallet.web3.eth.subscribe('newBlockHeaders',window.wallet.update);
    }

    window.wallet.option['erc20s']['0x0'] = ['eth','<i class="fab fa-ethereum"></i>'];
    let delay = 200;
    for (let erc20 in option['erc20s']) {
      window.wallet.utils.contractAdd(window.wallet.erc20abi,erc20);
      if(window.wallet.option['type']=="http") {
        setTimeout(()=>{setInterval(()=>{window.wallet.utils.getBalance(window.wallet.account.address(),erc20)},30000)},delay);
        delay += 200;
      } else if(option['type']=="wss") {
        // todo
      }
    }
    window.wallet.utils.contractCreate();
    console.log("web3 :"+window.wallet.web3.version);
  },

  // window.wallet.account.create
	this.account.create	= function(password,callback=null) {
    let params = { keyBytes: 32, ivBytes: 16 };
    window.wallet.keythereum.create(params, (dk)=>{
      let options = {
        kdf: "pbkdf2",
        cipher: "aes-128-ctr",
        kdfparams: {
          c: 262144,
          dklen: 32,
          prf: "hmac-sha256"
        }
      };
      window.wallet.keythereum.dump(password, dk.privateKey, dk.salt, dk.iv, options, (keyObject)=>{
        if(callback)
    			callback(keyObject);
      });
    });
	},

  // window.wallet.account
	// window.wallet.account.login
	this.account.login	= function(password,keyObject,callback=null) {
		if(!window.wallet.web3) {
			if(callback)
				callback("web3 error",null);
		} else {
			try {
				window.wallet.account.keyObject	= keyObject;
				window.wallet.keythereum.recover(password, keyObject);
				if(window.wallet.update)
					window.wallet.update();
				if(callback)
					callback(null,window.wallet.account.address());
			} catch (e) {
        window.wallet.account.keyObject = null;
        window.wallet.account.balances  = {};
        if(window.wallet.update)
					window.wallet.update();
				if(callback)
					callback(e,null);
			}
		}
	},
  // window.wallet.account.logout
	this.account.logout	= function(callback=null) {
		window.wallet.account.keyObject = null;
    window.wallet.account.balances  = {};
    if(window.wallet.update)
      window.wallet.update();
		if(callback)
			callback("logout");
	},
  this.account.address = function () {
		return window.wallet.account.keyObject?'0x'+window.wallet.account.keyObject.address:null;
	},

  // window.wallet.tx
  this.tx.getGasPrice = function(callback) {
    if(callback)
      window.wallet.web3.eth.getGasPrice().then(callback);
  },
  this.tx.send  = function(password,keyObject,to,gasPrice,weiAmount,data=null,error=null,hash=null,success=null) {
    window.wallet.utils.privateKey(password,keyObject,(pk)=>{
      if(pk!=''&&window.wallet.web3.utils.isAddress(to)) {
        let tx = {'from'  : '0x'+keyObject.address,
                  'to'    : to,
                  'value' : window.wallet.web3.utils.toHex(weiAmount)};
        if(data!=null)	tx['data']	= data;
        window.wallet.web3.eth.estimateGas(tx).then((gasLimit)=>{
          tx['gasPrice']	= window.wallet.web3.utils.toHex(parseInt(gasPrice));
          tx['gasLimit']	= window.wallet.web3.utils.toHex(parseInt(gasLimit));
          window.wallet.web3.eth.accounts.privateKeyToAccount('0x'+pk).signTransaction(tx).then((r)=>{
            window.wallet.web3.eth.sendSignedTransaction(r.rawTransaction)
              .on('transactionHash',(r0)=>{if(hash)hash(r0);})
              .then((r1)=>{if(success)success(r1);})
              .catch((e)=>{if(error)error(e);});
          });
        });
      } else {
        if(pk=='')
          error("Wrong password");
        else if(!window.wallet.web3.utils.isAddress(to))
          error("Wrong address");
      }
    });
	},
  this.tx.transfer	= function(password,keyObject,to,gasPrice,erc20,weiAmount,error=null,hash=null,success=null) {
    window.wallet.utils.getBalance('0x'+keyObject.address,erc20,(token,balance)=>{
      if(balance>weiAmount) {
        if(token=='0x0')
          window.wallet.tx.send(password,keyObject,to,gasPrice,weiAmount,null,error,hash,success);
        else if(window.wallet.option['erc20s'][token])
          window.wallet.tx.send(password,keyObject,to,gasPrice,0,window.wallet.contracts[token].c.methods.transfer(weiAmount).encodeABI(),error,hash,success);
      } else {
        if(error)
          error('Out of balance');
      }
    });
  },

  // window.wallet.logs
  this.logs.getLogs	= function(address,topics,callback) {
		let url	= window.wallet.option['network']['api']+'/api?module=logs&action=getLogs&fromBlock=0&toBlock=latest&address='+address;
		if(topics!='')
			url +='&'+topics;
		window.wallet.utils.loadJson(url,(err,data)=>{if(!err)callback(data.result);});
	},
  this.logs.txlist	= function(address,callback) {
		let url	= window.wallet.option['network']['api']+"/api?module=account&action=txlist&address="+address+"&startblock=0&endblock=latest&sort=desc";
		window.wallet.utils.loadJson(url,(err,data)=>{if(!err)callback(data.result);});
	},
	this.logs.txlistinternal	= function(address,callback) {
		let url	= window.wallet.option['network']['api']+"/api?module=account&action=txlistinternal&address="+address+"&startblock=0&endblock=latest&sort=desc";
		window.wallet.utils.loadJson(url,(err,data)=>{if(!err)callback(data.result);});
	},
	this.logs.tokentx	= function (address,token,callback) {
		let url	= window.wallet.option['network']['api']+'/api?module=account&action=tokentx&contractaddress='+token+'&address='+address+'&startblock=0&endblock=latest&sort=asc';
		window.wallet.utils.loadJson(url,(err,data)=>{if(!err)callback(data.result);});
	},
  this.logs.txlistAll	= function(address,token,callback) {
		if(token=="0x0")
			window.wallet.logs.txlist(address,(data0)=>{
					window.wallet.logs.txlistinternal(address,(data1)=>{
						let total = data0.concat(data1);
						total.sort(function(a, b){return parseInt(b.blockNumber)-parseInt(a.blockNumber);});
						callback(total);
					});
			});
		else
			window.wallet.logs.tokentx(address,token,callback);
	},

  // window.wallet.utils
	this.utils.loadJson = function(url,callback=null) {
		let xhr = new XMLHttpRequest();
		xhr.onreadystatechange = function() {
			if (xhr.readyState === XMLHttpRequest.DONE) {
				if (xhr.status === 200) {
					if (callback)
						callback(null,JSON.parse(xhr.responseText));
				} else {
					if (callback)
						callback(xhr,null);
				}
			}
		};
		xhr.open("GET", url, true);
		xhr.send();
	},
  this.utils.privateKey	= function(password,keyObject,callback=null) {
    window.wallet.keythereum.recover(password, keyObject, function (temp) {
      if(callback)
        callback(Array.prototype.map.call(temp, x => ('00' + x.toString(16)).slice(-2)).join(''));
    });
	},
  this.utils.contractAdd = function (abi,address) {
		if(!window.wallet.contracts[address]&&window.wallet.web3.utils.isAddress(address))
			window.wallet.contracts[address]	= {a:abi,c:!window.wallet.web3?null:new window.wallet.web3.eth.Contract(abi,address)};
	},
  this.utils.contractCreate = function () {
		if(!window.wallet.web3)
			return;
		for (let address in window.wallet.contracts)
			if(!window.wallet.contracts[address].c&&window.wallet.web3.utils.isAddress(address))
				window.wallet.contracts[address].c	= new window.wallet.web3.eth.Contract(window.wallet.contracts[address].a,address);
	},
	this.utils.geteABI = function(abi,name) {
		let found = abi.find(obj=> {return obj.name==name;});
		if(!found)
			return null;
		return found;
	},
  this.utils.getBalance	= function(address,erc20,callback=null) {
    if(!address)
			return;
		else if(erc20=='0x0')
			window.wallet.web3.eth.getBalance(address,(e,r)=>{if(!e){window.wallet.utils.updateBalance(erc20,parseInt(r));if(callback)callback(erc20,parseInt(r));}});
		else if(window.wallet.option['erc20s'][erc20])
			window.wallet.contracts[erc20].c.methods.balanceOf(address).call((e,r)=>{if(!e){window.wallet.utils.updateBalance(erc20,parseInt(r));if(callback)callback(erc20,parseInt(r));}});
	},
  this.utils.updateBalance	= function (erc20,balance) {
    if(!window.wallet.account.keyObject)
      return;
    window.wallet.account.balances[erc20] = balance;
  },
  this.utils.QRcode	= function(message,size=256) {
		return '<img src="https://api.qrserver.com/v1/create-qr-code/?data='+message+'&size='+size+'x'+size+' alt="" width="256" height="'+size+'"/>';
	},
  this.utils.linkAddress = function () {
		return window.wallet.option['network']['href']+"/address/"+window.wallet.address();
	},
	this.utils.linkTX = function (txHash) {
		return window.wallet.option['network']['href']+"/tx/"+txHash;
	}
};

module.exports    = window.wallet;
