# FloodGuard Platform Guide

## Purpose of This Guide

This guide explains how FloodGuard works in plain language for non-developers.

It is meant for:

- Platform administrators
- Telco operators
- Disaster managers such as Kenya Red Cross
- Project stakeholders
- Trainers and onboarding teams

It explains:

- what the platform does
- how the end-to-end flood response flow works
- what each role is responsible for
- what each page in each dashboard is used for
- how the platform integrations fit together

This is an operational guide, not a technical developer manual.

---

## 1. What FloodGuard Is

FloodGuard is a disaster intelligence and coordination platform for flood response.

It brings together:

- live weather intelligence
- flood risk analysis
- mapped flood-prone zones
- emergency incident coordination
- citizen distress signals
- rescue resource tracking
- mass SMS broadcasting through telco operators

The goal is simple:

1. detect flood risk early
2. help responders understand where the danger is
3. warn people in affected areas quickly
4. coordinate rescue and field operations
5. track outcomes from alert to response

FloodGuard is designed so that each organization sees only the tools it needs, while still collaborating through one shared platform.

---

## 2. The Main Roles in FloodGuard

FloodGuard has three main operational roles.

### 2.1 Administrator

The Administrator manages the platform itself.

This role is responsible for:

- setting up organizations
- maintaining the official flood map
- monitoring platform health
- overseeing incidents across the system
- ensuring integrations are working

Admins are the system stewards.

### 2.2 Disaster Manager

This role represents responders such as Kenya Red Cross.

This role is responsible for:

- monitoring live flood risk
- viewing and managing incidents
- receiving and handling distress signals from citizens
- dispatching rescue resources
- coordinating field response

Disaster managers are the operational response team.

### 2.3 Telco Operator

This role represents the telecommunications partner, such as Safaricom.

This role is responsible for:

- reviewing emergency SMS alerts
- approving or rejecting outbound alert campaigns
- sending broadcasts to network users
- monitoring delivery status and failures
- tracking incoming SMS replies relevant to field response

Telco operators are the communication delivery team.

---

## 3. How the Platform Works End to End

FloodGuard works as a connected operational pipeline.

### Step 1: Flood zones are prepared by Admin

Administrators define flood-prone areas on the map using real geographic zones.

For each zone, the platform can store context such as:

- zone name
- location
- drainage conditions
- historical flood vulnerability
- population at risk
- other flood intelligence inputs

These zones become the foundation for monitoring and alerting.

### Step 2: Weather data is collected continuously

FloodGuard pulls weather intelligence for mapped zones using external weather services.

The platform currently uses:

- Tomorrow.io
- OpenWeather

This allows the system to observe rainfall and zone-level weather conditions in near real time.

### Step 3: Flood risk is assessed

FloodGuard evaluates the incoming weather data against the conditions of each flood zone.

The system uses:

- recent weather conditions
- zone risk configuration
- prior assessments
- flood-risk scoring logic

The output is a risk level such as:

- Low
- Medium
- High
- Critical

### Step 4: AI helps summarize the situation

FloodGuard includes a Vertex AI integration to support operational intelligence.

Vertex AI is used to help with:

- flood risk summaries in plain language
- actionable recommendations for responders
- composing concise SMS alerts for residents

This means the platform does not only show raw risk data. It can also help turn that data into readable guidance and alert messaging.

Important note:
AI supports human decision-making. It does not replace human approval for emergency action.

### Step 5: Admin and Disaster Managers monitor emerging risk

When risk rises, the flood map and operational dashboards help the Admin and Disaster Manager understand:

- which zones are deteriorating
- how severe the risk is
- where incidents are active
- whether distress signals are appearing
- whether rescue teams need to be staged

### Step 6: Telco receives alert requests

When an alert is prepared for public communication, the Telco dashboard receives it for review.

The telco operator can:

- check the message
- review the affected area
- confirm the urgency
- approve or reject the message

