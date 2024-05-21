# Dev Todo

- [ ] Test/Fix merging cars as obstacles in both lanes
- [ ] Improve target lane mergin behavior
  - As a car approaches an intersection **within a certain distance**
    it should highly prioritize moving into the next lane.
  - Implement "signaling" functionality where a car that cannot merge
    can signal and place a phantom obstacle in the target lane
    - Cars will slow less aggressively for this phantom target
