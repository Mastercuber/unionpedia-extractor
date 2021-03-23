const Unionpedia = require('./index.js')

(async () => {
  const NS_PER_SEC = 1e9

  const union = new Unionpedia('https://en.unionpedia.org')

  const concept1 = 'Computer Science'

  const hrtime = process.hrtime()
  const concept = await union.getConceptObject(concept1)
  const end = process.hrtime(hrtime)
  const elapsedTime = end[0] + end[1]/NS_PER_SEC
  console.log(`${elapsedTime} sec, for receiving a concept`)

  const hrtime2 = process.hrtime()
  const incoming = await union.getIncomingRelations(concept1)
  const end2 = process.hrtime(hrtime2)
  const elapsedTime2 = end2[0] + end2[1]/NS_PER_SEC
  console.log(`${elapsedTime2} sec, for extracting incoming relations`)

  const hrtime3 = process.hrtime()
  const outgoing = await union.getOutgoingRelations(concept1)
  const end3 = process.hrtime(hrtime3)
  const elapsedTime3 = end3[0] + end3[1]/NS_PER_SEC
  console.log(`${elapsedTime3} sec, for extracting outgoing relations`)

  console.log(`\ntotal time elapsed: ${elapsedTime + elapsedTime2 + elapsedTime3}`)
})()
