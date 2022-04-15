class physics_ODE_2D{

    // NOTE: This engine assumes +y is "down" in real life

    constructor(){
        // Kinematic variables
        this.p_x = 0
        this.p_y = 0
        this.v_x = 0
        this.v_y = 0
        this.a_x = 0
        this.a_y = 0
        // The net force excluding gravity
        this.force_x = 0 
        this.force_y = 0
        // Drag coefficient (F = c * v^2 * sign(v))
        this.drag = 0
        // Lumped mass
        this.mass = 1
        // Acceleration of gravity in +y direction (down)
        this.g = 9.8
    }

    step(dt) {
        let drag_x = -this.drag*this.v_x*this.v_x*math.sign(this.v_x)
        let drag_y = -this.drag*this.v_y*this.v_y*math.sign(this.v_y)

        // Net accelerations
        this.a_x = (this.force_x + drag_x)/this.mass
        this.a_y = (this.force_y + drag_y)/this.mass + this.g

        // Integrate velocity
        this.v_x += a_x*dt
        this.v_y += a_y*dt

        // Integrate position
        this.p_x += this.v_x*dt
        this.p_y += this.v_y*dt
    }

    // Compute Kinetic energy
    compute_KE(){
        return 0.5*this.mass*(this.v_x*this.v_x+this.v_y*this.v_y)
    }
}