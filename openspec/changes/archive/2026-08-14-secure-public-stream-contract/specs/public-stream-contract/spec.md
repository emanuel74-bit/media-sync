## ADDED Requirements

### Requirement: General stream reads never expose publish credentials

The general Streams API MUST return a public stream representation that does not contain a
`publishToken` property, even when the corresponding internal stream record contains a token.

#### Scenario: Stream collection contains a reserved token-bearing record

- **GIVEN** a persisted reserved stream whose internal `publishToken` is non-empty
- **WHEN** a client requests `GET /api/streams`
- **THEN** the returned stream object MUST preserve its non-secret public fields
- **AND** the object MUST NOT contain a `publishToken` property

#### Scenario: Single-stream query finds a token-bearing record

- **GIVEN** a persisted stream whose internal `publishToken` is non-empty
- **WHEN** a client requests `GET /api/streams/:name` for that stream
- **THEN** the response MUST preserve its non-secret public fields
- **AND** the response MUST NOT contain a `publishToken` property

### Requirement: General stream mutations never expose publish credentials

Every general Streams API mutation that returns a stream MUST return the same credential-free
public stream representation, regardless of the returned internal stream's status or token value.

#### Scenario: Manual stream creation returns a stream

- **WHEN** a client successfully requests `POST /api/streams`
- **THEN** the response MUST NOT contain a `publishToken` property

#### Scenario: Stream update returns a token-bearing internal stream

- **GIVEN** the update service returns an internal stream containing `publishToken`
- **WHEN** a client successfully requests `PATCH /api/streams/:name`
- **THEN** the response MUST preserve its non-secret public fields
- **AND** the response MUST NOT contain a `publishToken` property

#### Scenario: Assignment returns a token-bearing internal stream

- **GIVEN** the assignment service returns an internal stream containing `publishToken`
- **WHEN** a client successfully requests `PATCH /api/streams/:name/assign`
- **THEN** the response MUST preserve its non-secret public fields
- **AND** the response MUST NOT contain a `publishToken` property

#### Scenario: Unassignment returns a token-bearing internal stream

- **GIVEN** the unassignment service returns an internal stream containing `publishToken`
- **WHEN** a client successfully requests `PATCH /api/streams/:name/unassign`
- **THEN** the response MUST preserve its non-secret public fields
- **AND** the response MUST NOT contain a `publishToken` property

### Requirement: General stream absence semantics remain unchanged

Credential-safe projection MUST preserve the existing empty-collection and missing-stream response
semantics.

#### Scenario: Stream collection is empty

- **GIVEN** there are no streams
- **WHEN** a client requests `GET /api/streams`
- **THEN** the response MUST be an empty array

#### Scenario: Single stream does not exist

- **GIVEN** no stream exists for the requested name
- **WHEN** a client requests `GET /api/streams/:name`
- **THEN** the response MUST remain `null`

### Requirement: Reservation explicitly delivers publish credentials

The ingest reservation API MUST return a `StreamReservation` containing the newly generated
`publishToken` and a `publishUrl` that embeds the same token as a publish credential, as required by
ADR-0013.

#### Scenario: Publisher reserves an ingest stream

- **WHEN** a client successfully requests `POST /api/ingest/streams`
- **THEN** the response MUST contain a non-empty `publishToken`
- **AND** its `publishUrl` MUST contain that same token in the publish credentials
- **AND** the response MUST retain the reservation name, ingest node, and expiry

### Requirement: General redaction does not change internal credential behavior

Applying the public stream contract MUST NOT remove or alter `publishToken` in persistence, change
token generation or expiry, or change publish-auth matching behavior.

#### Scenario: Public projection of a reserved stream

- **GIVEN** reservation created a persisted stream with a generated `publishToken`
- **WHEN** that stream is returned through a general Streams endpoint
- **THEN** the public response MUST omit `publishToken`
- **AND** the persisted stream MUST retain the token for publish authorization

#### Scenario: Publisher authenticates after a general stream query

- **GIVEN** a publisher holds the token returned by `POST /api/ingest/streams`
- **AND** the same stream has subsequently been read through a general Streams endpoint
- **WHEN** MediaMTX presents the matching path, publish action, and token to publish auth
- **THEN** authorization behavior MUST remain the ADR-0013 matching behavior

### Requirement: Frontend models keep general streams separate from reservations

The frontend `Stream` contract MUST NOT define `publishToken`, while the frontend
`StreamReservation` contract MUST continue to require `publishToken` and the credential-bearing
`publishUrl`.

#### Scenario: Frontend consumes a general stream

- **WHEN** frontend code consumes any general Streams API response
- **THEN** it MUST model the response without a `publishToken` field

#### Scenario: Frontend consumes a reservation

- **WHEN** frontend code consumes a successful `POST /api/ingest/streams` response
- **THEN** `StreamReservation` MUST expose the returned `publishToken` and `publishUrl`

### Requirement: Reserved lifecycle timestamps use only non-secret state

The frontend reserved-stage timestamp MUST be derived from the stream's non-secret status and
timestamps and MUST NOT depend on credential presence.

#### Scenario: Reserved stream has an update timestamp

- **GIVEN** a stream whose status is `reserved` and whose `updatedAt` is present
- **WHEN** the frontend requests its reserved-stage timestamp
- **THEN** the timestamp MUST equal `updatedAt`

#### Scenario: Reserved stream lacks an update timestamp

- **GIVEN** a stream whose status is `reserved`, whose `updatedAt` is absent, and whose `createdAt`
  is present
- **WHEN** the frontend requests its reserved-stage timestamp
- **THEN** the timestamp MUST equal `createdAt`

#### Scenario: Reserved stream lacks both candidate timestamps

- **GIVEN** a stream whose status is `reserved` and whose `updatedAt` and `createdAt` are absent
- **WHEN** the frontend requests its reserved-stage timestamp
- **THEN** the timestamp MUST be `undefined`

#### Scenario: Stream is not currently reserved

- **GIVEN** a stream whose status is not `reserved`
- **WHEN** the frontend requests its reserved-stage timestamp
- **THEN** the timestamp MUST be `undefined` regardless of its other timestamps
