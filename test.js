const Unionpedia = require('./index.js');

(async () => {
  const union = new Unionpedia('https://en.unionpedia.org');

  //console.log(await union.getIncomingRelations('Informatik'));
  console.log(await union.getConceptObject('computer science'))
})()
