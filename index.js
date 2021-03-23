const { JSDOM } = require('jsdom')

const Unionpedia = (() => {
  let _url = 'https://en.unionpedia.org/'

  // Cache for the concept itself and the outgoing edges
  const _cache = {}
  // Cache for the incoming edges
  const _cacheIncoming = {}

  function Unionpedia(url) {
    if (url) {
      _url = new URL(url).href
    }
  }

  async function getDocument (concept, incoming = false) {
    if (incoming) {
      if (concept in _cacheIncoming) return _cacheIncoming[concept].window.document

      _cacheIncoming[concept] = await JSDOM.fromURL(`${_url}i/${concept}`)
      return _cacheIncoming[concept].window.document
    }

    if (concept in _cache) return _cache[concept].window.document

    _cache[concept] = await JSDOM.fromURL(`${_url}${concept}`)

    return _cache[concept].window.document
  }
  function getConceptDescription (document) {
    return document.querySelector('.page-title + p').textContent
      .replace(/ \[[0-9]*\]/, '')
      .replace(/\[[0-9]*\]/, '')
  }
  function getTitle (document) {
    return document.querySelector('.page-title h1').textContent
  }
  function getLinks (document) {
    const relationsIndex = document.getElementById('relations-index')
    const dots = document.getElementById('dots-content')
    relationsIndex.removeChild(dots)

    return Array.from(relationsIndex.querySelectorAll('a:not(#show-all):not(#show-less)'))
  }

  Unionpedia.prototype.getConceptObject = async function (concept) {
    const document = await getDocument(concept)
    const description = getConceptDescription(document)
    const title = getTitle(document)

    return { href: document.documentURI, title: title, description: description }
  }

  Unionpedia.prototype.getIncomingRelations = async function (concept) {
    const incomingDocument = await getDocument(concept, true)
    const incomingLinks = getLinks(incomingDocument)

    return incomingLinks.map(link => {return {href: link.href, title: link.text }})
  };

  Unionpedia.prototype.getOutgoingRelations = async function (concept) {
    const outgoingDocument = await getDocument(concept)
    const outgoingLinks = getLinks(outgoingDocument)

    return outgoingLinks.map(link => {return {href: link.href, title: link.text }})
  }

  return Unionpedia;
})()

module.exports = Unionpedia
