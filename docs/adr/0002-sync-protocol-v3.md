---
status: proposed
---
# Sync protocol 3: the server refuses clients that do not send a protocol version

A 2.0 client deletes records it does not know. Its `commit()` marks every key that is in its last-synced copy but not in its own `flatten()` output as deleted, and it writes `habit:<id>` back as `{name, order}` only. If a 2.0 phone and a 3.1 phone share one sync server, the first edit on the 2.0 phone deletes every reason, urge, value, Avoid item and setting, and resets every habit's kind to Build daily. The 2.0 server also drops unknown key prefixes without an error, so a 3.1 client on a 2.0 server would look synced while its new data stays only on the phone.

So: 3.1 clients send `v: 3` in every sync request. The 3.1 server accepts the new key prefixes only from v3 requests, and answers a request without `v` with `426 Upgrade Required`, which a 2.0 client shows as a sync error instead of losing data. The 3.1 client checks `/api/health` for `protocol >= 3` before its first push and stays off (showing "server needs update") if the server is older.

## Considered options

- **Keep the 2.0 key set and pack new fields into existing values.** Rejected: a 2.0 client still overwrites `habit:` values and has no place for reasons or urges.
- **Ignore the problem because the beta is a separate app.** Rejected for 3.1.0: the release reuses the 2.0 app id and server, and phones update at different times.

## Consequences

- The server is upgraded before any phone runs 3.1.0.
- The beta app points at its own server (or its own database file) so beta data never mixes with 2.0 data.
- A user with a phone still on 2.0 sees sync errors on that phone until it updates. This is the intended trade: an error, not data loss.
