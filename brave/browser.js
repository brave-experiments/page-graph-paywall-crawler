'use strict'

const pathLib = require('path')

const puppeteerLib = require('puppeteer-core')

const braveConstantsLib = require('./constants')

const launch = async args => {
  const userDataDir = pathLib.join(args.temp, braveConstantsLib.profileDirName)
  const launchArgs = {
    args: [
      '--disable-background-networking',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-breakpad',
      '--disable-client-side-phishing-detection',
      '--disable-default-apps',
      '--disable-dev-shm-usage',
      '--disable-extensions',
      '--disable-features=site-per-process,TranslateUI,BlinkGenPropertyTrees',
      '--disable-hang-monitor',
      '--disable-ipc-flooding-protection',
      '--disable-popup-blocking',
      '--disable-prompt-on-repost',
      '--disable-renderer-backgrounding',
      '--disable-sync',
      '--force-color-profile=srgb',
      '--metrics-recording-only',
      '--no-first-run',
      '--enable-automation',
      '--password-store=basic',
      '--use-mock-keychain',
      '--hide-scrollbars',
      '--mute-audio',
      'about:blank',
      '--remote-debugging-port=0',
      '--v=0',
      '--disable-brave-update',
      '--enable-logging=stderr'
    ],
    headless: true,
    executablePath: args.browser,
    userDataDir
  }
  const browser = await puppeteerLib.launch(launchArgs)
  return browser
}

module.exports = {
  launch
}
