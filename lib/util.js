module.exports = {
  isPlainObject (x) {
    return x !== null && x.constructor === Object
  },

  // Conditionally log to console.
  log (...args) {
    if (process.env.QUIET) {
      return
    }
    console.log(...args)
  }
}
