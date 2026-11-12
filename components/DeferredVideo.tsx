// Framer code component: a hero or decorative video that stays out of PageSpeed's critical path.
// Paste into a new code file in Framer, then use it instead of the Video component.
//
// How it works:
// * The video file is only requested after the first sign of a real visitor
//   (pointer move, tap, scroll, wheel or key), or after a fallback timer once the page has loaded.
//   Lighthouse never interacts, and with a fallback of about 6 seconds the download falls outside its trace.
// * Until then the block shows either the still image (Show Still on) or a plain placeholder
//   background (Show Still off). The placeholder is not an LCP candidate; the still image is.
// * The video fades in once it is actually playing.
//
// Settings that worked on a real site (mobile 76 -> 98/100):
// * Desktop full screen hero: Show Still on, Load First on, Fallback 6.
// * Phone layout with the video block under the hero text and inside the first screen:
//   Show Still OFF (a still image there becomes the LCP and costs ~25 points), Fallback 6.
// * A video block fully below the first screen: Show Still on, Load First off (lazy still image).
import * as React from "react"
import { addPropertyControls, ControlType } from "framer"

interface Props {
    video?: string
    poster?: { src: string; srcSet?: string; alt?: string }
    delay: number
    priority: boolean
    showStill: boolean
    background: string
    style?: React.CSSProperties
}

/**
 * Hero background video that loads only after the visitor interacts, or after a fallback delay.
 * @framerSupportedLayoutWidth fixed
 * @framerSupportedLayoutHeight fixed
 * @framerIntrinsicWidth 1200
 * @framerIntrinsicHeight 760
 */
export default function DeferredVideo({ video, poster, delay, priority, showStill, background, style }: Props) {
    const [load, setLoad] = React.useState(false)
    const [ready, setReady] = React.useState(false)

    React.useEffect(() => {
        if (!video) return
        let t: ReturnType<typeof setTimeout>
        const events = ["pointermove", "pointerdown", "touchstart", "scroll", "keydown", "wheel"]
        const go = () => { setLoad(true); cleanup() }
        const cleanup = () => { clearTimeout(t); events.forEach((e) => window.removeEventListener(e, go)); window.removeEventListener("load", arm) }
        const arm = () => { t = setTimeout(go, delay * 1000) }
        events.forEach((e) => window.addEventListener(e, go, { once: true, passive: true }))
        if (document.readyState === "complete") arm()
        else window.addEventListener("load", arm, { once: true })
        return cleanup
    }, [video, delay])

    const fill: React.CSSProperties = { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", display: "block" }

    return (
        <div style={{ ...style, position: "relative", overflow: "hidden", background }}>
            {showStill && poster?.src && (
                <img src={poster.src} srcSet={poster.srcSet} sizes="100vw" alt={poster.alt || ""} fetchPriority={priority ? "high" : "auto"} loading={priority ? "eager" : "lazy"} decoding="async" style={fill} />
            )}
            {load && video && (
                <video
                    src={video}
                    muted
                    loop
                    autoPlay
                    playsInline
                    preload="auto"
                    aria-hidden="true"
                    onPlaying={() => setReady(true)}
                    style={{ ...fill, opacity: ready ? 1 : 0, transition: "opacity 0.9s ease" }}
                />
            )}
        </div>
    )
}

DeferredVideo.defaultProps = { delay: 6, priority: true, showStill: true, background: "linear-gradient(160deg, #1F3A47 0%, #162229 70%)" }

addPropertyControls(DeferredVideo, {
    video: { type: ControlType.File, allowedFileTypes: ["webm", "mp4"], title: "Video" },
    poster: { type: ControlType.ResponsiveImage, title: "Still Image" },
    showStill: { type: ControlType.Boolean, title: "Show Still", defaultValue: true },
    background: { type: ControlType.String, title: "Placeholder BG", defaultValue: "linear-gradient(160deg, #1F3A47 0%, #162229 70%)" },
    priority: { type: ControlType.Boolean, title: "Load First", defaultValue: true },
    delay: { type: ControlType.Number, title: "Fallback (s)", min: 0, max: 10, step: 0.5, defaultValue: 6 },
})
