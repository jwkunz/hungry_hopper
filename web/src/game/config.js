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

  // Walk animation (squash & bob)
  walk_stride_px: 70, // distance per full bounce
  walk_bob_px: 3, // how high the body lifts at the top of a bounce
  walk_squash: 0.06, // vertical squash/stretch amount
  breathe_squash: 0.012, // idle breathing

  // Tongue
  frog_tongue_action_ms: 25,
  frog_tongue_reload_ms: 500,
  frog_tongue_aim_deg_per_s: 90,
  frog_tongue_angle_limit_up_deg: 60, // aims up to this far above horizontal
  frog_tongue_angle_limit_down_deg: 35, // ...and this far below

  tongue_thickness: 16, // hit-test thickness of the tongue

  // Water
  water_gravity: 0.18, // fraction of normal gravity while swimming
  water_drag_x: 5,
  water_drag_y: 4, // also caps the sinking speed
  swim_speed: 150,
  swim_stroke: 340, // upward kick per jump press while swimming
  water_out_jump: 0.85, // hop-out jump strength when your head is above water
  breath_ms: 7000, // how long you can stay submerged
  breath_refill: 3, // refill speed multiplier at the surface

  // Mud and leaves
  mud_speed: 0.5, // walking speed multiplier in mud
  mud_jump: 0.9,
  leaf_dip: 9, // how far a leaf sinks under your weight (px)
  leaf_dip_down: 70, // px/s
  leaf_dip_up: 45,

  // Combat
  stomp_bounce: 430, // upward speed after stomping an enemy
  stomp_bounce_high: 620, // ...while holding jump
  invuln_ms: 1500, // grace period after a shield absorbs a hit
  death_ms: 1000, // pause on death before respawning
  death_hop: 520, // upward speed of the death hop
  start_lives: 3,
  points_life_bonus: 500, // per remaining life when the level is cleared
  screen_min_ms: 600, // ignore start taps this soon after a screen appears
  swallow_ms: 170, // how long a tongued enemy takes to be pulled in and swallowed
  points_eat: 200,
  points_stomp: 100,
  points_pickup: 50,
  points_briar: 10, // per section cut
  // Enemy aggression: once you are inside aggro_range an enemy flies at you at
  // speed = chase_k / distance (inversely proportional: faster the closer it
  // gets), clamped to [chase_min_speed, chase_max_speed].
  // Respawn safety: nothing hostile within this window of the spawn point,
  // plus a short grace period so you can get your bearings.
  spawn_clear_behind: 150,
  spawn_clear_ahead: 380,
  spawn_invuln_ms: 1500,
  // M7: power-ups, grapple, combo
  glide_ms: 9000,
  glide_fall: 110, // max fall speed while gliding (px/s)
  glide_speed_mul: 1.15,
  fire_ms: 9000,
  grapple_speed: 660,
  grapple_hang_ms: 2400,
  grapple_launch_x: 420,
  grapple_launch_y: 640,
  combo_window_ms: 3200,
  combo_max: 5,
  points_boss_hit: 500,
  points_boss_kill: 2000,
  aggro_range: 480,
  chase_k: 24000,
  chase_min_speed: 32,
  chase_max_speed: 160,
  chase_turn: 5, // how quickly it steers (1/s)
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
