// Tunable game constants. World units are "pixels" of the fixed 960x540 view.
export const CONFIG = {
  // View
  view_w: 960,
  view_h: 540,

  // Simulation
  step_ms: 1000 / 120, // fixed physics step
  max_frame_ms: 100, // longest frame we'll catch up on (tab switches etc.)

  // Frog movement
  frog_mass: 1.0,
  frog_scale: 0.12, // sprite scale; also sets the frog's hitbox size
  run_speed: 260, // px/s terminal walking speed
  ground_drag: 10, // higher = snappier start/stop on ground
  air_drag: 4, // lower = floatier air control
  gravity: 1800,
  jump_speed: 760, // initial upward speed (~160px apex)
  jump_cut: 0.45, // releasing jump early caps upward speed to this fraction
  coyote_ms: 90, // can still jump this long after leaving a ledge
  jump_buffer_ms: 110, // jump pressed this early before landing still counts

  // Tongue
  frog_tongue_action_ms: 25,
  frog_tongue_reload_ms: 500,
  frog_tongue_aim_deg_per_s: 60,
  frog_tongue_angle_limit_up_deg: 13,
  frog_tongue_angle_limit_down_deg: 4,

  // Camera
  camera_lead: 0.4, // frog sits this fraction across the screen
  camera_smooth: 8, // higher = snappier follow

  background: '#0b1410',
}

// Size of the "rest" sprite frame in the sheet; the frog's hitbox is this
// frame scaled by frog_scale.
export const FROG_REST_SIZE = { w: 865, h: 475 }
export const frogHitbox = (cfg = CONFIG) => ({
  w: FROG_REST_SIZE.w * cfg.frog_scale,
  h: FROG_REST_SIZE.h * cfg.frog_scale,
})
