# cypress-data-session-statechart

The repo tests the paths though the cypress-data-session logic.

`npm i`, cd in, `npm run cy:open`.

All functions are dumb versions of a realistic authentication system.

---

`commands.spec.js` tests the lego building blocks that will compose into our main function `cy.maybeGetTokenAndUser`.

The function utilizes `cypress-data-session` in order to:

- re-use a token from the session if it has ever been used before. Ask for a new one if not.
- check if there is a user in the hypothetical DB

  - re-use if there is
  - generate a new user if not

  Save the user to the session in either case, so that next time it is used immediately.

## The logic as documented in the docs

- First, the code pulls cached data for the session name.

- if there is no cached value:

  - it calls the `init` method, which might return a value _(ex: a token)_
    - if there is a value && passes `validate` callback _(ex: cy.me() returns truthy)_
      - it saves the value in the data session and finishes
    - else it needs to generate the real value and save it _(ex: cy.me() returns falsey, fails validate())_
      - it calls `preSetup` and `setup` methods and saves the value

- else (there is a cached value):
  - it calls `validate` with the cached value
    - if the `validate` returns `true`, the code calls `recreate` method
    - else it has to recompute the value, so it calls `onInvalidated`, `preSetup`, and `setup` methods

## State chart interpretation of the logic

![image](cypress-data-session-flow.svg)
