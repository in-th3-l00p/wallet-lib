# panoplia wallet lib

eth wallet abstraction library, providing all the functionality for building web3 wallet apps

* lib/local-wallet - typescript library for having a realm db based storage for eth wallets, that can be accessed using ethers library
* rest/cloud-wallets - rust based rest api for storing encrypted wallets on cloud, in a postgresql database \w social recovery
* lib/cloud-wallet - ts library for accessing a cloud based wallet encrypted in the rest api for cloud wallets, with acccesibility through ethers library
* lib/react - library that provides react hooks for using the panoplia wallet lib, accesibility with both cloud and local wallets, and state management done through react context api
