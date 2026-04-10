// event types to ignore
const ignoreEvents = ["dragenter", "dragover", "dragleave", "drop"]
// event types to accept
const acceptEvents = ["drop", "paste"]

const toLimit = (value, min, max) => {
  return Math.min(max, Math.max(min, parseInt(value) || 0))
}

new Vue({
  // app root
  el: "#app",
  // app data
  data: {
    // canvas and context
    canvas: null,
    canvasContext: null,
    // select and context
    select: null,
    selectContext: null,
    // crop area
    crop: { x: 0, y: 0, width: 600, height: 450 },
    // dragging state
    dragging: false
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
        // resize select to image size
        this.select.width = image.width
        this.select.height = image.height
        // reset crop area
        this.crop = { x: 0, y: 0, width: image.width, height: image.height }
        // reset selection
        this.setSelection()
        // draw image on context
        this.canvasContext.drawImage(image, 0, 0)
        // revoke object url
        URL.revokeObjectURL(image.src)
      })
      // set blob url on image
      image.src = URL.createObjectURL(file)
    },
    // method to draw selection
    setSelection() {
      // validate crop area values
      this.crop.x = toLimit(this.crop.x, 0, this.canvas.width)
      this.crop.y = toLimit(this.crop.y, 0, this.canvas.height)
      this.crop.width = toLimit(this.crop.width, 0, this.canvas.width - this.crop.x)
      this.crop.height = toLimit(this.crop.height, 0, this.canvas.height - this.crop.y)
      // clear selection
      this.selectContext.clearRect(0, 0, this.select.width, this.select.height)
      // configure select style
      this.selectContext.strokeStyle = "#4d79ff"
      this.selectContext.lineWidth = 2
      // draw selection
      this.selectContext.strokeRect(this.crop.x, this.crop.y, this.crop.width, this.crop.height)
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
    // store canvas and context
    this.canvas = this.$refs.canvas
    this.canvasContext = this.canvas.getContext("2d")
    // store select and context
    this.select = this.$refs.select
    this.selectContext = this.select.getContext("2d")
    // selection start
    this.select.addEventListener("mousedown", event => {
      // set as dragging
      this.dragging = true
      // set crop x and y
      this.crop.x = event.layerX
      this.crop.y = event.layerY
      // reset crop size
      this.crop.width = 0
      this.crop.height = 0
      // update selection
      this.setSelection()
    })
    // selection move
    this.select.addEventListener("mousemove", event => {
      // return if not dragging
      if (!this.dragging) { return }
      // update crop size
      this.crop.width = event.layerX - this.crop.x
      this.crop.height = event.layerY - this.crop.y
      // update selection
      this.setSelection()
    })
    // stop dragging
    this.select.addEventListener("mouseleave", () => this.dragging = false)
    this.select.addEventListener("mouseout", () => this.dragging = false)
    this.select.addEventListener("mouseup", () => this.dragging = false)
  }
})
