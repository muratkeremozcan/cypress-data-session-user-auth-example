describe('Cached value', () => {
  let admin
  let newUser

  before(() => {
    admin = {
      role: 'admin',
      email: `auth-admin@gmail.com`,
      password: 'p@22w0rd'
    }
  })

  const genericAssertions = (user) => {
    expect(user.email).to.be.a('string')
    expect(user.accessToken).to.eq(`token-for-${user.email}-${user.password}`)
  }

  it('Existing user (init() may run the first time to cache things), validate() returns true: run validate() recreate() ', () => {
    let sessionToken

    cy.maybeGetToken(admin.email, admin.password, 'foo')

    cy.maybeGetTokenAndUser(admin, 'adminSession', 'foo').then((user) => {
      genericAssertions(user)
      sessionToken = user.accessToken
    })

    cy.maybeGetTokenAndUser(admin, 'adminSession', 'foo').then((user) => {
      genericAssertions(user)
      expect(
        user.accessToken,
        'access token acquired should be from the session'
      ).to.equal(sessionToken)
    })
  })
})
