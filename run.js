#!/usr/bin/env node
'use strict'

const fsLib = require('fs')

const argParseLib = require('argparse')

const braveCrawlLib = require('./brave/crawl')

const parser = new argParseLib.ArgumentParser({
  addHelp: true,
  description: 'Crawl sites, try to elicit paywall behavior, and record the page graphs'
})

parser.addArgument(['-d', '--domain'], {
  required: true,
  help: 'the domain to try to elicit paywall behavior from'
})
parser.addArgument(['-w', '--dest'], {
  required: true,
  help: 'the directory to write results to'
})
parser.addArgument(['-b', '--browser'], {
  required: true,
  help: 'path to the PageGraph enabled Brave build'
})
parser.addArgument(['-t', '--temp'], {
  defaultValue: '/tmp/',
  help: 'where to the temp files needed when crawling'
})
parser.addArgument(['-c', '--children'], {
  defaultValue: 10,
  type: 'int',
  help: 'the number of child pages to crawl on the domain'
})
parser.addArgument(['-s', '--secs'], {
  defaultValue: 30,
  type: 'int',
  help: 'the number of seconds to allow each page to load'
})
const args = parser.parseArgs()

// Perform some additional validation to make sure the files
// and paths are actually files and paths.
const expectedDirs = {
  dest: args.dest,
  temp: args.temp
}
for (const [dirLabel, dirPath] of Object.entries(expectedDirs)) {
  const dirStatRs = fsLib.statSync(dirPath)
  if (dirStatRs.isDirectory() === false) {
    console.error(`Error: ${dirPath} (--${dirLabel}) doesn't appear to be a directory.`)
    process.exit(1)
  }
}

const browserStat = fsLib.statSync(args.browser)
if (browserStat.isFile() === false) {
  console.error(`Error: ${args.browser} (--browser) doesn't appear to be a file.`)
  process.exit(1)
}

(async _ => {
  await braveCrawlLib.crawl(args)
})()
