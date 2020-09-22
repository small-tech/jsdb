////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
// WhatDB (What Database?)
//
// Copyright ⓒ 2020 Aral Balkan. Licensed under AGPLv3 or later.
// Shared with ♥ by the Small Technology Foundation.
//
// To use:
//
// const db = new WhatDB(databaseDirectory)
//
// Like this? Fund us!
// https://small-tech.org/fund-us
//
//
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const LoopBench = require('loopbench')

const loopBench = LoopBench();

setInterval(() => {
  console.log(`loop delay: ${loopBench.delay}`);
  console.log(`loop delay limit: ${loopBench.limit}`);
  console.log(`is loop overloaded: ${loopBench.overLimit}`);
}, 100)

module.exports = require('./lib/WhatDB')