This is an important control step that helps avoid misinformation and accidental mass messaging.

### Step 7: Broadcast is sent to users

Once approved, the platform sends the SMS campaign through the configured SMS gateway.

FloodGuard currently integrates with the secure SMS delivery pipeline used for telco broadcasts and delivery reporting.

The system records:

- who was targeted
- whether the message was sent
- delivery status when available
- failures or message issues

### Step 8: Citizens can reply or raise distress

Inbound SMS replies or distress reports can feed the response side of the platform.

This allows responders to identify:

- people needing rescue
- people confirming they are safe
- free-text distress messages that may need investigation

### Step 9: Disaster Managers coordinate rescue

Disaster managers then use the Incidents, Distress Signals, and Rescue Resources pages to:

- open or update incidents
- acknowledge distress cases
- escalate urgent cases
- assign rescue resources
- track deployment progress

This closes the loop from prediction to public communication to response.

---

## 4. Major Integrations in the Platform

These are the major live integrations used by FloodGuard.

### 4.1 Google Maps

Used for:

- viewing flood zones
- visualizing affected areas
- drawing and managing mapped flood polygons
- helping operators understand geographic risk

### 4.2 Weather Providers

Used for:

- rainfall and weather monitoring
- zone-level flood intelligence
- supporting risk assessments

Current providers:

- Tomorrow.io
- OpenWeather

### 4.3 Vertex AI

Used for:

- AI-assisted flood risk summaries
- operational recommendations
- SMS message composition assistance

This helps convert technical weather and risk data into understandable action points.

### 4.4 SMS Gateway / Telco Messaging Layer

Used for:

- outbound emergency broadcasts
- delivery tracking
- SMS workflow operations

This is the communication bridge between the platform and mobile subscribers.

### 4.5 Platform Database

Used for storing and serving:

- users
- organizations
- flood zones
- incidents
- alerts
- SMS messages
- distress signals
- rescue resources
- health checks
- audit activity

### 4.6 Authentication and Role Access

Used to ensure:

- admins only see admin controls
- telco teams only see communication workflows
- disaster managers only see response workflows

This keeps the platform secure and role-specific.

---

## 5. How the Three Roles Work Together

FloodGuard is most effective when the three roles work as one connected operation.

### Admin to Disaster Manager

Admin prepares and maintains the flood intelligence environment.

This gives disaster managers:

- accurate zones
- current system visibility
- reliable incident and map data

### Disaster Manager to Telco

Disaster operations identify which situations need citizen communication.

This leads to:

- alert drafting
- escalation of severe risk
- public warning messages requiring telco approval and distribution

### Telco to Disaster Manager

Telco broadcasts alerts and surfaces SMS delivery outcomes and incoming replies.

This helps disaster teams know:

- whether warnings reached people
- whether help requests are increasing
- where communication may have failed

### Admin Across Everyone

Admin ensures:

- the system stays healthy
- organizations are onboarded
- flood zones remain current
- incidents and workflows can continue smoothly

---

## 6. Page-by-Page Guide for the Administrator

The Administrator dashboard focuses on system oversight, governance, mapping, and platform health.

### 6.1 Overview

Purpose:
Provides the high-level status of the entire platform.

What the Admin can understand here:

- how many organizations are on the platform
- how many active alerts exist
- how many zones are currently high risk
- how much SMS traffic has been sent recently
- whether services are healthy
- what key actions have happened recently through audit logs

Why it matters:
This is the Admin command summary page.

### 6.2 Organizations

Purpose:
Manage partner organizations on the platform.

What this page is for:

- onboarding organizations
- keeping organization records accurate
- identifying which partner entities are active in the system

Why it matters:
FloodGuard depends on multiple organizations working in one platform.

### 6.3 Flood Map

Purpose:
View and manage the live flood intelligence map.

What the Admin uses it for:

- viewing all registered flood zones
- seeing current risk levels
- checking weather-linked zone intelligence
- reviewing mapped infrastructure and nearby response context
- managing flood-zone records and updates

