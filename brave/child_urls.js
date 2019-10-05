'use strict'

const urlLib = require('url')

const rssParserLib = require('rss-parser')
const randomJsLib = require('random-js')
const tldjsLib = require('tldjs')

const braveDebugLib = require('./debug')

const _urlsFromDOM = async page => {
  let links
  try {
    links = await page.$$('a[href]')
  } catch (e) {
    braveDebugLib.verbose(`Unable to look for child links, page closed: ${e.toString()}`)
    return []
  }

  const sameETldLinks = new Set()
  const pageUrl = page.url()
  const mainETld = tldjsLib.getDomain(pageUrl)

  for (const aLink of links) {
    const hrefHandle = await aLink.getProperty('href')
    const hrefValue = await hrefHandle.jsonValue()
    try {
      const hrefUrl = new urlLib.URL(hrefValue.trim(), pageUrl)
      hrefUrl.hash = ''
      hrefUrl.search = ''

      if (hrefUrl.protocol !== 'http:' && hrefUrl.protocol !== 'https:') {
        continue
      }

      const childUrlString = hrefUrl.toString()
      const childLinkETld = tldjsLib.getDomain(childUrlString)
      if (childLinkETld !== mainETld) {
        continue
      }
      if (!childUrlString || childUrlString.length === 0) {
        continue
      }
      sameETldLinks.add(childUrlString)
    } catch (_) {
      continue
    }
  }

  return Array.from(sameETldLinks)
}

const _urlsFromFeed = async (page) => {
  braveDebugLib.verbose('About to query for a RSS feed for this site.')
  const feedLink = await page.$('[type="application/rss+xml"], [type="application/atom+xml"]')

  if (feedLink === null) {
    braveDebugLib.verbose('Was not able to find a feed for this site.')
    return false
  }

  const pageUrl = page.url()
  const relativeFeedUrl = (await (await feedLink.getProperty('href')).jsonValue())
  const absoluteFeedUrl = (new urlLib.URL(relativeFeedUrl, pageUrl)).toString()
  braveDebugLib.verbose(`Found feed at ${absoluteFeedUrl}.`)

  try {
    const parser = new rssParserLib() // eslint-disable-line
    const feed = await parser.parseURL(absoluteFeedUrl)
    const childLinks = feed.items.map(item => item.link)
    braveDebugLib.verbose(`Found ${childLinks.length} links in the feed.`)
    return childLinks
  } catch (error) {
    braveDebugLib.log(`Encountered error trying to parse feed url at ${absoluteFeedUrl}.`)
    return false
  }
}

const select = async (page, count = 10) => {
  const selectResult = Object.create(null)
  selectResult.urlsFromFeed = false
  selectResult.urlsFromPage = false

  const collectedLinks = new Set()
  const urlsFromFeed = await _urlsFromFeed(page)
  if (urlsFromFeed !== false && urlsFromFeed.length > 0) {
    selectResult.urlsFromFeed = true
    for (const aLinkFromFeed of urlsFromFeed) {
      collectedLinks.add(aLinkFromFeed)
    }
  }

  if (collectedLinks.size < count) {
    const urlsFromPage = await _urlsFromDOM(page)
    if (urlsFromPage.length > 0) {
      selectResult.urlsFromPage = true
      for (const aLinkFromPage of urlsFromPage) {
        collectedLinks.add(aLinkFromPage)
        if (collectedLinks.size === count) {
          break
        }
      }
    }
  }

  const linksAsArray = Array.from(collectedLinks)

  if (linksAsArray.length <= count) {
    return linksAsArray
  }

  const random = new randomJsLib.Random()
  selectResult.urls = random.sample(linksAsArray, count)
  return selectResult
}

module.exports = {
  select
}
