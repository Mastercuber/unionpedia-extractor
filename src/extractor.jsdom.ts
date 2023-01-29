import { JSDOM } from 'jsdom'
import LRU from 'lru-cache'

export type Concept = {
  title: string
  href: string
  description: string
}

export default class Unionpedia {
  private readonly BASE: string = 'https://en.unionpedia.org/'
  // Cache for the concept object
  private readonly CACHE: LRU<string, Concept>
  // Cache for the outgoing edges
  private readonly CACHE_OUTGOING: LRU<string, Concept[]>
  // Cache for the incoming edges
  private readonly CACHE_INCOMING: LRU<string, Concept[]>
  // Cache for the fetched html sites
  private readonly CACHE_HTML: LRU<string, JSDOM>

  constructor(url?: string,
              cacheOptions: LRU.Options<string, Concept | Concept[] | JSDOM> = {
                max: 1000,
                ttl: 1000 * 60 * 60 * 24
              },
              objectCacheOptions?: LRU.Options<string, Concept>,
              outgoingRelationsCacheOptions?: LRU.Options<string, Concept[]>,
              incomingRelationsCacheOptions?: LRU.Options<string, Concept[]>,
              htmlCacheOptions?: LRU.Options<string, JSDOM>
  ) {
    this.BASE = url.endsWith('/') ? url : `${url}/`

    this.CACHE = new LRU(objectCacheOptions || cacheOptions) as LRU<string, Concept>
    this.CACHE_OUTGOING = new LRU(outgoingRelationsCacheOptions || cacheOptions) as LRU<string, Concept[]>
    this.CACHE_INCOMING = new LRU(incomingRelationsCacheOptions || cacheOptions) as LRU<string, Concept[]>
    this.CACHE_HTML = new LRU(htmlCacheOptions || cacheOptions) as LRU<string, JSDOM>
  }
  private getConceptDescription (doc) {
    const element = doc.window.document.querySelector('.page-title + p')
    if (!element) return ''

    return element.textContent
      .replace(/ \[[0-9]*]/, '')
      .replace(/\[[0-9]*]/, '')
  }
  private getConceptTitle (doc) {
    const element = doc.window.document.querySelector('.page-title h1')
    if (!element) return ''

    return element.textContent
  }
  private getLinks (doc) {
    const descs = Array.from(doc.window.document.querySelectorAll('h2 + .rel-desc'))
    const links = Array.from(doc.window.document.querySelectorAll('h2 > a'))
    const results = []

    for (let i=0; i<descs.length; i++) {
      results.push({ // @ts-ignore
        title: links[i].textContent, // @ts-ignore
        description: descs[i].textContent, // @ts-ignore
        href: links[i].href.replaceAll(/\.\/(i\/)?(.+)/g, `${this.BASE}$2`)
      })
    }
    return results
  }
  private async fetchAndParseHTML(concept, outgoing = true) {
    if (!outgoing) {
      if (this.CACHE_HTML.has(`${concept}/incoming`)) {
        return this.CACHE_HTML.get(`${concept}/incoming`)
      }
      let doc
      if (this.CACHE_HTML.has(concept)) {
        doc = this.CACHE_HTML.get(concept)
      } else {
        doc = await JSDOM.fromURL(this.BASE + concept)
        if (!doc.window.document.querySelector('.page-title')) {
          doc.exists = false
        }
        this.CACHE_HTML.set(concept, doc)
      }
      const links = doc.window.document.querySelectorAll('#tabs-bar a')
      if (links.length === 0) return Promise.reject('Unknown concept')

      let docIncoming
      if (this.CACHE_HTML.has(`${concept}/incoming`)) {
         docIncoming = this.CACHE_HTML.get(`${concept}/incoming`)
      } else {
        docIncoming = JSDOM.fromURL(links[1].href.replace('./', this.BASE))
        this.CACHE_HTML.set(`${concept}/incoming`, docIncoming)
      }
      return docIncoming
    } else {
      let doc
      if (this.CACHE_HTML.has(concept)) {
        doc = this.CACHE_HTML.get(concept)
      } else {
        doc = await JSDOM.fromURL(this.BASE + concept)
        this.CACHE_HTML.set(concept, doc)
      }

      if (!doc.window.document.querySelector('.page-title')) {
        return Promise.reject('Unknown concept')
      }
      return doc
    }
  }
  private checkForValidConcept(concept) {
    if (typeof concept !== 'string') return Promise.reject('Concept not a string')
    if (concept.length === 0) return Promise.reject('Concept is empty')
  }

  async getConceptObject(concept: string): Promise<Concept> {
    await this.checkForValidConcept(concept)

    concept = concept.trim()
    if (this.CACHE.has(concept)) {
      if (this.CACHE_HTML.get(concept).exists === false) {
        return Promise.reject('Unknown concept')
      }
      return this.CACHE.get(concept)
    }

    const doc = await this.fetchAndParseHTML(concept)
    if (doc.exists === false) {
      this.CACHE.set(concept, {} as Concept)
      return Promise.reject('Unknown concept')
    }
    const description = this.getConceptDescription(doc)
    const title = this.getConceptTitle(doc)

    const links = doc.window.document.querySelectorAll('#tabs-bar a')
    const object = {
      href: links[0].href.replace('./', this.BASE),
      title,
      description
    }
    this.CACHE.set(concept, object)
    return object
  }

  async getOutgoingRelations(concept: string): Promise<Concept[]> {
    await this.checkForValidConcept(concept)

    concept = concept.trim()
    if (this.CACHE_OUTGOING.has(concept)) {
      if (this.CACHE_HTML.get(concept).exists === false) {
        return Promise.reject('Unknown concept')
      }
      return this.CACHE_OUTGOING.get(concept)
    }

    const doc = await this.fetchAndParseHTML(concept)
    if (doc.exists === false) {
      this.CACHE_OUTGOING.set(concept, [])
      return Promise.reject('Unknown concept')
    }
    const relations = this.getLinks(doc)
    this.CACHE_OUTGOING.set(concept, relations)
    return relations
  }

  async getIncomingRelations(concept: string): Promise<Concept[]> {
    await this.checkForValidConcept(concept)

    concept = concept.trim()
    if (this.CACHE_INCOMING.has(concept)) {
      if (this.CACHE_HTML.get(concept).exists === false) {
        return Promise.reject('Unknown concept')
      }
      return this.CACHE_INCOMING.get(concept)
    }

    let relations = []
    try {
      const $ = await this.fetchAndParseHTML(concept, false)
      relations = this.getLinks($)
    } catch (e) {
      this.CACHE_INCOMING.set(concept, [])
      throw e
    }
    this.CACHE_INCOMING.set(concept, relations)
    return relations
  }
}
