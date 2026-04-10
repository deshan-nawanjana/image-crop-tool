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
    // dragging values
    dragging: null,
    // loading state
    loading: false,
    // file name
    fileName: "Image",
    // file input
    input: null
  },
  // app methods
  methods: {
    // method to open file
    openFile() {
      // trigger file input
      this.input.click()
    },
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
      // split file name
      const parts = file.name.split(".")
      // pop file extension
      parts.pop()
      // store file name
      this.fileName = parts.join(".").replace(/ /g, "_")
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
      // clear dragging values
      this.dragging = null
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
    },
    // method to download
    download() {
      // set as loading
      this.loading = true
      // ui update delay
      setTimeout(() => {
        // resize output canvas
        this.output.width = this.resize.width
        this.output.height = this.resize.height
        // get copy coordinates
        const from = [0, 0, this.crop.width, this.crop.height]
        const to = [0, 0, this.resize.width, this.resize.height]
        // draw resized image on output
        this.outputContext.drawImage(this.preview, ...from, ...to)
        // create blob from canvas
        this.output.toBlob(blob => {
          // create anchor element
          const anchor = document.createElement("a")
          // set object url from blob
          anchor.href = URL.createObjectURL(blob)
          // get file size
          const fileSize = `${this.resize.width}x${this.resize.height}`
          // configure anchor
          anchor.download = `${this.fileName}_${fileSize}.png`
          anchor.style.display = "none"
          // append anchor on body
          document.body.appendChild(anchor)
          // trigger download
          anchor.click()
          // remove anchor
          anchor.remove()
          // revoke object url
          setTimeout(() => URL.revokeObjectURL(anchor.href), 50)
          // stop loading
          this.loading = false
        })
      }, 100)
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
      // set start values
      this.dragging = [
        toPoint(this.select, event.layerX, "width"),
        toPoint(this.select, event.layerY, "height")
      ]
    })
    // selection move
    this.select.addEventListener("mousemove", event => {
      // return if not dragging
      if (!this.dragging) { return }
      // get end points
      const end = [
        toPoint(this.select, event.layerX, "width"),
        toPoint(this.select, event.layerY, "height")
      ]
      // get boundary points
      const ax = Math.min(this.dragging[0], end[0])
      const ay = Math.min(this.dragging[1], end[1])
      const bx = Math.max(this.dragging[0], end[0])
      const by = Math.max(this.dragging[1], end[1])
      // update crop size
      this.crop.x = ax
      this.crop.y = ay
      this.crop.width = (bx - ax)
      this.crop.height = (by - ay)
      // update selection
      this.setSelection()
    })
    // stop dragging
    this.select.addEventListener("mouseleave", this.setPreview)
    this.select.addEventListener("mouseout", this.setPreview)
    this.select.addEventListener("mouseup", this.setPreview)
    // create input element
    this.input = document.createElement("input")
    // configure input element
    this.input.type = "file"
    this.input.accept = "image/*"
    this.input.multiple = false
    // key down listener
    window.addEventListener("keydown", event => {
      // check for open shortcut command
      if (event.ctrlKey && event.key.toUpperCase() === "O") {
        // prevent default behavior
        event.preventDefault()
        // trigger input prompt
        this.input.click()
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
    this.input.addEventListener("input", () => {
      // load image if available
      if (this.input.files.length) { this.loadImage(this.input.files[0]) }
      // clear input value
      this.input.value = ""
    })
  }
})