Why it matters:
This is the core spatial intelligence page for the platform.

### 6.4 Incidents

Purpose:
Track, create, review, and update operational incidents.

What the Admin uses it for:

- viewing the incident backlog
- monitoring active emergencies
- checking incident severity and status
- reviewing updates shared by disaster operations

Why it matters:
It gives Admin full visibility into real operational events.

### 6.5 System Health

Purpose:
Monitor the health of platform services and integrations.

What the Admin can see:

- whether platform services are up or degraded
- response times for service checks
- status of important integrations

Why it matters:
If health checks fail, then alerts, map intelligence, or response workflows may be affected.

### 6.6 Settings

Purpose:
Manage live configuration details relevant to the user and organization.

What this page is for:

- profile and organization details
- selected integration settings
- account-level platform information

Why it matters:
This page keeps the platform identity and operating configuration accurate.

---

## 7. Page-by-Page Guide for the Telco Operator

The Telco dashboard focuses on communications, approvals, broadcasts, recipients, and delivery outcomes.

### 7.1 Overview

Purpose:
Provide a live operational summary of SMS activity.

What the Telco operator sees:

- messages sent
- messages delivered
- failures
- pending approvals
- recent broadcasts
- incoming replies

Why it matters:
This is the communications control center.

### 7.2 Network Users

Purpose:
Show the subscriber records or network-targetable users relevant to messaging workflows.

What this page is for:

- reviewing available subscriber entries
- verifying target audiences in the system
- confirming the recipients who may receive alerts

Why it matters:
Broadcast quality depends on accurate recipient data.

### 7.3 Alert Approvals

Purpose:
Review emergency alerts before they are sent.

What the Telco operator can do:

- review pending alert requests
- check severity and location
- approve alerts
- reject alerts
- approve and send when appropriate

Why it matters:
This is the safety gate before mass public communication.

### 7.4 SMS Templates

Purpose:
Manage and preview standardized messaging formats used for broadcasts.

What this page is for:

- understanding available message patterns
- testing template sends to approved recipients
- reviewing the live recipients used for demo verification

Why it matters:
Templates help ensure messaging stays clear, short, and operationally consistent.

### 7.5 Broadcasts

Purpose:
Track approved, queued, and sent broadcasts.

What the Telco operator can see:

- messages waiting to go out
- messages already sent
- recipient counts
- status trends
- zone-related broadcast outcomes

Why it matters:
This page shows where the outbound alert process currently stands.

### 7.6 Delivery Reports

Purpose:
Understand whether messages actually reached recipients.

What the page is used for:

- reviewing delivery versus failure
- checking send history
- understanding the status of outbound messages
- spotting issues in messaging performance

Why it matters:
A sent alert is only useful if it reaches people.

### 7.7 Settings

Purpose:
Keep telco-facing account and integration settings current.

What it supports:

- organization information
- SMS integration visibility
- live account configuration records

Why it matters:
Communication workflows depend on accurate account setup.

---

## 8. Page-by-Page Guide for Disaster Management / Red Cross

The Disaster Manager dashboard focuses on response operations and field coordination.

### 8.1 Overview

Purpose:
Provide a response-focused summary of the current emergency picture.

What this page shows:

- active incidents
- distress signals in the last 24 hours
- unresolved help requests
- deployed rescue teams
- high-risk flood zones

Why it matters:
This is the operational briefing page for the response team.

### 8.2 Flood Map

Purpose:
Visualize where the danger is and what is happening geographically.

What disaster managers use it for:

- seeing current risk by zone
- checking weather-linked flood intelligence
- understanding zone conditions
- reviewing mapped context around affected areas
- supporting decisions about staging and deployment

Why it matters:
This turns risk data into location-based action.

### 8.3 Incidents

Purpose:
Manage real emergency cases.

What this page is used for:

- creating incidents
- viewing incident details
- updating status
- coordinating shared operational awareness with admin

