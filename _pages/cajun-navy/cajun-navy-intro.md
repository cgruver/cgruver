---
title: Introducing The Cajun Navy Response System
permalink: /cajun-navy-response-system/intro/
sitemap: false
published: false
---
This work is inspired by, and principally based on [Emergency Response Demo](https://erdemo.io).  For a working application, follow that link.

I am doing this re-write principally for my own education.

I am writing this application with the Quarkus Java framework, using reactive techniques.  The persistence layer will be provided by a three node Cassandra cluster, deployed with the [K8ssandra](https://github.com/k8ssandra/k8ssandra) project.

## How it will work:

1. A disaster is registered
    1. Shelters
    1. Inclusion Zones
1. Incidents are registered (Asynchronous Activity)
    1. Victims
1. Responders enroll (Asynchronous Activity)
1. Responders are assigned to Incidents
    1. Missions

### Services:

1. ___[Disaster Service](https://github.com/cgruver-cajun-navy/disaster)___

    * Registers a disaster
    * Responds to the creation of Incidents and creates Missions with available Responders
    * Records the rescue status of Victim to Shelters
    * Manages the prioritization of Incidents when there are not enough Responders 

1. ___[Incident Service](https://github.com/cgruver-cajun-navy/incident)___

    * Manages Incident State

1. ___[Responder Service](https://github.com/cgruver-cajun-navy/responder)___

    * Manages Responder State

1. ___[Mission Service](https://github.com/cgruver-cajun-navy/mission)___

    * Creates Missions for Responders

### Kafka Topics:

| Topic  | Description | Producer | Consumers |
| - | - | - | - |
| incident-reported | | Incident Service | Disaster Service |
| incident-updated | | Incident Service | |
| incident-update-location | | Disaster Service | Incident Service |
| incident-update-status | | Disaster Service | Incident Service |
| incident-assigned | | Disaster Service | Incident Service |
| | | | |
| responder-info-update | | Disaster Service | Responder Service |
| responder-location-update | | Disaster Service | Responder Service, Mission Service |
| responder-availability-update | | Disaster Service | Responder Service |
| responder-created | | Responder Service | |
| responder-updated | | Responder Service | Disaster Service |
| responder-location-updated | | Responder Service | |
| | | | |
| priority-zone-clear | | | Incident Service |
| mission-command | | Disaster Service | Mission Service |
| mission-event | | Mission Service | Disaster Service |
| | | |

### Kafka Topics by Service

| Service | Produces | Consumes |
| - | - | - |
| Incident Service | | |
| | incident-reported | incident-update-location |
| | incident-updated | incident-update-status |
| | | incident-assigned |
| Disaster Service | | |
| | incident-update-location | incident-reported |
| | incident-update-status | incident-updated |
| | incident-assigned | responder-updated |
| | responder-info-update | responder-created |
| | responder-location-update | mission-event |
| | responder-availability-update | victim-rescued |
| | mission-command |
| Responder Service | | |
| | responder-created | responder-info-update |
| | responder-updated | responder-location-update |
| | responder-location-updated | responder-availability-update |
| | | |
| Mission Service | | |
| | mission-event | mission-command |
| | | responder-location-updated |

### Development Roadmap:

1. MVP

    * Record Disaster
    * Add Shelters

1. Incident

    * Register Incident and associate with Disaster

1. Responder

    * Register Responders and associate with Disaster

1. Assignments

    Assign Responder to Incident

1. TBD

First, let's establish our common domain language.

Why are we here?  Because a Disaster has ocurred.

__Question__: What is a disaster?

__Answer__: An event that significantly disrupts the normal operations for a locality.  Now, the locality can be pretty narrow.  For example, your basement...  The washing machine overflows and your sump pump failed.  That's a pretty significant disruption, but not one that is likely to require the attention of the Cajun Navy.  So, let's define locality a bit more broadly.

__Domain Vocabulary__: A locality represents a population of the order of a town, city, or one or more counties, which may span one or more States.  So, let's define that for a __Disaster__.

__Question__: What do we need to do in order to deal with the disaster, in the immediate term?

__Answer__: Get the affected people to safety.

So, let's focus on that.

__Domain Vocabulary__: Let's call the affected people, __Victims__.

__Question__: What defines a Victim?

__Answer__: An individual who is unable to extricate themselves from a dangerous situation.

OK, so the goal of our application is to help get Victims out of danger and to a place of safety?

__Question__: What is a place of safety?

__Answer__: A location that mitigates the effects of the disaster.

__Domain Vocabulary__: Let's call the places of safety, __Shelters__.

__Question__: How do we get Victims from where they are, to a Shelter?

__Answer__: We need someone with resources to move them.

__Domain Vocabulary__: Let's call the Victim movers, __Responders__.

__Question__: How do the Responders know which Victims to move, and where they are?

__Answer__: Victims in close proximity are handled as a unit of work, so that responders can move them efficiently.

__Domain Vocabulary__: Let's call the units of work, __Incidents__.

__Question__: How do the Responders know what route to take in order to get the Victims at an Incident, to the appropriate Shelter?

__Answer__: A Shelter will be designated for the Victims of a given incident, and a route from Incident to Shelter will be provided to the Responder.

__Domain Vocabulary__: Let's call the route from Incident to Shelter, a __Mission__.

OK...  let's pause for a minute and analyze our domain vocabulary.  So far, we have: Disaster, Victim, Shelter, Responder, Incident, and Mission.

Let's take a stab at defining our domains. Remember, this is on paper, so it's easy to change:

* Disaster
* Shelter
* Responder
* Victim
* Incident
* Mission

The goal of this operation is to move Victims from Incidents to Shelters.

Let's build an app to help realize that goal.

Let's talk about the events at a really high level.

1. A Disaster occurs which affects Victims.

1. Shelters are identified to house Victims.

1. Victims indicate their need for assistance.

1. Responders are available to help Victims

1. Incidents are created for Victims that are at the same location.

1. Missions are created to assign Incidents to Shelters

1. Missions are assigned to Responders.

1. Responders complete Missions.

