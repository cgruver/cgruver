---
title: Leader Election for Regionally Distributed Message Processing
permalink: /home-library/leader-election/
sitemap: false
published: false
---
## Leader Elector for regionally distributed micro-services

The leader is selected through a random number drawing.  The highest number wins.  Ties are recast.

## Processes

### Bootstrap

When a voter process starts, it needs to register with other voters.

1. Apply the external configuration:

   There are 5 environment variables which feed the configuration as defined in `application.yml`

   | Config Property | Description |
   | --- | --- |
   | `voter-url` | The URL that this Voter instance will be listening on.  AKA the OpenShift Route endpoint. |
   | `voter-id` | The unique string identifier for this Voter instance |
   | `voter-list` | The list of IDs and URLs for the other Voters who are expected to join the cluster.  This is a list of JSON objects. i.e. {% raw %}`[{{"voterId":"region-one-voter"},{"voterUrl":"https://route.to.region-one-voter.instance"}},{{"voterId":"region-two-voter"},{"voterUrl":"https://route.to.region-two-voter.instance"}}]` {% endraw %}|
   | `heartbeat-interval` | The amount of time, in seconds, to wait in between heartbeat processing. |
   | `missed-heartbeat-tolerance` | The number of missed heartbeats allowed before marking a Voter as offline. |

1. Retrieve the list of voters

   The `SEED_HOST` environment variable references a DNS round-robin entry which returns the list of potential voter host system IP addresses.

   The `VOTER_URL` is a relative URL that when combined with the `SEED_HOST` IP addresses, give a complete URL to any of the initial voter systems.

   On startup, the voter retrieves the list of seed IP addresses and creates a list of potential voter URLs

1. Try to invoke the `register` API of each of the seed URLs until a valid response is received.

   If the response if from the sender, then then try the other seed addresses to see if another valid response is received.

   If another response is not received, then:

   1. The voter is the first one to bootstrap.

   1. The voter is orphaned in an isolated region.

   In either case, the voter enters a lazy loop trying to register with another voter.  The loop timer is based on the heartbeat interval that is configured.

   The loop is broken when one of two events occur:

   1. The voter successfully registers with another voter

   1. The voter receives a registration message from another voter.

### Election

The election is started either because the current leader has stopped sending heartbeats and the followers decide to elect a new leader, or through an external call to start an election.

When a follower misses a heartbeat from the current leader, it first requests a health check from the other voters, including the leader.  If the other voters agree that the leader has failed its health check, then the leader is removed from the voter pool, and an election is started.

Each voter casts a vote by creating a random Long Integer and sending it to each of the voters.  The voter with the highest number wins the election.  Each voter sends their version of the results to each other voter.  If they all agree, then the election is certified.  If the current leader is still running, its role is updated to `FOLLOWER`, and the new leader takes on the role of `LEADER`.

### Health Check Processing

Each voter periodically checks the health of every other voter.

The health response is a StatusDto object.

When a heartbeat is received, the Voter does the following:

1. Update VoterState.knownVoters.[voterId].Voter.lastHeartBeat with the system time that the heartbeat was received.

1. Compare the list of known voters in the heartbeat message with its own list.

   If the list is different, then start a reconciliation of voters.

### Reconciliation of Voters

This process is initiated when a voter receives a heartbeat message from another voter which has a known voter list that does not match the receiver's list.

1. The receiving voter sends its own known voter list back to the `reconcile` endpoint of the voter who sent the heartbeat message.

   The voter who sent the heartbeat invokes the `status` endpoint of any unknown voters in the list received from the heartbeat receiver.

   If it receives a response then it adds the voter to its list.

   If it does not receive a response, then it invokes the `remove` endpoint of the sending voter.

1. The receiving voter invokes the `status` endpoint of any unknown voters in the heartbeat message.

   If it receives a response then it adds the voter to its list.

   If it does not receive a response, then it invokes the `remove` endpoint of the heartbeat sender.

API Endpoints:

```java
@POST
/register
```

Register a new voter

```java
@POST
/remove
```

Remove a voter

```java
@GET
/status
```

Get the current leader, and the list of voters

```java
@POST
/heartbeat
```

Each voter will periodically register their health with the other voters.

```java
@POST
/reconcile
```

Invoked when there is a mismatch in known voter lists.

```java
@POST
/election/start
```

Start an Election.  Either on first bootstrap, or because the current leader has died.  Any voter can call an election.

```java
@POST
/election/cast
```

Cast your vote.  Each voter sends its random number to each other member.

```java
@POST
/election/result
```

```java
@POST
/election/certify
```

Service Methods:

registerVoter

removeVoter

startElection

countVote

certifyResult

heartBeat

Use DNS delegation for Load Balancing.

quarkus ext add scheduler vertx smallrye-fault-tolerance
