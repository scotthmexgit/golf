# Product North-Star

Last revised: 2026-04-26

---

## Status

> This document captures product intent. It is not an acceptance-criteria source. Phase plans (e.g., docs/plans/STROKE_PLAY_PLAN.md) remain the AC source for active engineering work. This document informs which phase plan to draft next; it does not generate engineering tasks directly.

---

## Goal Summary

Source: docs/sessions/2026-04-26-start-of-day-survey.md §1, verbatim.

> 1. Track betting among a current golf group.
>    1a. Multiple bet types exist; implement one at a time until each is fully functional.
>
> 2. Mobile web primary; native app possible later. Multiple users may be linked as "friends," but only the round creator may edit a round. On disconnect, the creator must be able to reconnect and resume editing.
>
> 3. Future: group-adjusted handicaps. Players may have a USGA handicap but use a different handicap with a specific friend or group, adjusted at the end of each betting round for next time. Mechanism TBD — possibly per-bet, possibly per-round. Vocabulary: "user" = primary app user; "pairing" = current round's players; "golf group" = a recurring set of players whose pairings shift round to round.

---

## Operator Clarifications Recorded 2026-04-26

Source: docs/sessions/2026-04-26-start-of-day-survey.md §1, Additional context block, verbatim (excluding the terminology observation about "wager" and "bet").

- User (operator) is intermediary for the entire pairing and interacts with the app. **Be more explicit in the future** (operator clarification 2026-04-26).
- Round lifecycle: Created → In-Progress → Complete → Final Adjustment → Settled.
- Friends/disconnect/reconnect: future enhancement, after user auth is added most likely (operator clarification 2026-04-26).
- Course-agnostic for now; course integration is a near-future enhancement.
- No auth/login yet; users created and selected without login; auth is a future phase.

---

## Out of Scope for Current Product Surface

Items the goal summary defers, with revisit trigger where named in source material.

- **Auth and login**: Revisit: prerequisite for friends, disconnect/reconnect, and prior-round access.
- **Course-specific tee ratings and slope**: Course schema will eventually need slope rating per course, per tee box, and per gender (USGA handicap math requirement). Currently course-agnostic with a flat TEES constant. Revisit: when course integration phase begins.
- **Cross-round settlement and money tracking**: no trigger named.
- **Group-adjusted handicaps (mechanism TBD)**: Goal 3 marks this "Future" and "mechanism TBD." no trigger named.
- **Friend graph and group membership**: Revisit: after auth phase.

---

## Revision Policy

This document is dated and revisable. When revised, append a dated note at the bottom rather than rewriting in place.

## Revisions

- 2026-04-26: Added per-tee-box, per-gender granularity note to "Course-specific tee ratings and slope" out-of-scope item. Surfaced during persistence floor Decision 4 (CourseHole population).
