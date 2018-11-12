const MSGPACK   = require("msgpack-lite");
const AESJS     = require("aes-js");
const ERC20ABI  = require("./contracts/abi/erc20abi.js");
const ERC721ABI = require("./contracts/abi/erc721abi.js");

window.wallet	= new function() {
  this.web3				= null,
  this.contracts  = {},
  this.update		  = null,
  this.tokenList  = [],

  this.start	= function(option, update=null) {
    window.wallet.option  = option;
    window.wallet.update  = update;

    let Web3  = require('web3');

    if(option['type']=="http") {
      window.wallet.web3		= new Web3(new Web3.providers.HttpProvider(option['network'][option['type']]));
      setInterval(()=>{if(window.wallet.update)window.wallet.update();},60000);
    } else if(option['type']=="wss") {
      window.wallet.web3		= new Web3(new Web3.providers.WebsocketProvider(option['network'][option['type']]));
      window.wallet.web3.eth.subscribe('newBlockHeaders',(error,data)=>{
          if(window.wallet.update)
            window.wallet.update();
          window.wallet.utils.getBalance(window.wallet.account.address(),"0x0");
      });
    } else {
      return;
    }

    window.wallet.option['erc20s']['0x0'] = ['eth','<i class="fab fa-ethereum"></i>'];
    let delay = 50;
    for (let erc20 in option['erc20s']) {
      window.wallet.utils.contractAdd(ERC20ABI,erc20);
      if(window.wallet.option['type']=="http") {
        setTimeout(()=>{setInterval(()=>{window.wallet.utils.getBalance(window.wallet.account.address(),erc20)},30000)},delay);
        delay += 100;
      } else if(option['type']=="wss") {
        if(erc20!="0x0") {
          window.wallet.web3.eth.subscribe('logs',
            {address:erc20,topics:[window.wallet.utils.geteABI(wallet.contracts[erc20].a,"Transfer").signature]},
            (error,data)=>{
              window.wallet.utils.getBalance(window.wallet.account.address(),erc20);
            });
        }
      }
      window.wallet.tokenList.push(erc20);
    }
    for (let erc721 in option['erc721s']) {
      window.wallet.utils.contractAdd(ERC721ABI,erc721);
      if(window.wallet.option['type']=="http") {
        setTimeout(()=>{setInterval(()=>{window.wallet.utils.getBalance(window.wallet.account.address(),erc721)},30000)},delay);
        delay += 100;
      } else if(option['type']=="wss") {
        window.wallet.web3.eth.subscribe('logs',
          {address:erc721,topics:[window.wallet.utils.geteABI(wallet.contracts[erc721].a,"Transfer").signature]},
          (error,data)=>{
            window.wallet.utils.getBalance(window.wallet.account.address(),erc721);
          });
      }
      window.wallet.tokenList.push(erc721);
    }
    window.wallet.utils.contractCreate();
    console.log("web3 :"+window.wallet.web3.version);
  },

  // window.wallet.account
  this.account = {
    keyObject:null,
    balances:{},
    encrypt : function(password,privateKey) {
      return window.wallet.web3.eth.accounts.encrypt(privateKey, password);
    },
    decrypt : function(password,keyObject) {
      return window.wallet.web3.eth.accounts.decrypt(keyObject, password);
    },
    create : function(password) {
      let entropy = btoa(window.wallet.web3.utils.sha3(Math.random().toString(36).substring(2,15)+Math.random().toString(36).substring(2,15)).substring(2,66));
      return window.wallet.account.encrypt(password,window.wallet.web3.eth.accounts.create(entropy).privateKey);
  	},
  	login	: function(password,keyObject,callback=null) {
  		if(!window.wallet.web3) {
  			if(callback)
  				callback("web3 error",null);
  		} else {
  			try {
  				window.wallet.account.keyObject	= keyObject;
          window.wallet.account.decrypt(password,keyObject);
          window.wallet.utils.getAllBalances(window.wallet.account.address(),0);
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
  	logout	: function(callback=null) {
  		window.wallet.account.keyObject = null;
      window.wallet.account.balances  = {};
      if(window.wallet.update)
        window.wallet.update();
  		if(callback)
  			callback("logout");
  	},
    address : function () {
  		return window.wallet.account.keyObject?'0x'+window.wallet.account.keyObject.address:null;
  	}
  },

  // window.wallet.tx
  this.tx = {
    getGasPrice : function(callback) {
      if(callback)
        window.wallet.web3.eth.getGasPrice().then(callback);
    },
    send  : function(account,to,gasPrice,weiAmount,data=null,error=null,hash=null,success=null) {
      let tx = {'from'  : account.address,
                'to'    : to,
                'value' : window.wallet.web3.utils.toHex(weiAmount)};
      if(data!=null)	tx['data']	= data;
      window.wallet.web3.eth.estimateGas(tx).then((gasLimit)=>{
        tx['gasPrice']	= window.wallet.web3.utils.toHex(parseInt(gasPrice));
        tx['gasLimit']	= window.wallet.web3.utils.toHex(parseInt(gasLimit));
        account.signTransaction(tx).then((r)=>{
          window.wallet.web3.eth.sendSignedTransaction(r.rawTransaction)
            .on('transactionHash',(r0)=>{if(hash)hash(r0);})
            .then((r1)=>{if(success)success(r1);})
            .catch((e)=>{if(error)error(e);});
        });
      });
    },
    transfer : function(account,to,gasPrice,weiAmount,error=null,hash=null,success=null) {
      window.wallet.utils.getBalance(account.address,'0x0',(token,balance)=>{
        if(balance>weiAmount) {
          if(token=='0x0')
            window.wallet.tx.send(account,to,gasPrice,weiAmount,null,error,hash,success);
          else if(error)
            error('not ethereum');
        } else if(error)
          error('Out of balance');
      });
    }
  },

  this.erc20 = {
    transfer : function(account,erc20,gasPrice,weiAmount,error=null,hash=null,success=null) {
      window.wallet.utils.getBalance(account.address,erc20,(token,balance)=>{
        if(balance>weiAmount) {
          if(window.wallet.option['erc20s'][token])
            window.wallet.tx.send(account,token,gasPrice,0,window.wallet.contracts[token].c.methods.transfer(weiAmount).encodeABI(),error,hash,success);
          else if(error)
            error('not erc20');
        } else if(error)
          error('Out of balance');
      });
    },
    approve : function(account,erc20,gasPrice,weiAmount,spender,error=null,hash=null,success=null) {
      if(window.wallet.option['erc20s'][erc20])
        window.wallet.tx.send(account,erc20,gasPrice,0,window.wallet.contracts[erc20].c.methods.approve(spender,weiAmount).encodeABI(),error,hash,success);
      else if(error)
        error('not erc20');
    }
  },

  this.erc721 = {
    safeTransferFrom : function (account,erc721,gasPrice,from,to,tokenId,data=null,error=null,hash=null,success=null) {
      if(window.wallet.option['erc721s'][erc721]&&data!=null)
        window.wallet.tx.send(account,erc721,gasPrice,0,window.wallet.contracts[erc721].c.methods.safeTransferFrom(from,to,tokenId,data).encodeABI(),error,hash,success);
      else if(window.wallet.option['erc721s'][erc721])
        window.wallet.tx.send(account,erc721,gasPrice,0,window.wallet.contracts[erc721].c.methods.safeTransferFrom(from,to,tokenId).encodeABI(),error,hash,success);
      else if(error)
        error('not erc721');
    },
    transferFrom : function (account,erc721,gasPrice,from,to,tokenId,error=null,hash=null,success=null) {
      if(window.wallet.option['erc721s'][erc721])
        window.wallet.tx.send(account,erc721,gasPrice,0,window.wallet.contracts[erc721].c.methods.transferFrom(from,to,tokenId).encodeABI(),error,hash,success);
      else if(error)
        error('not erc721');
    },
    approve : function (account,erc721,gasPrice,approved,tokenId,error=null,hash=null,success=null) {
      if(window.wallet.option['erc721s'][erc721])
        window.wallet.tx.send(account,erc721,gasPrice,0,window.wallet.contracts[erc721].c.methods.approve(approved,tokenId).encodeABI(),error,hash,success);
      else if(error)
        error('not erc721');
    },
    setApprovalForAll : function (account,erc721,gasPrice,operator,approved,error=null,hash=null,success=null) {
      if(window.wallet.option['erc721s'][erc721])
        window.wallet.tx.send(account,erc721,gasPrice,0,window.wallet.contracts[erc721].c.methods.setApprovalForAll(operator,approved).encodeABI(),error,hash,success);
      else if(error)
        error('not erc721');
    }
  }

  // window.wallet.logs
  this.logs = {
    getLogs	: function(address,topics,callback) {
  		let url	= window.wallet.option['network']['api']+'/api?module=logs&action=getLogs&fromBlock=0&toBlock=latest&address='+address;
  		if(topics!='')
  			url +='&'+topics;
  		window.wallet.utils.loadJson(url,(err,data)=>{if(!err)callback(data.result);});
  	},
    txlist	: function(address,callback) {
  		let url	= window.wallet.option['network']['api']+"/api?module=account&action=txlist&address="+address+"&startblock=0&endblock=latest&sort=desc";
  		window.wallet.utils.loadJson(url,(err,data)=>{if(!err)callback(data.result);});
  	},
  	txlistinternal	: function(address,callback) {
  		let url	= window.wallet.option['network']['api']+"/api?module=account&action=txlistinternal&address="+address+"&startblock=0&endblock=latest&sort=desc";
  		window.wallet.utils.loadJson(url,(err,data)=>{if(!err)callback(data.result);});
  	},
  	tokentx	: function (address,token,callback) {
  		let url	= window.wallet.option['network']['api']+'/api?module=account&action=tokentx&contractaddress='+token+'&address='+address+'&startblock=0&endblock=latest&sort=asc';
  		window.wallet.utils.loadJson(url,(err,data)=>{if(!err)callback(data.result);});
  	},
    txlistAll	: function(address,token,callback) {
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
  	}
  },

  // window.wallet.utils
  this.utils = {
    loadJson : function(url,callback=null) {
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
    contractAdd : function (abi,address) {
  		if(!window.wallet.contracts[address]&&address!="0x0"&&window.wallet.web3.utils.isAddress(window.wallet.web3.utils.toChecksumAddress(address)))
  			window.wallet.contracts[address]	= {a:abi,c:!window.wallet.web3?null:new window.wallet.web3.eth.Contract(abi,address)};
  	},
    contractCreate : function () {
  		if(!window.wallet.web3)
  			return;
  		for (let address in window.wallet.contracts)
  			if(!window.wallet.contracts[address].c&&window.wallet.web3.utils.isAddress(window.wallet.web3.utils.toChecksumAddress(address)))
  				window.wallet.contracts[address].c	= new window.wallet.web3.eth.Contract(window.wallet.contracts[address].a,address);
  	},
  	geteABI : function(abi,name) {
  		let found = abi.find(obj=> {return obj.name==name;});
  		if(!found)
  			return null;
  		return found;
  	},
    getAllBalances : function(address,index) {
      if(!address||index>=window.wallet.tokenList.length)
  			return;
      window.wallet.utils.getBalance(address,window.wallet.tokenList[index],(x,y)=>{window.wallet.utils.getAllBalances(address,index+1);});
    },
    getBalance : function(address,token,callback=null) {
      if(!address)
  			return;
  		else if(token=='0x0')
  			window.wallet.web3.eth.getBalance(address,(e,r)=>{if(!e){window.wallet.utils.updateBalance(token,parseInt(r));if(callback)callback(token,parseInt(r));}});
  		else if(window.wallet.option['erc20s'][token])
  			window.wallet.contracts[token].c.methods.balanceOf(address).call((e,r)=>{if(!e){window.wallet.utils.updateBalance(token,parseInt(r));if(callback)callback(token,parseInt(r));}});
      else if(window.wallet.option['erc721s'][token])
        window.wallet.contracts[token].c.methods.balanceOf(address).call((e,r)=>{if(!e){window.wallet.utils.updateBalance(token,parseInt(r));if(callback)callback(token,parseInt(r));}});
  	},
    updateBalance	: function (token,balance) {
      if(!window.wallet.account.keyObject)
        return;
      window.wallet.account.balances[token] = balance;
    },
    QRcode : function(message,size=256) {
  		return '<img src="https://api.qrserver.com/v1/create-qr-code/?data='+message+'&size='+size+'x'+size+' alt="" width="256" height="'+size+'"/>';
  	},
    linkAddress : function () {
  		return window.wallet.option['network']['href']+"/address/"+window.wallet.address();
  	},
  	linkTX : function (txHash) {
  		return window.wallet.option['network']['href']+"/tx/"+txHash;
  	}
  },

  this.secure = {
    msgpack  : {
      encode : function(json) {return window.wallet.web3.utils.bytesToHex(MSGPACK.encode(json));},
      decode : function(hex)  {
        try {
          return MSGPACK.decode(window.wallet.web3.utils.hexToBytes(hex));
        } catch (e) {
          console.log(e);
        }
        return null;
      }
    },
    crypto   : {
      aesCtr : function(password,salt='') {
        let key = window.wallet.web3.utils.hexToBytes(window.wallet.web3.utils.sha3(password+salt));
        return new AESJS.ModeOfOperation.ctr(key,new AESJS.Counter(5));
      },
      aesCbc : function(password,salt='') {
        let key = window.wallet.web3.utils.hexToBytes(window.wallet.web3.utils.sha3(password+salt));
        let iv  = window.wallet.web3.utils.hexToBytes("0x"+(window.wallet.web3.utils.sha3(salt+password)).slice(10,42));
        return new AESJS.ModeOfOperation.cbc(key, iv);
      },
      encrypt : function(bytes,password,salt='') {
        return window.wallet.secure.crypto.aesCbc(password,salt).encrypt(bytes);
      },
      decrypt : function(bytes,password,salt='')  {
        try {
          return window.wallet.secure.crypto.aesCbc(password,salt).decrypt(bytes);
        } catch (e) {
          console.log(e);
        }
        return null;
      }
    },
    encrypt : function(json,password,salt='',error=null) {
      let base64hex       = window.wallet.web3.utils.utf8ToHex(btoa(window.wallet.web3.utils.bytesToHex(MSGPACK.encode(json))));
      return window.wallet.web3.utils.bytesToHex(window.wallet.secure.crypto.encrypt(window.wallet.web3.utils.hexToBytes(base64hex),password,salt));
    },
    decrypt : function(hex,password,salt='',error=null) {
      try {
        let base64decrypt = atob(window.wallet.web3.utils.hexToUtf8(window.wallet.web3.utils.bytesToHex(window.wallet.secure.crypto.decrypt(window.wallet.web3.utils.hexToBytes(hex),password,salt))));
        return MSGPACK.decode(window.wallet.web3.utils.hexToBytes(base64decrypt));
      } catch (e) {
        console.log(e);
      }
      return null;
    }
  }

  this.storage = {
    getItem : function (key, password, salt='') {
      return window.wallet.secure.decrypt(localStorage.getItem(key),password,salt);
    },
    setItem : function(key, value, password, salt='') {
      localStorage.setItem(key,window.wallet.secure.encrypt(value,password,salt));
    },
    removeItem : function(key) {
      localStorage.removeItem(key);
    },
    clear : function() {
      localStorage.clear();
    }
  }
};

module.exports    = window.wallet;
