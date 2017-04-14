---
title: SynopticLabs Data Checks
layout: default
ignore_alert: true
---

> Understanding our representation of data.

SynopticLabs provides not only our own quality control products but those of other data providers.  Currently we display the [MADIS (Meteorological Assimilation Data Ingest System)](https://madis.noaa.gov/) quality control products, and we are working to include other providers also.

For more information regarding our QC tests and motivations, you can read a case study presented at the 2017 American Meteorological Society's annal meeting [here](./qc-case-study.html).

__How we process our Data Checks__

We process our data checks (DC) in three distict stages.  First we apply a range test to determine if the observation is physically valid.  Then we process our temporal and "inline tests".  These include tests such as "wind speed vs. wind gust".  Our third stage (currently in devlopement) is spatial tests.

1. Apply range check if this test fails, then we close any open segment for that unique sensor and open a "range check" flag against it.  __We do not apply any further testing against this sensor, until the observations become compliant again__.

2. If the observation has passed the range check, then we test the value against our complete suite of DCs.

It is important to note that we do not alter any data or the data flags associated with the data in our repository that is received from data providers.  In terms of data management, we are only accountable for the UUNET (`&network=153`).  In short we do not and can not control if MADIS (or any other provider) applies a flag to an observation. To indicate these third party flags, we color code them with a blue back ground.


## Current offerings

 The following are descriptions of our current data checks.


### Range gate check

> Is the observation even valid?

We consider our range check to be a quality control check. You will see these values appear with a red background in our tab table product.  These are displayed with a red background.


{:.table .table-striped}

|              Variable               |      Unit      | Minimum |   Maximum   |
|-------------------------------------|----------------|---------|-------------|
| Altimeter                           | Pascals        | 25.10   | 31.90       |
| Pressure                            | Pascals        | 600.00  | 1080.00     |
| Temperature                         | Celsius        | -75.00  | 135.00      |
| Dew Point                           | Celsius        | -75.00  | 95.00       |
| Relative Humidity                   | %              | 0.00    | 100.00      |
| Wind Speed                          | m/s            | 0.00    | 200.00      |
| Wind Direction                      | Degrees        | 0.00    | 360.00      |
| Wind Gust                           | m/s            | 0.00    | 200.00      |
| Precipitation 5min                  | Millimeters    | 0.00    | 1.00        |
| Snow depth                          | Millimeters    | 0.00    | 500.00      |
| Solar Radiation                     | W/m**2         | 0.00    | 1500.00     |
| Soil Temperature                    | Celsius        | -58.00  | 185.00      |
| Precipitation accumulated           | Millimeters    | 0.00    | 300.00      |
| Sea_level pressure                  | Pascals        | 850.00  | 1080.00     |
| Hours of sun                        | Hours          | 0.00    | 24.00       |
| Water Temperature                   | Celsius        | 0.00    | 135.00      |
| Weather conditions                  | code           | 0.00    | 512000.00   |
| Cloud_layer_3 height/coverage       | code           | 0.00    | 8009.00     |
| Low_cloud symbol                    | code           | 0.00    | 9.00        |
| Mid_cloud symbol                    | code           | 10.00   | 19.00       |
| High_cloud symbol                   | code           | 20.00   | 29.00       |
| Pressure Tendency                   | code           | 0.00    | 8999.00     |
| Quality check flag                  | code           | -1.00   | 9.00        |
| Precipitation 10min                 | Millimeters    | 0.00    | 2.00        |
| Precipitation 3hr                   | Millimeters    | 0.00    | 30.00       |
| Precipitation 15min                 | Millimeters    | 0.00    | 3.00        |
| Precipitation 1hr                   | Millimeters    | 0.00    | 10.00       |
| Snowfall                            | Millimeters    | 0.00    | 150.00      |
| Precipitation storm                 | Millimeters    | 0.00    | 150.00      |
| Road sensor number                  |                | 1.00    | 10.00       |
| Road Temperature                    | Celsius        | -40.00  | 150.00      |
| Road_Freezing Temperature           | Celsius        | 0.00    | 40.00       |
| Road_Surface Conditions             | code           | 1.00    | 100.00      |
| unknown                             |                | 0.00    | 100.00      |
| Cloud_layer_1 height/coverage       | code           | 0.00    | 18009.00    |
| Cloud_layer_2 height/coverage       | code           | 0.00    | 8009.00     |
| Precipitation 6hr                   | Millimeters    | 0.00    | 30.00       |
| Precipitation 24hr                  | Millimeters    | 0.00    | 45.00       |
| Visibility                          | Statute miles  | 0.00    | 200.00      |
| Sonic_Wind Direction                | Degrees        | 0.00    | 360.00      |
| Remarks                             | text           | NULL    | NULL        |
| Raw observation                     | text           | NULL    | NULL        |
| 6 Hr High Temperature               | Celsius        | -75.00  | 135.00      |
| 6 Hr Low Temperature                | Celsius        | -75.00  | 135.00      |
| Peak_Wind Speed                     | m/s            | 0.00    | 200.00      |
| Fuel Temperature                    | Celsius        | -40.00  | 140.00      |
| Fuel Moisture                       | gm             | 0.00    | 100.00      |
| Ceiling                             | Meters         | 0.00    | 40000.00    |
| Sonic_Wind Speed                    | m/s            | 0.00    | 200.00      |
| Pressure change                     | code           | 0.00    | 2000.00     |
| Precipitation smoothed              | Millimeters    | 0.00    | 300.00      |
| IR_Soil Temperature                 | Celsius        | -75.00  | 135.00      |
| Temperature in_case                 | Celsius        | -75.00  | 135.00      |
| Soil Moisture                       | %              | 0.00    | 100.00      |
| Battery voltage                     | volts          | 0.00    | 50.00       |
| Data Insert Date/Time               | minutes        | 0.00    | 16000000.00 |
| Data Update Date/Time               | minutes        | 0.00    | 16000000.00 |
| Snow smoothed                       | Millimeters    | 0.00    | 500.00      |
| Precipitation manual                | Millimeters    | 0.00    | 150.00      |
| Precipitation 1hr manual            | Millimeters    | 0.00    | 10.00       |
| Precipitation 3hr manual            | Millimeters    | 0.00    | 30.00       |
| Precipitation 5min manual           | Millimeters    | 0.00    | 1.00        |
| Precipitation 10min manual          | Millimeters    | 0.00    | 2.00        |
| Precipitation 15min manual          | Millimeters    | 0.00    | 3.00        |
| Precipitation 6hr manual            | Millimeters    | 0.00    | 30.00       |
| Precipitation 24hr manual           | Millimeters    | 0.00    | 45.00       |
| Snow manual                         | Millimeters    | 0.00    | 500.00      |
| Snow interval                       | Millimeters    | 0.00    | 150.00      |
| Road Subsurface Temperature         | Celsius        | -40.00  | 150.00      |
| Water Temperature                   | Celsius        | 0.00    | 135.00      |
| Evapotranspiration                  | Millimeters    | 0.00    | 5.00        |
| Snow water equivalent               | Millimeters    | 0.00    | 100.00      |
| Precipitation 30 min                | Millimeters    | 0.00    | 5.00        |
| All variables                       |                | NULL    | NULL        |
| Precipitable water vapor            | Millimeters    | 0.00    | 5.00        |
| 24 Hr High Temperature              | Celsius        | -75.00  | 135.00      |
| 24 Hr Low Temperature               | Celsius        | -75.00  | 135.00      |
| Peak_Wind Direction                 | Degrees        | 0.00    | 360.00      |
| Precipitation (weighing_gauge)      | Millimeters    | 0.00    | 150.00      |
| Net Radiation                       | W/m**2         | -500.00 | 1000.00     |
| Soil Moisture tension               | centibars      | 0.00    | 300.00      |
| 1500 m Pressure                     | Pascals        | 700.00  | 1000.00     |
| Wet bulb temperature                | Celsius        | -75.00  | 135.00      |
| Air_Temperature at_2_meters         | Celsius        | -75.00  | 135.00      |
| Air_Temperature at_10_meters        | Celsius        | -75.00  | 135.00      |
| Precipitation 1min                  | Millimeters    | 0.00    | 0.50        |
| Pressure                            | Pascals        | 600.00  | 1080.00     |
| Temperature                         | Celsius        | -75.00  | 135.00      |
| Relative Humidity                   | %              | 0.00    | 100.00      |
| Wind Speed                          | m/s            | 0.00    | 200.00      |
| Wind Direction                      | Degrees        | 0.00    | 360.00      |
| Wind Gust                           | m/s            | 0.00    | 250.00      |
| Latitude                            | Degrees        | -90.00  | 90.00       |
| Longitude                           | Degrees        | -180.00 | 180.00      |
| Elevation                           | Meters         | -300.00 | 30000.00    |
| Platform True_Direction             | Degrees        | 0.00    | 360.00      |
| Primary_Swell Wave_Direction        | Degrees        | 0.00    | 360.00      |
| Primary_Swell Wave_Period           | Seconds        | 0.00    | 99.00       |
| Primary_Swell Wave_Height           | Meters         | 0.00    | 33.63       |
| Secondary_Swell Wave_Direction      | Degrees        | 0.00    | 360.00      |
| Secondary_Swell Wave_Period         | Seconds        | 0.00    | 99.00       |
| Secondary_Swell Wave_Height         | Meters         | 0.00    | 33.63       |
| Tide Indicator                      | code           | 0.00    | 10.00       |
| Tide Departure                      | Meters         | 0.00    | 100.00      |
| Surface Temperature                 | Celsius        | -58.00  | 185.00      |
| Platform True_Speed                 | m/s            | 0.00    | 125.00      |
| Wave Period                         | Seconds        | 0.00    | 99.00       |
| Wave Height                         | Meters         | 0.00    | 33.63       |
| Net Shortwave Radiation             | W/m**2         | -500.00 | 1000.00     |
| Net Longwave Radiation              | W/m**2         | -500.00 | 1000.00     |
| Sonic Temperature                   | Celsius        | -75.00  | 135.00      |
| Vertical_Velocity                   | m/s            | -2.00   | 2.00        |
| Zonal_Wind Standard_Deviation       | m/s            | 0.00    | 5.00        |
| Meridional_Wind Standard_Deviation  | m/s            | 0.00    | 5.00        |
| Vertical_Wind Standard_Deviation    | m/s            | 0.00    | 5.00        |
| Temperature Standard_Deviation      | Centigrade     | 0.00    | 5.00        |
| Vertical Heat_Flux                  | m/s C          | -2.00   | 2.00        |
| Friction Velocity                   | m/s            | 0.00    | 5.00        |
| SIGW/USTR                           | nondimensional | 0.00    | 5.00        |
| Sonic_Obs Total                     | nondimensional | 0.00    | 5000.00     |
| Sonic Warnings                      | nondimensional | 0.00    | 5000.00     |
| Moisture Standard_Deviation         | g/m**3         | 0.00    | 5.00        |
| Vertical Moisture_Flux              | m/s g/m**3     | -1.00   | 1.00        |
| Dew Point                           | Celsius        | -75.00  | 135.00      |
| Virtual Temperature                 | Celsius        | -75.00  | 135.00      |
| Geopotential Height                 | Meters         | -300.00 | 30000.00    |
| Outgoing Shortwave Radiation        | W/m**2         | 0.00    | 1000.00     |
| Clear Sky Solar Radiation           | W/m**2         | 0.00    | 1500.00     |
| Grip 2 Level of Grip                |                | 0.00    | 1.00        |
| Grip 1 Ice Friction Code            |                | 0.00    | 1.00        |
| Photosynthetically Active Radiation | umol/m**2 s    | 0.00    | 2500.00     |
| PM_2.5 Concentration                | ug/m3          | 0.00    | 200.00      |
| Flow Rate                           | liters/min     | 0.00    | 100.00      |
| Internal Relative_Humidity          | %              | 0.00    | 100.00      |
| Air Flow Temperature                | Celsius        | -75.00  | 135.00      |
| Ozone Concentration                 | ppb            | 0.00    | 500.00      |
| Precipitation_since 00_UTC          | Millimeters    | 0.00    | 45.00       |
| Stream flow                         | ft3/s          | NULL    | NULL        |
| Gage height                         | ft             | NULL    | NULL        |
| Black Carbon Concentration          | ug/m3          | 0.00    | 200.00      |
| Precipitation_since local_midnight  | Millimeters    | 0.00    | 45.00       |
| Soil Temperature 2                  | Celsius        | -58.00  | 185.00      |
| 18_Inch Soil_Temperature            | Celsius        | -58.00  | 185.00      |
| 18_Inch Soil_Temperature2           | Celsius        | -58.00  | 185.00      |
| 20_Inch Soil_Temperature            | Celsius        | -58.00  | 185.00      |
| Soil Temperature 3                  | Celsius        | -58.00  | 185.00      |
| Soil Temperature 4                  | Celsius        | -58.00  | 185.00      |
| Soil Moisture 2                     | %              | 0.00    | 100.00      |
| Particulate Concentration           | ug/m3          | 0.00    | 10000.00    |
| Filter Percentage                   | %              | 0.00    | 100.00      |
| Sensor Error Code                   | code           | 0.00    | 1000.00     |
| Electric Conductivity               | dS/m           | 0.00    | 10.00       |
| Permittivity                        |                | 0.00    | 100.00      |
| Precipitation since_7_AM local      | Millimeters    | 0.00    | 48.00       |
| Snow 24hr                           | Millimeters    | 0.00    | 500.00      |
| Snow since 7 AM local               | Millimeters    | 0.00    | 500.00      |
| Past weather                        | code           | 0.00    | 9.00        |
| Precipitation 12hr                  | Millimeters    | 0.00    | 24.00       |
| METAR Origin                        | code           | 0.00    | 1.00        |
| Surface Level                       | Millimeters    | -100.00 | 100.00      |
| Estimated Snowfall_Rate             | Millimeters/hr | 0.00    | 10.00       |
| Incoming Longwave Radiation         | W/m**2         | 0.00    | 1500.00     |
| Outgoing Longwave Radiation         | W/m**2         | 0.00    | 1500.00     |


### Anemometer wind speed vs. wind gust check

> Is the wind speed great than the wind gust?

We report this as a data check if the wind speed is greater than the wind gust for the same observation period.  If this test is triggered, then the DC flag is applied to the wind gust.  These are displayed with a yellow background.


### Time rate of change test

> Is the sensor changing to quickly?

The SynopticLabs rate change test, compares an observation to its last state to see if the change is greater than what would be expected.  When the temporal frequency of an observation is between "rules" then we interpolate using the next highest rule.  For example a temperature observation with a dt of 7 minutes would use the 15 minute rule, interpolated would yield a threshold of `7/15 = 0.466 ==> threshold = 7.5 * 0.466 = 3.495 Degrees C`.  These are displayed with a yellow background.

{:.table .table-striped}

| Variable Name |  Unit   |                             Rules                             |
|---------------|---------|---------------------------------------------------------------|
| Altimeter     | Pascals | 5 min: 925<br/>15 min: 1500<br/>30 min: 1500<br/>60 min: 1000 |
| Pressure      | Pascals | 5 min: 925<br/>15 min: 1500<br/>30 min: 1500<br/>60 min: 1000 |
| Temperature   | Celsius | 5 min: 5<br/>15 min: 7.5<br/>30 min: 15<br/>60 min: 20        |


### Persistence check

> Is a sensor in a persistent state?

The SynopticLans persistence check evaluates a sensor over a 24 hour period and determines if the total change in the sensors minimum and maximum values are greater than a defined threshold. Once the sensor has remained in this state for 24 hours, all values going back to the first observation meeting these requirements will be flagged along with any new observation until the sensor reports a value that breaks the persistent state.

The following table describes the variable, period of evaluation and the required change observational change in order to not become in a persistent state.  These are displayed with a yellow background.

{:.table .table-striped}

|           Variable Name            | GEMPAK | unit        | Evaluation period | Min number of obs | Required Change
| ----------------------------------- | ------ | ----------- | ----------------- | ----------------- | ---------------
| Altimeter                           | ALTI   | Pascals     | 24 hrs            | 24                | 5.0
| Pressure                            | PRES   | Pascals     | 24 hrs            | 24                | 5.0
| Temperature                         | TMPF   | Celsius     | 24 hrs            | 24                | 0.1
| Dew Point                           | DWPF   | Celsius     | 24 hrs            | 24                | 0.1
| Relative Humidity                   | RELH   | %           | 24 hrs            | 24                | 0.5
| Wind Speed                          | SKNT   | m/s         | 24 hrs            | 24                | 0.25
| Wind Direction                      | DRCT   | Degrees     | 24 hrs            | 24                | 2.5
| Wind Gust                           | GUST   | m/s         | 24 hrs            | 24                | 0.25
| Solar Radiation                     | SOLR   | W/m**2      | 48 hrs            | 48                | 0.5
| Soil Temperature                    | TSOI   | Celsius     | 48 hrs            | 48                | 0.05
| Sea_level pressure                  | PMSL   | Pascals     | 24 hrs            | 24                | 5.0
| Water Temperature                   | TLKE   | Celsius     | 48 hrs            | 48                | 0.05
| Road Temperature                    | TRD    | Celsius     | 24 hrs            | 24                | 0.1
| Sonic_Wind Direction                | DIRS   | Degrees     | 24 hrs            | 24                | 1.0
| Peak_Wind Speed                     | PEAK   | m/s         | 24 hrs            | 24                | 0.25
| Fuel Temperature                    | FT     | Celsius     | 72 hrs            | 72                | 0.1
| Fuel Moisture                       | FM     | gm          | 24 hrs            | 24                | 0.1
| Sonic_Wind Speed                    | SPDS   | m/s         | 24 hrs            | 24                | 0.1
| IR_Soil Temperature                 | TIR    | Celsius     | 24 hrs            | 24                | 0.1
| Road Subsurface Temperature         | TSRD   | Celsius     | 48 hrs            | 48                | 0.05
| Water Temperature                   | TLRW   | Celsius     | 48 hrs            | 48                | 0.05
| Peak_Wind Direction                 | PDIR   | Degrees     | 24 hrs            | 24                | 2.5
| Net Radiation                       | NETR   | W/m**2      | 48 hrs            | 48                | 0.5
| Air_Temperature at_2_meters         | T2M    | Celsius     | 24 hrs            | 24                | 0.1
| Air_Temperature at_10_meters        | T10M   | Celsius     | 24 hrs            | 24                | 0.1
| Pressure                            | MPRS   | Pascals     | 24 hrs            | 24                | 5.0
| Temperature                         | MTMP   | Celsius     | 24 hrs            | 24                | 0.1
| Relative Humidity                   | MRH    | %           | 24 hrs            | 24                | 0.5
| Wind Speed                          | MSKT   | m/s         | 24 hrs            | 24                | 0.25
| Wind Direction                      | MDIR   | Degrees     | 24 hrs            | 24                | 2.5
| Wind Gust                           | MGST   | m/s         | 24 hrs            | 24                | 2.5
| Surface Temperature                 | TGND   | Celsius     | 24 hrs            | 24                | 0.1
| Net Shortwave Radiation             | NETS   | W/m**2      | 48 hrs            | 48                | 0.5
| Net Longwave Radiation              | NETL   | W/m**2      | 48 hrs            | 48                | 0.5
| Sonic Temperature                   | TSNC   | Celsius     | 24 hrs            | 24                | 0.1
| Dew Point                           | MDWP   | Celsius     | 24 hrs            | 24                | 0.1
| Virtual Temperature                 | MTVR   | Celsius     | 24 hrs            | 24                | 0.1
| Outgoing Shortwave Radiation        | OUTS   | W/m**2      | 48 hrs            | 48                | 0.5
| Photosynthetically Active Radiation | SPAR   | umol/m**2 s | 48 hrs            | 48                | 0.5
| PM_2.5 Concentration                | PM25   | ug/m3       | 24 hrs            | 24                | 0.5
| Ozone Concentration                 | OZNE   | ppb         | 24 hrs            | 24                | 0.5
| Black Carbon Concentration          | BLKC   | ug/m3       | 24 hrs            | 24                | 0.5
| Particulate Concentration           | PMCN   | ug/m3       | 24 hrs            | 24                | 0.5
