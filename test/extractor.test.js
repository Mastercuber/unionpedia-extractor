const Unionpedia = require('../src/extractor.cheerio');
jest.setTimeout(10000)

describe('Extractor Tests', function () {
  const union = new Unionpedia('https://en.unionpedia.org')
  const unionDe = new Unionpedia('https://de.unionpedia.org')

  describe('Concept Object Tests', function () {
    it('should throw an error for a non existing concept', function () {
      return expect(union.getConceptObject('this concept does not exist!!!!')).rejects.toEqual('Unknown concept')
    });
    it('should throw an error for an empty concept string', function () {
      return expect(union.getConceptObject('')).rejects.toEqual('Concept is empty')
    });
    it('should throw errors, when the concept is not a string, null or undefined', async function () {
      await expect(union.getConceptObject(undefined)).rejects.toEqual('Concept not a string')
      await expect(union.getConceptObject(null)).rejects.toEqual('Concept not a string')
      await expect(union.getConceptObject(false)).rejects.toEqual('Concept not a string')
      await expect(union.getConceptObject(true)).rejects.toEqual('Concept not a string')
      await expect(union.getConceptObject({})).rejects.toEqual('Concept not a string')
      await expect(union.getConceptObject([])).rejects.toEqual('Concept not a string')
      await expect(union.getConceptObject(123)).rejects.toEqual('Concept not a string')
    });

    it('should receive an object for an existing concept', async function () {
      const object = await union.getConceptObject('Computer Science')
      expect('href' in object).toBeTruthy()
      expect(object.href.length).toBeGreaterThan(0)
      expect(object.href.startsWith('https://en.unionpedia.org')).toBeTruthy()
      expect('title' in object).toBeTruthy()
      expect(object.title.length).toBeGreaterThan(0)
      expect('description' in object).toBeTruthy()
      expect(object.description.length).toBeGreaterThan(0)
    });

    it('should receive an object for a concept of another language', async function () {
      const objectDe = await unionDe.getConceptObject('Informatik')
      expect('href' in objectDe).toBeTruthy()
      expect(objectDe.href.length).toBeGreaterThan(0)
      expect(objectDe.href.startsWith('https://de.unionpedia.org')).toBeTruthy()
      expect('title' in objectDe).toBeTruthy()
      expect(objectDe.title.length).toBeGreaterThan(0)
      expect('description' in objectDe).toBeTruthy()
      expect(objectDe.description.length).toBeGreaterThan(0)
    });

  });

  describe('Relations Tests (Outgoing & Incoming)', function () {
    it('should throw an error when an unknown concept is given', async function () {
      await expect(union.getOutgoingRelations('asdasdasdasd')).rejects.toEqual('Unknown concept')
      await expect(union.getIncomingRelations('asdasdasdasd')).rejects.toEqual('Unknown concept')
    })
    it('should throw an error when an empty concept is given', async function () {
      await expect(union.getOutgoingRelations('')).rejects.toEqual('Concept is empty')
      await expect(union.getIncomingRelations('')).rejects.toEqual('Concept is empty')
    })
    it('should throw errors when the concept is not a string, null or undefined', async function () {
      await expect(union.getOutgoingRelations(undefined)).rejects.toEqual('Concept not a string')
      await expect(union.getOutgoingRelations(null)).rejects.toEqual('Concept not a string')
      await expect(union.getOutgoingRelations(false)).rejects.toEqual('Concept not a string')
      await expect(union.getOutgoingRelations(true)).rejects.toEqual('Concept not a string')
      await expect(union.getOutgoingRelations({})).rejects.toEqual('Concept not a string')
      await expect(union.getOutgoingRelations([])).rejects.toEqual('Concept not a string')
      await expect(union.getOutgoingRelations(123)).rejects.toEqual('Concept not a string')

      await expect(union.getIncomingRelations(undefined)).rejects.toEqual('Concept not a string')
      await expect(union.getIncomingRelations(null)).rejects.toEqual('Concept not a string')
      await expect(union.getIncomingRelations(false)).rejects.toEqual('Concept not a string')
      await expect(union.getIncomingRelations(true)).rejects.toEqual('Concept not a string')
      await expect(union.getIncomingRelations({})).rejects.toEqual('Concept not a string')
      await expect(union.getIncomingRelations([])).rejects.toEqual('Concept not a string')
      await expect(union.getIncomingRelations(123)).rejects.toEqual('Concept not a string')
    });
    it('should receive a non empty relations array for an existing concept', async function () {
      const outgoing = await union.getOutgoingRelations('Aiwa')
      expect(outgoing.length).toBeGreaterThan(20)

      const incoming = await union.getIncomingRelations('Aiwa')
      expect(incoming.length).toBeGreaterThan(20)
    })
  })

  describe('Cache Tests', function () {
    const NS_PER_MILLI_SEC = 1000000n
    const concept = 'Ada Lovelace';

    it('should serve an object from the cache', async function () {
      let start = process.hrtime.bigint()
      await union.getConceptObject(concept)
      let end = process.hrtime.bigint()
      let elapsedTime = (end - start) / NS_PER_MILLI_SEC
      expect(elapsedTime).toBeGreaterThan(50n)
      console.log('first fetch', elapsedTime, 'ms')

      let start2 = process.hrtime.bigint()
      await union.getConceptObject(concept)
      let end2 = process.hrtime.bigint()
      let elapsedTime2 = (end2 - start2) / NS_PER_MILLI_SEC
      expect(elapsedTime2).toBeLessThan(50n)
      console.log('second fetch', elapsedTime2, 'ms')
    });
    it('should use a cached document for fetching outgoing relations', async function () {
      let start = process.hrtime.bigint()
      const relations = await union.getOutgoingRelations(concept)
      let end = process.hrtime.bigint()
      let elapsedTime = (end - start) / NS_PER_MILLI_SEC
      expect(relations.length).toBeGreaterThan(0)
      expect(elapsedTime).toBeLessThan(50n)
      console.log('fetch outgoing in', elapsedTime, 'ms')
    });
    it('should fetch a new document for fetching incoming relations the first time', async function () {
      let start = process.hrtime.bigint()
      const relations = await union.getIncomingRelations(concept)
      let end = process.hrtime.bigint()
      let elapsedTime = (end - start) / NS_PER_MILLI_SEC
      expect(relations.length).toBeGreaterThan(0)
      expect(elapsedTime).toBeGreaterThan(0)
      console.log('fetch incoming in', elapsedTime, 'ms')
    });
    it('should use a cached document for fetching incoming relations the second time', async function () {
      let start = process.hrtime.bigint()
      const relations = await union.getIncomingRelations(concept)
      let end = process.hrtime.bigint()
      let elapsedTime = (end - start) / NS_PER_MILLI_SEC
      expect(relations.length).toBeGreaterThan(0)
      expect(elapsedTime).toBeLessThan(50n)
      console.log('fetch incoming in', elapsedTime, 'ms')
    });
    it('should use cached docs for all further fetching', async function () {
      let start = process.hrtime.bigint()
      const outgoing = await union.getOutgoingRelations(concept)
      const incoming = await union.getIncomingRelations(concept)
      const object = await union.getConceptObject(concept)
      let end = process.hrtime.bigint()
      let elapsedTime = (end - start) / NS_PER_MILLI_SEC
      expect(outgoing.length).toBeGreaterThan(0)
      expect(incoming.length).toBeGreaterThan(0)
      expect(Object.keys(object).length).toBeGreaterThan(0)
      expect(elapsedTime).toBeLessThan(50n)
    });
  });
});