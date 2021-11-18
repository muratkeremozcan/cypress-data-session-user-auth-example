import * as faker from 'faker'
import { pickNRandom } from '../../support/commands'

describe('should test the flow through the state chart', () => {
  let admin
  let newUser

  before(() => {
    admin = {
      role: 'admin',
      email: `auth-admin@gmail.com`,
      password: 'p@22w0rd'
    }
    newUser = {
      role: 'user',
      email: `${faker.datatype.uuid()}@gmail.com`,
      password: 'p@22w0rd'
    }
  })

  const genericAssertions = (user) => {
    expect(user.email).to.be.a('string')
    expect(user.accessToken).to.eq(`token-for-${user.email}-${user.password}`)
  }

  context('Left Path: no cached value', () => {
    beforeEach(() => Cypress.clearDataSession('adminSession'))

    // ISSUE 1 : after init(), it does not run validate()
    it('Left Path: Existing user / init() returns true: should run init() validate()', () => {
      // make init() return true - simulate that the user exists

      /** Simulates a call for a token to see if a user exists in the DB */
      Cypress.Commands.overwrite(
        'getTokenResponse',
        (getTokenResponse, email, password) =>
          new Cypress.Promise((resolve) =>
            resolve(
              pickNRandom(1, [
                {
                  body: {
                    accessToken: `token-for-${email}-${password}`
                  }
                }
                // null
              ])[0]
            )
          )
      )

      let sessionToken

      cy.maybeGetTokenAndUser('adminSession', admin).then((user) => {
        genericAssertions(user)
        sessionToken = user.accessToken
      })
    })

    // ISSUE 2: will fail because after init(), it does not run preSetup() & setup() to create a new user
    it.skip('Right Path: init() returns false: should run init() preSetup() setup()', () => {
      // make init() return false - simulate that a user does not exist
      /** Simulates a call for a token to see if a user exists in the DB */
      Cypress.Commands.overwrite(
        'getTokenResponse',
        (getTokenResponse, email, password) =>
          new Cypress.Promise((resolve) =>
            resolve(
              pickNRandom(1, [
                // {
                //   body: {
                //     accessToken: `token-for-${email}-${password}`
                //   }
                // },
                null
              ])[0]
            )
          )
      )

      let sessionToken

      cy.maybeGetTokenAndUser('userSession', newUser).then((user) => {
        genericAssertions(user)
        sessionToken = user.accessToken
      })
    })
  })
})
