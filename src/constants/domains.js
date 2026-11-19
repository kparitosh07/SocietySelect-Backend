export const DOMAINS = Object.freeze([
  "Web Development",
  "App Development",
  "ML",
  "Designer",
]);

export const isValidDomain = (domain) => DOMAINS.includes(domain);
