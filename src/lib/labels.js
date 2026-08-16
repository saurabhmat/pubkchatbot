// Copied verbatim from topic_labels() / outcome_labels() in pubk-chatbot.php
// so this standalone dashboard and the WordPress admin screen show identical
// wording for the same underlying values. Keep in sync if the PHP changes.

export const topicLabels = {
  trial: 'Free trial',
  pricing: 'Pricing',
  bundle: 'Bundles & groups',
  gsa: 'GSA purchasing',
  sponsor: 'Sponsorship',
  tickets: 'Annual Review tickets',
  briefing: 'Briefing Book',
  coverage: 'Coverage & articles',
  jobs: 'Jobs board',
  events: 'Events & calendar',
  account: 'Account & billing',
  press: 'Press & complaints',
  other: 'Other',
};

export const outcomeLabels = {
  answered: 'Answered',
  fallback: "Couldn't answer",
  lead_offered: 'Follow-up offered',
  handover_offered: 'Handed to a person',
};

export function topicLabel(topic) {
  return topicLabels[topic] || topicLabels.other;
}

export function outcomeLabel(outcome) {
  return outcomeLabels[outcome] || outcome || 'Unknown';
}
