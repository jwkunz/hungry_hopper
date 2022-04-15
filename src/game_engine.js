function game_update(){

}

function game_draw(){
    GM.main_scene.draw()
}

function game_loop(timestamp){
    // Time management
    GM.dt = timestamp-GM.last_timestamp
    GM.elapsed += GM.dt
    GM.last_timestamp = timestamp
    console.log("FPS: " + 1000/GM.dt)
    
    // Update game state
    game_update()
    
    // Draw
    game_draw()
    
    // Next cycle
    window.requestAnimationFrame(game_loop)
}