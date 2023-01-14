# Unionpedia Extractor
unionpedia-extractor is a package for receiving the incoming and outgoing relations of a concept of the [unionpedia](https://unionpedia.org) Concept-Map.

With the use of [cheerio](https://www.npmjs.com/package/cheerio) a local representation of the document is constructed and the **title**, a reference (**href**) and the **desciption** are extracted.


## Basic Usage
``` javascript
const Unionpedia = require('unionpedia-extractor');
const union = new Unionpedia();
```
The default constructor uses the english unionpedia website. To use another language version, pass the constructor the URL:
``` javascript
const union = new Unionpedia('https://de.unionpedia.org');
```
The fetched and parsed html documents (1), incoming (2) and outgoing (3) relations and the concept objects (4) are cached in 4 different LRU-Caches. 

As default, all caches are configured to keep *maximal* **1000** values with a *TTL* of **1 day**. To change the options for all caches pass a second argument with the options from the [lru-cache](https://www.npmjs.com/package/lru-cache) package: 
``` javascript
const union = new Unionpedia('https://en.unionpedia.org', { max: 2000, ttl: 1000 * 60 * 60 * 24 * 7 });
```

To configure all 4 caches individually, it's possible to pass `null` as the second argument and then 4 options objects.
``` javascript
const union = new Unionpedia('https://en.unionpedia.org', null, 
  { max: 2000, ttl: 1000 * 60 * 60 * 24 * 7 }, // conceptObject Cache
  { max: 2000, ttl: 1000 * 60 * 60 * 24 * 7 }, // outgoingRelations Cache
  { max: 2000, ttl: 1000 * 60 * 60 * 24 * 7 }, // incomingRelations Cache
  { max: 2000, ttl: 1000 * 60 * 60 * 24 * 7 }  // HTML Cache
)
```
When the second argument is given, and an options object is `null`, then the second argument is used instead.

## API
One concept is represented as an JSON Object:
``` javascript
{
  href: 'https://en.unionpedia.org/Computer science',
  title: 'Computer science',
  description: 'Computer science deals with the theoretical foundations of information and computation, together with practical techniques for the implementation and application of these foundations.'
}
```
* `getConceptObject (concept)`
  Receive an object representing the concept.

  Concept can be any query which you can find on unionpedia e.g. *Informatics* or *computer science*


* `getIncomingRelations (concept)`
  Receive all *incoming* related concepts.

  With this function you can receive all the links pointing to the given concept.


* `getOutgoingRelations (concept)`
  Receive all outgoing related concepts.

  With this function you can receive all the links pointing to another concept from the given one.

All functions return **Promises**:  
-> When a concept ***exists***, the promise ***resolves***  
-> When a concept is ***not a string***, ***empty*** or ***doesn't exist***, the promise is ***rejected*** and an error message is passed

See also:
* [Wikimedia REST API (de)](https://de.wikipedia.org/api/rest_v1/)
* [Wikimedia REST API (en)](https://en.wikipedia.org/api/rest_v1/)
* etc..
