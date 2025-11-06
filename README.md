# Traffic Simulation

The goal of this project is to try to accurately simulate the behavior of traffic on highways and roadways

## Currently working on: **Intersections**

Intersections decide the behavior of its related cars

## Feature/Bug Todo

- [x] Make lane changing smarter
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
  - Roads can have any number of lanes
  - Roads can be specified to be bidirectional
- Cars
  - Cars can be specified to have variable abilities: acceleration, braking, following distance, etc
  - Cars accelerate and decelerate to the appropriate speed in a situation
  - Cars change lanes when necessary for navigation or if obstacles in their way are too slow
- Routes
  - Cars can specify a route of roads and follow it
  - Direction of the rout is inferred from the way the roads in the route are positioned
- Intersections
  - Cars going into an intersection find the correct lane for their route
  - Intersections can control the start and end positions of splines and connecting them
  - Cars with an intersection in their route will behave differently depending on the specification
    of the intersection
  - Intersections control logic for when paths for cars are clear

## Technical details

Simulation rendered using [SimulationJs-v2](https://github.com/JacksonO123/simulationjs-v2)

Website built with [Pulse](https://github.com/JacksonO123/pulse)

By _Jackson Otto_
