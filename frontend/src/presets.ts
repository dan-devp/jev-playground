import type { QuestionSpec } from './api/types'

export interface Preset {
  id: string
  title: string
  description: string
  stateMode: 'text' | 'json'
  state: string
  questions: QuestionSpec[]
  /** Further states for the batch and composite pages. */
  samples: string[]
}

export const PRESETS: Preset[] = [
  {
    id: 'ticket-triage',
    title: 'Support ticket triage',
    description: 'Urgency (noul), responsible team (choice) and frustration level (score) of a ticket.',
    stateMode: 'text',
    state: 'Help! My payouts have been failing for 3 days and nobody answers my emails.',
    questions: [
      { name: 'is_urgent', type: 'noul', instructions: 'Does this convey urgency?' },
      {
        name: 'department',
        type: 'choice',
        instructions: 'Which team should handle this?',
        options: [
          { label: 'billing', description: 'Payments, invoicing, refunds' },
          { label: 'technical', description: 'Bugs, outages, integrations' },
          { label: 'sales', description: 'Pricing, upgrades, new accounts' },
        ],
      },
      {
        name: 'frustration',
        type: 'score',
        instructions: 'How frustrated is the customer?',
        levels: ['Calm', 'Frustrated', 'Very angry'],
      },
    ],
    samples: [
      'Help! My payouts have been failing for 3 days and nobody answers my emails.',
      'Hi, could you tell me what the enterprise plan costs for 50 seats?',
      'Our Stripe webhook integration started returning 500 errors after your last release.',
      'I was charged twice for my subscription this month, please refund one payment.',
      'Just wanted to say the new dashboard looks great, thanks!',
    ],
  },
  {
    id: 'moderation',
    title: 'Content moderation',
    description: 'A noul with whenTrue/whenFalse criteria, plus category and severity of a comment.',
    stateMode: 'text',
    state: 'This product is garbage and so are the idiots who built it.',
    questions: [
      {
        name: 'is_abusive',
        type: 'noul',
        instructions: 'Is this comment abusive towards a person or group?',
        whenTrue: 'The comment insults, demeans or threatens people',
        whenFalse: 'The comment criticises without attacking people',
      },
      {
        name: 'category',
        type: 'choice',
        instructions: 'What kind of content is this?',
        options: [
          { label: 'ok', description: 'Acceptable, possibly critical feedback' },
          { label: 'harassment', description: 'Insults or attacks on people' },
          { label: 'spam', description: 'Advertising or unrelated links' },
          { label: 'off_topic', description: 'Unrelated to the product' },
        ],
      },
      {
        name: 'severity',
        type: 'score',
        instructions: 'How severe is the violation?',
        levels: ['None', 'Mild', 'Moderate', 'Severe'],
      },
    ],
    samples: [
      'This product is garbage and so are the idiots who built it.',
      'The update broke my workflow, please bring back the old export button.',
      'BUY CHEAP WATCHES AT www.example-watches.biz !!!',
      'Has anyone seen the football game yesterday?',
    ],
  },
  {
    id: 'intent',
    title: 'Banking intent (confidence gate)',
    description: 'Intent detection where risky actions need a higher confidence.',
    stateMode: 'text',
    state: 'Please send 500 euros to my landlord, same as last month.',
    questions: [
      {
        name: 'intent',
        type: 'choice',
        instructions: 'What does the customer want to do?',
        options: [
          { label: 'check_balance', description: 'See the account balance or recent transactions' },
          { label: 'transfer_funds', description: 'Move money to another account' },
          { label: 'report_fraud', description: 'Report a suspicious or unauthorised transaction' },
          { label: 'other', description: 'Anything else' },
        ],
      },
      {
        name: 'is_ambiguous',
        type: 'noul',
        instructions: 'Is information missing that is needed to carry out the request?',
      },
    ],
    samples: [
      'Please send 500 euros to my landlord, same as last month.',
      'How much money is left on my account?',
      'There is a payment of 899 dollars I never made.',
      'Can you move some money around for me?',
    ],
  },
  {
    id: 'candidates',
    title: 'Candidate scoring (composite)',
    description: 'Several score dimensions on a JSON state, combined into weighted rankings.',
    stateMode: 'json',
    state: JSON.stringify(
      {
        name: 'Alex',
        cv: '8 years Python backend work, designed a sharded event pipeline, mentored two juniors.',
      },
      null,
      2,
    ),
    questions: [
      {
        name: 'python_depth',
        type: 'score',
        instructions: 'How deep is the Python expertise?',
        levels: ['None', 'Basic', 'Solid', 'Expert'],
      },
      {
        name: 'system_design',
        type: 'score',
        instructions: 'How strong is the system design experience?',
        levels: ['None', 'Basic', 'Solid', 'Expert'],
      },
      {
        name: 'team_leadership',
        type: 'score',
        instructions: 'How much people leadership experience is shown?',
        levels: ['None', 'Some mentoring', 'Led a team', 'Led several teams'],
      },
    ],
    samples: [
      'Alex: 8 years Python backend work, designed a sharded event pipeline, mentored two juniors.',
      'Sam: Engineering manager for 6 years, led three teams of 8, occasional Python scripting.',
      'Kim: 2 years as a junior developer writing Python data scripts.',
      'Robin: Staff engineer, author of a distributed cache, Python and Go, tech lead of a platform team.',
    ],
  },
]
