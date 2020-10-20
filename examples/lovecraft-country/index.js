const JSDB = require('../..')

// Open your database (creating it if it doesn’t exist)
// It will be stored in a directory called “db”.
const db = JSDB.open('db')

// Create a “table” on it. Tables can be arrays or objects.
if (!db.episodes) {
  db.episodes = [
    {title: 'Sundown', rating: 8.4},
    {title: 'Whitey’s on the Moon', rating: 7.1},
    {title: 'Holy Ghost', rating: 7.7},
    {title: 'A History of Violence', rating: 7.6},
    {title: 'Strange Case', rating: 7.1},
    {title: 'Meet me in Daegu', rating: 8.4},
    {title: 'I am.', rating: 7.1},
    // {title: 'Jig-a-Bobo', rating: 8.4},
    // {title: 'Rewind 1921', rating: 8.6},
    // {title: 'Full Circle', rating: 7.0},
  ]
}
