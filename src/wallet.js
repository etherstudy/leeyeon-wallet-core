const MSGPACK = require('msgpack-lite')
const AESJS = require('aes-js')

window.wallet = {
  web3: null,
  abi: { erc20: require('./contracts/abi/erc20abi.js'), erc721: require('./contracts/abi/erc721abi.js') },
  contracts: {},
  update: null,
  tokenList: [],

  start: function (option, update = null) {
    window.wallet.account.logout()
    window.wallet.option = option
    window.wallet.update = update
    window.wallet.web3 = null
    window.wallet.contracts = {}
    window.wallet.tokenList = []

    let Web3 = require('web3')

    if (option['type'] === 'http') {
      window.wallet.web3 = new Web3(new Web3.providers.HttpProvider(option['network'][option['type']]))
      setInterval(() => {
        if (window.wallet.update) window.wallet.update()
      }, 60000)
    } else if (option['type'] === 'wss') {
      window.wallet.web3 = new Web3(new Web3.providers.WebsocketProvider(option['network'][option['type']]))
      window.wallet.web3.eth.subscribe('newBlockHeaders', (_err, data) => {
        if (window.wallet.update) window.wallet.update()
        window.wallet.utils.getBalance(window.wallet.account.address(), '0x0')
      })
    } else {
      return
    }

    window.wallet.option['erc20s']['0x0'] = ['eth', '<i class="fab fa-ethereum"></i>']
    let delay = 50
    for (let erc20 in option['erc20s']) {
      window.wallet.utils.tokenAdd(window.wallet.option['type'], window.wallet.abi.erc20, erc20, delay)
      delay += 100
    }
    for (let erc721 in option['erc721s']) {
      window.wallet.utils.tokenAdd(window.wallet.option['type'], window.wallet.abi.erc721, erc721, delay)
      delay += 100
    }
    window.wallet.utils.contractCreate()
    console.log('web3 :' + window.wallet.web3.version)
  },

  // window.wallet.account
  account: {
    keyObject: null,
    balances: {},
    encrypt: function (password, privateKey) {
      return window.wallet.web3.eth.accounts.encrypt(privateKey, password)
    },
    decrypt: function (password, keyObject) {
      return window.wallet.web3.eth.accounts.decrypt(keyObject, password)
    },
    create: function (password) {
      let entropy = window.btoa(window.wallet.web3.utils.sha3(Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)).substring(2, 66))
      return window.wallet.account.encrypt(password, window.wallet.web3.eth.accounts.create(entropy).privateKey)
    },
    login: function (password, keyObject, _callback = null) {
      if (!window.wallet.web3) {
        if (_callback) _callback('web3 error', null)
      } else {
        try {
          window.wallet.account.keyObject = keyObject
          window.wallet.account.decrypt(password, keyObject)
          window.wallet.utils.getAllBalances(window.wallet.account.address(), 0)
          if (window.wallet.update) window.wallet.update()
          if (_callback) _callback(null, window.wallet.account.address())
        } catch (e) {
          window.wallet.account.keyObject = null
          window.wallet.account.balances = {}
          if (window.wallet.update) window.wallet.update()
          if (_callback) _callback(e, null)
        }
      }
    },
    logout: function (_callback = null) {
      window.wallet.account.keyObject = null
      window.wallet.account.balances = {}
      if (window.wallet.update) window.wallet.update()
      if (_callback) _callback('logout')
    },
    address: function () {
      return window.wallet.account.keyObject ? '0x' + window.wallet.account.keyObject.address : null
    }
  },

  // window.wallet.tx
  tx: {
    getGasPrice: function (callback) {
      if (callback) window.wallet.web3.eth.getGasPrice().then(callback)
    },
    send: function (account, to, gasPrice, weiAmount, data = null, err = null, hash = null, success = null) {
      let tx = { 'from': account.address,
        'to': to,
        'value': window.wallet.web3.utils.toHex(weiAmount) }
      if (data != null) tx['data'] = data
      window.wallet.web3.eth.estimateGas(tx).then((gasLimit) => {
        tx['gasPrice'] = window.wallet.web3.utils.toHex(parseInt(gasPrice))
        tx['gasLimit'] = window.wallet.web3.utils.toHex(parseInt(gasLimit))
        account.signTransaction(tx).then((r) => {
          window.wallet.web3.eth.sendSignedTransaction(r.rawTransaction)
            .on('transactionHash', (r0) => { if (hash)hash(r0) })
            .then((r1) => { if (success)success(r1) })
            .catch((e) => { if (err)err(e) })
        })
      })
    },
    transfer: function (account, to, gasPrice, weiAmount, data = null, err = null, hash = null, success = null) {
      window.wallet.utils.getBalance(account.address, '0x0', (token, balance) => {
        if (balance > weiAmount) {
          if (token === '0x0') window.wallet.tx.send(account, to, gasPrice, weiAmount, data, err, hash, success)
          else if (err) err('not ethereum')
        } else if (err) err('Out of balance')
      })
    }
  },

  erc20: {
    add: function (address, symbol) {
      if (!window.wallet.option['erc20s'][address]) {
        window.wallet.option['erc20s'][address] = [symbol, '']
        window.wallet.utils.tokenAdd(window.wallet.option['type'], window.wallet.abi.erc20, address, 0)
      }
    },
    remove: function (address) {
      delete window.wallet.option['erc20s'][address]
    },
    transfer: function (account, erc20, gasPrice, weiAmount, to, err = null, hash = null, success = null) {
      window.wallet.utils.getBalance(account.address, erc20, (token, balance) => {
        if (balance > weiAmount) {
          if (window.wallet.option['erc20s'][token]) {
            window.wallet.tx.send(account, token, gasPrice, 0, window.wallet.contracts[token].c.methods.transfer(to, weiAmount).encodeABI(), err, hash, success)
          } else if (err) err('not erc20')
        } else if (err) err('Out of balance')
      })
    },
    approve: function (account, erc20, gasPrice, weiAmount, spender, err = null, hash = null, success = null) {
      if (window.wallet.option['erc20s'][erc20]) {
        window.wallet.tx.send(account, erc20, gasPrice, 0, window.wallet.contracts[erc20].c.methods.approve(spender, weiAmount).encodeABI(), err, hash, success)
      } else if (err) err('not erc20')
    },
    transferFrom: function (account, erc20, gasPrice, weiAmount, from, to, err = null, hash = null, success = null) {
      if (window.wallet.option['erc20s'][erc20]) {
        window.wallet.tx.send(account, erc20, gasPrice, 0, window.wallet.contracts[erc20].c.methods.transferFrom(from, to, weiAmount).encodeABI(), err, hash, success)
      } else if (err) err('not erc20')
    }
  },

  erc721: {
    add: function (address, symbol) {
      if (!window.wallet.option['erc721s'][address]) {
        window.wallet.option['erc721s'][address] = [symbol, '']
        window.wallet.utils.tokenAdd(window.wallet.option['type'], window.wallet.abi.erc721, address, 0)
      }
    },
    remove: function (address) {
      delete window.wallet.option['erc721s'][address]
    },
    safeTransferFrom: function (account, erc721, gasPrice, from, to, tokenId, data = null, err = null, hash = null, success = null) {
      if (window.wallet.option['erc721s'][erc721] && data != null) {
        window.wallet.tx.send(account, erc721, gasPrice, 0, window.wallet.contracts[erc721].c.methods.safeTransferFrom(from, to, tokenId, data).encodeABI(), err, hash, success)
      } else if (window.wallet.option['erc721s'][erc721]) {
        window.wallet.tx.send(account, erc721, gasPrice, 0, window.wallet.contracts[erc721].c.methods.safeTransferFrom(from, to, tokenId).encodeABI(), err, hash, success)
      } else if (err) err('not erc721')
    },
    transferFrom: function (account, erc721, gasPrice, from, to, tokenId, err = null, hash = null, success = null) {
      if (window.wallet.option['erc721s'][erc721]) {
        window.wallet.tx.send(account, erc721, gasPrice, 0, window.wallet.contracts[erc721].c.methods.transferFrom(from, to, tokenId).encodeABI(), err, hash, success)
      } else if (err) err('not erc721')
    },
    approve: function (account, erc721, gasPrice, approved, tokenId, err = null, hash = null, success = null) {
      if (window.wallet.option['erc721s'][erc721]) {
        window.wallet.tx.send(account, erc721, gasPrice, 0, window.wallet.contracts[erc721].c.methods.approve(approved, tokenId).encodeABI(), err, hash, success)
      } else if (err) err('not erc721')
    },
    setApprovalForAll: function (account, erc721, gasPrice, operator, approved, err = null, hash = null, success = null) {
      if (window.wallet.option['erc721s'][erc721]) {
        window.wallet.tx.send(account, erc721, gasPrice, 0, window.wallet.contracts[erc721].c.methods.setApprovalForAll(operator, approved).encodeABI(), err, hash, success)
      } else if (err) err('not erc721')
    }
  },

  // window.wallet.logs
  logs: {
    getLogs: function (address, topics, callback) {
      let url = window.wallet.option['network']['api'] + '/api?module=logs&action=getLogs&fromBlock=0&toBlock=latest&address=' + address
      if (topics !== '') { url += '&' + topics }
      window.wallet.utils.loadJson(url, (err, data) => { if (!err)callback(data.result) })
    },
    txlist: function (address, callback) {
      let url = window.wallet.option['network']['api'] + '/api?module=account&action=txlist&address=' + address + '&startblock=0&endblock=latest&sort=desc'
      window.wallet.utils.loadJson(url, (err, data) => { if (!err)callback(data.result) })
    },
    txlistinternal: function (address, callback) {
      let url = window.wallet.option['network']['api'] + '/api?module=account&action=txlistinternal&address=' + address + '&startblock=0&endblock=latest&sort=desc'
      window.wallet.utils.loadJson(url, (err, data) => { if (!err)callback(data.result) })
    },
    tokentx: function (address, token, callback) {
      let url = window.wallet.option['network']['api'] + '/api?module=account&action=tokentx&contractaddress=' + token + '&address=' + address + '&startblock=0&endblock=latest&sort=asc'
      window.wallet.utils.loadJson(url, (err, data) => { if (!err)callback(data.result) })
    },
    txlistAll: function (address, token, callback) {
      if (token === '0x0') {
        window.wallet.logs.txlist(address, (data0) => {
          window.wallet.logs.txlistinternal(address, (data1) => {
            let total = data0.concat(data1)
            total.sort(function (a, b) { return parseInt(b.blockNumber) - parseInt(a.blockNumber) })
            if (callback)callback(total)
          })
        })
      } else { window.wallet.logs.tokentx(address, token, callback) }
    }
  },

  // window.wallet.utils
  utils: {
    loadJson: function (url, callback = null) {
      let xhr = new window.XMLHttpRequest()
      xhr.onreadystatechange = function () {
        if (xhr.readyState === window.XMLHttpRequest.DONE) {
          if (xhr.status === 200) {
            if (callback) { callback(null, JSON.parse(xhr.responseText)) }
          } else {
            if (callback) { callback(xhr, null) }
          }
        }
      }
      xhr.open('GET', url, true)
      xhr.send()
    },
    contractAdd: function (abi, address) {
      if (!window.wallet.contracts[address] && address !== '0x0' && window.wallet.web3.utils.isAddress(window.wallet.web3.utils.toChecksumAddress(address))) {
        window.wallet.contracts[address] = { a: abi, c: !window.wallet.web3 ? null : new window.wallet.web3.eth.Contract(abi, address) }
      }
    },
    contractCreate: function () {
      if (!window.wallet.web3) { return }
      for (let address in window.wallet.contracts) {
        if (!window.wallet.contracts[address].c && window.wallet.web3.utils.isAddress(window.wallet.web3.utils.toChecksumAddress(address))) {
          window.wallet.contracts[address].c = new window.wallet.web3.eth.Contract(window.wallet.contracts[address].a, address)
        }
      }
    },
    geteABI: function (abi, name) {
      let found = abi.find(obj => { return obj.name === name })
      if (!found) { return null }
      return found
    },
    getAllBalances: function (address, index) {
      if (!address || index >= window.wallet.tokenList.length) return
      window.wallet.utils.getBalance(address, window.wallet.tokenList[index],
        (x, y) => { window.wallet.utils.getAllBalances(address, index + 1) })
    },
    getBalance: function (address, token, callback = null) {
      if (!address) return
      if (token === '0x0') {
        window.wallet.web3.eth.getBalance(address, (e, r) => {
          if (!e) {
            window.wallet.utils.updateBalance(token, parseInt(r))
            if (callback)callback(token, parseInt(r))
          }
        })
      } else if (window.wallet.option['erc20s'][token]) {
        window.wallet.contracts[token].c.methods.balanceOf(address).call((e, r) => {
          if (!e) {
            window.wallet.utils.updateBalance(token, parseInt(r))
            if (callback)callback(token, parseInt(r))
          }
        })
      } else if (window.wallet.option['erc721s'][token]) {
        window.wallet.contracts[token].c.methods.balanceOf(address).call((e, r) => {
          if (!e) {
            window.wallet.utils.updateBalance(token, parseInt(r))
            if (callback)callback(token, parseInt(r))
          }
        })
      }
    },
    updateBalance: function (token, balance) {
      if (!window.wallet.account.keyObject) return
      window.wallet.account.balances[token] = balance
    },
    tokenAdd: function (type, abi, address, delay) {
      window.wallet.utils.contractAdd(abi, address)
      if (type === 'http') {
        setTimeout(() => {
          setInterval(() => {
            window.wallet.utils.getBalance(window.wallet.account.address(), address)
          }, 30000)
        }, delay)
      } else if (type === 'wss') {
        if (address !== '0x0') {
          window.wallet.web3.eth.subscribe('logs',
            { address: address,
              topics: [window.wallet.utils.geteABI(window.wallet.contracts[address].a, 'Transfer').signature] },
            (_err, data) => {
              window.wallet.utils.getBalance(window.wallet.account.address(), address)
            })
        }
      }
      window.wallet.tokenList.push(address)
    },
    tokenInfo: function (abi, address, callback = null) {
      let info = {}
      let temp = new window.wallet.web3.eth.Contract(abi, address)

      temp.methods.totalSupply().call((e, r) => {
        if (!e) info['totalSupply'] = r
        temp.methods.name().call((e, r) => {
          if (!e) info['name'] = r
          temp.methods.symbol().call((e, r) => {
            if (!e) info['symbol'] = r
            if (temp.methods.decimals) {
              temp.methods.decimals().call((e, r) => {
                if (!e) info['decimals'] = r
                if (callback) callback(info)
              })
            } else if (callback) {
              callback(info)
            }
          })
        })
      })
    },
    QRcode: function (message, size = 256) {
      return '<img src="https://api.qrserver.com/v1/create-qr-code/?data=' + message + '&size=' + size + 'x' + size + ' alt="" width="256" height="' + size + '"/>'
    },
    linkAddress: function (address) {
      return !address ? window.wallet.option['network']['href'] : window.wallet.option['network']['href'] + '/address/' + address
    },
    linkTX: function (txHash) {
      return window.wallet.option['network']['href'] + '/tx/' + txHash
    }
  },

  secure: {
    msgpack: {
      encode: function (json) { return window.wallet.web3.utils.bytesToHex(MSGPACK.encode(json)) },
      decode: function (hex) {
        try {
          return MSGPACK.decode(window.wallet.web3.utils.hexToBytes(hex))
        } catch (e) {
          console.log(e)
        }
        return null
      }
    },
    crypto: {
      aesCtr: function (password, salt = '') {
        let key = window.wallet.web3.utils.hexToBytes(window.wallet.web3.utils.sha3(password + salt))
        return new AESJS.ModeOfOperation.ctr(key, new AESJS.Counter(5))// eslint-disable-line
      },
      aesCbc: function (password, salt = '') {
        let key = window.wallet.web3.utils.hexToBytes(window.wallet.web3.utils.sha3(password + salt))
        let iv = window.wallet.web3.utils.hexToBytes('0x' + (window.wallet.web3.utils.sha3(salt + password)).slice(10, 42))
        return new AESJS.ModeOfOperation.cbc(key, iv)// eslint-disable-line
      },
      encrypt: function (bytes, password, salt = '') {
        return window.wallet.secure.crypto.aesCbc(password, salt).encrypt(bytes)
      },
      decrypt: function (bytes, password, salt = '') {
        try {
          return window.wallet.secure.crypto.aesCbc(password, salt).decrypt(bytes)
        } catch (e) {
          console.log(e)
        }
        return null
      }
    },
    encrypt: function (json, password, salt = '', err = null) {
      let base64hex = window.wallet.web3.utils.utf8ToHex(
        window.btoa(
          window.wallet.web3.utils.bytesToHex(MSGPACK.encode(json))))
      return window.wallet.web3.utils.bytesToHex(
        window.wallet.secure.crypto.encrypt(
          window.wallet.web3.utils.hexToBytes(base64hex), password, salt))
    },
    decrypt: function (hex, password, salt = '', err = null) {
      try {
        let base64decrypt = window.atob(
          window.wallet.web3.utils.hexToUtf8(
            window.wallet.web3.utils.bytesToHex(
              window.wallet.secure.crypto.decrypt(
                window.wallet.web3.utils.hexToBytes(hex), password, salt))))
        return MSGPACK.decode(window.wallet.web3.utils.hexToBytes(base64decrypt))
      } catch (e) {
        console.log(e)
      }
      return null
    }
  },

  storage: {
    getItem: function (key, password, salt = '') {
      return window.wallet.secure.decrypt(window.localStorage.getItem(key), password, salt)
    },
    setItem: function (key, value, password, salt = '') {
      window.localStorage.setItem(key, window.wallet.secure.encrypt(value, password, salt))
    },
    removeItem: function (key) {
      window.localStorage.removeItem(key)
    },
    clear: function () {
      window.localStorage.clear()
    }
  }
}

module.exports = window.wallet
