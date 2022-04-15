function init_controls() {
    document.body.addEventListener('keydown', function (event) {
        const key = event.key;
        //console.log(key)
        switch (key) {
            case "ArrowLeft":
                GM.key_left = true
                break;
            case "ArrowRight":
                GM.key_right = true
                break;
            case "ArrowUp":
                GM.key_up = true
                break;
            case "ArrowDown":
                GM.key_down = true
                break;
            case " ":
                GM.key_spacebar = true
                break;    
            case "f":
                GM.key_f = true
                break;    
            case "d":
                GM.key_d = true
                break;        
        }
    }
    )

    document.body.addEventListener('keyup', function (event) {
        const key = event.key;
        switch (key) {
            case "ArrowLeft":
                GM.key_left = false
                break;
            case "ArrowRight":
                GM.key_right = false
                break;
            case "ArrowUp":
                GM.key_up = false
                break;
            case "ArrowDown":
                GM.key_down = false
                break;
            case " ":
                GM.key_spacebar = false
                break;    
            case "f":
                GM.key_f = false
                break;    
            case "d":
                GM.key_d = false
                break;         
        }
    }
    )
}