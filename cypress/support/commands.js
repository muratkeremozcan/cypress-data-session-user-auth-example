import { UserFactory } from './factories/user-factory'

/** Picks n random items from an array */
export const pickNRandom = (n, arr) =>
  arr.sort(() => Math.random() - Math.random()).slice(0, n)

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
Cypress.Commands.add('maybeGetToken', (email, password, sessionName) =>
  cy.dataSession({
    name: `${sessionName}`,
    setup: () => {
      cy.log('**called setup for maybeGetToken**')
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

  - it calls the `init` method, which might return a value _(ex: a token)_
    - if there is a value && passes `validate` callback _(ex: cy.me() returns truthy)_
      - it calls `recreate`, saves the value in the data session and finishes
    - else it needs to generate the real value and save it _(ex: cy.me() returns falsey, fails validate())_
      - it calls `onInvalidated`, `preSetup` and `setup` methods and saves the value

- else (there is a cached value):
  - it calls `validate` with the cached value
    - if the `validate` returns `true`, the code calls `recreate` method
    - else it has to recompute the value, so it calls `onInvalidated`, `preSetup`, and `setup` methods
*/

Cypress.Commands.add(
  'maybeGetTokenAndUser',
  (partialUser, sessionName, parentSessionName) =>
    cy.dataSession({
      name: `${sessionName}`,

      dependsOn: parentSessionName,

      init: () => {
        cy.log(
          `**init()**: runs when there is nothing in cache. Yields the value to validate().
          Checks something, for ex: is there a token response for the email/pw combo?`
        )
        return cy
          .getTokenResponse(partialUser.email, partialUser.password)
          .then((response) => {
            if (response?.body.accessToken) {
              cy.log('init returns truthy')

              cy.log(`access token is ${response.body}`)

              return cy
                .me(response.body.accessToken, partialUser)
                .then((user) => ({ ...user, password: partialUser.password }))
            }
            cy.log('init returns falsey')
            return false
          })
      },

      validate: (maybeUser) => {
        cy.log(
          '**validate(maybeUser)**: gets passed what init() yields, or gets passed a cached value'
        )
        cy.log(`maybeUser is ${maybeUser}`)

        return cy
          .me(maybeUser.accessToken, maybeUser)
          .then((resp) => resp.id != null)
          .then(Boolean)
      },

      preSetup: () => {
        cy.log(`**preSetup()**: prepares data for setup function(). 
      Does not get anything passed to it.
      For example: see if we can get a token before creating a user in setup()`)
        return cy.maybeGetToken(
          'superadminSession',
          'SUPERADMIN_EMAIL',
          'SUPERADMIN_PASSWORD'
        )
      },

      setup: (superadminToken) => {
        cy.log(`**setup()**: there is no user, create one as superadmin.
      Gets passed in what is yielded from preSetup()`)
        return cy.createUserWithToken(superadminToken, partialUser)
      },

      recreate: (user) => {
        cy.log(
          `**recreate()**: gets passed what validate() yields if validate is successful`
        )
        cy.log('recreated user is', user)
        return Promise.resolve(user)
      },

      onInvalidated: (user) => {
        cy.log(
          `**onInvalidated**: runs when validate() returns false.
        Will be called before the "setup" function executes.
        With it you can clear user session for example.'
        `
        )
        // Cypress.clearDataSessions()
      },

      shareAcrossSpecs: true
    })
)