Why it matters:
Incidents are the formal records of operational emergencies.

### 8.4 Distress Signals

Purpose:
Handle direct help requests and SMS-originated distress reports.

What disaster managers can do:

- review incoming distress signals
- acknowledge them
- mark them for follow-up
- escalate them into formal incidents
- resolve them when handled

Why it matters:
This page is the bridge between citizen communications and rescue operations.

### 8.5 Rescue Resources

Purpose:
Manage the rescue assets available for field deployment.

What this page is for:

- viewing available teams and equipment
- updating resource readiness
- assigning resources to incidents
- tracking whether resources are available, deployed, or recalled

Examples of resources:

- rescue teams
- ambulances
- boats
- field support units

Why it matters:
Good response depends on knowing what resources exist and where they are being used.

### 8.6 Settings

Purpose:
Manage organization and account settings for the disaster-management organization.

Why it matters:
It keeps the response organization profile and related configuration accurate.

---

## 9. How Operators Should Use FloodGuard in Practice

This section explains how the platform should be used in a normal operational cycle.

### 9.1 Daily Monitoring Routine

Recommended daily use:

1. Admin checks system health and flood map readiness
2. Disaster Manager checks overview, open incidents, and distress queue
3. Telco checks pending approvals, delivery reports, and recipient readiness

### 9.2 During Rising Flood Risk

Recommended workflow:

1. Admin or Disaster Manager reviews the flood map
2. risk severity is confirmed
3. an incident may be created or updated
4. an alert is prepared for public communication
5. Telco reviews and approves the alert
6. the broadcast is sent
7. delivery is monitored
8. incoming distress signals are triaged
9. rescue resources are dispatched where needed

### 9.3 After a Broadcast

Recommended follow-up:

1. Telco checks delivery reports
2. Disaster team checks for new distress signals
3. Incidents are updated based on field reality
4. resources are reassigned if conditions worsen

### 9.4 After the Event

Recommended wrap-up:

1. resolve incidents
2. resolve or archive distress cases
3. return rescue resources to available status
4. review health, delivery, and operational logs
5. update flood-zone intelligence where needed

---

## 10. What Makes FloodGuard Valuable

FloodGuard is valuable because it combines prediction, communication, and response in one system.

Its strengths include:

- shared situational awareness across multiple organizations
- clear separation of duties by role
- live weather-linked flood intelligence
- map-based risk visibility
- AI-assisted summaries and messaging support
- SMS-based warning and feedback loops
- incident and rescue coordination in one workflow

This reduces the gap between:

- detecting risk
- warning the public
- responding on the ground

---

## 11. Important Operating Principles

Teams using FloodGuard should keep these principles in mind.

### Human approval remains important

Even though the platform uses automation and AI, human operators still make the final decisions around:

- approving public alerts
- opening or escalating incidents
- dispatching rescue resources

### Data quality matters

The platform is only as strong as its live data inputs.

This means teams should keep accurate:

- organizations
- flood zones
- recipients
- incident updates
- rescue resource status

### Delivery matters as much as sending

An alert marked as sent is not enough on its own. Teams must also monitor whether it was delivered successfully.

### Distress handling must be timely

Need-help signals should be treated as operationally urgent and followed through quickly.

---

## 12. Simple Summary for Non-Technical Readers

If you only remember one thing, remember this:

FloodGuard helps three teams work together.

- Admin keeps the platform and flood intelligence ready
- Telco sends the right alerts to the right people
- Red Cross or disaster teams respond to people and incidents on the ground

The platform starts with weather and flood risk, turns that into alerts and incidents, and then supports rescue and follow-up until the situation is under control.

---

## 13. Suggested Use for Training and Demos

This document can be used for:

- onboarding new team members
- stakeholder demos
- training operators by role
- explaining the platform during presentations
- preparing operations handover notes

For best results, walk each team through only the pages they own first, then show how the roles connect in the full emergency lifecycle.
