const Unionpedia = require('../src/extractor.jsdom');
const UnionpediaC = require('../src/extractor.cheerio');

(async () => {
  const NS_PER_MILLI_SEC = 1000000n

  const unionJSDOM = new Unionpedia('https://en.unionpedia.org');
  const unionCheerio = new UnionpediaC('https://en.unionpedia.org');

  const concept1 = 'Computer Science'
  let totalTime = 0n, totalTimeC = 0n, lastElapsed

  let start = process.hrtime.bigint()
  await unionJSDOM.getConceptObject(concept1)
  let end = process.hrtime.bigint()
  let elapsedTime = (end - start) / NS_PER_MILLI_SEC
  totalTime += elapsedTime
  lastElapsed = elapsedTime

  start = process.hrtime.bigint()
  await unionCheerio.getConceptObject(concept1)
  end = process.hrtime.bigint()
  elapsedTime = (end - start) / NS_PER_MILLI_SEC
  totalTimeC += elapsedTime
  console.log(`What?\t\t\tjsdom\tcheerio`)
  console.log(`Receiving Concept\t${lastElapsed} ms\t${elapsedTime} ms`)

  start = process.hrtime.bigint()
  await unionJSDOM.getIncomingRelations(concept1)
  end = process.hrtime.bigint()
  elapsedTime = (end - start) / NS_PER_MILLI_SEC
  totalTime += elapsedTime
  lastElapsed = elapsedTime

  start = process.hrtime.bigint()
  await unionCheerio.getIncomingRelations(concept1)
  end = process.hrtime.bigint()
  elapsedTime = (end - start) / NS_PER_MILLI_SEC
  totalTimeC += elapsedTime
  console.log(`Incoming Relations\t${lastElapsed} ms\t${elapsedTime} ms`)

  start = process.hrtime.bigint()
  await unionJSDOM.getOutgoingRelations(concept1)
  end = process.hrtime.bigint()
  elapsedTime = (end - start) / NS_PER_MILLI_SEC
  totalTime += elapsedTime
  lastElapsed = elapsedTime

  start = process.hrtime.bigint()
  await unionCheerio.getOutgoingRelations(concept1)
  end = process.hrtime.bigint()
  elapsedTime = (end - start) / NS_PER_MILLI_SEC
  totalTimeC += elapsedTime
  console.log(`Outgoing Relations\t${lastElapsed} ms\t${elapsedTime} ms`)

  console.log(`\nTotal time\t\t${totalTime}ms\t${totalTimeC} ms`)
})()
