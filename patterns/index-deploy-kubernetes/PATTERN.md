---
id: index-deploy-kubernetes
title: Run the index pipeline on Kubernetes
version: 1.0.0
status: designed
license: Apache-2.0
visibility: public                # public | private: marked for, not where it is published
uses: [index-extract-tika, index-search, big-red-button]
provides: [Deployment]
requires: [Cluster, WorkQueue, BlobStore, Database, SearchEngine]
environment:
  language: []
  runs: cloud
  cloud_services: [Kubernetes]
  local_needs: []
---

# Deploy an isolated indexing pipeline

## Problem

Untrusted files can compromise parsers. Bursty work can exhaust resources, while scaling workers to zero can strand database jobs unless queue delivery survives process failure.

## Use when / Do not use when

Use when deploying an indexing pipeline on a container-orchestration cluster. Do not use this deployment recipe for a host without equivalent identity, isolation, and supervision controls.

## Environment

Kubernetes with enforced networking, KEDA queue scaling, workload identity, transactional storage, object storage, and search.

## Solution

Separate trusted workers from untrusted extraction. Workers use narrow workload identities; parser, converter, and recognition processes receive only their job's inputs and a supervised result channel. Each extraction has an independently stoppable execution boundary.

Commit each job with an outbox entry. An available relay delivers pending entries to the queue, recovers after interruptions, and tolerates duplicates. Durable deadlines cover retries, expired leases, and rescans. Notifications wake delivery; they do not replace it.

Search serves only versions published by the database record of truth. Backups preserve that authority and required originals; rebuilding the search engine alone is insufficient recovery.

## Ports

- **Deployment:** Creates and removes isolated environments and their supervised workloads.
- **Cluster:** Supplies enforceable scheduling, isolation, and workload identity.
- **WorkQueue:** Delivers durable job references with replay protection.
- **BlobStore:** Keeps tenant-isolated originals and derivatives.
- **Database:** Owns jobs, outbox, stops, leases, and publication authority.
- **SearchEngine:** Serves the currently authorized published content.

## Rules

1. **Enforce separate ingress and egress isolation,** because Kubernetes permits both by default and policies add their allowances together. Allow worker ingress but no initiated extraction egress, including metadata. Verify an enforcing network plugin and block host-network escape routes. [Network isolation](https://kubernetes.io/docs/concepts/services-networking/network-policies/).
2. **Disable service-account token automounting on extraction pods,** because Kubernetes mounts API credentials by default and pod settings override account settings. Mount no other credentials or projected cloud tokens. [Token mounting](https://kubernetes.io/docs/tasks/configure-pod-container/configure-service-account/).
3. **Supervise each extraction independently,** because canceling a worker request does not stop a remote parser. A tenant stop must terminate its execution without killing another tenant's job.
4. **Use separate worker workload identity,** because stored keys expand compromise. AKS identity injection requires its workload-identity pod label and injects projected tokens into containers by default; keep extraction in separate unlabeled pods. [Federated workload access](https://learn.microsoft.com/en-us/azure/aks/workload-identity-overview).
5. **Keep outbox delivery available when workers reach zero,** because a crash between database commit and queue send otherwise strands work. Recover durable pending entries after reconnect; acknowledge only confirmed delivery. [Notification limits](https://www.postgresql.org/docs/current/sql-listen.html).
6. **Expose cross-tenant claims and deployment-stop reads only through narrow audited functions,** because forced row-level security also constrains owners. Give a nonlogin function owner only the bypass authority required; applications cannot assume it. Pin trusted name resolution and restrict invocation. [Row security](https://www.postgresql.org/docs/current/ddl-rowsecurity.html), [function security](https://www.postgresql.org/docs/current/sql-createfunction.html).
7. **Check stops, leases, and expected content and derivative versions before commit,** because older work must not replace newer content. Missing control state refuses work. Lifts require a different authorized approver; pre-stop work stays invalid.
8. **Join search candidates to authoritative publication before hits, totals, and facets,** because cleanup cannot stop delayed writes from recreating obsolete documents. Each chunk needs its own identity; unavailable validation refuses results.
9. **Commit events with state and consume in commit order,** because allocated sequence order can differ from commit order. Checkpoints cannot pass partially applied work. [Sequence behavior](https://www.postgresql.org/docs/current/functions-sequence.html).
10. **Catch replacement and rollback generations up through cutover, including removals,** because concurrent changes otherwise disappear.
11. **Serve byte links through a gate checking lockdown on every request and stopping active streams,** because issued storage capabilities survive a service stop.
12. **Set requests, limits, and a scaling ceiling,** because CPU limits throttle while memory pressure can kill containers. KEDA scale-in can terminate a busy worker; provide termination grace or use Jobs for long work. Pausing scaling is not a work stop. [Resource bounds](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/).
13. **Restore authority, originals, keys, and checkpoints coherently and reconcile queues and engines,** because recovery must preserve removals and quarantine. Test recovery and alert on stranded work, feed lag, failed leases, and slow stops.

## Conformance

1. Given hostile extraction, outbound services and metadata are unreachable and no credential is mounted.
2. Given simultaneous tenant jobs, stopping one terminates only its extraction.
3. Given a crash after job commit with zero workers, outbox recovery delivers it.
4. Given forced row security, narrow claims and global stop checks work; application-wide reads fail.
5. Given stale chunks recreated after cleanup, search reveals none, including totals and facets.
6. Given issued byte links and lockdown, requests and active streams stop.
7. Given coordinated recovery, removed or quarantined content remains unpublished.

## Swap points

Replace cluster, scaler, queue, or search host while retaining the security and durability boundaries. The platform-neutral queue, scaling and worker lifecycle rules are index-workers; this pattern is one way to supply them.

## Sources

- [Workload supervision](https://kubernetes.io/docs/concepts/workloads/controllers/job/).
- [Worker scaling](https://keda.sh/docs/latest/concepts/scaling-deployments/), [job scaling](https://keda.sh/docs/latest/concepts/scaling-jobs/).

## Known gaps

Isolation depends on network and runtime enforcement. Recovery objectives and resource ceilings depend on workload and infrastructure.
