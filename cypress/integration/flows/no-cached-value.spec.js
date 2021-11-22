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
    Cypress.clearDataSession('adminSession')
    Cypress.clearDataSession('userSession')
  })

  it('Existing user / validate() returns true: should run init() validate() recreate()', () => {
    cy.log('make validate() return true')
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

    cy.maybeGetTokenAndUser('adminSession', admin).then((user) => {
      expect(user.email).to.be.a('string')
      expect(user.accessToken).to.eq(`token-for-${user.email}-${user.password}`)
      expect(
        user.accessToken,
        'access token acquired should be from the session'
      ).to.equal(sessionToken)
    })
  })

  it('New user / validate() returns false: should run init() validate() preSetup() setup()', () => {
    cy.log('make validate() return false')
    /** simulates a check for identity */
    Cypress.Commands.overwrite(
      'me',
      (me, accessToken, partialUser) =>
        new Cypress.Promise((resolve) => resolve(false))
    )

    let sessionToken

    cy.maybeGetTokenAndUser('userSession', newUser).then((user) => {
      genericAssertions(user)
      sessionToken = user.accessToken
    })

    cy.maybeGetTokenAndUser('userSession', newUser).then((user) => {
      expect(user.email).to.be.a('string')
      expect(user.accessToken).to.eq(`token-for-${user.email}-${user.password}`)
      expect(
        user.accessToken,
        'access token acquired should be from the session'
      ).to.equal(sessionToken)
    })
  })
})
