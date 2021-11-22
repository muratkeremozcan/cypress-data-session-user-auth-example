import { UserFactory } from './factories/user-factory'

/** Picks n random items from an array */
export const pickNRandom = (n, arr) =>
  arr.sort(() => Math.random() - Math.random()).slice(0, n)

// Decided to control this at test level because Commands.overwrite did not work well
/** Simulates a call for a token to see if a user exists in the DB.
 * Assume that this is allowed to fail and can return with nothing */
Cypress.Commands.add(
  'getTokenResponse',
  (email, password) =>
    new Cypress.Promise((resolve) =>
      resolve(
        pickNRandom(1, [
          {
            body: {
              accessToken: `token-for-${email}-${password}`
            }
          },
          null
        ])[0]
      )
    )
)

/** Simulates a call for a token, assume that this one is not allowed to fail */
Cypress.Commands.add(
  'getToken',
  (email, password) =>
    new Cypress.Promise((resolve) => resolve(`token-for-${email}-${password}`))
)

/** Simulates a call that creates a user */
Cypress.Commands.add(
  'createUser',
  (token, partialUser) =>
    new Cypress.Promise((resolve) =>
      resolve(new UserFactory(token).build(partialUser))
    )
)

/** Creates a user and enhances it with an access token */
Cypress.Commands.add('createUserWithToken', (accessToken, partialUser) =>
  cy.createUser(accessToken, partialUser).then((user) =>
    cy.getToken(user.email, partialUser.password).then((token) => ({
      ...user,
      accessToken: token
    }))
  )
)

/** Always attempts to grab the token from data session at first, if not in session only then asks for the token */
Cypress.Commands.add('maybeGetToken', (sessionName, email, password) =>
  cy.dataSession({
    name: `${sessionName}Token`,
    setup: () => {
      cy.log('**called setup**')
      return cy.getToken(email, password)
    },
    // if validate is true, get the token from cypress-data-session and skip setup
    // if the token is not in cypress-data-session, only then the setup fn is run and we make an api request with cy.getToken
    validate: true,
    shareAcrossSpecs: true
  })
)

/** takes in an accessToken, (assume it pings an identity endpoint), yields the user, enhances it with an accessToken */
Cypress.Commands.add('me', (accessToken, partialUser) =>
  cy
    .fixture('users')
    .then((users) => users.filter((user) => user.email === partialUser.email)[0])
    .then((user) => ({ ...user, accessToken }))
)

/*
- First, the code pulls cached data for the session name.

- if there is no cached value:
  - it calls the `init` method, which might return a value (ex: a token)
    - if there is a value && passes `validate` callback (ex: cy.me() returns truthy)
      - it saves the value in the data session and finishes
    - else it needs to generate the real value and save it (ex: cy.me() returns falsey, fails validate())
      - it calls `preSetup` and `setup` methods and saves the value

- else (there is a cached value):
  - it calls `validate` with the cached value 
    - if the `validate` returns `true`, the code calls `recreate` method
    - else it has to recompute the value, so it calls `onInvalidated`, `preSetup`, and `setup` methods
*/

Cypress.Commands.add('maybeGetTokenAndUser', (sessionName, partialUser) =>
  cy.dataSession({
    name: `${sessionName}`,

    init: () => {
      cy.log(
        `**init()**: runs when there is nothing in cache. Yields the value to validate().
        Check something for Ex: is there a token response for the email/pw combo?`
      )
      return cy
        .getTokenResponse(partialUser.email, partialUser.password)
        .then((response) => {
          if (response?.body.accessToken) {
            cy.log(
              `**there is a token response / a user exists in DB**
               wrap a user with token and password
               pass it through validate() - it should pass`
            )

            cy.log('access token is')
            cy.log(response.body)

            return cy
              .me(response.body.accessToken, partialUser)
              .then((user) => ({ ...user, password: partialUser.password }))
          }
          cy.log(
            `**there is no token response**,
            pass it through validate() - it should fail`
          )
          return false
        })
    },

    validate: (user) => {
      cy.log(
        `**validate()**: use a predicate to yield a Boolean value.
        gets passed as an argument what is yielded from init()
        Ex: determine if session data should be re-used by checking if the user exists
        `
      )
      return cy.me(user.accessToken, user).then(Boolean)
    },

    onInvalidated: (user) => {
      cy.log(
        `**onInvalidated**: runs when validate() returns false. Calls preSetup() & setup()
         gets passed as an argument what is yielded from init()'
        `
      )
      cy.log('gets passed as an argument what is yielded from init()')
      cy.wrap(user)
    },

    preSetup: () => {
      cy.log(
        `**preSetup()**: prepares data for setup(). 
        Nothing is passed to it as an arg, yields nothing to setup()`
      )
    },

    setup: () => {
      cy.log(`**setup()**: setup function. Does not get anything passed to it.
      There is no user, create one as superadmin`)
      return cy
        .maybeGetToken(
          'superadminSession',
          'SUPERADMIN_EMAIL',
          'SUPERADMIN_PASSWORD'
        )
        .then((superadminToken) =>
          cy.createUserWithToken(superadminToken, partialUser)
        )
    },

    recreate: () => {
      cy.log(
        `**recreate()**: perform commands with the validated value to "finish" the recreation`
      )
    },

    shareAcrossSpecs: true
  })
)
