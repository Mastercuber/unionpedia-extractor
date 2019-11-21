# Unionpedia-extractor
unionpedia-extractor is a package for receiving the incoming and outgoing links of the [unionpedia](https://unionpedia.org) Concept-Map.

With the use of [jsdom](https://www.npmjs.com/package/jsdom) a local representation of the document is constructed and the **title**, a reference (**href**) and optionally the **desciption** are extracted.

## Basic Usage
```
const Unionpedia = require('unionpedia-extractor');
const union = new Unionpedia();
```
The default constructor uses the english unionpedia website. To use another language version, pass the constructor the URL: 
```
const union = new Unionpedia('https://de.unionpedia.org');
```

## API
One concept is represented as an object:
```
{
  href: 'https://en.unionpedia.org/Computer science',
  title: '',
  description: '' [optional]
}
```
* `getConceptObject (concept)`  
    Receive an object representing the concept.
      
    Concept can be any query which you can find on unionpedia e.g. *Informatics* or *computer science*
* `getIncomingRelations (concept, withDescription = false)`  
    Receive all *incoming* related concepts.
      
    With this function you can receive all the links pointing to the given concept.
    
    If you also want the *description* pass `true` as the second argument.
* `getOutgoingRelations (concept, withDescription = false)`  
    Reviece all outgoing related concepts.
    
    With this function you can receive all the links pointing to another concept from the given one.

    If you also want the *description* pass `true` as the second argument.

All functions returns **Promises**!
