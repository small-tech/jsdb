const { performance } = require('perf_hooks')

class Time {

  static mark () {
    this.startTime = performance.now()
  }

  // By default, elapsed will return the time as a string
  // with three decimal places of precision. If you want
  // a full precision number instead, pass a negative value
  // as the only argument. Any positive number will attempt
  // to return the answer to that level of precision.
  static elapsed (precision = 3) {
    const endTime = performance.now()
    const duration = endTime - this.startTime
    this.startTime = endTime
    return precision < 0 ? duration : duration.toFixed(precision)
  }
}

module.exports = Time
