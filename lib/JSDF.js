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

    // Attempt to serialise if this is a supported intrinsic object
    // (and throw an error if it is an unsupported intrinsic object).
    switch (objectType) {
      //
      // Supported intrinsic objects.
      //

      // Simple data types that don’t need to be modified.
      // Note: Number will include Infinity and NaN. This is fine.
      case 'Number':
      case 'Boolean':
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

      case 'Symbol':
        serialisedValue = `Symbol.for(value.description)`
        break

      //
      // Unsupported intrinsic objects.
      // For reference, see:
      // http://www.ecma-international.org/ecma-262/6.0/#sec-well-known-intrinsic-objects
      //

      // Might support in the future.
      case 'Map':
      case 'Set':

      case 'WeakMap':
      case 'WeakSet':

      case 'ArrayBuffer':
      case 'Float32Array':
      case 'Float64Array':
      case 'Int8Array':
      case 'Int16Array':
      case 'Int32Array':
      case 'TypedArray':
      case 'Uint8Array':
      case 'Uint16Array':
      case 'Uint32Array':
      case 'Uint8ClampedArray':

      // Does not make sense to support.
      case 'DataView':
      case 'Function':
      case 'Generator':
      case 'Promise':
      case 'Proxy':
      case 'RegExp':

      case 'Error':
      case 'EvalError':
      case 'RangeError':
      case 'ReferenceError':
      case 'SyntaxError':
      case 'TypeError':
      case 'URIError':
        throw new TypeError(`You cannot store objects of type ${objectType} in JSDB.`)

      default:
        console.log(`[GENERIC SERIALISATION HANDLER] ${objectType} encountered`)
        serialisedValue = `Object.create(typeof ${objectType} === 'function' ? ${objectType}.prototype : {}, {})`
        isComplexDataType = true
        break
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
