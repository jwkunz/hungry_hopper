class frog {
    state_rest = Symbol("state_rest")
    state_jump_up = Symbol("state_jump_up")
    state_jump_down = Symbol("state_jump_down")
    state_eating = Symbol("state_eating")

    constructor(
        p_x = 0,
        p_y = 0,
        scale = 1.0,
        rotation = 0,
        facing_right = true
    ) {

        this.scale = scale
        this.rotation = rotation

        this.physics = new physics_ODE_2D()
        this.physics.p_x = p_x
        this.physics.p_y = p_y
        this.physics.mass = GM.frog_mass
        this.physics.g = 0.0
        this.physics.drag = GM.frog_drag_walk

        this.is_right = facing_right
        this.eat_counter = 0
        this.current_state = this.state_rest

        this.tongue_angle_deg = 0

        this.last_vx = 0

        let body_src = "../media/sprites/frog/frog.png"
        let body_masks = new Map(
            [
                ["rest right", new sprite_mask(0, 0, 865, 475)],
                ["rest left", new sprite_mask(1510, 0, 865, 475)],
                ["jump up right", new sprite_mask(120, 745, 1050, 660)],
                ["jump up left", new sprite_mask(1185, 745, 1050, 660)],
                ["jump down right", new sprite_mask(70, 1410, 1095, 590)],
                ["jump down left", new sprite_mask(1185, 1410, 1095, 590)],
                ["smash right", new sprite_mask(5, 2180, 1180, 346)],
                ["smash left", new sprite_mask(1200, 2180, 1180, 346)],
                ["eat right", new sprite_mask(0, 2645, 890, 465)],
                ["eat left", new sprite_mask(1495, 2645, 890, 465)],
            ]
        )

        this.body = new sprite(body_src, body_masks, "rest right", p_x, p_y, scale, rotation)

        this.height = this.body.animation_state_mask_map.get("rest right").s_height*scale

        let tongue_src = "../media/sprites/frog/tongue.png"
        let tongue_masks = new Map(
            [
                ["right 0", new sprite_mask(0, 0, 100, 100)],
                ["left 0", new sprite_mask(1100, 0, 100, 100)],
                ["right 1", new sprite_mask(0, 0, 685, 90)],
                ["left 1", new sprite_mask(2915, 0, 685, 90)],
                ["right 2", new sprite_mask(0, 260, 950, 130)],
                ["left 2", new sprite_mask(2650, 260, 950, 130)],
                ["right 3", new sprite_mask(0, 560, 1210, 120)],
                ["left 3", new sprite_mask(2390, 260, 1210, 120)],
                ["right 4", new sprite_mask(0, 895, 1450, 150)],
                ["left 4", new sprite_mask(2150, 895, 1450, 150)],
                ["right 5", new sprite_mask(0, 1170, 1736, 142)],
                ["left 5", new sprite_mask(2430, 1170, 1736, 142)]
            ]
        )


        this.tongue = new sprite(
            tongue_src,
            tongue_masks, "right 0",
            0,
            0,
            scale,
            0)
        this._place_tongue()
    }

    load_img_to_canvas(arg_canvas) {
        arg_canvas.appendChild(this.body.img)
        arg_canvas.appendChild(this.tongue.img)
    }

    // Place the tongue in the correct location
    _place_tongue(){
        this.tongue.p_y = this.body.p_y + this.body.animation_state_mask_map.get("eat right").s_height * 0.4 * this.scale
        if(this.is_right){
            this.tongue.p_x = this.body.p_x + this.body.animation_state_mask_map.get("eat right").s_width * 0.6 * this.scale
            this.tongue.rotation = this.tongue_angle_deg*Math.PI/180
        }else{
            this.tongue.rotation = -this.tongue_angle_deg*Math.PI/180
            let R = this.tongue.animation_state_mask_map.get(this.tongue.current_animation_state).s_width*this.scale
            this.tongue.p_x = this.body.p_x + this.body.animation_state_mask_map.get("eat right").s_width * 0.4 * this.scale
            this.tongue.p_x -= R*Math.cos(this.tongue.rotation)
            this.tongue.p_y -= R*Math.sin(this.tongue.rotation)
        }
    }

    draw(arg_canvas) {
        this.body.p_x = this.physics.p_x
        this.body.p_y = this.physics.p_y

        // Decide direction based on velocity change
        
        let dir_word = ""
        if(this.physics.v_x > 0){
            this.is_right = true
            dir_word = "right"
        }else{
            this.is_right = false
            dir_word = "left"
        }

        switch(this.current_state){
            case this.state_rest:
                this.body.current_animation_state = "rest " + dir_word
                break
            case this.state_jump_up:
                    this.body.current_animation_state = "jump up " + dir_word
                    break
            case this.state_jump_down:
                    this.body.current_animation_state = "jump down " + dir_word
                    break        
            case this.state_eating:
                    this.body.current_animation_state = "eat " + dir_word
                    s = this.tongue.current_animation_state.split()
                    s[0] = dir_word
                    this.tongue.current_animation_state = s[0]+" "+s[1]
                    break 
        }

        this._place_tongue()
        this.tongue.draw(arg_canvas)
        this.body.draw(arg_canvas)
    }

    push_left(d){
        this.physics.force_x = -d
    }
    push_right(d){
        this.physics.force_x = d
    }
    push_up(d){
        this.physics.force_y = -d
    }
    push_down(d){
        this.physics.force_y = d
    }

    set_on_y(
        y
    ){
        this.physics.p_y = y-this.height
    }
}
