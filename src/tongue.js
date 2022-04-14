class tongue extends sprite{

    constructor(
    p_x = 0,
    p_y = 0,
    width = 0,
    height = 0,
    scale = 1.0,
    rotation = 0
    ){
        
    let img_src = "../media/sprites/frog/tongue.png"
    let animation_masks = new Map(
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
    super(img_src,animation_masks,"right 1",p_x,p_y,width,height,scale,rotation)
    }   
}
