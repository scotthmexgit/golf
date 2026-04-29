export async function patchRoundComplete(roundId: number): Promise<{ ok: boolean }> {
  try {
    const res = await fetch(`/golf/api/rounds/${roundId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'Complete' }),
    })
    // 204 = success; 409 = already Complete (forward-only lifecycle) — both are ok
    return { ok: res.status === 204 || res.status === 409 }
  } catch {
    // Network failure: round is scored correctly; only consequence is badge stays InProgress
    return { ok: false }
  }
}
