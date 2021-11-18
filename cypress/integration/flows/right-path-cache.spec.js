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

  context('Right Path: cached value', () => {
    let sessionToken

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

    beforeEach('run the function once so that the value is cached', () => {
      cy.maybeGetTokenAndUser('adminSession', admin).then((user) => {
        expect(user.email).to.be.a('string')
        expect(user.accessToken).to.eq(
          `token-for-${user.email}-${user.password}`
        )
        sessionToken = user.accessToken
      })
    })

    it('Left Path: Existing user / init() may run the first time, validate() returns true: run validate() recreate() ', () => {
      cy.maybeGetTokenAndUser('adminSession', admin).then((user) => {
        expect(user.email).to.be.a('string')
        expect(user.accessToken).to.eq(
          `token-for-${user.email}-${user.password}`
        )
        expect(
          user.accessToken,
          'access token acquired should be from the session'
        ).to.equal(sessionToken)
      })
    })

    it('Right Path: Existing user / validate() returns false: run validate() onInvalidated() preSetup() setup() ', () => {
      // make validate return false
      /** simulates a check for identity */
      Cypress.Commands.overwrite(
        'me',
        (me, accessToken, partialUser) =>
          new Cypress.Promise((resolve) => resolve(false))
      )

      cy.maybeGetTokenAndUser('adminSession', admin).then((user) => {
        expect(user.email).to.be.a('string')
        expect(user.accessToken).to.eq(
          `token-for-${user.email}-${user.password}`
        )
        expect(
          user.accessToken,
          'access token acquired should be from the session'
        ).to.equal(sessionToken)
      })
    })
  })
})
