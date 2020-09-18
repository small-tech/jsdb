const { performance } = require('perf_hooks')

class Time {

  static mark () {
    this.startTime = performance.now()
  }

  static elapsed (precision = 3) {
    const endTime = performance.now()
    const duration = endTime - this.startTime
    this.startTime = endTime
    return precision < 0 ? duration : duration.toFixed(precision)
  }
}

module.exports = Time
