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

  static serialise (value, key, parentType = null) {

    // Note: loose test ()
    if (key === undefined || key === null) {
      throw new Error('Key cannot be undefined or null.')
    }

    const objectType = value === undefined ? 'undefined' : value === null ? 'null' : value.constructor.name

    let serialisedValue

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
      case 'undefined':
      case 'null': {
        serialisedValue = value
        break
      }

      case 'String': {
        serialisedValue = `\`${value.replace(/`/g, '\\`')}\``
        break
      }

      case 'Object':
      /* case 'bound Object':*/ {
        const children = []
        for (let childKey in value) {
          const childValue = value[childKey]
          children.push(JSDF.serialise(childValue, childKey, 'object'))
        }
        serialisedValue = `{ ${children.join(', ')} }`
        break
      }

      case 'Array': {
        const children = []
        const numberOfChildren = value.length
        for (let i = 0; i < numberOfChildren; i++) {
          const childValue = value[i]
          children.push(JSDF.serialise(childValue, i, 'array'))
        }
        serialisedValue = `[ ${children.join(', ')} ]`
        break
      }

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
      case 'URIError': {
        throw new TypeError(`You cannot store objects of type ${objectType} in JSDB.`)
        // (no break necessary after throwing an error)
      }

      default: {
        // console.log(`[GENERIC SERIALISATION HANDLER] ${objectType} encountered`)

        const children = []
        for (let childKey in value) {
          const childValue = value[childKey]
          children.push(JSDF.serialise(childValue, childKey, 'object'))
        }
        const properties = `{ ${children.join(', ')} }`

        serialisedValue = `Object.create(typeof ${objectType} === 'function' ? ${objectType}.prototype : {}, Object.getOwnPropertyDescriptors(${properties}))`
        break
      }
    }

    let serialisedStatement
    switch(parentType) {
      case null: {
        serialisedStatement = `${key} = ${serialisedValue};\n`
        break
      }

      case 'object': {
        serialisedStatement = `${key}: ${serialisedValue}`
        break
      }

      case 'array': {
        serialisedStatement = serialisedValue
        break
      }
    }

    return serialisedStatement
  }
}

module.exports = JSDF
