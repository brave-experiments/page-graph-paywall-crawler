'use strict'

const childProcLib = require('child_process')

const puppeteerLib = require('puppeteer-core')

const braveBrowserLib = require('./browser')
const braveChildUrlsLib = require('./child_urls')
const braveDebugLib = require('./debug')
const braveReportLib = require('./report')

const loadFor = async (page, url, numSecs = 30) => {
  const waitTime = numSecs * 1000
  page.setDefaultNavigationTimeout(waitTime)
  const startTime = Date.now()
  try {
    await page.goto(url)
  } catch (e) {
    if ((e instanceof puppeteerLib.errors.TimeoutError) === false) {
      console.error(`Error doing top level fetch: ${e.toString()}`)
      throw e
    }
  }
  const endTime = Date.now()
  const timeElapsed = endTime - startTime

  if (timeElapsed < waitTime) {
    const additionalWaitTime = Math.floor((waitTime - timeElapsed) / 1000)
    if (additionalWaitTime > 0) {
      childProcLib.execSync(`sleep ${additionalWaitTime}`)
    }
  }
}

const crawl = async args => {
  const landingPageUrl = `http://${args.domain}`

  braveDebugLib.verbose(`Starting crawl of ${landingPageUrl}`)
  const report = braveReportLib.create(args)
  await report.installCleanProfile()

  let childUrlsResult
  const browser = await braveBrowserLib.launch(args)
  try {
    const page = await browser.newPage()
    await loadFor(page, landingPageUrl, args.secs)

    childUrlsResult = await braveChildUrlsLib.select(page, args.children)
    if (childUrlsResult.urlsFromFeed === true) {
      report.setHasFeed()
    }
  } catch (e) {
    braveDebugLib.log(`Crash with ${landingPageUrl}`)
    braveDebugLib.log(e)
    await browser.close()
    return
  }
  await browser.close()

  const conditions = ['clean', 'dirty']
  for (const aCondition of conditions) {
    // We only want to clear the 'dirty' profile the first time,
    // the 'clean' profile gets cleaned after every crawl.
    if (aCondition === 'dirty') {
      await report.installCleanProfile()
    }

    for (const childUrl of childUrlsResult.urls) {
      if (aCondition === 'clean') {
        await report.installCleanProfile()
      }

      const browser = await braveBrowserLib.launch(args)
      braveDebugLib.verbose(`Starting ${aCondition} crawl of ${childUrl}`)
      try {
        const page = await browser.newPage()
        await loadFor(page, childUrl, args.secs)
        const devTools = await page.target().createCDPSession()
        const graphMl = await devTools.send('Page.generatePageGraph')
        await report.addPageGraphResult(childUrl, graphMl.data, aCondition)
      } catch (e) {
        console.error(`Crash with ${childUrl}`)
        console.error(e)
      }
      await browser.close()
    }
  }

  await report.write()
}

module.exports = {
  crawl
}
