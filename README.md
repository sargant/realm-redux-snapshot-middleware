# realm-redux-snapshot-middleware

[![Travis](https://img.shields.io/travis/sargant/realm-redux-snapshot-middleware.svg?style=flat-square)](https://travis-ci.org/sargant/realm-redux-snapshot-middleware)
[![npm](https://img.shields.io/npm/v/realm-redux-snapshot-middleware.svg?style=flat-square)](https://www.npmjs.com/package/realm-redux-snapshot-middleware)

Simple redux middleware that recursively converts action payloads of type
`Realm.Result` or `Realm.Object` into plain objects and arrays.

**Note: realm-redux-snapshot-middleware expects an
[FSA-compliant](https://github.com/acdlite/flux-standard-action/blob/master/README.md)
action, and will only convert the `payload`**

## Usage

Simply add `realm-redux-snapshot-middleware` to the middlewares of your redux
store:

```javascript
import realmReduxSnapshotMiddleware from 'realm-redux-snapshot-middleware'

const middleware = [
  ...otherMiddleware,
  realmReduxSnapshotMiddleware()
]

createStore(
  combineReducers(reducers),
  initialState,
  compose(applyMiddleware(...middleware, ))
)
```

Then start passing `Realm.Results` or `Realm.Object` objects directly as an
action payload, or as any value on a payload object:

```javascript
// Pass Realm.Results directly to the reducer...
let allCats = realm.objects('Cats')
dispatch({ action: 'LOAD_ALL_CATS', payload: allCats })
// ...or pass the results as one of the payload object value...
let allDogs = realm.objects('Dogs')
dispatch({ action: 'LOAD_ALL_DOGS', payload: { dogs: allDogs } })
// ...or pass an individual Realm.Object as the payload...
let rex = realm.objectForPrimaryKey('Dogs', 'rex')
dispatch({ action: 'LOAD_FAVOURITE_DOG', payload: rex })
// ... or even mix everything together as an object, with both Realm and
// non-Realm values!
dispatch({ action: 'LOADS_OF_PETS', payload: { dogs: allDogs, favouriteDog: rex, otherPets: 'a bird' }})
```

and they will emerge in your reducer as native javascript arrays!

```javascript
const reducer = (state, action) => {
  if (action.type === 'LOADS_OF_PETS') {
    console.log(action.payload.dogs.constructor === Realm.Results) // false
    console.log(action.payload.dogs.constructor === Array) // true
    console.log(action.payload.favouriteDog.constructor === Realm.Object) // false
    console.log(action.payload.favouriteDog.constructor === Object) // true
  }
}
```

## Configuration

The middleware takes an optional `config` object as its only argument, where
all keys are optional:

* `maxDepth` _(default 8)_: maximum depth to which to unpack elements,
  anything beyond this depth is `undefined`. Note that circular references
  are unpacked as separate objects, up to this limit.
* `requireMetaFlag` _(default false)_: if set to `true`, then your actions must
  have `meta.unpackRealm` set to a truthy value to be processed, e.g.:
  ```javascript
  // Using realmReduxSnapshot({ requireMetaFlag: true })
  let action1 = { type: 'TEST', payload: foo } // will not be processed
  let action2 = { type: 'TEST', payload: bar, meta: { unpackRealm: true }} // will be processed
  ```

## Why?

Because sometimes you just want to use Realm as an object database without all
the live updating and state mutations that come with it living in your store.
