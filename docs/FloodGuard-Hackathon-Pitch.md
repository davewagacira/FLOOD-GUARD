# FloodGuard Hackathon Pitch

## Why This Matters Right Now

In early March 2026, Nairobi experienced one of its most devastating flood disasters in recent memory. At least 62 people died nationally, with Nairobi recording the highest death toll. More than 5,260 households were displaced inside the city, and floodwaters exposed a painful truth: Nairobi's flood risk is no longer a seasonal inconvenience. It is a fast-moving urban life-and-death problem.

FloodGuard is a near-production disaster intelligence and emergency coordination platform designed to help cities, telcos, NGOs, and disaster managers move from reactive response to coordinated early action.

## The Core Problem We Solved

Flood emergencies in Nairobi do not fail because one organization is absent. They fail because the entire response chain is disconnected.

Before FloodGuard:

- weather intelligence lives in one place
- flood-prone geography lives in another
- community exposure is rarely operationalized in real time
- telco alerting is separate from field coordination
- distress responses arrive late and are hard to triage
- administrators, NGOs, and telcos do not share one operational picture

FloodGuard connects the full chain:

1. monitor mapped flood-prone zones
2. ingest live weather and risk signals
3. assess which communities are most exposed
4. generate actionable intelligence
5. route alerts through approval workflows
6. trigger mass SMS communication through telco infrastructure
7. ingest distress responses and feed them back into field operations

## What Makes FloodGuard Stand Out

### 1. It is built for the real Nairobi flood context

FloodGuard is built around actual Nairobi and metro flood corridors, including Kibera, Mathare, Mukuru, Korogocho, Embakasi, Njiru, Ruai, Dandora, Kangemi, Githogoro, Kahawa-Githurai, Donholm-Umoja-Chokaa, and more.

We already monitor 21 flood zones across Nairobi and the wider metro risk belt.

### 2. It combines prediction, communication, and response in one workflow

Most systems do one part well:

- weather monitoring
- mapping
- messaging
- rescue coordination

FloodGuard does all four in one shared operational environment.

### 3. It is role-based and partnership-ready

The platform is built around the exact institutions that need to collaborate during a flood emergency:

- administrators
- disaster managers
- telco operators

That makes it immediately compelling for partnerships with county disaster teams, the Kenya Red Cross, Safaricom and other mobile network operators, humanitarian NGOs, and public safety agencies.

### 4. It already uses the right infrastructure stack

FloodGuard integrates services that make the platform practical, scalable, and credible:

- `Google Maps / Places API`
- `Tomorrow.io` and `OpenWeather`
- `Vertex AI`
- `Ably`
- `Neon PostgreSQL + Prisma`
- telco-ready SMS delivery workflows

## The FloodGuard Use Cases

### Admin Use Case: Citywide Visibility and Control

The admin is the system orchestrator.

The admin can:

- define and maintain flood-prone zones
- monitor organization activity across the platform
- view active alerts and high-risk zones
- check service health and audit logs
- refresh weather and flood intelligence
- oversee whether the platform is functioning during active emergencies

This gives FloodGuard governance maturity. It is not just an alerting tool. It is a managed operational platform.

### Disaster Manager Use Case: Early Action and Field Coordination

The disaster manager is the operational responder.

The disaster manager can:

- monitor live flood-zone risk levels
- view incidents and severity trends
- receive citizen distress signals
- track unresolved help requests
- monitor deployed teams and active operations
- use flood intelligence to stage response before conditions worsen

This is where FloodGuard becomes life-saving. It turns scattered data into actionable response intelligence.

### Telco Use Case: Trusted, Controlled Mass Warning at Scale

The telco operator is the communication delivery engine.

The telco team can:

- receive queued alert requests
- distinguish pending approvals from ready-to-send broadcasts
- review alert severity, target zone, and recipient count
- trigger SMS broadcast operations
- monitor delivery health and dispatch logs
- track incoming SMS replies from the public

Most hackathon solutions stop at "send an SMS." FloodGuard actually models the institutional workflow needed for real telecom partnership and public alert operations.

### Community Use Case: Faster Warnings, Better Chance of Survival

Residents benefit from:

- earlier alerts when flood risk rises
- messages tied to specific flood-prone zones
- a pathway to reply or send distress signals
- a higher chance that responders are staged before the situation becomes fatal

For families living along the Nairobi, Mathare, and Ngong river corridors, even a few minutes can determine whether evacuation is possible and whether rescuers can still reach them.

## Why FloodGuard Can Help Save Lives

FloodGuard saves lives because it reduces the delay between risk detection and protective action.

It directly targets the failure points Nairobi keeps experiencing:

- flash flooding in low-lying settlements
- structural collapse in weak housing
- electrocution in waterlogged estates
- blocked roads that prevent rescue and evacuation
- late warning to residents already in danger

## Why FloodGuard Is Partnership-Ready

### For telcos

- creates a structured public warning workflow
- reduces risk of unverified or poorly timed mass SMS
- gives delivery observability and operational logs
- opens room for co-branded public safety services

### For NGOs and disaster managers

- provides a live operational picture
- improves triage of distress and incident response
- helps allocate scarce field resources more intelligently
- gives evidence for preparedness, staging, and after-action review

### For county and government stakeholders

- centralizes flood-zone intelligence
- improves visibility into exposed populations
- supports policy decisions around riparian risk and urban resilience
- creates a foundation for a broader multi-hazard early warning platform

## Why Judges Should Care

FloodGuard stands out because it is not just technically impressive. It is institutionally realistic.

We built a platform that:

- matches the real Nairobi flood problem
- serves the real actors who respond to disasters
- uses real geographies and exposure baselines
- integrates live weather, risk, messaging, and response
- is architected in a way that could support real pilot partnerships

That is the difference between a clever app and a deployable civic technology platform.

## Our Current Strengths

- 21 monitored flood zones across Nairobi and the metro risk belt
- live weather ingestion workflow
- flood-risk assessment pipeline
- real-time dashboarding
- admin, disaster manager, and telco role separation
- SMS approval and dispatch workflow
- distress-signal visibility for field response
- near-production full-stack architecture

## Our Next Strategic Expansion

FloodGuard can grow beyond the current platform by:

- adding omitted high-risk corridors such as Huruma, Pipeline, Mukuru Kwa Reuben, Mukuru Viwandani, South B, Kariobangi-Baba Dogo, Lang'ata-Nairobi West, Westlands-Parklands, Kilimani-Loresho, and Lucky Summer-Kamulu
- deepening exposed-population modeling using GIS overlays instead of static estimates
- integrating more formal emergency dispatch routing
- supporting multilingual public alerts
- expanding from flood response into a broader climate resilience platform

## Closing Message

FloodGuard brings together the right data, the right actors, and the right workflows at the right moment.

In a city where floodwaters can rise within hours, where roads fail fast, and where the most vulnerable communities often receive warning last, FloodGuard creates the one thing disaster response cannot function without:

shared, actionable, real-time coordination.

That is why FloodGuard stands out.
That is why it is partnership-worthy.
And that is why it can help save lives.
