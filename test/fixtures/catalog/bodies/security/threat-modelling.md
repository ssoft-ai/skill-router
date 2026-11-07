# Threat modelling

Apply this skill when a feature, service or integration is designed or changed in a way that exposes data, adds an entry point, or moves a trust boundary, and its risks have not been written down.

## Four questions

Every threat model answers:

1. What are we working on? (a model of the system)
2. What can go wrong? (threats)
3. What are we going to do about it? (mitigations)
4. Did we do a good enough job? (review)

## Steps

1. Draw a data flow diagram (DFD): external entities, processes, data stores, data flows, and dashed lines for trust boundaries - between the browser and the API, the API and the database, your cloud account and a vendor's. Keep it at the level where each box is one deployable or one store.
2. List the assets: personal data, payment data, credentials, business secrets, availability of the service itself.
3. Walk STRIDE over each element and each flow crossing a boundary:

| Threat | Property violated | Example question |
|---|---|---|
| Spoofing | authentication | Can a caller pretend to be another user or service? |
| Tampering | integrity | Can data be modified in transit or at rest? |
| Repudiation | non-repudiation | Could a user deny an action we cannot prove? |
| Information disclosure | confidentiality | What leaks through errors, logs, caches, URLs? |
| Denial of service | availability | What is expensive for us and cheap for an attacker? |
| Elevation of privilege | authorisation | Can a normal user reach admin functions? |

4. For each threat, rate it (a simple likelihood times impact grid, or DREAD, or the team's risk matrix) and pick a response: mitigate, eliminate, transfer, or accept with a named owner.
5. Turn mitigations into tracker tickets linked to the model, and add security test cases for them.
6. Store the model next to the code and revisit it when the design changes.

## Tools

OWASP Threat Dragon, Microsoft Threat Modeling Tool, IriusRisk, or a diagram in the repository plus a table in Markdown. For privacy-heavy features add LINDDUN to STRIDE. Attack trees help when one high-value goal ("steal stored card data") has many paths.

## Pitfalls

- Modelling the whole company at once; scope to the change.
- Listing generic threats ("hackers") without a concrete path.
- Treating the internal network as trusted - zero trust assumes it is not.
- Forgetting the CI/CD pipeline, admin tools and support staff access as entry points.
- A model written once for the audit and never updated.

The diagram itself can be drawn as code with diagramming. Credentials and roles that the model reveals are reviewed with access-review, and the API surface is designed with api-design.
