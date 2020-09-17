const { performance } = require('perf_hooks')

class Time {

  static mark () {
    this.startTime = performance.now()
  }

  static elapsed () {
    const endTime = performance.now()
    const duration = (endTime - this.startTime).toFixed(3)
    this.startTime = endTime
    return duration
  }
}

module.exports = Time
