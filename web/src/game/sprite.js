// A region of a sprite sheet used for one animation frame.
export class SpriteMask {
  constructor(s_x, s_y, s_width, s_height) {
    this.s_x = s_x
    this.s_y = s_y
    this.s_width = s_width
    this.s_height = s_height
  }
}

// Generic sprite: a sprite sheet, a map of named masks, a position,
// scale and rotation.
export class Sprite {
  constructor(src, masks, state, p_x = 0, p_y = 0, scale = 1.0, rotation = 0) {
    this.img = new Image()
    this.img.src = src
    this.masks = masks // Map<string, SpriteMask>
    this.state = state
    this.p_x = p_x
    this.p_y = p_y
    this.scale = scale
    this.rotation = rotation
    this.flip = false // mirror horizontally (around the sprite's own box)
    this.alpha = 1
    this.sx = 1 // extra horizontal / vertical stretch (squash & stretch)
    this.sy = 1
  }

  mask(name = this.state) {
    return this.masks.get(name)
  }

  draw(ctx) {
    const m = this.mask()
    if (!m || m.s_width === 0 || !this.img.complete) return
    ctx.save()
    ctx.translate(this.p_x, this.p_y)
    ctx.rotate(this.rotation)
    ctx.globalAlpha = this.alpha
    if (this.flip) {
      ctx.translate(m.s_width * this.scale * this.sx, 0)
      ctx.scale(-1, 1)
    }
    ctx.drawImage(
      this.img,
      m.s_x, m.s_y, m.s_width, m.s_height,
      0, 0, m.s_width * this.scale * this.sx, m.s_height * this.scale * this.sy
    )
    ctx.restore()
  }
}
