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

  tongue_thickness: 16, // hit-test thickness of the tongue

  // Combat
  stomp_bounce: 430, // upward speed after stomping an enemy
  stomp_bounce_high: 620, // ...while holding jump
  invuln_ms: 1500, // grace period after a shield absorbs a hit
  death_ms: 1000, // pause on death before respawning
  death_hop: 520, // upward speed of the death hop
  start_lives: 3,
  points_life_bonus: 500, // per remaining life when the level is cleared
  screen_min_ms: 600, // ignore start taps this soon after a screen appears
  points_eat: 200,
  points_stomp: 100,
  points_pickup: 50,
  active_margin: 500, // enemies only move within this distance of the screen

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
