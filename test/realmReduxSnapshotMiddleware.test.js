import realmReduxSnapshot from '../src/realmReduxSnapshotMiddleware'
import Chai from 'chai'
import Mocha from 'mocha'
import rimraf from 'rimraf'
import fs from 'fs'
import Realm from 'realm'

const { describe, it, before } = Mocha
const { expect } = Chai

const testRealm = () => {
  return new Realm({
    path: '.testRealm/Realm',
    schema: [
      {
        name: 'Dog',
        properties: {
          name: 'string',
          likesTreats: 'bool',
          age: 'int'
        }
      },
      {
        name: 'Cat',
        properties: {
          name: 'string',
          likesScratches: 'bool',
          favouriteDog: 'Dog'
        }
      },
      {
        name: 'CatOwner',
        properties: {
          name: 'string',
          cats: { type: 'list', objectType: 'Cat', default: [] }
        }
      }
    ]
  })
}

const initRealm = () => {
  let realm = testRealm()
  realm.write(() => {
    let dog1 = realm.create('Dog', {
      name: 'Rex',
      age: 7,
      likesTreats: true
    }, true)

    let dog2 = realm.create('Dog', {
      name: 'Toby',
      age: 4,
      likesTreats: false
    }, true)

    let cat1 = realm.create('Cat', {
      name: 'Archie',
      likesScratches: false,
      favouriteDog: dog1
    }, true)

    let cat2 = realm.create('Cat', {
      name: 'Gerald',
      likesScratches: true,
      favouriteDog: dog2
    })

    realm.create('CatOwner', {
      name: 'Molly',
      cats: [cat1, cat2]
    })
  })
}

