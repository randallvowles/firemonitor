---
title: Monitoring the Health of Surface Based Observational Networks
layout: default
ignore_alert: true
---

> This was a case study presented at the 2017 American Meterlogical Society's annual meeting.

## Introduction and Background

Monitor the quality of the information available from diverse data streams flowing to and from MADIS.
With web-based technologies and the Mesonet API, we are creating a suite of web tools that focus on real-time and retrospective monitoring of station, network status, metadata and quality control information.

Some background:

The Mesonet API Beta provides the following:

- Real time observations from over 200 networks providing overs 30,000+ active weather stations
- Over 100 distinct variable types
- Robust infrastructure to support our hundreds of daily users, requesting over six billion data objects per day
- Internal and external QC flags provided along side the observation in the data stream

## Challenges Facing QC Algorithms

There are several challenges facing QC algorithms including but not limited to computational resources as well as the logical rules that govern valid versus suspect observations.

Real-time QC tests involve processing currently over 20 million observations per day as they are received as well as integrating QC checks received from other sources such as MADIS. Roughly 0.5 million values per day do not pass one or more validity checks.

{:.article__short-img}
![alt text][mesowest-madis]
![alt text][flag-freq]

We have the potential currently to use 80 QC validity checks of which the accompanying table illustrates the ones that are most frequently triggered. Once a SynopticLabs validity check is triggered, then it remains so until a later observation passes the validity check, which reduces the data storage substantially for QC information.

As we show next in the Peter Sinks example [(here)](assets/img/abernathy-ams-2017.pdf), our ability to detect the difference between an extreme weather event and an unique observation in real-time is difficult. The current approach applies well for most cases, but there are situations where false positives (suspect observation fails to be identified) or false negatives (valid observations that trigger an exception) arise.


## How to use this suite of products

We have developed a suite of products to help you explore the quality control flags attached to an observation.  From the image below, there are three components to this.  Each component allows you to see the data at a different level and as you move closer to the observation, you will be able to see more context.

{:.article__img}
![alt text][qc-cycle]

Examples of these products are here:

- [QC data for UUNet (network)](https://synopticlabs.org/demos/qc/qc/network.html?network=4&recent=1440&display_interval=3600)
- [Station by Year for MTMET](https://synopticlabs.org/demos/qc/qc/station.html?stid=mtmet&year=2016)
- [Observations for MTMET](https://synopticlabs.org/demos/qc/tabtable.html?stid=mtmet&recent=720)

[mesowest-madis]: ./img/meso-madis.png "MesoWest and MADIS observations"
[flag-freq]: ./img/qc-freq.png "Flag frequency"
[qc-cycle]: ./img/qc-cycle.jpg "QC exploratory cycle"
