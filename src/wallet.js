window.wallet	= new function() {
	this.web3				= null,
	this.callback		= null,
	this.keyObject	= null,
	this.contract		= {},
  this.balances   = {},
  this.erc20abi   = [{"constant": true,"inputs": [],"name": "name","outputs": [{"name": "","type": "string"}],"payable": false,"type": "function"},{"constant": true,"inputs": [],"name": "decimals","outputs": [{"name": "","type": "uint8"}],"payable": false,"type": "function"},{"constant": true,"inputs": [{"name": "_owner","type": "address"}],"name": "balanceOf","outputs": [{"name": "balance","type": "uint256"}],"payable": false,"type": "function"},{"constant": true,"inputs": [],"name": "symbol","outputs": [{"name": "","type": "string"}],"payable": false,"type": "function"}],
  this.start	= function() {
		window.wallet.loadJson('wallet.json',(err,data)=>{
			if(err) {
				console.log(err);
			} else {
				window.wallet.option   = data;

		    if(window.wallet.option['type']=="http") {
					window.wallet.web3		= new Web3(new Web3.providers.HttpProvider(window.wallet.option['network'][window.wallet.option['type']]));
					setInterval(()=>{window.wallet.update();if(window.wallet.callback)window.wallet.callback();},60000);
				} else {
					window.wallet.web3		= new Web3(new Web3.providers.WebsocketProvider(window.wallet.option['network'][window.wallet.option['type']]));
					window.wallet.web3.eth.subscribe('newBlockHeaders',()=>{window.wallet.update();if(window.wallet.callback)window.wallet.callback();});
				}

		    window.wallet.balances['0x0']  = {'contract':null,'balance':-1,'name':'ETH','icon':'<i class="fab fa-ethereum"></i>'};
				window.wallet.addERC20s(data['erc20s'],0);

				window.wallet.createContracts();
				window.wallet.update();

				console.log("web3 :"+window.wallet.web3.version);
			}
		});
		return wallet;
  },
	this.addERC20s	= function(erc20s,index) {
		if(index<erc20s.length) {
			let erc20 = erc20s[index];
			if(!window.wallet.balances[erc20[0]]) {
				window.wallet.balances[erc20[0]] = {'contract':new window.wallet.web3.eth.Contract(window.wallet.erc20abi,erc20[0]),'balance':-1,'name':erc20[1],'icon':erc20[2]};
				if(erc20[1]=='') {
					window.wallet.balances[erc20[0]]['contract'].methods.name().call((e,r)=>{if(!e){window.wallet.balances[erc20[0]].name=r;} window.wallet.addERC20s(erc20s,index+1);});
				} else {
					window.wallet.addERC20s(erc20s,index+1);
				}
			}
		}
	},
	this.pushContract = function (abi,address) {
		if(!window.wallet.contract[address])
			window.wallet.contract[address]	= {a:abi,c:!window.wallet.web3?null:new window.wallet.web3.eth.Contract(abi,address)};
	},
	this.createContracts = function () {
		if(!window.wallet.web3)
			return;
		for (var address in window.wallet.contract)
			if(!window.wallet.contract[address].c)
				window.wallet.contract[address].c	= new window.wallet.web3.eth.Contract(window.wallet.contract[address].a,address);
	},
  this.update			= function() {
    if(window.wallet.address()) {
			for (let erc20 in window.wallet.balances)
				window.wallet.getBalance(erc20,window.wallet.callback);
    }
  },
	this.getBalance	= function(erc20,callback) {
		if(!window.wallet.address())
			return;
		if(erc20=='0x0')
			window.wallet.web3.eth.getBalance(window.wallet.address(),(e,r)=>{if(!e){window.wallet.balances[erc20]['balance']=parseInt(r);if(callback)callback();}});
		else if(window.wallet.balances[erc20])
			window.wallet.balances[erc20]['contract'].methods.balanceOf(window.wallet.address()).call((e,r)=>{if(!e){window.wallet.balances[erc20]['balance']=parseInt(r);if(callback)callback();}});
	}

	// create
	this.create	= function(password,callback) {
		let dk				= keythereum.create();
		let temp			= keythereum.dump(password, dk.privateKey, dk.salt, dk.iv);
		if(callback)
			callback(temp);
	},

	// login
	this.login	= function(password,keyObject,error,success) {
		if(!window.wallet.web3) {
			if(error)
				error("web3 error");
			return;
		} else {
			try {
				window.wallet.keyObject	= keyObject;
				keythereum.recover(password, keyObject);
				window.wallet.update();
				if(window.wallet.callback)
					window.wallet.callback();
				if(success)
					success(window.wallet.address());
			} catch (e) {
				window.wallet.keyObject	= null;
				if(error)
					error(e);
			}
		}
	},
	this.address = function () {
		return window.wallet.keyObject?'0x'+window.wallet.keyObject.address:null;
	},
	this.addressQR	= function() {
		return '<img src="https://api.qrserver.com/v1/create-qr-code/?data='+window.wallet.address()+'&size=256x256 alt="" width="256" height="256"/>';
	},
	this.addressLNK = function () {
		return window.wallet.option['network']['href']+"/address/"+window.wallet.address();
	},
	this.txLNK = function (txHash) {
		return window.wallet.option['network']['href']+"/tx/"+txHash;
	},
	this.isAddress = function (who) {
		return window.wallet.web3?window.wallet.web3.utils.isAddress(who):false;
	},

	// logout
	this.logout	= function(password,callback) {
		window.wallet.keyObject			= null;
		if(callback)
			callback("logout");
	},

	// transfer
	this.transfer	= function(to,password,erc20,amount,error=null,hash=null,success=null) {
		if(window.wallet.address())
			window.wallet.getBalance(erc20,()=>{
				amount = window.wallet.web3.utils.toWei(amount,'ether');
				if(window.wallet.balances[erc20]['balance']>amount) {
					if(erc20=='0x0')
						window.wallet.sendTx(to,password,amount,null,error,hash,success);
					else
						window.wallet.sendTx(to,password,0,window.wallet.web3.utils.toWei(0,'ether'),window.wallet.balances[erc20]['contract'].methods.transfer(amount).encodeABI(),error,hash,success);
				} else {
					if(error)
						error('Out of balance');
				}
			});
	},

	// sendTx
	this.sendTx	= function(to,password,amount,data=null,error=null,hash=null,success=null) {
		if(window.wallet.address()) {
			let privateKey	= window.wallet.getPrivateKeyString(password);

			if(privateKey!=null&&window.wallet.isAddress(to)) {
				window.wallet.web3.eth.getGasPrice((e,gasPrice)=>{
					if(e!=null) {
						if(error)
							error("Fail get gas price");
					} else {
						let tx = {'from':window.wallet.address(),'to':to,'value':window.wallet.web3.utils.toHex(amount)};
						if(data!=null)	tx['data']	= data;
						window.wallet.web3.eth.estimateGas(tx).then((gasLimit)=>{
							tx['gasPrice']	= window.wallet.web3.utils.toHex(parseInt(gasPrice));
							tx['gasLimit']	= window.wallet.web3.utils.toHex(parseInt(gasLimit));
							window.wallet.web3.eth.accounts.privateKeyToAccount('0x'+privateKey).signTransaction(tx).then((r)=>{
								window.wallet.web3.eth.sendSignedTransaction(r.rawTransaction)
									.on('transactionHash',(r0)=>{
										if(hash)
											hash(r0);
									}).then((r1)=>{
										if(success)
											success(r1);
										window.wallet.update();
									}).catch((e)=>{if(error)error(e);});
							});
						});
					}
				});
			} else {
				if(error&&window.wallet.isAddress(to))
					error("Wrong password");
			}
		}
	},
	this.getPrivateKeyString	= function(password) {
		let privateKey	= null;
		try {
			let temp		= keythereum.recover(password, window.wallet.keyObject);
			privateKey	= Array.prototype.map.call(temp, x => ('00' + x.toString(16)).slice(-2)).join('');
		} catch (e) {
			privateKey	= null;
		}
		return privateKey;
	},

	// txHistory
	this.txHistory	= function(erc20, callback) {
		if(window.wallet.address()) {
			if(erc20=="0x0")
				window.wallet.txNormal(window.wallet.address(),(data0)=>{
						window.wallet.txInternal(window.wallet.address(),(data1)=>{
							let total = data0.concat(data1);
							total.sort(function(a, b){return parseInt(b.blockNumber)-parseInt(a.blockNumber);});
							callback(total);
						});
				});
			else
				window.wallet.txERC20(erc20,window.wallet.address(),callback);
		}
	},
	// transaction history
	this.txNormal	= function(address,callback) {
		let url	= window.wallet.option['network']['api']+"/api?module=account&action=txlist&address="+address+"&startblock=0&endblock=latest&sort=desc";
		window.wallet.loadJson(url,(err,data)=>{if(!err)callback(data.result);});
	},
	this.txInternal	= function(address,callback) {
		let url	= window.wallet.option['network']['api']+"/api?module=account&action=txlistinternal&address="+address+"&startblock=0&endblock=latest&sort=desc";
		window.wallet.loadJson(url,(err,data)=>{if(!err)callback(data.result);});
	},
	this.txERC20	= function (erc20,address,callback) {
		let url	= window.wallet.option['network']['api']+'/api?module=account&action=tokentx&contractaddress='+erc20+'&address='+address+'&startblock=0&endblock=latest&sort=asc';
		window.wallet.loadJson(url,(err,data)=>{if(!err)callback(data.result);});
	},
	this.logs	= function(address,topics,callback) {
		let url	= window.wallet.option['network']['api']+'/api?module=logs&action=getLogs&fromBlock=0&toBlock=latest&address='+address;
		if(topics!='')
			url +='&'+topics;
		window.wallet.loadJson(url,(err,data)=>{if(!err)callback(data.result);});
	},

	// json
	this.loadJson = function(url, callback) {
		var xhr = new XMLHttpRequest();
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

	// abi
	this.findABI = function(abi,name) {
		let found = abi.find(obj=> {return obj.name==name;});
		if(!found)
			return null;
		return found;
	}
}

module.exports = window.wallet.start();
