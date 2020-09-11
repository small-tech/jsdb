# WhatDB?

A transparent, in-memory, write-on-update JavaScript database for Small Web applications that persists to JSON files.

For initial brainstorming, see [this gist](https://gist.github.com/aral/fc4115fdf338e02d735ae58e245817ce).

## Use case

A data layer for simple [Small Web](https://ar.al/2020/08/07/what-is-the-small-web/) sites for basic public (e.g., anonymous comments on articles) or configuration data. Built for use in [Site.js](https://sitejs.org).

## Features

  - __Transparent:__ if you know how to work with arrays and objects and call methods in JavaScript, you already know how to use WhatDB? It’s not called “What database?” for nothing. Database? What database?

  - __Automatic:__ it just works. No configuration.

## Limitations

  - __Small Data:__ this is for small data, not Big Data™.

  - __For Node.js:__ will not work in the browser.

  - __Runs on untrusted nodes:__ this is for data kept on untrusted (server) nodes. Use it judiciously if you must for public data, configuration data, etc. If you want to store personal data or model human communication, consider end-to-end encrypted and peer-to-peer replicating data structures instead to protect privacy and freedom of speech. Keep an eye on the work taking place around the [Hypercore Protocol](https://hypercore-protocol.org/).

  - __In-memory:__ all data is kept in memory and, [without tweaks, cannot exceed 1.4GB in size](https://www.the-data-wrangler.com/nodejs-memory-limits/). If your local database is > 1 GB in size, you’re not really building a Small Web site/app and this is not the tool for you. Quite literally every other database out there is for your use case so please don’t open an issue here for this reason.

  - __Write-on-update__: every update will trigger a write (unless a write is already in process, in which case updates that take place during a write will be batch written together). So this is not what you should be using for, say, logging. Use an append-only log for that instead.

  - __No schema, no migrations__: again, this is meant to be a very simple persistence, query, and observation layer for local data. If you want schemas and migrations, take a look at nearly every other database out there. You might also want to see how well [ObjectModel](https://github.com/sylvainpolletvillard/ObjectModel) works alongside WhatDB.

## Related projects, inspiration, etc.

  - [proxy-fun](https://github.com/mikaelbr/awesome-es2015-proxy)
  - [filejson](https://github.com/bchr02/filejson)
  - [Declaraoids](https://github.com/Matsemann/Declaraoids/blob/master/src/declaraoids.js)
  - [ScunMEngine](https://github.com/jlvaquero/SCUNM/blob/master/SCUNMEngine/SCUNMEngine.js)
