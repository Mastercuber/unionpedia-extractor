const cheerio = require('cheerio')
const { https } = require('follow-redirects')
const LRU = require('lru-cache')
const { LRUCache } = require('lru-cache')

class Unionpedia {
  #BASE = 'https://en.unionpedia.org/'
  // Cache for the concept object
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
  #getConceptDescription ($) {
    const pageTitles = $('.page-title + p')
    if (pageTitles.length === 0) return ''

    return pageTitles[0].children[0].data
      .replace(/ \[[0-9]*]/, '')
      .replace(/\[[0-9]*]/, '')
  }
  #getConceptTitle ($) {
    const headers = $('.page-title h1')
    if (headers.length === 0) return ''

    return headers[0].children[0].data
  }
  #getLinks ($) {
    const descs = Array.from($('h2 + .rel-desc'))
    const links = Array.from($('h2 > a'))
    const results = []

    for (let i=0; i<descs.length; i++) {
      results.push({
        title: links[i].children[0].data,
        description: descs[i].children[0].data,
        href: links[i].attribs.href.replaceAll(/\.\/(i\/)?(.+)/g, `${this.#BASE}$2`)
      })
    }
    return results
  }
  #fetchAndParseHTML(concept, outgoing = true) {
    return new Promise(async (resolve, reject) => {
      let url = this.#BASE + concept.replaceAll(' ', '_')
      if (!outgoing) {
        if (this.#CACHE_HTML.has(`${concept}/incoming`)) {
          return resolve(this.#CACHE_HTML.get(`${concept}/incoming`))
        }
        let $
        if (this.#CACHE_HTML.has(concept)) {
          $ = this.#CACHE_HTML.get(concept)
        } else {
          // fetch the document to extract the incoming relations href,
          // since this is a bit buggy when self constructed
          const html = await new Promise((_resolve, _reject) => {
            https.get(url, (res) => {
              let data = ''
              res.on('data', (d) => {
                data += d
              });
              res.on('close', () => {
                _resolve(data)
              })
            }).on('error', (e) => {
              _reject(e)
            });
          }).catch(reject)

          $ = cheerio.load(html)
          if ($('.page-title').length === 0) {
            $.exists = false
          }
          this.#CACHE_HTML.set(concept, $)
        }

        const links = $('#tabs-bar a')
        if (links.length === 0) return reject('Unknown concept')

        url = links[1].attribs.href.replace('./', this.#BASE)
      } else if (this.#CACHE_HTML.has(concept)) {
        return resolve(this.#CACHE_HTML.get(concept))
      }

      https.get(url, (res) => {
        let data = ''
        res.on('data', (d) => {
          data += d
        });
        res.on('close', () => {
          const $ = cheerio.load(data)
          if ($('.page-title').length === 0) {
            $.exists = false
          }
          if (outgoing) {
            this.#CACHE_HTML.set(concept, $)
          } else {
            this.#CACHE_HTML.set(`${concept}/incoming`, $)
          }
          resolve($)
        })
      }).on('error', (e) => {
        reject(e)
      });
    })
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

    const $ = await this.#fetchAndParseHTML(concept)
    if ($.exists === false) {
      this.#CACHE.set(concept, {})
      return Promise.reject('Unknown concept')
    }
    const description = this.#getConceptDescription($)
    const title = this.#getConceptTitle($)

    const [link] = $('#tabs-bar a')
    const object = {
      href: link.attribs.href.replace('./', this.#BASE),
      title,
      description
    };
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

    const $ = await this.#fetchAndParseHTML(concept)
    if ($.exists === false) {
      this.#CACHE_OUTGOING.set(concept, [])
      return Promise.reject('Unknown concept')
    }
    const relations = this.#getLinks($)
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
