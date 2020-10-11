////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
// JSDF class.
//
// Copyright ⓒ 2020 Aral Balkan. Licensed under AGPLv3 or later.
// Shared with ♥ by the Small Technology Foundation.
//
// Recursively serialises a JavaScript data structure into JavaScript Data Format (a series
// of JavaScript statements that atomically recreates said data structure when run).
//
// Like this? Fund us!
// https://small-tech.org/fund-us
//
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

class JSDF {

  static serialise (value, keyPath) {
    return `(()=>{${this.getOperations(value, keyPath).join(' ')}})();\n`
  }


  static getOperations (value, keyPath, operations = []) {
    const objectType = value.constructor.name

    let serialisedValue
    let isComplexDataType = false
    switch (objectType) {
      case 'Number':
        serialisedValue = value
        break

      case 'String':
        serialisedValue = `\`${value}\``
        break

      case 'Object':
        serialisedValue = '{}'
        isComplexDataType = true
        break

      case 'Array':
        serialisedValue = '[]'
        isComplexDataType = true
        break

      case 'Date':
        serialisedValue = `new Date('${value.toJSON()}')`
        break

      default:
        console.log(`[GENERIC SERIALISATION HANDLER] ${objectType} encountered`)
        serialisedValue = `Object.create(typeof ${objectType} === 'function' ? ${objectType}.prototype : {}, {})`
        isComplexDataType = true
    }

    const operation = `${keyPath} = ${serialisedValue};`

    operations.push(operation)

    if (isComplexDataType)
    Object.keys(value).forEach(key => {
      const childValue = value[key]
      JSDF.getOperations(childValue, `${keyPath}[${!isNaN(parseInt(key)) ? key : `'${key}'`}]`, operations)
    })

    return operations
  }
}

module.exports = JSDF
