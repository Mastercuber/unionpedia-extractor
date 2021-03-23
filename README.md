# Unionpedia-extractor
unionpedia-extractor is a package for receiving the incoming and outgoing links of the [unionpedia](https://unionpedia.org) Concept-Map.

With the use of [jsdom](https://www.npmjs.com/package/jsdom) a local representation of the document is constructed and the **title**, a reference (**href**) and optionally the **desciption** are extracted.

## Basic Usage
``` javascript
const Unionpedia = require('unionpedia-extractor');
const union = new Unionpedia();
```
The default constructor uses the english unionpedia website. To use another language version, pass the constructor the URL:
``` javascript
const union = new Unionpedia('https://de.unionpedia.org');
```

## API
One concept is represented as an JSON Object:
``` javascript
{
  href: 'https://en.unionpedia.org/Computer science',
  title: 'Computer science',
  description: 'Computer science deals with the theoretical foundations of information and computation, together with practical techniques for the implementation and application of these foundations.'
}
```
A relation looks similar, but has no description. To receive the description, grab the title and receive the concept object.
* `getConceptObject (concept)`
  Receive an object representing the concept.

  Concept can be any query which you can find on unionpedia e.g. *Informatics* or *computer science*


* `getIncomingRelations (concept)`
  Receive all *incoming* related concepts.

  With this function you can receive all the links pointing to the given concept.


* `getOutgoingRelations (concept)`
  Receive all outgoing related concepts.

  With this function you can receive all the links pointing to another concept from the given one.

All functions return **Promises**!

See also:
* [Wikimedia REST API (de)](https://de.wikipedia.org/api/rest_v1/)
* [Wikimedia REST API (en)](https://en.wikipedia.org/api/rest_v1/)
* etc..
