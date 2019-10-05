'use strict'

const pathLib = require('path')

const _constants = Object.freeze({
  profileDirName: 'paywall-crawl-profile',
  cleanProfilePath: pathLib.join(__dirname, '..', 'resources', 'start-profile')
})

module.exports = _constants