describe('realmReduxSnapshot', () => {
  // Create an instance of realm redux snapshot that passes an empty store
  // and has a next parameter that simply returns the action
  const testMiddleware = (action) => realmReduxSnapshot({})(x => x)(action)

  before(() => {
    rimraf.sync('.testRealm')
    fs.mkdirSync('.testRealm')
    initRealm()
  })

  it('should not change an empty object', () => {
    let initialAction = {}
    let result = testMiddleware(initialAction)
    expect(result).to.equal(initialAction)
  })

  it('should not change a non-FSA compliant action', () => {
    let initialAction = { hello: 'world' }
    let result = testMiddleware(initialAction)
    expect(result).to.equal(initialAction)
  })

  it('should not change an action with no payload', () => {
    let initialAction = { type: 'TEST' }
    let result = testMiddleware(initialAction)
    expect(result).to.equal(initialAction)
  })

  it('should not change the the payload if it is a string', () => {
    let initialAction = { type: 'TEST', payload: 'some string' }
    let result = testMiddleware(initialAction)
    expect(result).to.deep.equal(initialAction)
  })

  it('should not change the payload if it is a basic object', () => {
    let initialAction = { type: 'TEST', payload: {} }
    let result = testMiddleware(initialAction)
    expect(result).to.deep.equal(initialAction)
  })

  it('should change a payload of Realm.Results to an Array', () => {
    let results = testRealm().objects('Dog')
    let initialAction = { type: 'TEST', payload: results }
    let result = testMiddleware(initialAction)
    expect(result.payload.constructor).to.not.equal(Realm.Results)
    expect(result.payload.constructor).to.equal(Array)
  })

  it('should change the values of a payload object from Realm.Results to Arrays', () => {
    let dogs = testRealm().objects('Dog')
    let cats = testRealm().objects('Cat')
    let bird = { name: 'A bird' }
    let initialAction = { type: 'TEST', payload: { dogs, cats, bird } }
    let result = testMiddleware(initialAction)
    expect(result.payload.constructor).to.equal(Object)
    expect(result.payload.dogs.constructor).to.not.equal(Realm.Results)
    expect(result.payload.dogs.constructor).to.equal(Array)
    expect(result.payload.cats.constructor).to.not.equal(Realm.Results)
    expect(result.payload.cats.constructor).to.equal(Array)
    expect(result.payload.bird.constructor).to.equal(Object)
  })

  it('should convert an individual result from Realm.Object to an Object', () => {
    let dogs = testRealm().objects('Dog').filtered('name == "Rex"')
    let initialAction = { type: 'TEST', payload: { dogs } }
    let result = testMiddleware(initialAction)
    expect(result.payload.dogs.constructor).to.not.equal(Realm.Results)
    expect(result.payload.dogs.constructor).to.equal(Array)
    expect(result.payload.dogs).to.have.lengthOf(1)
    let dog = result.payload.dogs[0]
    expect(dog.constructor).to.not.equal(Realm.Object)
    expect(dog.constructor).to.equal(Object)
  })

  it('should preserve the keys and values of the converted object', () => {
    let dogs = testRealm().objects('Dog').filtered('name == "Rex"')
    let initialAction = { type: 'TEST', payload: { dogs } }
    let result = testMiddleware(initialAction)
    expect(result.payload.dogs.constructor).to.not.equal(Realm.Results)
    expect(result.payload.dogs.constructor).to.equal(Array)
    expect(result.payload.dogs).to.have.lengthOf(1)
    let dog = result.payload.dogs[0]
    expect(dog.constructor).to.not.equal(Realm.Object)
    expect(dog.constructor).to.equal(Object)
    expect(dog).to.deep.equal({ name: 'Rex', likesTreats: true, age: 7 })
  })

  it('should convert nested Realm.Object objects into native Objects', () => {
    let cats = testRealm().objects('Cat').filtered('name == "Gerald"')
    let initialAction = { type: 'TEST', payload: { cats } }
    let result = testMiddleware(initialAction)
    expect(result.payload.cats).to.not.be.an.instanceOf(Realm.Results)
    expect(result.payload.cats).to.be.an.instanceOf(Array)
    expect(result.payload.cats).to.have.lengthOf(1)
    expect(result.payload.cats[0]).to.not.be.an.instanceOf(Realm.Object)
    expect(result.payload.cats[0]).to.be.an.instanceOf(Object)
    expect(result.payload.cats[0]).to.have.ownProperty('favouriteDog')
    expect(result.payload.cats[0].favouriteDog).to.not.be.an.instanceOf(Realm.Object)
    expect(result.payload.cats[0].favouriteDog).to.be.an.instanceOf(Object)
    expect(result.payload.cats[0].favouriteDog).to.deep.equal({ name: 'Toby', likesTreats: false, age: 4 })
  })

  it('should convert Realm.List objects into native Arrays', () => {
    let catOwners = testRealm().objects('CatOwner')
    let initialAction = { type: 'TEST', payload: { catOwners } }
    let result = testMiddleware(initialAction)
    expect(result.payload.catOwners.constructor).to.not.equal(Realm.Results)
    expect(result.payload.catOwners.constructor).to.equal(Array)
    expect(result.payload.catOwners).to.have.lengthOf(1)
    let catOwner = result.payload.catOwners[0]
    expect(catOwner.constructor).to.not.equal(Realm.Object)
    expect(catOwner.constructor).to.equal(Object)
    expect(catOwner).to.have.ownProperty('cats')
    expect(catOwner.cats.constructor).to.not.equal(Realm.List)
    expect(catOwner.cats.constructor).to.equal(Array)
    expect(catOwner.cats).to.have.lengthOf(2)
  })

  it('should convert Realm.Objects inside Realm.List objects into native Objects and Arrays', () => {
    let catOwners = testRealm().objects('CatOwner')
    let initialAction = { type: 'TEST', payload: { catOwners } }
    let result = testMiddleware(initialAction)
    let catOwner = result.payload.catOwners[0]
    expect(catOwner.constructor).to.not.equal(Realm.Object)
    expect(catOwner.constructor).to.equal(Object)
    expect(catOwner.cats.constructor).to.not.equal(Realm.List)
    expect(catOwner.cats.constructor).to.equal(Array)
    expect(catOwner.cats).to.have.lengthOf(2)
    expect(catOwner.cats[0].constructor).to.not.equal(Realm.Object)
    expect(catOwner.cats[1].constructor).to.not.equal(Realm.Object)
    expect(catOwner.cats[0].constructor).to.equal(Object)
    expect(catOwner.cats[1].constructor).to.equal(Object)
  })

  it('should convert everything correctly inside a complex nested object', () => {
    let catOwners = testRealm().objects('CatOwner')
    let initialAction = { type: 'TEST', payload: { catOwners } }
    let result = testMiddleware(initialAction)
    let catOwner = result.payload.catOwners[0]
    expect(catOwner).to.deep.equal({
      name: 'Molly',
      cats: [
        {
          name: 'Archie',
          likesScratches: false,
          favouriteDog: {
            name: 'Rex',
            age: 7,
            likesTreats: true
          }
        },
        {
          name: 'Gerald',
          likesScratches: true,
          favouriteDog: {
            name: 'Toby',
            age: 4,
            likesTreats: false
          }
        }
      ]
    })
  })
})
