function game_init() {
    div = document.createElement("div")
    document.body.appendChild(div)

    init_controls()

    viewport_width = math.round(window.innerWidth * 0.9)
    viewport_height = math.round(window.innerHeight * 0.75)

    let main_frog = new frog(viewport_width / 2, 0, GM.frog_scale)
    main_frog.set_on_y(viewport_height * 0.99)    

    GM.main_scene = new scene(
        html_host_element = div,
        list_of_sprites = [main_frog],
        width = viewport_width,
        height = viewport_height,
        background = "#000000"
    )
}


function game_update() {

    switch (GM.current_game_state) {
        case GM.game_state_init: {
            game_init()
            GM.current_game_state = GM.game_state_play
            break
        }
        case GM.game_state_play: {

            let frog = GM.main_scene.sprites[0]

            // Handle jumping
            switch (frog.current_state) {
                case frog.state_rest: {
                    // Move frog
                    if (GM.key_left) {
                        frog.push_left(GM.frog_push_f)
                    } else if (GM.key_right) {
                        frog.push_right(GM.frog_push_f)
                    } else {
                        frog.physics.force_x = 0
                    }

                    /*
                    // Up down motion
                    if(GM.key_up){
                        frog.push_up(GM.frog_push_f)
                    }else if(GM.key_down){
                        frog.push_down(GM.frog_push_f)
                    }else{
                        frog.physics.force_y = 0
                    } 
                    */

                    if (GM.key_f) {
                        frog.current_state = frog.state_jump_up
                        frog.physics.drag = GM.frog_drag_jump
                        frog.push_up(GM.frog_f_jump)
                        frog.physics.g = GM.frog_g_jump
                        frog.physics.force_x = 0
                        GM.jump_y_start = frog.physics.p_y

                    }

                    if (GM.key_spacebar) {
                        frog.current_state = frog.state_eat
                    }

                    break
                }
                case frog.state_jump_up: {
                    frog.physics.force_y = 0
                    if (frog.physics.v_y >= 0) {
                        frog.current_state = frog.state_jump_down
                    }
                    break
                }
                case frog.state_jump_down: {
                    if (GM.jump_y_start <= frog.physics.p_y) {
                        frog.current_state = frog.state_rest
                        frog.physics.g = 0
                        frog.physics.v_y = 0
                        frog.physics.drag = GM.frog_drag_walk
                        frog.physics.p_y = GM.jump_y_start
                    }
                    break
                }
                case frog.state_eat: {
                    let dir_word = ""
                    if (frog.is_right) {
                        dir_word = "right"
                    } else {
                        dir_word = "left"
                    }
                    switch (frog.eat_counter) {
                        case 0: {
                            frog.body.current_animation_state = "eat " + dir_word
                            frog.tongue.current_animation_state = dir_word + " 0"
                            GM.frog_tongue_start = GM.elapsed
                            frog.eat_counter = 1
                            frog.physics.v_x = 0
                            frog.physics.force_x = 0
                            break
                        }
                        case 1: {
                            frog.body.current_animation_state = "eat " + dir_word
                            frog.tongue.current_animation_state = dir_word + " 1"
                            if(GM.elapsed - GM.frog_tongue_start > GM.frog_tongue_action_ms){
                                GM.frog_tongue_start = GM.elapsed
                                frog.eat_counter = 2
                            }
                            break
                        }
                        case 2: {
                            frog.body.current_animation_state = "eat " + dir_word
                            frog.tongue.current_animation_state = dir_word + " 2"
                            if(GM.elapsed - GM.frog_tongue_start > GM.frog_tongue_action_ms){
                                GM.frog_tongue_start = GM.elapsed
                                frog.eat_counter = 3
                            }
                            break
                        }
                        case 3: {
                            frog.body.current_animation_state = "eat " + dir_word
                            frog.tongue.current_animation_state = dir_word + " 3"
                            if(GM.elapsed - GM.frog_tongue_start > GM.frog_tongue_action_ms){
                                GM.frog_tongue_start = GM.elapsed
                                frog.eat_counter = 4
                            }
                            break
                        }
                        case 4: {
                            frog.body.current_animation_state = "eat " + dir_word
                            frog.tongue.current_animation_state = dir_word + " 4"
                            if(GM.elapsed - GM.frog_tongue_start > GM.frog_tongue_action_ms){
                                GM.frog_tongue_start = GM.elapsed
                                frog.eat_counter = 5
                            }
                            break
                        }
                        case 5: {
                            frog.body.current_animation_state = "eat " + dir_word
                            frog.tongue.current_animation_state = dir_word + " 3"
                            if(GM.elapsed - GM.frog_tongue_start > GM.frog_tongue_action_ms){
                                GM.frog_tongue_start = GM.elapsed
                                frog.eat_counter = 6
                            }
                            break
                        }     
                        case 6: {
                            frog.body.current_animation_state = "eat " + dir_word
                            frog.tongue.current_animation_state = dir_word + " 2"
                            if(GM.elapsed - GM.frog_tongue_start > GM.frog_tongue_action_ms){
                                GM.frog_tongue_start = GM.elapsed
                                frog.eat_counter = 7
                            }
                            break
                        }   
                        case 7: {
                            frog.body.current_animation_state = "eat " + dir_word
                            frog.tongue.current_animation_state = dir_word + " 1"
                            if(GM.elapsed - GM.frog_tongue_start > GM.frog_tongue_action_ms){
                                GM.frog_tongue_start = GM.elapsed
                                frog.eat_counter = 8
                            }
                            break
                        }                
                        case 8: {
                            frog.body.current_animation_state = "eat " + dir_word
                            frog.tongue.current_animation_state = dir_word + " 0"
                            if(GM.elapsed - GM.frog_tongue_start > GM.frog_tongue_action_ms){
                                GM.frog_tongue_start = GM.elapsed
                                frog.eat_counter = 9
                            }
                            break
                        }                                                                                                              
                        case 9: {
                            frog.body.current_animation_state = "rest " + dir_word
                            frog.tongue.current_animation_state = dir_word + " 0"
                            if(GM.elapsed - GM.frog_tongue_start > GM.frog_tongue_reload_ms){
                                GM.frog_tongue_start = GM.elapsed
                                frog.eat_counter = 0
                                frog.current_state = frog.state_rest
                            }
                            break
                        }                     
                    }
                    break
                }
            }

            // Physics
            dt_seconds = GM.dt / 1000
            frog.physics.step(dt_seconds)

            break
        }
    }
}

function game_draw() {
    GM.main_scene.draw()
}

function game_loop(timestamp) {
    // Time management
    GM.dt = timestamp - GM.last_timestamp
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