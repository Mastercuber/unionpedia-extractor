const { JSDOM } = require('jsdom');

const Unionpedia = (() => {
  let _url = 'https://en.unionpedia.org/';

  function Unionpedia(url) {
    if (url) {
      _url = new URL(url).href
    }
  }

  async function getDocument (concept, incoming = false) {
    let jsdom
    if (incoming) {
      jsdom = await JSDOM.fromURL(`${_url}i/${concept}`)
    } else {
      jsdom = await JSDOM.fromURL(`${_url}${concept}`)
    }
    return jsdom.window.document
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
    const relationsIndex = document.getElementById('relations-index');
    return Array.from(relationsIndex.querySelectorAll('a'));
  }
  async function getConceptObjects (baseConcept, links, withDescription) {
    const conceptObjects = await Promise.all(
      links.map(async (el) => {

        if (!el.href.startsWith('javascript')) {
          const conceptObject = { href: el.href, title: el.text}

          if (withDescription) {
            const jsdom = await JSDOM.fromURL(el.href.replace(`${baseConcept}#`, ''));
            const document = jsdom.window.document;
            const description = document.querySelector('.page-title + p').textContent;
            conceptObject.description = description;
          }

          return conceptObject
        }

      })
    );

    return conceptObjects;
  }

  Unionpedia.prototype.getConceptObject = async function (concept) {
    const document = await getDocument(concept)
    const description = getConceptDescription(document);
    const title = getTitle(document);

    return { href: document.documentURI, title: title, description: description }
  }

  Unionpedia.prototype.getIncomingRelations = async function (concept, withDescription = false) {
    const incomingDocument = await getDocument(concept, true);
    const incomingLinks = getLinks(incomingDocument);
    const conceptObjects = await getConceptObjects(concept, incomingLinks, withDescription);
    return conceptObjects
  };

  Unionpedia.prototype.getOutgoingRelations = async function (concept, withDescription = false) {
    const outgoingDocument = await getDocument(concept);
    const outgoingLinks = getLinks(outgoingDocument);
    const conceptObjects = await getConceptObjects(concept, outgoingLinks, withDescription);
    return conceptObjects;
  };

  return Unionpedia;
})();

module.exports = Unionpedia
