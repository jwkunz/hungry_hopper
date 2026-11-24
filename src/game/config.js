// Tunable game constants (formerly the global `GM` object in v1).
export const CONFIG = {
  frog_push_f: 2000,
  frog_f_jump: 60000,
  frog_g_jump: 1000,
  frog_drag_jump: 0.1,
  frog_drag_walk: 5.0,
  frog_mass: 1.0,
  frog_scale: 0.3,
  frog_tongue_action_ms: 25,
  frog_tongue_reload_ms: 500,
  frog_tongue_angle_step_deg: 1,
  frog_tongue_angle_limit_up_deg: 13,
  frog_tongue_angle_limit_down_deg: 4,
  // Largest time step (ms) the simulation will take in one frame, so a
  // background tab or a hiccup can't launch the frog into orbit.
  max_dt_ms: 50,
  background: '#000000',
}
