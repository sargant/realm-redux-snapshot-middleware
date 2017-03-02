# realm-redux-snapshot-middleware

[![Travis](https://img.shields.io/travis/sargant/realm-redux-snapshot-middleware.svg?style=flat-square)](https://travis-ci.org/sargant/realm-redux-snapshot-middleware)
[![npm](https://img.shields.io/npm/v/realm-redux-snapshot-middleware.svg?style=flat-square)](https://www.npmjs.com/package/realm-redux-snapshot-middleware)

Simple redux middleware that converts the payload of an action with a type of
`Realm.Results` (or an object with some values of type `Relam.Results`) into a
plain javascript object. Recursively converts all instances of `Realm.Object`
and `Realm.List` into native objects and arrays.

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

Then start passing `Realm.Results` objects directly as an action payload, or as
any value on an object:

```javascript
// As the payload directly...
let allCats = realm.objects('Cats')
dispatch({ action: 'LOAD_ALL_CATS', payload: allCats })
// ...or as a value of one of the payload keys
let allDogs = realm.Objects('Dogs')
dispatch({ action: 'LOAD_ALL_DOGS', payload: { dogs: allDogs } })
```

and they will emerge in your reducer as native javascript arrays and objects in
your reducer!

```javascript
const reducer = (state, action) => {
  if (action.type === 'LOAD_ALL_CATS') {
    console.log(action.prototype.constructor === Realm.Results) // false
    console.log(action.prototype[0].constructor === Realm.Object) // false
    console.log(action.prototype.constructor === Array) // true
    console.log(action.prototype[0].constructor === Object) // true
  }
}
```

## Configuration

The middleware takes an optional `config` object as its only argument, where
all keys are optional:

* `maxDepth` _(default 8)_: maximum depth to which to unpack elements,
  anything beyond this depth is `undefined`. Note that circular references
  are unpacked as separate objects, up to this limit.

## Why?

Because working with simple objects and arrays in your state is much easier,
and avoids problems with live updates, state mutations and other
unpredictabilities.
