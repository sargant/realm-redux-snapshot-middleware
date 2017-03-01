# realm-redux-snapshot-middleware

[![Travis](https://img.shields.io/travis/sargant/realm-redux-snapshot-middleware.svg?style=flat-square)](https://travis-ci.org/sargant/realm-redux-snapshot-middleware)
[![npm](https://img.shields.io/npm/v/realm-redux-snapshot-middleware.svg?style=flat-square)](https://www.npmjs.com/package/realm-redux-snapshot-middleware)

Simple redux middleware that converts the payload of an action with a type of `Realm.Results` (or an object with some values of type `Relam.Results`) into a plain javascript object. Recursively converts all instances of `Realm.Object` and `Realm.List` into native objects and arrays.

**Note: realm-redux-snapshot-middleware expects an [FSA-compliant](https://github.com/acdlite/flux-standard-action/blob/master/README.md) action, and will only convert the `payload`**

## Usage

Simply add `realm-redux-snapshot-middleware` to the middlewares of your redux store:

```javascript
import realmReduxSnapshotMiddleware from 'realm-redux-snapshot-middleware'

const middleware = [
  ...otherMiddleware,
  realmReduxSnapshotMiddleware
]

createStore(
  combineReducers(reducers),
  initialState,
  compose(applyMiddleware(...middleware, ))
)
```

Then start passing `Realm.Results` objects directly as an action payload:

```javascript
let allCats = realm.objects('Cats')

dispatch({
    action: 'LOAD_ALL_CATS',
    payload: allCats
})
```

or pass an object as the payload, and any values on the top-level object that are instances of `Realm.Results` will also be converted:

```javascript
let allDogs = realm.Objects('Dogs')

dispatch({
  action: 'LOAD_ALL_DOGS',
  payload: { dogs: allDogs }
})
```

and they will emerge in your reducer as native javascript arrays and objects in your reducer:

```javascript
const reducer = (state, action) => {
  // action.payload is an array of objects with the middleware,
  // as opposed to a Realm.Results instance
}
```

### Why?

Because working with simple objects and arrays in your state is much easier, and avoids problems with live updates, state mutations and other nastiness.
