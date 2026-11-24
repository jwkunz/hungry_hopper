// Simple 2D point-mass integrator. NOTE: +y is "down" (screen coordinates).
export class PhysicsODE2D {
  constructor() {
    this.p_x = 0
    this.p_y = 0
    this.v_x = 0
    this.v_y = 0
    this.a_x = 0
    this.a_y = 0
    // Net force excluding gravity
    this.force_x = 0
    this.force_y = 0
    // Linear drag coefficient (F = -c * v)
    this.drag = 0
    this.mass = 1
    // Gravity acceleration in +y (down)
    this.g = 9.8
  }

  // Advance by dt seconds
  step(dt) {
    const drag_x = -this.drag * this.v_x
    const drag_y = -this.drag * this.v_y
    this.a_x = (this.force_x + drag_x) / this.mass
    this.a_y = (this.force_y + drag_y) / this.mass + this.g
    this.v_x += this.a_x * dt
    this.v_y += this.a_y * dt
    this.p_x += this.v_x * dt
    this.p_y += this.v_y * dt
  }

  kineticEnergy() {
    return 0.5 * this.mass * (this.v_x * this.v_x + this.v_y * this.v_y)
  }
}
