---
title: "Bridging Simulations with Observations: Machine Learning and Domain Adaptation Techniques for Cross-Survey Analysis"
speaker: "Dr. Daniel López"
date: "2026-02-25"
time: "15:00  - 16:00 "
location: "Module 15, Sala 201"
affiliation: "Instituto de Física de Altas Energías (IFAE), UAB, Barcelona, Spain"
posterUrl: "./info.png"
#slides: "https://dauam.sharepoint.com/:b:/s/AdministracionFisicaTeorica/IQCNTT687_lgQ7jZ0K7mETltAdTn0FizkiUUrRWuFgIcsJY?e=OGOnOZ" # Add this for slides
#video: "https://dauam.sharepoint.com/:v:/s/AdministracionFisicaTeorica/IQAPBb5fBHONRa_QsIed8mlQAbmwQajVKSwudr63_0VPnQU?e=Lsktep" # Add this for video
---
Abstract: 
    Modern cosmology relies on combining multiple surveys (DESI, J-PAS, LSST, WEAVE) and state-of-the-art N-body simulations, but differences in data generation, selection, and instrumentation create "domain shifts" that degrade model performance. In this talk, I’ll present a semi-supervised domain adaptation pipeline that bridges this gap for a key task: classifying J-PAS sources into quasars (high/low-z), galaxies, and stars. Accurate quasar classification is crucial—they're rare yet powerful probes of the early universe, and we need clean samples for follow-up surveys like WEAVE-QSO.
    The challenge: abundant DESI-to-J-PAS mocks don't perfectly match actual observations, while labelled J-PAS data is scarce. My solution pre-trains on large simulations, then adapts using a small set of cross-matched observations, leveraging both statistical power and realism to improve classification where it matters most. I’ll discuss the technical framework, practical lessons for simulation-to-observation transfer, and argue why domain-aware ML pipelines should become standard practice for cross-survey analysis.


Speaker Bio: Dr Daniel López did his BSc and MSc in Physics at UAM/IFT (Madrid), where Alexander Knebe supervised his master's thesis related to galaxy statistics using semi-analytical models. He then completed his PhD at DIPC (Donostia) under Raúl Angulo, working on N-body simulations and structure formation processes. He is currently a FAPESP postdoctoral fellow at IFUSP (São Paulo), working with Raul Abramo, employing ML tools for cross-survey analysis. From February to July this year, He will be at IFAE (Barcelona) with Jonás Chaves and Andreu Font, studying Ly-α forest modelling.
