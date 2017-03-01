import realmReduxSnapshot from '../src/realmReduxSnapshotMiddleware'
import Chai from 'chai'
import Mocha from 'mocha'
import rimraf from 'rimraf'
import fs from 'fs'
import Realm from 'realm'

const { describe, it, before, after } = Mocha
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
  before(() => {
    rimraf.sync('.testRealm')
    fs.mkdirSync('.testRealm')
    initRealm()
  })

  after(() => {
    rimraf.sync('.testRealm')
  })

  it('should not mutate the action if it does not have a payload', () => {
    let initialAction = {}
    let next = (action) => expect(action).to.equal(initialAction)
    realmReduxSnapshot()(next)(initialAction)
  })

  it('should not change the action if it has a payload of type string', () => {
    let initialAction = { type: 'TEST', payload: 'some string' }
    let next = (action) => expect(action).to.equal(initialAction)
    realmReduxSnapshot()(next)(initialAction)
  })

  it('should not change the action if it has a payload of type object', () => {
    let initialAction = { type: 'TEST', payload: {} }
    let next = (action) => {
      expect(action).to.equal(initialAction)
    }
    realmReduxSnapshot()(next)(initialAction)
  })

  it('should change a payload of Realm.Results to an Array', () => {
    let results = testRealm().objects('Dog')
    let initialAction = { type: 'TEST', payload: results }
    let next = (action) => {
      expect(action.payload.constructor).to.not.equal(Realm.Results)
      expect(action.payload.constructor).to.equal(Array)
    }
    realmReduxSnapshot()(next)(initialAction)
  })

  it('should change the values of a payload object from Realm.Results to Arrays', () => {
    let dogs = testRealm().objects('Dog')
    let cats = testRealm().objects('Cat')
    let bird = { name: 'A bird' }
    let initialAction = { type: 'TEST', payload: { dogs, cats, bird } }
    let next = (action) => {
      expect(action.payload.constructor).to.equal(Object)
      expect(action.payload.dogs.constructor).to.not.equal(Realm.Results)
      expect(action.payload.dogs.constructor).to.equal(Array)
      expect(action.payload.cats.constructor).to.not.equal(Realm.Results)
      expect(action.payload.cats.constructor).to.equal(Array)
      expect(action.payload.bird.constructor).to.equal(Object)
    }
    realmReduxSnapshot()(next)(initialAction)
  })

  it('should convert an individual result from Realm.Object to an Object', () => {
    let dogs = testRealm().objects('Dog').filtered('name == "Rex"')
    let initialAction = { type: 'TEST', payload: { dogs } }
    let next = (action) => {
      expect(action.payload.dogs.constructor).to.not.equal(Realm.Results)
      expect(action.payload.dogs.constructor).to.equal(Array)
      expect(action.payload.dogs).to.have.lengthOf(1)
      let dog = action.payload.dogs[0]
      expect(dog.constructor).to.not.equal(Realm.Object)
      expect(dog.constructor).to.equal(Object)
    }
    realmReduxSnapshot()(next)(initialAction)
  })

  it('should preserve the keys and values of the converted object', () => {
    let dogs = testRealm().objects('Dog').filtered('name == "Rex"')
    let initialAction = { type: 'TEST', payload: { dogs } }
    let next = (action) => {
      expect(action.payload.dogs.constructor).to.not.equal(Realm.Results)
      expect(action.payload.dogs.constructor).to.equal(Array)
      expect(action.payload.dogs).to.have.lengthOf(1)
      let dog = action.payload.dogs[0]
      expect(dog.constructor).to.not.equal(Realm.Object)
      expect(dog.constructor).to.equal(Object)
      expect(dog).to.deep.equal({ name: 'Rex', likesTreats: true, age: 7 })
    }
    realmReduxSnapshot()(next)(initialAction)
  })

  it('should convert nested Realm.Object objects into native Objects', () => {
    let cats = testRealm().objects('Cat').filtered('name == "Gerald"')
    let initialAction = { type: 'TEST', payload: { cats } }
    let next = (action) => {
      expect(action.payload.cats).to.not.be.an.instanceOf(Realm.Results)
      expect(action.payload.cats).to.be.an.instanceOf(Array)
      expect(action.payload.cats).to.have.lengthOf(1)
      expect(action.payload.cats[0]).to.not.be.an.instanceOf(Realm.Object)
      expect(action.payload.cats[0]).to.be.an.instanceOf(Object)
      expect(action.payload.cats[0]).to.have.ownProperty('favouriteDog')
      expect(action.payload.cats[0].favouriteDog).to.not.be.an.instanceOf(Realm.Object)
      expect(action.payload.cats[0].favouriteDog).to.be.an.instanceOf(Object)
      expect(action.payload.cats[0].favouriteDog).to.deep.equal({ name: 'Toby', likesTreats: false, age: 4 })
    }
    realmReduxSnapshot()(next)(initialAction)
  })

  it('should convert Realm.List objects into native Arrays', () => {
    let catOwners = testRealm().objects('CatOwner')
    let initialAction = { type: 'TEST', payload: { catOwners } }
    let next = (action) => {
      expect(action.payload.catOwners.constructor).to.not.equal(Realm.Results)
      expect(action.payload.catOwners.constructor).to.equal(Array)
      expect(action.payload.catOwners).to.have.lengthOf(1)
      let catOwner = action.payload.catOwners[0]
      expect(catOwner.constructor).to.not.equal(Realm.Object)
      expect(catOwner.constructor).to.equal(Object)
      expect(catOwner).to.have.ownProperty('cats')
      expect(catOwner.cats.constructor).to.not.equal(Realm.List)
      expect(catOwner.cats.constructor).to.equal(Array)
      expect(catOwner.cats).to.have.lengthOf(2)
    }
    realmReduxSnapshot()(next)(initialAction)
  })

  it('should convert Realm.Objects inside Realm.List objects into native Objects and Arrays', () => {
    let catOwners = testRealm().objects('CatOwner')
    let initialAction = { type: 'TEST', payload: { catOwners } }
    let next = (action) => {
      let catOwner = action.payload.catOwners[0]
      expect(catOwner.constructor).to.not.equal(Realm.Object)
      expect(catOwner.constructor).to.equal(Object)
      expect(catOwner.cats.constructor).to.not.equal(Realm.List)
      expect(catOwner.cats.constructor).to.equal(Array)
      expect(catOwner.cats).to.have.lengthOf(2)
      expect(catOwner.cats[0].constructor).to.not.equal(Realm.Object)
      expect(catOwner.cats[1].constructor).to.not.equal(Realm.Object)
      expect(catOwner.cats[0].constructor).to.equal(Object)
      expect(catOwner.cats[1].constructor).to.equal(Object)
    }
    realmReduxSnapshot()(next)(initialAction)
  })

  it('should convert everything correctly inside a complex nested object', () => {
    let catOwners = testRealm().objects('CatOwner')
    let initialAction = { type: 'TEST', payload: { catOwners } }
    let next = (action) => {
      let catOwner = action.payload.catOwners[0]
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
    }
    realmReduxSnapshot()(next)(initialAction)
  })
})
