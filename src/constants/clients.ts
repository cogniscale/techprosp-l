// Known TechPros clients
export const KNOWN_CLIENTS = [
  { name: "6sense", slug: "6sense" },
  { name: "Enate", slug: "enate" },
  { name: "Gilroy", slug: "gilroy" },
  { name: "HubbubHR", slug: "hubbubhr" },
  { name: "Amphora", slug: "amphora" },
] as const;

export type KnownClientSlug = (typeof KNOWN_CLIENTS)[number]["slug"];

// CogniScale is handled separately as it has special fee structures
export const COGNISCALE_CLIENT = {
  name: "CogniScale",
  slug: "cogniscale",
} as const;
