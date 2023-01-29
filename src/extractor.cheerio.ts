import * as cheerio from 'cheerio'
import fr from 'follow-redirects'
const { https } = fr
import LRU from 'lru-cache'
import { CheerioAPI as CheerIOAPI } from 'cheerio'

export type Concept = {
  title: string
  href: string
  description: string
}

interface CheerioAPI extends CheerIOAPI {
  exists: boolean
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
  private readonly CACHE_HTML: LRU<string, CheerioAPI>
  constructor(url?: string,
              cacheOptions: LRU.Options<string, Concept | Concept[] | CheerioAPI> = {
                max: 1000,
                ttl: 1000 * 60 * 60 * 24
              },
              objectCacheOptions?: LRU.Options<string, Concept>,
              outgoingRelationsCacheOptions?: LRU.Options<string, Concept[]>,
              incomingRelationsCacheOptions?: LRU.Options<string, Concept[]>,
              htmlCacheOptions?: LRU.Options<string, CheerioAPI>
  ) {
    url = url || this.BASE
    this.BASE = url.endsWith('/') ? url : `${url}/`

    this.CACHE = new LRU(objectCacheOptions || cacheOptions) as LRU<string, Concept>
    this.CACHE_OUTGOING = new LRU(outgoingRelationsCacheOptions || cacheOptions) as LRU<string, Concept[]>
    this.CACHE_INCOMING = new LRU(incomingRelationsCacheOptions || cacheOptions) as LRU<string, Concept[]>
    this.CACHE_HTML = new LRU(htmlCacheOptions || cacheOptions) as LRU<string, CheerioAPI>
  }
  private getConceptDescription ($) {
    const pageTitles = $('.page-title + p')
    if (pageTitles.length === 0) return ''

    return pageTitles[0].children[0].data
      .replace(/ \[[0-9]*]/, '')
      .replace(/\[[0-9]*]/, '')
  }
  private getConceptTitle ($) {
    const headers = $('.page-title h1')
    if (headers.length === 0) return ''

    return headers[0].children[0].data
  }
  private getLinks ($: CheerioAPI) {
    const descs = Array.from($('h2 + .rel-desc'))
    const links = Array.from($('h2 > a'))
    const results = []

    for (let i=0; i<descs.length; i++) {
      results.push({ // @ts-ignore
        title: links[i].children[0].data, // @ts-ignore
        description: descs[i].children[0].data,
        href: links[i].attribs.href.replaceAll(/\.\/(i\/)?(.+)/g, `${this.BASE}$2`)
      })
    }
    return results
  }
  private fetchHtml(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
      https.get(url, (res) => {
        let data = ''
        res.on('data', (d) => {
          data += d
        });
        res.on('close', () => {
          resolve(data)
        })
      }).on('error', (e) => {
        reject(e)
      });
    });
  }
  private fetchAndParseHTML(concept: string, outgoing = true): Promise<CheerioAPI> {
    return new Promise(async (resolve, reject) => {
      let url = this.BASE + concept.replaceAll(' ', '_')
      if (!outgoing) {
        if (this.CACHE_HTML.has(`${concept}/incoming`)) {
          return resolve(this.CACHE_HTML.get(`${concept}/incoming`))
        }
        let $: CheerioAPI
        if (this.CACHE_HTML.has(concept)) {
          $ = this.CACHE_HTML.get(concept)
        } else {
          // fetch the document to extract the incoming relations href,
          // since this is a bit buggy when self constructed
          const html = await this.fetchHtml(url)

          $ = cheerio.load(html) as CheerioAPI
          if ($('.page-title').length === 0) {
            $.exists = false
          }
          this.CACHE_HTML.set(concept, $)
        }

        const links = $('#tabs-bar a')
        if (links.length === 0) return reject('Unknown concept')

        url = links[1].attribs.href.replace('./', this.BASE)
      } else if (this.CACHE_HTML.has(concept)) {
        return resolve(this.CACHE_HTML.get(concept))
      }

      const html = await this.fetchHtml(url)

      const $ = cheerio.load(html) as CheerioAPI
      if ($('.page-title').length === 0) {
        $.exists = false
      }
      if (outgoing) {
        this.CACHE_HTML.set(concept, $)
      } else {
        this.CACHE_HTML.set(`${concept}/incoming`, $)
      }
      resolve($)
    })
  }
  private checkForValidConcept(concept: string) {
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

    const $ = await this.fetchAndParseHTML(concept)
    if ($.exists === false) {
      this.CACHE.set(concept, {} as Concept)
      return Promise.reject('Unknown concept')
    }
    const description = this.getConceptDescription($)
    const title = this.getConceptTitle($)

    const [link] = $('#tabs-bar a')
    const object = {
      href: link.attribs.href.replace('./', this.BASE),
      title,
      description
    };
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

    const $ = await this.fetchAndParseHTML(concept)
    if ($.exists === false) {
      this.CACHE_OUTGOING.set(concept, [])
      return Promise.reject('Unknown concept')
    }
    const relations = this.getLinks($)
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
      if ($.exists === false) {
        this.CACHE_INCOMING.set(concept, [])
        return Promise.reject('Unknown concept')
      }
      relations = this.getLinks($)
    } catch (e) {
      this.CACHE_INCOMING.set(concept, [])
      throw e
    }
    this.CACHE_INCOMING.set(concept, relations)

    return relations
  }
}
