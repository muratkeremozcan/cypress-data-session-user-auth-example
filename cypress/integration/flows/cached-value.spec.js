import * as faker from 'faker'
import { pickNRandom } from '../../support/commands'

describe('Cached value', () => {
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

  it('Existing user (init() may run the first time to cache things), validate() returns true: run validate() recreate() ', () => {
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

    cy.log('run the function once so that the value is cached')

    cy.maybeGetTokenAndUser(
      'adminSession-cache',
      admin,
      'getTokenResponse'
    ).then((user) => {
      genericAssertions(user)
      sessionToken = user.accessToken
    })

    cy.maybeGetTokenAndUser(
      'adminSession-cache',
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

  it('Not-Existing user / validate() returns false: run validate() onInvalidated() preSetup() setup() ', () => {
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
      'userSession-cache',
      newUser,
      'getTokenResponse'
    ).then((user) => {
      genericAssertions(user)
      sessionToken = user.accessToken
    })

    cy.maybeGetTokenAndUser(
      'userSession-cache',
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
