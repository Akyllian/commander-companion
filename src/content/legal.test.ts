import { FAN_CONTENT_NOTICE } from './legal'

describe('Fan Content Policy notice', () => {
  it('matches the wording required by the policy', () => {
    expect(FAN_CONTENT_NOTICE).toBe(
      'Commander Companion is unofficial Fan Content permitted under the Fan Content Policy. ' +
        'Not approved/endorsed by Wizards. Portions of the materials used are property of Wizards of the Coast. ' +
        '©Wizards of the Coast LLC.',
    )
  })
})
