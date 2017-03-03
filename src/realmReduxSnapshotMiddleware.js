import { isFSA } from 'flux-standard-action'
import {
  Results as RealmResults,
  Object as RealmObject,
  List as RealmList
} from 'realm'

const defaultConfig = {
  maxDepth: 8,
  requireMetaFlag: false
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

  // If the "require meta flag" setting is set, and the action doesn't have
  // the flag, take no action
  if (config.requireMetaFlag) {
    if (!initialAction.meta || !initialAction.meta.unpackRealm) {
      return next(initialAction)
    }
  }

  // Make a shallow clone of the action to avoid mutating the original
  let action = { ...initialAction }

  // If the payload is a Realm.Results instance, convert into an array,
  // with each value converted to a basic object
  if (action.payload.constructor === RealmResults) {
    action.payload = action.payload.map(x => snapshotRealmObject(x, 0, config.maxDepth))
  // If it's a Realm.Object instance, convert it into a basic object
  } else if (action.payload.constructor === RealmObject) {
    action.payload = snapshotRealmObject(action.payload, 0, config.maxDepth)
  // If the payload is an object instance, loop through all its values.
  } else if (action.payload.constructor === Object) {
    Object.keys(action.payload).forEach(key => {
      // Only check if the value is truthy - other values won't have a constructor
      if (action.payload[key]) {
        // If it's a RealmResults instance, convert it into an array of plain objects
        if (action.payload[key].constructor === RealmResults) {
          action.payload[key] = action.payload[key].map(x => snapshotRealmObject(x, 0, config.maxDepth))
        // If it's a RealmObject instance, convert it into a plain object
        } else if (action.payload[key].constructor === RealmObject) {
          action.payload[key] = snapshotRealmObject(action.payload[key], 0, config.maxDepth)
        }
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
    // Something nullable - it won't have a constructor to check
    if (!object[key]) {
      unpackedObject[key] = object[key]

    // A RealmObject, for turning onto an Object
    } else if (object[key].constructor === RealmObject) {
      unpackedObject[key] = snapshotRealmObject(object[key], depth + 1, maxDepth)

    // A RealmList instance, to be turned into an Array of Objects
    } else if (object[key].constructor === RealmList) {
      unpackedObject[key] = object[key].map(x => snapshotRealmObject(x, depth + 1, maxDepth))

    // Some other object we don't need to convert
    } else {
      unpackedObject[key] = object[key]
    }
  })

  return unpackedObject
}

export default realmReduxSnapshot
