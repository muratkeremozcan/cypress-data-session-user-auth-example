import * as faker from 'faker'
import { pickNRandom } from '../../support/commands'

describe('No Cached value, always calls init() first', () => {
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

  beforeEach(() => {
    Cypress.clearDataSession('adminSession-no-cache')
    Cypress.clearDataSession('userSession-no-cache')
  })

  it('Existing user / validate() returns true: should run init() validate() recreate()', () => {
    let sessionToken

    cy.log('make init() return true - simulate that the user exists')
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

    cy.maybeGetTokenAndUser(
      'adminSession-no-cache',
      admin,
      'getTokenResponse'
    ).then((user) => {
      genericAssertions(user)
      sessionToken = user.accessToken
    })

    cy.maybeGetTokenAndUser(
      'adminSession-no-cache',
      admin,
      'getTokenResponse'
    ).then((user) => {
      genericAssertions(user)
      expect(
        user.accessToken,
        'access token acquired should be from the session'
      ).to.equal(sessionToken)
    })
  })

  it('New user / validate() returns false: should run init() validate() preSetup() setup()', () => {
    let sessionToken

    cy.log('make init() return false - simulate that the user does not exist')
    /** Simulates a call for a token to see if a user exists in the DB */
    Cypress.Commands.overwrite(
      'getTokenResponse',
      (getTokenResponse, email, password) =>
        new Cypress.Promise((resolve) =>
          resolve(
            pickNRandom(1, [
              //  {
              //    body: {
              //      accessToken: `token-for-${email}-${password}`
              //    }
              //  }
              null
            ])[0]
          )
        )
    )

    cy.log('make validate() return false')
    /** simulates a check for identity */
    Cypress.Commands.overwrite(
      'me',
      (me, accessToken, partialUser) =>
        new Cypress.Promise((resolve) => resolve(false))
    )

    cy.maybeGetTokenAndUser(
      'userSession-no-cache',
      newUser,
      'getTokenResponse'
    ).then((user) => {
      genericAssertions(user)
      sessionToken = user.accessToken
    })

    cy.maybeGetTokenAndUser(
      'userSession-no-cache',
      newUser,
      'getTokenResponse'
    ).then((user) => {
      genericAssertions(user)
      expect(
        user.accessToken,
        'access token acquired should be from the session'
      ).to.equal(sessionToken)
    })
  })
})
