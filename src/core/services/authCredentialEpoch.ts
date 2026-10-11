/** Active auth credential epoch — storage keys are scoped so stale clears cannot wipe a new session. */
let credentialEpoch = 0;

export function setCredentialEpoch(epoch: number): void {
  credentialEpoch = epoch;
}

export function getCredentialEpoch(): number {
  return credentialEpoch;
}
