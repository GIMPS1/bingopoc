# Guided pre-check notes

Implemented in `js/main.js`.

Commands detected from the locked IGN's visible chat lines:
- `Precheck!` or `Precheck`
- `Validate!` or `Validate`
- `CancelPrecheck!` or `CancelPrecheck`

Tracked baseline items, in order:
1. Tectonic energy
2. Draconic energy
3. Black stone heart
4. Ancient scale
5. Dark Nilas

Observation format expected:
- `I have obtained 10 Tectonic energy.`
- `I have obtained 34 black stone hearts from the Shadow Reef.`

Behaviour:
- Start pre-check
- Prompt next item in the feed
- Wait for the expected quick-chat line
- Confirm `[item] x [qty] recorded`
- After ~2 seconds, prompt the next item
- After all items are captured, prompt `Type "Validate!" in chat to complete`
- On validate, enters live tracking mode
- Later higher totals for tracked items show `[item] +[delta] tracked`

Backend:
The plugin will try these JSON endpoints under `/b/{bingo_id}`:
- `/api/precheck/start`
- `/api/precheck/baseline`
- `/api/precheck/validate`
- `/api/precheck/observe`
- `/api/precheck/cancel`

If those endpoints are not live yet, the plugin still runs locally for UI/testing and logs failed pre-check submits to the browser console without breaking the flow.
