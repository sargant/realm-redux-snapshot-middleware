import { isFSA } from 'flux-standard-action'
import {
  Results as RealmResults,
  Object as RealmObject,
  List as RealmList
} from 'realm'

const defaultConfig = {
  maxDepth: 8
}

/**
 * Converts an FSA action with a payload that is either a Realm.Results
 * instance, or an object with any values that are Realm.Results instances, to
 * a simple object
 */
const realmReduxSnapshot = (incomingConfig) => () => (next) => (initialAction) => {
  // If the action is not FSA-compliant or it has no payload,
  // take no action
  if (!isFSA(initialAction) || !initialAction.payload) {
    return next(initialAction)
  }

  // Merge the user-set configuration with the default configugration
  const config = {
    ...defaultConfig,
    ...incomingConfig
  }

  // Make a shallow clone of the action to avoid mutating the original
  let action = { ...initialAction }

  // If the payload is a Realm.Results instance, convert into an array,
  // with each value converted to a basic object
  if (action.payload.constructor === RealmResults) {
    action.payload = action.payload.map(x => snapshotRealmObject(x, 0, config.maxDepth))

  // If the payload is an object instance, loop through all its values.
  // If any of the values are an instance of a Realm.Results object, convert
  // them into a simple array, with each value converted to a basic object
  } else if (action.payload.constructor === Object) {
    Object.keys(action.payload).forEach(key => {
      if (action.payload[key].constructor === RealmResults) {
        action.payload[key] = action.payload[key].map(x => snapshotRealmObject(x, 0, config.maxDepth))
      }
    })
  }

  // Continue onto the next middleware with our modified action
  return next(action)
}

/**
 * Converts a Realm.Object instance into a simple javascript object,
 * with any nested Realm.Object or Realm.List values recursively converted
 * into simple objects and arrays respectively
 */
const snapshotRealmObject = (object, depth, maxDepth) => {
  // If not a realm object, return immediately
  if (object.constructor !== RealmObject) {
    return object
  }

  // If we've exceeded the max depth, stop unpacking
  if (depth > maxDepth) {
    return undefined
  }

  // Unpack the Realm.Object into a simple object
  let unpackedObject = {}

  // For each of its values, check if any are instances of Realm.Object
  // or Realm.List, and convert them recursively
  Object.keys(object).forEach((key) => {
    if (object[key].constructor === RealmObject) {
      unpackedObject[key] = snapshotRealmObject(object[key], depth + 1, maxDepth)
    } else if (object[key].constructor === RealmList) {
      unpackedObject[key] = object[key].map(x => snapshotRealmObject(x, depth + 1, maxDepth))
    } else {
      unpackedObject[key] = object[key]
    }
  })

  return unpackedObject
}

export default realmReduxSnapshot
