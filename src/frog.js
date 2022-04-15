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
        this.physics.mass = 1
        this.physics.g = 0

        this.is_right = facing_right
        this.eat_counter = 0
        this.current_state = this.state_rest

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

        let tongue_src = "../media/sprites/frog/tongue.png"
        let tongue_masks = new Map(
            [
                ["right 0", new sprite_mask(1100, 0, 100, 100)],
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
            rotation)
        this._place_tongue()
    }

    load_img_to_canvas(arg_canvas) {
        arg_canvas.appendChild(this.body.img)
        arg_canvas.appendChild(this.tongue.img)
    }

    // Place the tongue in the correct location
    _place_tongue(){
        this.tongue.p_x = this.body.p_x + this.body.animation_state_mask_map.get("eat right").s_width * 0.6 * this.scale
        this.tongue.p_y = this.body.p_y + this.body.animation_state_mask_map.get("eat right").s_height * 0.4 * this.scale
    }

    draw(arg_canvas) {
        this.body.p_x = this.physics.p_x
        this.body.p_y = this.physics.p_y
        this._place_tongue()
        this.tongue.draw(arg_canvas)
        this.body.draw(arg_canvas)
    }

    move_left(d) {
        this.physics.p_x -=d
        if (this.is_right) {
            this.is_right = false
            switch(this.current_state){
                case this.state_rest:
                    this.body.current_animation_state = "rest left"
                    break
                case this.state_jump_up:
                        this.body.current_animation_state = "jump up left"
                        break
                case this.state_jump_down:
                        this.body.current_animation_state = "jump down left"
                        break        
                case this.state_eating:
                        this.body.current_animation_state = "eat left"
                        s = this.tongue.current_animation_state.split()
                        s[0] = "left"
                        this.tongue.current_animation_state = s[0]+" "+s[1]
                        break     
            }
        }
    }

    move_right(d) {
        this.physics.p_x +=d
        if (this.is_right == false) {
            this.is_right = true
            switch(this.current_state){
                case this.state_rest:
                    this.body.current_animation_state = "rest right"
                    break
                case this.state_jump_up:
                        this.body.current_animation_state = "jump up right"
                        break
                case this.state_jump_down:
                        this.body.current_animation_state = "jump down right"
                        break        
                case this.state_eating:
                        this.body.current_animation_state = "eat right"
                        s = this.tongue.current_animation_state.split()
                        s[0] = "right"
                        this.tongue.current_animation_state = s[0]+" "+s[1]
                        break     
            }
        }      
    }

    move_up(d) {
        this.physics.p_y -=d
    }

    move_down(d) {
        this.physics.p_y +=d
    }

    toggle_jump(){
        let state_string = ""
        switch(this.current_state){
            case this.state_rest:
                this.current_state = this.state_jump_up
                state_string= "jump up "
                break
            case this.state_jump_up:
                this.current_state = this.state_jump_down
                state_string= "jump down "
                break
            case this.state_jump_down:
                this.current_state = this.state_rest
                state_string= "rest "
                break      
        }
        if(this.is_right){
            state_string += "right"
        }else{
            state_string += "left"
        }            
        this.body.current_animation_state = state_string
    }

}
