
/*
    This class defines a region of an image to mask for a given animation
*/


class sprite_mask{
	constructor(s_x,s_y,s_width,s_height){
		this.s_x = s_x
		this.s_y = s_y
		this.s_width = s_width
		this.s_height = s_height
	}
}

/*
    This class is a generic sprite.  It handles drawing, scaling, rotation, etc
*/


class sprite{
	constructor(
        img_file,
        animation_state_mask_map, // A Map object that takes a string and returns a sprite_mask
        current_animation_state, // A string name of the current state
        p_x = 0,
        p_y = 0,
        scale = 1.0,
        rotation = 0
        ){
		this.img = new Image()
        this.img.src = img_file
		this.animation_state_mask_map = animation_state_mask_map
		this.current_animation_state = current_animation_state

        this.p_x = p_x
        this.p_y = p_y
        this.scale = scale
        this.rotation = rotation
	}

	load_img_to_canvas(arg_canvas){
        arg_canvas.appendChild(this.img)
    }

	draw(arg_canvas){
        let mask = this.animation_state_mask_map.get(this.current_animation_state)
		let ctx = arg_canvas.getContext('2d')
        ctx.translate(this.p_x,this.p_y)
		ctx.rotate(this.rotation)
		ctx.drawImage(
			this.img,
			mask.s_x,
			mask.s_y,
			mask.s_width,
			mask.s_height,
			0,
			0,
			mask.s_width*this.scale,
			mask.s_height*this.scale
		)
		ctx.rotate(-this.rotation)
        ctx.translate(-this.p_x,-this.p_y)
	}
}