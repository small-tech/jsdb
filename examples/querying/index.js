const WhatDB = require('../..')

const db = new WhatDB('db')

console.log('===>', db.people.where('name').isEqualTo('Aral')[0])

