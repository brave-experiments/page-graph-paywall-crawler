'use strict'

const pathLib = require('path')

const puppeteerLib = require('puppeteer-core')

const braveConstantsLib = require('./constants')

const launch = async args => {
  const userDataDir = pathLib.join(args.tmp, braveConstantsLib.profileDirName)
  const launchArgs = {
    defaultViewport: {
      deviceScaleFactor: 1,
      hasTouch: false,
      height: 1080,
      isLandscape: true,
      isMobile: false,
      width: 1920
    },
    executablePath: args.browser,
    userDataDir
  }
  const browser = await puppeteerLib.launch(launchArgs)
  return browser
}

module.exports = {
  launch
}
