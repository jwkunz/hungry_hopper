function game_update(){
    
    let frog = GM.main_scene.sprites[0]

    // Handle jumping
    switch(frog.current_state){
        case frog.state_rest:{
            // Move frog
            if(GM.key_left){
                frog.push_left(GM.frog_push_f)
            }else if(GM.key_right){
                frog.push_right(GM.frog_push_f)
            }else{
                frog.physics.force_x = 0
            }

            if(GM.key_up){
                frog.push_up(GM.frog_push_f)
            }else if(GM.key_down){
                frog.push_down(GM.frog_push_f)
            }else{
                frog.physics.force_y = 0
            }            

            if(GM.key_f){
                frog.toggle_jump()
                GM.jump_time_start = GM.elapsed
            }
            break
        }
        case frog.state_jump_up:{
            if(GM.elapsed-GM.jump_time_start > GM.frog_jump_ms){
                frog.toggle_jump()
                GM.jump_time_start = GM.elapsed
            }
            break
        }        
        case frog.state_jump_down:{
            if(GM.elapsed-GM.jump_time_start > GM.frog_jump_ms){
                frog.toggle_jump()
                GM.jump_time_start = 0
            }
            break
        }  
    }

    // Physics
    dt_seconds = GM.dt/1000
    frog.physics.step(dt_seconds)




}

function game_draw(){
    GM.main_scene.draw()
}

function game_loop(timestamp){
    // Time management
    GM.dt = timestamp-GM.last_timestamp
    GM.elapsed += GM.dt
    GM.last_timestamp = timestamp
    //console.log("FPS: " + 1000/GM.dt)
    
    // Update game state
    game_update()
    
    // Draw
    game_draw()
    
    // Next cycle
    window.requestAnimationFrame(game_loop)
}