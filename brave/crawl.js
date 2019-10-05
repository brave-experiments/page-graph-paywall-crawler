'use strict'

const puppeteerLib = require('puppeteer-core')

const braveBrowserLib = require('./browser')
const braveChildUrlsLib = require('./child_urls')
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
      return
    }
  }
  const endTime = Date.now()
  const timeElapsed = endTime - startTime

  if (timeElapsed < waitTime) {
    const additionalWaitTime = waitTime - timeElapsed
    await page.waitFor(additionalWaitTime)
  }
}

const crawl = async args => {
  const report = braveReportLib.create(args)
  await report.installCleanProfile()

  const landingPageUrl = `https://${args.domain}`
  const browser = await braveBrowserLib.launch(args)
  const page = await browser.newPage()
  await loadFor(page, landingPageUrl, args.secs)

  const childUrlsResult = braveChildUrlsLib.select(page, args.children)
  if (childUrlsResult.urlsFromFeed === true) {
    report.setHasFeed()
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
      const page = await browser.newPage()
      await loadFor(page, childUrl, args.secs)
      const devTools = await page.target().createCDPSession()
      const graphMl = await devTools.send('Page.generatePageGraph')
      await report.addPageGraphResult(childUrl, graphMl, aCondition)
      await browser.close()
    }
  }

  await report.write()
}

module.exports = {
  crawl
}
