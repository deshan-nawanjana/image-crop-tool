// event types to ignore
const ignoreEvents = ["dragenter", "dragover", "dragleave", "drop"]
// event types to accept
const acceptEvents = ["drop", "paste"]

new Vue({
  // app root
  el: "#app",
  // app data
  data: {
    // canvas and context
    canvas: null,
    context: null
  },
  // app methods
  methods: {
    // method to load image
    loadImage(file) {
      // create image
      const image = new Image()
      // image load listener
      image.addEventListener("load", () => {
        // resize canvas to image size
        this.canvas.width = image.width
        this.canvas.height = image.height
        // draw image on context
        this.context.drawImage(image, 0, 0)
        // revoke object url
        URL.revokeObjectURL(image.src)
      })
      // set blob url on image
      image.src = URL.createObjectURL(file)
    }
  },
  // mounted listener
  mounted() {
    // for each ignoring event type
    ignoreEvents.forEach(eventType => {
      // add event listener
      window.addEventListener(eventType, event => {
        // prevent default behavior
        event.preventDefault()
        event.stopPropagation()
      }, { passive: false })
    })
    // for each accepting event type
    acceptEvents.forEach(eventType => {
      // add event listener
      window.addEventListener(eventType, event => {
        // get event data
        const data = event.dataTransfer || event.clipboardData
        // get files as an array
        const files = Array.from(data.files)
        // find if any image file
        const file = files.find(item => item.type.startsWith("image"))
        // load image if available
        if (file) { this.loadImage(file) }
      })
    })
    // store canvas element
    this.canvas = this.$refs.canvas
    // get context from canvas
    this.context = this.canvas.getContext("2d")
  }
})
