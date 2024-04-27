# Traffic Simulation

The goal of this project is to try to accurately simulate the behavior of traffic on highways and roadways

## Currently working on: **Intersections**

Cars should change lanes if they are behind a slow car, or stopped in traffic

## Feature/Bug Todo

- [ ] Fix set start for intersections
- [ ] Add various types of intersections
- [x] Add intersections as a part of a cars route
- [x] Acceleration
- [x] Lane changing
- [x] Add speed limits for roads
- [x] Decision making
  - Cars should know when to change lanes

# Features in simulation

- Road splines
  - Roads are based off of spline shapes which can have any number of curves
  - Roads can have any number of lanes, variable lane width, lane gap
  - Roads can be specified to be bidirectional
- Cars
  - Cars can be specified to have variable abilities: acceleration, braking, etc
  - Cars accelerate and decelerate to the appropriate speed in a situation
- Routes
  - Cars can specify a route of roads and follow it
  - Cars can specify the direction to traverse the route
- Intersections
  - Intersections can control the start and end positions of splines and connecting them
  - Cars with an intersection in their route will stop and start
- Traffic engine
  - Engine and cars respond to other cars on the road, slowing, changing lanes

## Technical details

Simulation rendered using [SimulationJs-v2](https://github.com/JacksonO123/simulationjs-v2)

Website built with [Pulse](https://github.com/JacksonO123/pulse)

By _Jackson Otto_
