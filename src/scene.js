/*
    A scene is a collection of sprites and a background
*/

class scene{
    constructor(
        html_host_element,
        list_of_sprites,
        width = 800,
        height = 600,
        background = "#000000",
    ){
        this.width = width
        this.height = height
        this.background = background
        
        this.canvas = document.createElement("canvas")
        this.canvas.id = "viewport"
        this.canvas.width = width
        this.canvas.height = height

        this.sprites = list_of_sprites

        for (let i in this.sprites){
            this.sprites[i].load_img_to_canvas(this.canvas)
        }

        html_host_element.appendChild(this.canvas)

        this.draw()
    }

    clear(){
        var ctx = this.canvas.getContext('2d')
        ctx.fillStyle = this.background
        ctx.fillRect(0,0,this.width,this.height)
    }

    draw(){
        this.clear()
        for (let i in this.sprites){
            this.sprites[i].draw(this.canvas)
        }
    }
}