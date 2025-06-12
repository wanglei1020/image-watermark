;(() => {
  const debug = true

  const defaultOptions = {
    fontSize: 20, // 字体大小
    color: 'rgba(255, 255, 255, 0.2)', // 文字颜色
    horInterval: 50, // 水平间隔
    verInterval: 50, // 垂直间隔
    radian: -30, // 旋转角度
    ignoreClassName: ['ignore-image-watermark'], // 忽略添加水印的图片类名
    ignoreSize: 100, // 忽略图片大小，图片源宽或高小于该值则不添加水印
  }

  const cache = {}

  const log = (...args) => {
    if (debug) {
      console.log('imageWatermark.js: ', ...args)
    }
  }

  window.addImageWatermarkInScope = addImageWatermarkInScope

  /**
   * 添加水印到页面中所有图片上，并监听后续的新增及变更
   * @param text {string} 水印文字
   * @param options {Object} 配置项
   */
  function addImageWatermarkInScope(text, options = defaultOptions) {
    // 为已有的图片添加水印
    document.querySelectorAll('img').forEach((img) => {
      imageWatermark(img, text, options)
    })

    // 监听新图片加载及src变更，添加水印
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        switch (mutation.type) {
          case 'childList':
            mutation.addedNodes.forEach((node) => {
              if (node instanceof HTMLImageElement) {
                imageWatermark(node, text)
              } else if (node.querySelectorAll) {
                node.querySelectorAll('img').forEach((img) => {
                  imageWatermark(img, text)
                })
              }
            })
            break
          case 'attributes':
            if (mutation.attributeName === 'src') {
              imageWatermark(mutation.target, text)
            }
            break
        }
      })
    })
    observer.observe(document.body, {
      childList: true,
      attributes: true,
      subtree: true,
    })
  }

  /**
   * 图片添加水印
   * @param el {HTMLImageElement} 图片元素
   * @param text {string} 水印文字
   * @param options {Object} 配置项
   * @returns {Promise<string>}
   */
  function imageWatermark(el, text, options = {}) {
    const opt = { ...defaultOptions, ...options }
    return new Promise((resolve, reject) => {
      if (opt.ignoreClassName.some((cn) => el.classList.contains(cn))) {
        resolve(el.src)
        console.log('该图片配置忽略添加水印', el)
        return
      }

      if (!el.src) {
        resolve(el.src)
        console.log('图片源为空', el)
        return
      }

      // 检测图片是否已添加水印
      if (el.classList.contains('has-watermark')) {
        log('图片已有水印', el)
        resolve(el.src)
        return
      }

      // 检测图片是否已缓存
      if (cache[el.src]) {
        log('使用缓存')
        el.src = cache[el.src]
        el.classList.add('has-watermark')
        resolve(el.src)
        return
      }

      log('图片添加水印开始', el)
      const src = el.src
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const img = new Image()
      img.onload = function () {
        if (
          img.naturalWidth < opt.ignoreSize ||
          img.naturalHeight < opt.ignoreSize
        ) {
          log(`图片源宽或高小于${opt.ignoreSize}px，不添加水印`, el)
          resolve(el.src)
        }
        canvas.width = img.width
        canvas.height = img.height
        ctx.drawImage(img, 0, 0)
        ctx.fillStyle = opt.color
        ctx.font = '20px Arial'
        maskTextDraw(canvas, text, opt)
        canvas.toBlob((blob) => {
          el.src = URL.createObjectURL(blob)
          cache[src] = el.src
          el.classList.add('has-watermark')
          canvas.remove()
          resolve(el.src)
          log('图片添加水印结束', el)
        })
      }
      img.onerror = function () {
        log('图片加载失败', el)
        resolve(src)
      }
      img.src = src
    })
  }

  /**
   * 水印绘制函数（水印文字倾斜全图排列）
   * @param canvas
   * @param text
   * @param options
   */
  function maskTextDraw(canvas, text, options) {
    const { width, height } = canvas
    const ctx = canvas.getContext('2d')
    const { horInterval, verInterval, radian } = options
    const angle = (radian / 180) * Math.PI
    ctx.rotate(angle)
    const sinValue = Math.sin(Math.abs(angle))
    // 旋转之后多余的宽度
    const rotatedX = sinValue * height
    const rotatedY = sinValue * width
    const textWidth = ctx.measureText(text).width
    for (
      let x = -rotatedX;
      x < width + rotatedX;
      x += +horInterval + textWidth
    ) {
      for (let y = -rotatedY; y < height + rotatedY; y += +verInterval) {
        ctx.fillText(text, x, y)
      }
    }
  }
})()
