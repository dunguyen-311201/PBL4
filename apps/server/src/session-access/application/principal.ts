/** Who is calling, as proven by a token (04-protocol §2). Roles are not in the token. */
export type Principal =
  | { readonly kind: 'host'; readonly sessionId: string }
  | { readonly kind: 'pending'; readonly sessionId: string; readonly joinRequestId: string }
  | { readonly kind: 'viewer'; readonly sessionId: string; readonly viewerId: string };
