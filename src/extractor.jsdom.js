const { JSDOM } = require('jsdom')
const LRU = require('lru-cache')
const { LRUCache } = require('lru-cache')

class Unionpedia {
  #BASE = 'https://en.unionpedia.org/'
  #CACHE
  // Cache for the outgoing edges
  #CACHE_OUTGOING
  // Cache for the incoming edges
  #CACHE_INCOMING
  // Cache for the fetched html sites
  #CACHE_HTML
  /**
   * @param {string} url
   * @param {LRUCache.Options} cacheOptions
   * @param {LRUCache.Options} [objectCacheOptions]
   * @param {LRUCache.Options} [outgoingRelationsCacheOptions]
   * @param {LRUCache.Options} [incomingRelationsCacheOptions]
   * @param {LRUCache.Options} [htmlCacheOptions]
   */
  constructor(url = this.#BASE,
              cacheOptions = {
                max: 1000,
                ttl: 1000 * 60 * 60 * 24
              },
              objectCacheOptions,
              outgoingRelationsCacheOptions,
              incomingRelationsCacheOptions,
              htmlCacheOptions
  ) {
    this.#BASE = url.endsWith('/') ? url : `${url}/`

    this.#CACHE = new LRU(objectCacheOptions || cacheOptions)
    this.#CACHE_OUTGOING = new LRU(outgoingRelationsCacheOptions || cacheOptions)
    this.#CACHE_INCOMING = new LRU(incomingRelationsCacheOptions || cacheOptions)
    this.#CACHE_HTML = new LRU(htmlCacheOptions || cacheOptions)
  }
  #getConceptDescription (doc) {
    const element = doc.window.document.querySelector('.page-title + p')
    if (!element) return ''

    return element.textContent
      .replace(/ \[[0-9]*]/, '')
      .replace(/\[[0-9]*]/, '')
  }
  #getConceptTitle (doc) {
    const element = doc.window.document.querySelector('.page-title h1')
    if (!element) return ''

    return element.textContent
  }
  #getLinks (doc) {
    const descs = Array.from(doc.window.document.querySelectorAll('h2 + .rel-desc'))
    const links = Array.from(doc.window.document.querySelectorAll('h2 > a'))
    const results = []

    for (let i=0; i<descs.length; i++) {
      results.push({
        title: links[i].textContent,
        description: descs[i].textContent,
        href: links[i].href.replaceAll(/\.\/(i\/)?(.+)/g, `${this.#BASE}$2`)
      })
    }
    return results
  }
  async #fetchAndParseHTML(concept, outgoing = true) {
    if (!outgoing) {
      if (this.#CACHE_HTML.has(`${concept}/incoming`)) {
        return this.#CACHE_HTML.get(`${concept}/incoming`)
      }
      let doc
      if (this.#CACHE_HTML.has(concept)) {
        doc = this.#CACHE_HTML.get(concept)
      } else {
        doc = await JSDOM.fromURL(this.#BASE + concept)
        if (!doc.window.document.querySelector('.page-title')) {
          doc.exists = false
        }
        this.#CACHE_HTML.set(concept, doc)
      }
      const links = doc.window.document.querySelectorAll('#tabs-bar a')
      if (links.length === 0) return Promise.reject('Unknown concept')

      let docIncoming
      if (this.#CACHE_HTML.has(`${concept}/incoming`)) {
         docIncoming = this.#CACHE_HTML.get(`${concept}/incoming`)
      } else {
        docIncoming = JSDOM.fromURL(links[1].href.replace('./', this.#BASE))
        this.#CACHE_HTML.set(`${concept}/incoming`, docIncoming)
      }
      return docIncoming
    } else {
      let doc
      if (this.#CACHE_HTML.has(concept)) {
        doc = this.#CACHE_HTML.get(concept)
      } else {
        doc = await JSDOM.fromURL(this.#BASE + concept)
        this.#CACHE_HTML.set(concept, doc)
      }

      if (!doc.window.document.querySelector('.page-title')) {
        return Promise.reject('Unknown concept')
      }
      return doc
    }
  }
  #checkForValidConcept(concept) {
    if (typeof concept !== 'string') return Promise.reject('Concept not a string')
    if (concept.length === 0) return Promise.reject('Concept is empty')
  }
  /**
   * @param {string} concept
   */
  async getConceptObject(concept) {
    await this.#checkForValidConcept(concept)

    concept = concept.trim()
    if (this.#CACHE.has(concept)) {
      if (this.#CACHE_HTML.get(concept).exists === false) {
        return Promise.reject('Unknown concept')
      }
      return this.#CACHE.get(concept)
    }

    const doc = await this.#fetchAndParseHTML(concept)
    if (doc.exists === false) {
      this.#CACHE.set(concept, {})
      return Promise.reject('Unknown concept')
    }
    const description = this.#getConceptDescription(doc)
    const title = this.#getConceptTitle(doc)

    const links = doc.window.document.querySelectorAll('#tabs-bar a')
    const object = {
      href: links[0].href.replace('./', this.#BASE),
      title,
      description
    }
    this.#CACHE.set(concept, object)
    return object
  }
  /**
   * @param {string} concept
   */
  async getOutgoingRelations(concept) {
    await this.#checkForValidConcept(concept)

    concept = concept.trim()
    if (this.#CACHE_OUTGOING.has(concept)) {
      if (this.#CACHE_HTML.get(concept).exists === false) {
        return Promise.reject('Unknown concept')
      }
      return this.#CACHE_OUTGOING.get(concept)
    }

    const doc = await this.#fetchAndParseHTML(concept)
    if (doc.exists === false) {
      this.#CACHE_OUTGOING.set(concept, [])
      return Promise.reject('Unknown concept')
    }
    const relations = this.#getLinks(doc)
    this.#CACHE_OUTGOING.set(concept, relations)
    return relations
  }
  /**
   * @param {string} concept
   */
  async getIncomingRelations(concept) {
    await this.#checkForValidConcept(concept)

    concept = concept.trim()
    if (this.#CACHE_INCOMING.has(concept)) {
      if (this.#CACHE_HTML.get(concept).exists === false) {
        return Promise.reject('Unknown concept')
      }
      return this.#CACHE_INCOMING.get(concept)
    }

    let relations = []
    try {
      const $ = await this.#fetchAndParseHTML(concept, false)
      relations = this.#getLinks($)
    } catch (e) {
      this.#CACHE_INCOMING.set(concept, [])
      throw e
    }
    this.#CACHE_INCOMING.set(concept, relations)
    return relations
  }
}

module.exports = Unionpedia
