import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import DottedMap from 'dotted-map'

import { useTheme } from '../../context/ThemeContext'

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

export function WorldMap({
  dots = [],
  markers = [],
  lineColor = '#0ea5e9',
  showLabels = true,
  labelClassName = 'text-sm',
  animationDuration = 2,
  loop = true,
  className = '',
  onClick,
  focus,
  minZoom = 1,
  maxZoom = 3,
}) {
  const containerRef = useRef(null)
  const svgRef = useRef(null)
  const dragState = useRef({
    active: false,
    pointerId: null,
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
  })
  const movedDuringDragRef = useRef(false)
  const [hoveredLocation, setHoveredLocation] = useState(null)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const { theme } = useTheme()
  const isDark = theme !== 'day'

  const map = useMemo(
    () =>
      new DottedMap({
        height: 100,
        grid: 'diagonal',
        projection: { name: 'equirectangular' },
      }),
    []
  )

  const svgMap = useMemo(
    () =>
      map.getSVG({
        radius: 0.22,
        color: isDark ? '#E0BE8B70' : '#3A716F66',
        shape: 'circle',
        backgroundColor: isDark ? '#040302' : '#F7FBFB',
      }),
    [isDark, map]
  )

  const projectPoint = (lat, lng) => {
    const x = (lng + 180) * (800 / 360)
    const y = (90 - lat) * (400 / 180)
    return { x, y }
  }

  const createCurvedPath = (start, end) => {
    const midX = (start.x + end.x) / 2
    const midY = Math.min(start.y, end.y) - 50
    return `M ${start.x} ${start.y} Q ${midX} ${midY} ${end.x} ${end.y}`
  }

  const focusTransform = useMemo(() => {
    if (focus?.lat == null || focus?.lng == null || !focus?.zoom || focus.zoom <= 1) {
      return null
    }

    const point = projectPoint(focus.lat, focus.lng)
    const originX = Math.min(85, Math.max(15, (point.x / 800) * 100))
    const originY = Math.min(85, Math.max(15, (point.y / 400) * 100))

    const maxOffsetPercent = Math.max(0, (focus.zoom - 1) * 40)
    const offsetX = clamp(focus.offsetX ?? 0, -maxOffsetPercent, maxOffsetPercent)
    const offsetY = clamp(focus.offsetY ?? 0, -maxOffsetPercent, maxOffsetPercent)

    return {
      transform: `translate(${offsetX}%, ${offsetY}%) scale(${focus.zoom})`,
      transformOrigin: `${originX}% ${originY}%`,
    }
  }, [focus])

  const staggerDelay = 0.3
  const totalAnimationTime = dots.length * staggerDelay + animationDuration
  const pauseTime = 2
  const fullCycleDuration = totalAnimationTime + pauseTime

  const baseClassName = [
    'relative w-full overflow-hidden rounded-[2rem] font-sans touch-none',
    'aspect-[1.6/1] sm:aspect-[1.9/1] lg:aspect-[1.75/1]',
    isDark
      ? 'border border-gold/15 bg-[#040302]'
      : 'border border-[#3f7674]/16 bg-[linear-gradient(180deg,#f9fcfc_0%,#edf6f5_100%)]',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  const getPanBounds = () => {
    const container = containerRef.current
    if (!container || zoom <= 1) {
      return { maxX: 0, maxY: 0 }
    }

    const { clientWidth, clientHeight } = container
    return {
      maxX: ((clientWidth * zoom) - clientWidth) / 2,
      maxY: ((clientHeight * zoom) - clientHeight) / 2,
    }
  }

  const clampPan = (nextPan) => {
    const { maxX, maxY } = getPanBounds()
    return {
      x: clamp(nextPan.x, -maxX, maxX),
      y: clamp(nextPan.y, -maxY, maxY),
    }
  }

  const handlePointerDown = (event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return

    dragState.current = {
      active: true,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: pan.x,
      originY: pan.y,
    }
    movedDuringDragRef.current = false
    event.currentTarget.setPointerCapture?.(event.pointerId)
  }

  const handlePointerMove = (event) => {
    if (!dragState.current.active || dragState.current.pointerId !== event.pointerId) return

    const dx = event.clientX - dragState.current.startX
    const dy = event.clientY - dragState.current.startY

    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      movedDuringDragRef.current = true
    }

    setPan(clampPan({
      x: dragState.current.originX + dx,
      y: dragState.current.originY + dy,
    }))
  }

  const stopDragging = (event) => {
    if (!dragState.current.active || dragState.current.pointerId !== event.pointerId) return

    dragState.current.active = false
    dragState.current.pointerId = null
    event.currentTarget.releasePointerCapture?.(event.pointerId)
  }

  const handleWheel = (event) => {
    event.preventDefault()

    setZoom((currentZoom) =>
      clamp(Number((currentZoom + (event.deltaY < 0 ? 0.14 : -0.14)).toFixed(2)), minZoom, maxZoom)
    )
  }

  const zoomIn = () => {
    setZoom((currentZoom) => clamp(Number((currentZoom + 0.2).toFixed(2)), minZoom, maxZoom))
  }

  const zoomOut = () => {
    setZoom((currentZoom) => clamp(Number((currentZoom - 0.2).toFixed(2)), minZoom, maxZoom))
  }

  const resetView = () => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }

  const triggerMarkerAction = (marker) => {
    if (movedDuringDragRef.current) return
    marker.onClick?.()
  }

  useEffect(() => {
    setPan((currentPan) => clampPan(currentPan))
  }, [zoom])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return undefined

    const blockPageWheel = (event) => {
      event.preventDefault()
    }

    container.addEventListener('wheel', blockPageWheel, { passive: false })

    return () => {
      container.removeEventListener('wheel', blockPageWheel)
    }
  }, [])

  return (
    <div ref={containerRef} className={baseClassName}>
      <div
        className="absolute inset-0 transition-transform duration-700 ease-out"
        style={focusTransform || undefined}
      >
        <div
          className={`absolute inset-0 ${dragState.current.active ? 'cursor-grabbing' : 'cursor-grab'}`}
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: 'center center',
          }}
          onClick={() => {
            if (!movedDuringDragRef.current) {
              onClick?.()
            }
          }}
          onKeyDown={
            onClick
              ? (event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    onClick()
                  }
                }
              : undefined
          }
          role={onClick ? 'button' : undefined}
          tabIndex={onClick ? 0 : undefined}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={stopDragging}
          onPointerCancel={stopDragging}
          onWheel={handleWheel}
        >
          <img
            src={`data:image/svg+xml;utf8,${encodeURIComponent(svgMap)}`}
            className="pointer-events-none absolute inset-0 h-full w-full select-none object-cover [mask-image:linear-gradient(to_bottom,transparent,white_10%,white_90%,transparent)]"
            alt="world map"
            draggable={false}
          />

          <svg
            ref={svgRef}
            viewBox="0 0 800 400"
            className="absolute inset-0 h-full w-full select-none"
            preserveAspectRatio="xMidYMid meet"
          >
          <defs>
            <linearGradient id="location-map-path-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="white" stopOpacity="0" />
              <stop offset="5%" stopColor={lineColor} stopOpacity="1" />
              <stop offset="95%" stopColor={lineColor} stopOpacity="1" />
              <stop offset="100%" stopColor="white" stopOpacity="0" />
            </linearGradient>

            <filter id="location-map-glow">
              <feMorphology operator="dilate" radius="0.5" />
              <feGaussianBlur stdDeviation="1" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

            {dots.map((dot, index) => {
            const startPoint = projectPoint(dot.start.lat, dot.start.lng)
            const endPoint = projectPoint(dot.end.lat, dot.end.lng)
            const path = createCurvedPath(startPoint, endPoint)
            const startTime = (index * staggerDelay) / fullCycleDuration
            const endTime = (index * staggerDelay + animationDuration) / fullCycleDuration
            const resetTime = totalAnimationTime / fullCycleDuration

            return (
              <g key={`path-group-${index}`}>
                <motion.path
                  d={path}
                  fill="none"
                  stroke="url(#location-map-path-gradient)"
                  strokeWidth="1"
                  initial={{ pathLength: 0 }}
                  animate={
                    loop
                      ? {
                          pathLength: [0, 0, 1, 1, 0],
                        }
                      : {
                          pathLength: 1,
                        }
                  }
                  transition={
                    loop
                      ? {
                          duration: fullCycleDuration,
                          times: [0, startTime, endTime, resetTime, 1],
                          ease: 'easeInOut',
                          repeat: Infinity,
                          repeatDelay: 0,
                        }
                      : {
                          duration: animationDuration,
                          delay: index * staggerDelay,
                          ease: 'easeInOut',
                        }
                  }
                />

                {loop ? (
                  <motion.circle
                    r="4"
                    fill={lineColor}
                    initial={{ offsetDistance: '0%', opacity: 0 }}
                    animate={{
                      offsetDistance: [null, '0%', '100%', '100%', '100%'],
                      opacity: [0, 0, 1, 0, 0],
                    }}
                    transition={{
                      duration: fullCycleDuration,
                      times: [0, startTime, endTime, resetTime, 1],
                      ease: 'easeInOut',
                      repeat: Infinity,
                      repeatDelay: 0,
                    }}
                    style={{
                      offsetPath: `path('${path}')`,
                    }}
                  />
                ) : null}
              </g>
            )
            })}

            {dots.map((dot, index) => {
            const startPoint = projectPoint(dot.start.lat, dot.start.lng)
            const endPoint = projectPoint(dot.end.lat, dot.end.lng)

            return (
              <g key={`points-group-${index}`}>
                <g key={`start-${index}`}>
                  <motion.g
                    onHoverStart={() => setHoveredLocation(dot.start.label || `Location ${index + 1}`)}
                    onHoverEnd={() => setHoveredLocation(null)}
                    className="cursor-pointer"
                    whileHover={{ scale: 1.2 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 10 }}
                  >
                    <circle
                      cx={startPoint.x}
                      cy={startPoint.y}
                      r="3"
                      fill={lineColor}
                      filter="url(#location-map-glow)"
                      className="drop-shadow-lg"
                    />
                    <circle
                      cx={startPoint.x}
                      cy={startPoint.y}
                      r="3"
                      fill={lineColor}
                      opacity="0.5"
                    >
                      <animate
                        attributeName="r"
                        from="3"
                        to="12"
                        dur="2s"
                        begin="0s"
                        repeatCount="indefinite"
                      />
                      <animate
                        attributeName="opacity"
                        from="0.6"
                        to="0"
                        dur="2s"
                        begin="0s"
                        repeatCount="indefinite"
                      />
                    </circle>
                  </motion.g>

                  {showLabels && dot.start.label ? (
                    <motion.g
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 * index + 0.3, duration: 0.5 }}
                      className="pointer-events-none"
                    >
                      <foreignObject
                        x={startPoint.x - 60}
                        y={startPoint.y - 36}
                        width="120"
                        height="32"
                        className="block"
                      >
                        <div className="flex h-full items-center justify-center">
                          <span
                            className={`${labelClassName} rounded-md border px-2 py-0.5 font-medium shadow-sm ${
                              isDark
                                ? 'border-gold/20 bg-black/90 text-cream'
                                : 'border-[#3f7674]/16 bg-white/92 text-[#234645]'
                            }`}
                          >
                            {dot.start.label}
                          </span>
                        </div>
                      </foreignObject>
                    </motion.g>
                  ) : null}
                </g>

                <g key={`end-${index}`}>
                  <motion.g
                    onHoverStart={() => setHoveredLocation(dot.end.label || `Destination ${index + 1}`)}
                    onHoverEnd={() => setHoveredLocation(null)}
                    className="cursor-pointer"
                    whileHover={{ scale: 1.2 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 10 }}
                  >
                    <circle
                      cx={endPoint.x}
                      cy={endPoint.y}
                      r="3"
                      fill={lineColor}
                      filter="url(#location-map-glow)"
                      className="drop-shadow-lg"
                    />
                    <circle
                      cx={endPoint.x}
                      cy={endPoint.y}
                      r="3"
                      fill={lineColor}
                      opacity="0.5"
                    >
                      <animate
                        attributeName="r"
                        from="3"
                        to="12"
                        dur="2s"
                        begin="0.5s"
                        repeatCount="indefinite"
                      />
                      <animate
                        attributeName="opacity"
                        from="0.6"
                        to="0"
                        dur="2s"
                        begin="0.5s"
                        repeatCount="indefinite"
                      />
                    </circle>
                  </motion.g>

                  {showLabels && dot.end.label ? (
                    <motion.g
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 * index + 0.5, duration: 0.5 }}
                      className="pointer-events-none"
                    >
                      <foreignObject
                        x={endPoint.x - 60}
                        y={endPoint.y - 36}
                        width="120"
                        height="32"
                        className="block"
                      >
                        <div className="flex h-full items-center justify-center">
                          <span
                            className={`${labelClassName} rounded-md border px-2 py-0.5 font-medium shadow-sm ${
                              isDark
                                ? 'border-gold/20 bg-black/90 text-cream'
                                : 'border-[#3f7674]/16 bg-white/92 text-[#234645]'
                            }`}
                          >
                            {dot.end.label}
                          </span>
                        </div>
                      </foreignObject>
                    </motion.g>
                  ) : null}
                </g>
              </g>
            )
            })}

            {markers.map((marker, index) => {
            const point = projectPoint(marker.lat, marker.lng)
            const markerPoint = {
              x: point.x + (marker.offsetX ?? 0),
              y: point.y + (marker.offsetY ?? 0),
            }

            return (
              <g key={`marker-${index}`}>
                <motion.g
                  onHoverStart={() => setHoveredLocation(marker.label || `Location ${index + 1}`)}
                  onHoverEnd={() => setHoveredLocation(null)}
                  onPointerDown={(event) => {
                    event.stopPropagation()
                  }}
                  onPointerUp={(event) => {
                    event.stopPropagation()
                    triggerMarkerAction(marker)
                  }}
                  onTouchEnd={(event) => {
                    event.stopPropagation()
                    triggerMarkerAction(marker)
                  }}
                  onMouseUp={(event) => {
                    event.stopPropagation()
                    triggerMarkerAction(marker)
                  }}
                  onClick={(event) => {
                    event.stopPropagation()
                    triggerMarkerAction(marker)
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      event.stopPropagation()
                      triggerMarkerAction(marker)
                    }
                  }}
                  className="cursor-pointer"
                  role="link"
                  tabIndex={0}
                  style={{ outline: 'none', WebkitTapHighlightColor: 'transparent' }}
                  whileHover={{ scale: 1.15 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 12 }}
                >
                  <circle
                    cx={markerPoint.x}
                    cy={markerPoint.y}
                    r="38"
                    fill="rgba(0,0,0,0.001)"
                    pointerEvents="all"
                  />
                  <circle
                    cx={markerPoint.x}
                    cy={markerPoint.y}
                    r="20"
                    fill={lineColor}
                    opacity="0.1"
                    pointerEvents="none"
                  />
                  <circle
                    cx={markerPoint.x}
                    cy={markerPoint.y}
                    r="4.5"
                    fill={lineColor}
                    filter="url(#location-map-glow)"
                    className="drop-shadow-lg"
                  />
                  <circle cx={markerPoint.x} cy={markerPoint.y} r="4.5" fill={lineColor} opacity="0.45">
                    <animate
                      attributeName="r"
                      from="4.5"
                      to="16"
                      dur="2.4s"
                      begin="0s"
                      repeatCount="indefinite"
                    />
                    <animate
                      attributeName="opacity"
                      from="0.65"
                      to="0"
                      dur="2.4s"
                      begin="0s"
                      repeatCount="indefinite"
                    />
                  </circle>
                </motion.g>

                {showLabels && marker.label ? (
                  <motion.g
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.5 }}
                    className="cursor-pointer"
                    onPointerDown={(event) => {
                      event.stopPropagation()
                    }}
                    onPointerUp={(event) => {
                      event.stopPropagation()
                      triggerMarkerAction(marker)
                    }}
                    onTouchEnd={(event) => {
                      event.stopPropagation()
                      triggerMarkerAction(marker)
                    }}
                    onMouseUp={(event) => {
                      event.stopPropagation()
                      triggerMarkerAction(marker)
                    }}
                    onClick={(event) => {
                      event.stopPropagation()
                      triggerMarkerAction(marker)
                    }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      event.stopPropagation()
                      triggerMarkerAction(marker)
                    }
                  }}
                  style={{ outline: 'none', WebkitTapHighlightColor: 'transparent' }}
                  role="link"
                  tabIndex={0}
                >
                    <foreignObject
                      x={markerPoint.x - 78}
                      y={markerPoint.y - 42}
                      width="156"
                      height="38"
                      className="block"
                    >
                      <div className="flex h-full items-center justify-center">
                        <span
                          className={`${labelClassName} pointer-events-auto rounded-md border px-3 py-1 font-medium shadow-sm ${
                            isDark
                              ? 'border-gold/20 bg-black/90 text-cream'
                              : 'border-[#3f7674]/16 bg-white/92 text-[#234645]'
                          }`}
                        >
                          {marker.label}
                        </span>
                      </div>
                    </foreignObject>
                  </motion.g>
                ) : null}
              </g>
            )
          })}
          </svg>
        </div>
      </div>

      <div className="absolute right-2 top-2 z-20 flex flex-col gap-1 sm:right-4 sm:top-4 sm:gap-2">
        <button
          type="button"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation()
            resetView()
          }}
          className={`flex h-6 min-w-6 items-center justify-center rounded-full border px-1.5 text-[0.48rem] font-semibold uppercase tracking-[0.05em] shadow-md transition-colors sm:h-9 sm:min-w-9 sm:px-3 sm:text-[0.68rem] sm:tracking-[0.18em] ${
            isDark
              ? 'border-gold/20 bg-black/85 text-cream hover:bg-black'
              : 'border-[#3f7674]/16 bg-white/92 text-[#234645] hover:bg-white'
          }`}
          aria-label="Reset map"
        >
          Reset
        </button>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation()
              zoomIn()
            }}
            className={`flex h-6 w-6 items-center justify-center rounded-full border text-[0.82rem] font-semibold shadow-md transition-colors sm:h-9 sm:w-9 sm:text-lg ${
              isDark
                ? 'border-gold/20 bg-black/85 text-cream hover:bg-black'
              : 'border-[#3f7674]/16 bg-white/92 text-[#234645] hover:bg-white'
            }`}
            aria-label="Zoom in"
          >
            +
          </button>
          <button
            type="button"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation()
              zoomOut()
            }}
            className={`flex h-6 w-6 items-center justify-center rounded-full border text-[0.82rem] font-semibold shadow-md transition-colors sm:h-9 sm:w-9 sm:text-lg ${
              isDark
                ? 'border-gold/20 bg-black/85 text-cream hover:bg-black'
              : 'border-[#3f7674]/16 bg-white/92 text-[#234645] hover:bg-white'
            }`}
            aria-label="Zoom out"
          >
            -
          </button>
        </div>
      </div>

      <AnimatePresence>
        {hoveredLocation ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className={`absolute bottom-2.5 left-2.5 rounded-lg border px-2 py-1 text-[0.68rem] font-medium shadow-lg backdrop-blur-sm sm:hidden ${
              isDark
                ? 'border-gold/20 bg-black/90 text-cream'
                : 'border-[#3f7674]/16 bg-white/92 text-[#234645]'
            }`}
          >
            {hoveredLocation}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
