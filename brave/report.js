'use strict'

const fsExtraLib = require('fs-extra')
const pathLib = require('path')
const utilLib = require('util')

const braveConstantsLib = require('./constants')

const fileExists = utilLib.promisify(fsExtraLib.access)
const rmDir = utilLib.promisify(fsExtraLib.rmdir)
const stat = utilLib.promisify(fsExtraLib.stat)
const writeFile = utilLib.promisify(fsExtraLib.writeFile)

const validResultConditions = ['clean', 'dirty']

const _deleteDirIfExists = async dirPath => {
  try {
    const statRs = await stat(dirPath)
    if (statRs.isDirectory()) {
      await rmDir(dirPath)
    }
  } catch (_) {}
}

const _installCleanProfile = async fullProfilePath => {
  await _deleteDirIfExists(fullProfilePath)
  await fsExtraLib.mkdirp(fullProfilePath)
  await fsExtraLib.copy(braveConstantsLib.cleanProfilePath, fullProfilePath)
}

const _addPageGraphResult = async (crawlData, resultsDir, pageUrl, pageGraphXML, condition) => {
  if (validResultConditions.includes(condition) === false) {
    throw new Error(`Invalid condition: ${condition}`)
  }

  let urlIndex = crawlData.urlMapping[pageUrl]
  if (urlIndex === undefined) {
    urlIndex = Object.values(crawlData.urlMapping).length
    crawlData.urlMapping[pageUrl] = urlIndex
  }

  const reportDir = pathLib.join(resultsDir, 'pages', urlIndex.toString())
  const reportPath = pathLib.join(reportDir, condition + '.graphml')
  if (await fileExists(reportPath)) {
    throw new Error(`${reportPath} has already been recorded`)
  }

  await fsExtraLib.mkdirp(reportDir)
  await writeFile(reportPath, pageGraphXML, 'utf8')
}

const _generateSummary = crawlReport => {
  const summary = Object.create(null)
  summary.domain = crawlReport.domain
  summary.hasFeed = crawlReport.hasFeed

  // Build a mapping of url => relative path on disk
  const urlMappingUnpacked = Object.create(null)
  for (const [aUrl, aUrlIndex] of Object.entries(crawlReport.urlMapping)) {
    urlMappingUnpacked[aUrl] = pathLib.join('pages', aUrlIndex.toString())
  }
  summary.urls = urlMappingUnpacked

  return Object.freeze(summary)
}

const _writeReportToDisk = async (crawlData, resultsDir) => {
  const summary = _generateSummary(crawlData)
  const summaryPath = pathLib.join(resultsDir, 'summary.json')
  await fsExtraLib.writeJson(summaryPath, summary)
}

const create = args => {
  const resultsDir = args.dest
  const profileDir = args.temp
  const fullProfilePath = pathLib.join(profileDir, braveConstantsLib.profileDirName)

  const crawlData = {
    hasFeed: false,
    domain: args.domain,
    urlMapping: Object.create(null)
  }

  return {
    setHasFeed: _ => {
      crawlData.hasFeed = true
    },
    write: _writeReportToDisk.bind(undefined, crawlData, resultsDir),
    installCleanProfile: _installCleanProfile.bind(undefined, fullProfilePath),
    addPageGraphResult: _addPageGraphResult.bind(undefined, crawlData, resultsDir)
  }
}

module.exports = {
  create
}
