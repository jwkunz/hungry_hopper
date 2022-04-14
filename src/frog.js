class frog{

    constructor(
    p_x = 0,
    p_y = 0,
    scale = 1.0,
    rotation = 0
    ){
      
    this.p_x = p_x
    this.p_y = p_y
    this.scale = scale
    this.rotation = rotation

    let body_src = "../media/sprites/frog/frog.png"
    let body_masks = new Map(
        [
            ["rest right",new sprite_mask(0,0,865,475)],
            ["rest left",new sprite_mask(1510,0,865,475)],
            ["jump up right",new sprite_mask(120,745,1050,660)],
            ["jump up left",new sprite_mask(1185,745,1050,660)],
            ["jump down right",new sprite_mask(70,1410,1095,590)],
            ["jump down left",new sprite_mask(1185,1410,1095,590)],
            ["smash right",new sprite_mask(5,2180,1180,346)],
            ["smash left",new sprite_mask(1200,2180,1180,346)],
            ["eat right",new sprite_mask(0,2645,890,465)],
            ["eat left",new sprite_mask(1495,2645,890,465)],
        ]
    )

    this.body = new sprite(body_src,body_masks,"eat right",p_x,p_y,scale,rotation)

    let tongue_src = "../media/sprites/frog/tongue.png"
    let tongue_masks = new Map(
        [
            ["right 0",new sprite_mask(1100,0,100,100)],
            ["left 0",new sprite_mask(1100,0,100,100)],
            ["right 1",new sprite_mask(0,0,685,90)],
            ["left 1",new sprite_mask(2915,0,685,90)],
            ["right 2",new sprite_mask(0,260,950,130)],
            ["left 2",new sprite_mask(2650,260,950,130)],  
            ["right 3",new sprite_mask(0,560,1210,120)],
            ["left 3",new sprite_mask(2390,260,1210,120)],  
            ["right 4",new sprite_mask(0,895,1450,150)],
            ["left 4",new sprite_mask(2150,895,1450,150)],
            ["right 5",new sprite_mask(0,1170,1736,142)],
            ["left 5",new sprite_mask(2430,1170,1736,142)]                                              
        ]
    )

    let t_x = p_x+body_masks.get("eat right").s_width*0.6*scale
    let t_y = p_y+body_masks.get("eat right").s_height*0.4*scale
    this.tongue = new sprite(
        tongue_src,
        tongue_masks,"right 1",
        t_x,
        t_y,
        scale,
        rotation)
    }   

	load_img_to_canvas(arg_canvas){
        arg_canvas.appendChild(this.body.img)
        arg_canvas.appendChild(this.tongue.img)
    }


	draw(arg_canvas){
        this.tongue.draw(arg_canvas)
        this.body.draw(arg_canvas)        
	}

}
