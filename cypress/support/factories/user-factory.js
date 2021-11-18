import { Factory } from 'fishery'
import * as faker from 'faker'

export class UserFactory extends Factory {
  constructor(accessToken, version) {
    super(({ params }) => {
      const user = {
        email: `${faker.datatype.uuid()}@gmail.com`,
        password: faker.internet.password(8, false, undefined, '#1'),
        firstName: 'QA',
        lastName: 'Test User',
        role: 'user'
      }
      if (params.accountId !== undefined)
        Object.assign(user, { accountId: params.accountId })
      return user
    })
    this.accessToken = accessToken
    this.version = version
  }
}
