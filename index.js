// event types to ignore
const ignoreEvents = ["dragenter", "dragover", "dragleave", "drop"]
// event types to accept
const acceptEvents = ["drop", "paste"]
// event types to input
const inputEvents = ["Enter", "ArrowUp", "ArrowDown"]

// helper to get values into a valid range
const toLimit = (value, min, max) => Math.min(max, Math.max(min, parseInt(value) || 0))

// helper to get cursor point by client rect
const toPoint = (canvas, value, node) => {
  // get canvas client rect
  const rect = canvas.getBoundingClientRect()
  // return actual value
  return value * (canvas[node] / rect[node])
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
    // preview and context
    preview: null,
    previewContext: null,
    // preview and context
    output: null,
    outputContext: null,
    // crop area
    crop: { x: 0, y: 0, width: 600, height: 450 },
    // resize dimensions
    resize: { width: 600, height: 450 },
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
        // draw image on context
        this.canvasContext.drawImage(image, 0, 0)
        // reset selection
        this.setSelection()
        // update preview
        this.setPreview()
        // revoke object url
        URL.revokeObjectURL(image.src)
      })
      // set blob url on image
      image.src = URL.createObjectURL(file)
    },
    // method to draw selection
    setSelection(event) {
      // validate crop area values
      this.crop.x = toLimit(this.crop.x, 0, this.canvas.width)
      this.crop.y = toLimit(this.crop.y, 0, this.canvas.height)
      this.crop.width = toLimit(this.crop.width, 0, this.canvas.width - this.crop.x)
      this.crop.height = toLimit(this.crop.height, 0, this.canvas.height - this.crop.y)
      // update resize dimensions
      this.resize.width = this.crop.width
      this.resize.height = this.crop.height
      // clear selection
      this.selectContext.clearRect(0, 0, this.select.width, this.select.height)
      // configure select style
      this.selectContext.strokeStyle = "#4d79ff"
      this.selectContext.lineWidth = 3
      // draw selection
      this.selectContext.strokeRect(this.crop.x, this.crop.y, this.crop.width, this.crop.height)
      // update preview on blur events
      if (event && event.type === "blur") { this.setPreview() }
    },
    // method on key input
    onInput(event) {
      // return if not enter key
      if (!inputEvents.includes(event.key)) { return }
      // draw selection
      this.setSelection()
      // update preview
      this.setPreview()
    },
    // method to show preview
    setPreview() {
      // clear dragging state
      this.dragging = false
      // resize preview canvas
      this.preview.width = this.crop.width
      this.preview.height = this.crop.height
      // get copy coordinates
      const from = [this.crop.x, this.crop.y, this.crop.width, this.crop.height]
      const to = [0, 0, this.preview.width, this.preview.height]
      // draw cropped area on preview
      this.previewContext.drawImage(this.canvas, ...from, ...to)
    },
    // method to update resize values
    setResize(node) {
      // validate value into integer
      const value = Math.min(10000, Math.max(1, parseInt(this.resize[node]) || this.crop[node]))
      // set on current node
      this.resize[node] = value
      // switch by node
      if (node === "width") {
        // get height by cropped ratio
        this.resize.height = parseInt(value * this.crop.height / this.crop.width)
      } else {
        // get width by cropped ratio
        this.resize.width = parseInt(value * this.crop.width / this.crop.height)
      }
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
    // store preview and context
    this.preview = this.$refs.preview
    this.previewContext = this.preview.getContext("2d")
    // create output and context
    this.output = document.createElement("canvas")
    this.outputContext = this.output.getContext("2d")
    // selection start
    this.select.addEventListener("mousedown", event => {
      // set as dragging
      this.dragging = true
      // set crop x and y
      this.crop.x = toPoint(this.select, event.layerX, "width")
      this.crop.y = toPoint(this.select, event.layerY, "height")
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
      this.crop.width = toPoint(this.select, event.layerX, "width") - this.crop.x
      this.crop.height = toPoint(this.select, event.layerY, "height") - this.crop.y
      // update selection
      this.setSelection()
    })
    // stop dragging
    this.select.addEventListener("mouseleave", this.setPreview)
    this.select.addEventListener("mouseout", this.setPreview)
    this.select.addEventListener("mouseup", this.setPreview)
    // create input element
    const input = document.createElement("input")
    // configure input element
    input.type = "file"
    input.accept = "image/*"
    input.multiple = false
    // key down listener
    window.addEventListener("keydown", event => {
      // check for open shortcut command
      if (event.ctrlKey && event.key.toUpperCase() === "O") {
        // prevent default behavior
        event.preventDefault()
        // trigger input prompt
        input.click()
      }
      // check for escape command
      if (event.key === "Escape") {
        // reset cropping area
        this.crop.x = 0
        this.crop.y = 0
        this.crop.width = this.canvas.width
        this.crop.height = this.canvas.height
        // draw selection
        this.setSelection()
        // update preview
        this.setPreview()
      }
    })
    // input select listener
    input.addEventListener("input", () => {
      // load image if available
      if (input.files.length) { this.loadImage(input.files[0]) }
      // clear input value
      input.value = ""
    })
  }
})
