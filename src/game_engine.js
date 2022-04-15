function game_update(){
    
    let frog = GM.main_scene.sprites[0]

    // Move frog
    let d_frog = 1
    if(GM.key_left){
        frog.move_left(d_frog)
    }
    if(GM.key_right){
        frog.move_right(d_frog)
    }
    if(GM.key_up){
        frog.move_up(d_frog)
    }
    if(GM.key_down){
        frog.move_down(d_frog)
    }
    // Handle jumping
    switch(frog.current_state){
        case frog.state_rest:{
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